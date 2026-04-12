import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { pool, db, patientsTable } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

const SEED_TOKEN = "ccdb-seed-2024";

router.get("/admin/seed", async (req, res): Promise<void> => {
  if (req.query.token !== SEED_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [{ value }] = await db.select({ value: count() }).from(patientsTable);
  if (Number(value) > 0) {
    res.json({ skipped: true, message: `Database already has ${value} patients` });
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
      break;
    } catch { /* try next */ }
  }

  if (!sql) {
    res.status(500).json({ error: "Seed file not found" });
    return;
  }

  const cleanSql = sql
    .split("\n")
    .filter((line) => !line.startsWith("\\"))
    .join("\n");

  await pool.query(cleanSql);

  const [{ value: after }] = await db.select({ value: count() }).from(patientsTable);
  res.json({ success: true, patients: Number(after) });
});

export default router;
