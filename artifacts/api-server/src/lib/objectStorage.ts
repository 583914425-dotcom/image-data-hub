import { Storage, File } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import { existsSync, createReadStream, createWriteStream } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { dirname, join, resolve } from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const LOCAL_UPLOAD_ROUTE_PREFIX = "/api/storage/upload-target/";
const LOCAL_OBJECT_ROUTE_PREFIX = "/api/storage/objects/";

type StorageDriver = "replit" | "local";

interface LocalObjectMetadata {
  aclPolicy?: ObjectAclPolicy;
  contentType?: string;
}

interface LocalObjectFile {
  kind: "local";
  absolutePath: string;
  metadataPath: string;
}

type StoredObjectFile = File | LocalObjectFile;

function resolveStorageDriver(): StorageDriver {
  const raw = process.env.OBJECT_STORAGE_DRIVER?.trim().toLowerCase();
  if (raw === "replit" || raw === "local") {
    return raw;
  }
  return process.env.REPL_ID ? "replit" : "local";
}

function getWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "pnpm-workspace.yaml"))) {
      return candidate;
    }
  }

  return process.cwd();
}

const storageDriver = resolveStorageDriver();
const workspaceRoot = getWorkspaceRoot();
const localStorageRoot = resolve(
  process.env.LOCAL_OBJECT_STORAGE_DIR ?? join(workspaceRoot, "data", "object-storage"),
);

