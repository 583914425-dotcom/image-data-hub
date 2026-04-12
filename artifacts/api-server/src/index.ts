import app from "./app";
import { logger } from "./lib/logger";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { pool, db, patientsTable } from "@workspace/db";
import { count } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function autoSeed() {
  try {
    const [{ value }] = await db.select({ value: count() }).from(patientsTable);
    if (Number(value) > 0) {
      logger.info({ patients: Number(value) }, "Database already seeded, skipping");
      return;
    }

    const candidates = [
      join(process.cwd(), "scripts", "seed_data.sql"),
      resolve(process.cwd(), "../../scripts/seed_data.sql"),
      "/home/runner/workspace/scripts/seed_data.sql",
    ];

    let sql = "";
    for (const p of candidates) {
      try {
        sql = readFileSync(p, "utf-8");
        logger.info({ path: p }, "Found seed file");
        break;
      } catch { /* try next */ }
    }

    if (!sql) {
      logger.warn("Seed file not found, skipping auto-seed");
      return;
    }

    const cleanSql = sql
      .split("\n")
      .filter((line) => !line.startsWith("\\"))
      .join("\n");

    await pool.query(cleanSql);

    const [{ value: after }] = await db.select({ value: count() }).from(patientsTable);
    logger.info({ patients: Number(after) }, "Auto-seed complete");
  } catch (err) {
    logger.error({ err }, "Auto-seed failed");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  autoSeed();
});
