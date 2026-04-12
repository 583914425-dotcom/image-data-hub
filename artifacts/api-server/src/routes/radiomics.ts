import { Router, type IRouter } from "express";
import { eq, and, count, inArray } from "drizzle-orm";
import { db, radiomicsFeaturesTable, patientsTable } from "@workspace/db";
import {
  ListRadiomicsFeaturesQueryParams,
  CreateRadiomicsFeatureBody,
  RunRadiomicsAnalysisBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/radiomics/features", async (req, res): Promise<void> => {
  const params = ListRadiomicsFeaturesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, patientId } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (patientId) {
    conditions.push(eq(radiomicsFeaturesTable.patientId, patientId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(radiomicsFeaturesTable)
    .where(where);

  const total = totalResult?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const features = await db
    .select({
      id: radiomicsFeaturesTable.id,
      patientId: radiomicsFeaturesTable.patientId,
      patientName: patientsTable.patientName,
      featureClass: radiomicsFeaturesTable.featureClass,
      featureName: radiomicsFeaturesTable.featureName,
      featureValue: radiomicsFeaturesTable.featureValue,
      imagingId: radiomicsFeaturesTable.imagingId,
      createdAt: radiomicsFeaturesTable.createdAt,
    })
    .from(radiomicsFeaturesTable)
    .leftJoin(patientsTable, eq(radiomicsFeaturesTable.patientId, patientsTable.id))
    .where(where)
    .orderBy(radiomicsFeaturesTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    features: features.map((f) => ({ ...f, patientName: f.patientName ?? "" })),
    total,
    page,
    totalPages,
  });
});

router.post("/radiomics/features", async (req, res): Promise<void> => {
  const parsed = CreateRadiomicsFeatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [feature] = await db.insert(radiomicsFeaturesTable).values(parsed.data).returning();

  const [patient] = await db
    .select({ patientName: patientsTable.patientName })
    .from(patientsTable)
    .where(eq(patientsTable.id, parsed.data.patientId));

  res.status(201).json({ ...feature, patientName: patient?.patientName ?? "" });
});

router.post("/radiomics/analysis", async (req, res): Promise<void> => {
  const parsed = RunRadiomicsAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { analysisType, patientIds, featureClasses } = parsed.data;

  const conditions = [];
  if (patientIds && patientIds.length > 0) {
    conditions.push(inArray(radiomicsFeaturesTable.patientId, patientIds));
  }
  if (featureClasses && featureClasses.length > 0) {
    conditions.push(inArray(radiomicsFeaturesTable.featureClass, featureClasses));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const features = await db
    .select()
    .from(radiomicsFeaturesTable)
    .where(where);

  const featureNames = [...new Set(features.map((f) => f.featureName))];
  const patientIdSet = [...new Set(features.map((f) => f.patientId))];

  let results: { label: string; values: number[] }[] = [];
  let summary = "";

  switch (analysisType) {
    case "correlation": {
      const matrix: number[][] = [];
      for (const f1 of featureNames.slice(0, 10)) {
        const row: number[] = [];
        for (const f2 of featureNames.slice(0, 10)) {
          const vals1 = features.filter((f) => f.featureName === f1).map((f) => f.featureValue);
          const vals2 = features.filter((f) => f.featureName === f2).map((f) => f.featureValue);
          const corr = computeCorrelation(vals1, vals2);
          row.push(Math.round(corr * 100) / 100);
        }
        matrix.push(row);
      }
      results = featureNames.slice(0, 10).map((name, i) => ({
        label: name,
        values: matrix[i],
      }));
      summary = `Correlation analysis on ${featureNames.length} features across ${patientIdSet.length} patients`;
      break;
    }
    case "pca": {
      results = featureNames.slice(0, 5).map((name) => {
        const vals = features.filter((f) => f.featureName === name).map((f) => f.featureValue);
        const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1);
        return { label: name, values: [mean, Math.sqrt(variance)] };
      });
      summary = `PCA-like analysis: mean and std for top ${results.length} features`;
      break;
    }
    case "clustering": {
      const groups: Record<string, number[]> = {};
      for (const f of features) {
        if (!groups[f.featureClass]) groups[f.featureClass] = [];
        groups[f.featureClass].push(f.featureValue);
      }
      results = Object.entries(groups).map(([cls, vals]) => ({
        label: cls,
        values: [vals.length, vals.reduce((a, b) => a + b, 0) / (vals.length || 1)],
      }));
      summary = `Clustering by feature class: ${Object.keys(groups).length} clusters found`;
      break;
    }
    case "feature_importance": {
      results = featureNames.slice(0, 10).map((name) => {
        const vals = features.filter((f) => f.featureName === name).map((f) => f.featureValue);
        const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1);
        return {
          label: name,
          values: [Math.round(Math.sqrt(variance) * 100) / 100],
        };
      });
      results.sort((a, b) => (b.values[0] ?? 0) - (a.values[0] ?? 0));
      summary = `Feature importance ranking by variance for ${featureNames.length} features`;
      break;
    }
  }

  res.json({ analysisType, results, summary });
});

router.get("/radiomics/correlation", async (_req, res): Promise<void> => {
  const features = await db.select().from(radiomicsFeaturesTable);
  const featureNames = [...new Set(features.map((f) => f.featureName))].slice(0, 10);

  const matrix: number[][] = [];
  for (const f1 of featureNames) {
    const row: number[] = [];
    for (const f2 of featureNames) {
      const vals1 = features.filter((f) => f.featureName === f1).map((f) => f.featureValue);
      const vals2 = features.filter((f) => f.featureName === f2).map((f) => f.featureValue);
      row.push(Math.round(computeCorrelation(vals1, vals2) * 100) / 100);
    }
    matrix.push(row);
  }

  res.json({ features: featureNames, matrix });
});

function computeCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

export default router;
