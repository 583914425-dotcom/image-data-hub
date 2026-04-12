import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, imagingRecordsTable, patientsTable } from "@workspace/db";
import {
  ListImagingRecordsQueryParams,
  CreateImagingRecordBody,
  GetImagingRecordParams,
  DeleteImagingRecordParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/imaging", async (req, res): Promise<void> => {
  const params = ListImagingRecordsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, patientId, modality } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (patientId) {
    conditions.push(eq(imagingRecordsTable.patientId, patientId));
  }
  if (modality) {
    conditions.push(eq(imagingRecordsTable.modality, modality));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(imagingRecordsTable)
    .where(where);

  const total = totalResult?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const records = await db
    .select({
      id: imagingRecordsTable.id,
      patientId: imagingRecordsTable.patientId,
      patientName: patientsTable.patientName,
      modality: imagingRecordsTable.modality,
      bodyPart: imagingRecordsTable.bodyPart,
      studyDate: imagingRecordsTable.studyDate,
      description: imagingRecordsTable.description,
      findings: imagingRecordsTable.findings,
      imageUrl: imagingRecordsTable.imageUrl,
      createdAt: imagingRecordsTable.createdAt,
    })
    .from(imagingRecordsTable)
    .leftJoin(patientsTable, eq(imagingRecordsTable.patientId, patientsTable.id))
    .where(where)
    .orderBy(imagingRecordsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    records: records.map((r) => ({ ...r, patientName: r.patientName ?? "" })),
    total,
    page,
    totalPages,
  });
});

router.post("/imaging", async (req, res): Promise<void> => {
  const parsed = CreateImagingRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db.insert(imagingRecordsTable).values(parsed.data).returning();

  const [patient] = await db
    .select({ patientName: patientsTable.patientName })
    .from(patientsTable)
    .where(eq(patientsTable.id, parsed.data.patientId));

  res.status(201).json({ ...record, patientName: patient?.patientName ?? "" });
});

router.get("/imaging/:id", async (req, res): Promise<void> => {
  const params = GetImagingRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const records = await db
    .select({
      id: imagingRecordsTable.id,
      patientId: imagingRecordsTable.patientId,
      patientName: patientsTable.patientName,
      modality: imagingRecordsTable.modality,
      bodyPart: imagingRecordsTable.bodyPart,
      studyDate: imagingRecordsTable.studyDate,
      description: imagingRecordsTable.description,
      findings: imagingRecordsTable.findings,
      imageUrl: imagingRecordsTable.imageUrl,
      createdAt: imagingRecordsTable.createdAt,
    })
    .from(imagingRecordsTable)
    .leftJoin(patientsTable, eq(imagingRecordsTable.patientId, patientsTable.id))
    .where(eq(imagingRecordsTable.id, params.data.id));

  if (records.length === 0) {
    res.status(404).json({ error: "Imaging record not found" });
    return;
  }

  res.json({ ...records[0], patientName: records[0].patientName ?? "" });
});

router.delete("/imaging/:id", async (req, res): Promise<void> => {
  const params = DeleteImagingRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [record] = await db
    .delete(imagingRecordsTable)
    .where(eq(imagingRecordsTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Imaging record not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
