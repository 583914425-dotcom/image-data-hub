import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "fs";
import { join, resolve } from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

const staticRoot = resolveStaticRoot();
if (staticRoot) {
  app.use(express.static(staticRoot));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(join(staticRoot, "index.html"));
  });
} else {
  logger.warn("Medical portal frontend build not found; only /api routes will be served");
}

export default app;

function resolveStaticRoot(): string | null {
  const candidates = [
    resolve(process.cwd(), "../medical-portal/dist/public"),
    resolve(process.cwd(), "../../artifacts/medical-portal/dist/public"),
    resolve(process.cwd(), "artifacts/medical-portal/dist/public"),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}
