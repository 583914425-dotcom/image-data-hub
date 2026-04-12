import { Router, type IRouter } from "express";
import { eq, like, and, sql, count } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  GetPatientParams,
  GetPatientResponse,
  UpdatePatientParams,
  UpdatePatientBody,
  UpdatePatientResponse,
  DeletePatientParams,
  ImportPatientsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, search, figoStage2018, pathologyType, treatmentOutcome } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(like(patientsTable.patientName, `%${search}%`));
  }
  if (figoStage2018) {
    conditions.push(eq(patientsTable.figoStage2018, figoStage2018));
  }
  if (pathologyType !== undefined && pathologyType !== null) {
    conditions.push(eq(patientsTable.pathologyType, pathologyType));
  }
  if (treatmentOutcome !== undefined && treatmentOutcome !== null) {
    conditions.push(eq(patientsTable.treatmentOutcome, treatmentOutcome));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(patientsTable)
    .where(where);

  const total = totalResult?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const patients = await db
    .select()
    .from(patientsTable)
    .where(where)
    .orderBy(patientsTable.sequenceNumber)
    .limit(limit)
    .offset(offset);

  res.json({
    patients,
    total,
    page,
    totalPages,
  });
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [patient] = await db.insert(patientsTable).values(parsed.data).returning();
  res.status(201).json(patient);
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.id));

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json(patient);
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [patient] = await db
    .update(patientsTable)
    .set(parsed.data)
    .where(eq(patientsTable.id, params.data.id))
    .returning();

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json(patient);
});

router.delete("/patients/:id", async (req, res): Promise<void> => {
  const params = DeletePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [patient] = await db
    .delete(patientsTable)
    .where(eq(patientsTable.id, params.data.id))
    .returning();

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/patients/export", async (_req, res): Promise<void> => {
  const patients = await db
    .select()
    .from(patientsTable)
    .orderBy(patientsTable.sequenceNumber);
  res.json(patients);
});

router.post("/patients/import", async (req, res): Promise<void> => {
  const parsed = ImportPatientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let imported = 0;
  let failed = 0;

  for (const patient of parsed.data.patients) {
    try {
      await db.insert(patientsTable).values(patient);
      imported++;
    } catch {
      failed++;
    }
  }

  res.status(201).json({ imported, failed });
});

export default router;