export const objectStorageClient =
  storageDriver === "replit"
    ? new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      })
    : null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor(private readonly driver: StorageDriver = storageDriver) {}

  getDriver(): StorageDriver {
    return this.driver;
  }

  getPublicObjectSearchPaths(): Array<string> {
    if (this.driver === "replit") {
      const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
      const paths = Array.from(
        new Set(
          pathsStr
            .split(",")
            .map((path) => path.trim())
            .filter((path) => path.length > 0),
        ),
      );
      if (paths.length === 0) {
        throw new Error(
          "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
            "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths).",
        );
      }
      return paths;
    }

    const raw = process.env.LOCAL_PUBLIC_OBJECT_DIRS;
    const defaults = [
      join(localStorageRoot, "public"),
      join(workspaceRoot, "attached_assets"),
    ];

    const directories = (raw ? raw.split(",") : defaults)
      .map((value) => resolve(value.trim()))
      .filter((value) => value.length > 0);

    return Array.from(new Set(directories));
  }

  getPrivateObjectDir(): string {
    if (this.driver === "replit") {
      const dir = process.env.PRIVATE_OBJECT_DIR || "";
      if (!dir) {
        throw new Error(
          "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
            "tool and set PRIVATE_OBJECT_DIR env var.",
        );
      }
      return dir;
    }

    return join(localStorageRoot, "private");
  }

  async searchPublicObject(filePath: string): Promise<StoredObjectFile | null> {
    if (this.driver === "replit") {
      for (const searchPath of this.getPublicObjectSearchPaths()) {
        const fullPath = `${searchPath}/${filePath}`;

        const { bucketName, objectName } = parseObjectPath(fullPath);
        const bucket = objectStorageClient!.bucket(bucketName);
        const file = bucket.file(objectName);

        const [exists] = await file.exists();
        if (exists) {
          return file;
        }
      }

      return null;
    }

    const segments = toSafeSegments(filePath);
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const absolutePath = join(searchPath, ...segments);
      if (existsSync(absolutePath)) {
        return {
          kind: "local",
          absolutePath,
          metadataPath: getMetadataPath(absolutePath),
        };
      }
    }

    return null;
  }

  async downloadObject(file: StoredObjectFile, cacheTtlSec: number = 3600): Promise<Response> {
    if (isLocalObjectFile(file)) {
      const metadata = await readLocalMetadata(file.metadataPath);
      const fileStat = await stat(file.absolutePath);
      const webStream = Readable.toWeb(
        createReadStream(file.absolutePath),
      ) as ReadableStream<Uint8Array>;

      return new Response(webStream, {
        headers: {
          "Content-Type": metadata.contentType || "application/octet-stream",
          "Content-Length": String(fileStat.size),
          "Cache-Control": `${metadata.aclPolicy?.visibility === "public" ? "public" : "private"}, max-age=${cacheTtlSec}`,
        },
      });
    }

    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (this.driver === "replit") {
      const privateObjectDir = this.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/uploads/${objectId}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);

      return signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      });
    }

    return `${LOCAL_UPLOAD_ROUTE_PREFIX}uploads/${randomUUID()}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObjectFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    if (this.driver === "replit") {
      const parts = objectPath.slice(1).split("/");
      if (parts.length < 2) {
        throw new ObjectNotFoundError();
      }

      const entityId = parts.slice(1).join("/");
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) {
        entityDir = `${entityDir}/`;
      }
      const objectEntityPath = `${entityDir}${entityId}`;
      const { bucketName, objectName } = parseObjectPath(objectEntityPath);
      const bucket = objectStorageClient!.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      const [exists] = await objectFile.exists();
      if (!exists) {
        throw new ObjectNotFoundError();
      }
      return objectFile;
    }

    const absolutePath = toLocalObjectAbsolutePath(objectPath);
    if (!existsSync(absolutePath)) {
      throw new ObjectNotFoundError();
    }

    return {
      kind: "local",
      absolutePath,
      metadataPath: getMetadataPath(absolutePath),
    };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    const pathname = extractPathname(rawPath);

    if (pathname.startsWith(LOCAL_UPLOAD_ROUTE_PREFIX)) {
      return `/objects/${pathname.slice(LOCAL_UPLOAD_ROUTE_PREFIX.length)}`;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return pathname;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    if (this.driver === "local") {
      const absolutePath = toLocalObjectAbsolutePath(normalizedPath);
      const metadataPath = getMetadataPath(absolutePath);
      const metadata = await readLocalMetadata(metadataPath);
      await writeLocalMetadata(metadataPath, { ...metadata, aclPolicy });
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    if (isLocalObjectFile(objectFile)) {
      return normalizedPath;
    }

    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async getObjectEntityDownloadURL(objectPath: string, ttlSec: number = 900): Promise<string> {
    if (this.driver === "local") {
      const relativePath = objectPath.replace(/^\/objects\//, "");
      return `${LOCAL_OBJECT_ROUTE_PREFIX}${relativePath}`;
    }

    const file = await this.getObjectEntityFile(objectPath);
    if (isLocalObjectFile(file)) {
      const relativePath = objectPath.replace(/^\/objects\//, "");
      return `${LOCAL_OBJECT_ROUTE_PREFIX}${relativePath}`;
    }

    const { bucketName, objectName } = parseObjectPath(`/${file.bucket.name}/${file.name}`);
    return signObjectURL({ bucketName, objectName, method: "GET", ttlSec });
  }

  async readObjectEntity(objectPath: string): Promise<Buffer> {
    const file = await this.getObjectEntityFile(objectPath);
    if (isLocalObjectFile(file)) {
      return readFile(file.absolutePath);
    }

    const [buffer] = await file.download();
    return buffer;
  }

  async writeUploadedObject(
    objectPath: string,
    body: NodeJS.ReadableStream,
    contentType?: string,
  ): Promise<void> {
    if (this.driver !== "local") {
      throw new Error("Direct upload handler is only available in local storage mode");
    }

    const absolutePath = toLocalObjectAbsolutePath(objectPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await pipeline(body, createWriteStream(absolutePath));

    const metadataPath = getMetadataPath(absolutePath);
    const metadata = await readLocalMetadata(metadataPath);
    await writeLocalMetadata(metadataPath, {
      ...metadata,
      contentType: contentType || metadata.contentType || "application/octet-stream",
    });
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (isLocalObjectFile(objectFile)) {
      const metadata = await readLocalMetadata(objectFile.metadataPath);
      const aclPolicy = metadata.aclPolicy;
      if (!aclPolicy) {
        return true;
      }

      if (
        aclPolicy.visibility === "public" &&
        (requestedPermission ?? ObjectPermission.READ) === ObjectPermission.READ
      ) {
        return true;
      }

      return Boolean(userId && aclPolicy.owner === userId);
    }

    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function isLocalObjectFile(file: StoredObjectFile): file is LocalObjectFile {
  return "kind" in file && file.kind === "local";
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

function extractPathname(rawPath: string): string {
  if (rawPath.startsWith("/")) {
    return rawPath;
  }

  try {
    return new URL(rawPath).pathname;
  } catch {
    return rawPath;
  }
}

function toSafeSegments(input: string): string[] {
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function toLocalObjectAbsolutePath(objectPath: string): string {
  const relativeObjectPath = objectPath.replace(/^\/objects\//, "");
  return join(localStorageRoot, "private", ...toSafeSegments(relativeObjectPath));
}

function getMetadataPath(absolutePath: string): string {
  return `${absolutePath}.meta.json`;
}

async function readLocalMetadata(metadataPath: string): Promise<LocalObjectMetadata> {
  if (!existsSync(metadataPath)) {
    return {};
  }

  try {
    const raw = await readFile(metadataPath, "utf-8");
    return JSON.parse(raw) as LocalObjectMetadata;
  } catch {
    return {};
  }
}

async function writeLocalMetadata(
  metadataPath: string,
  metadata: LocalObjectMetadata,
): Promise<void> {
  await mkdir(dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        "make sure you're running on Replit",
    );
  }

  const { signed_url: signedURL } = (await response.json()) as {
    signed_url: string;
  };
  return signedURL;
}
