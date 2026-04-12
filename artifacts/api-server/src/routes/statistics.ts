import { Router, type IRouter } from "express";
import { sql, avg, count } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/statistics/overview", async (_req, res): Promise<void> => {
  const [totalResult] = await db.select({ count: count() }).from(patientsTable);
  const totalPatients = totalResult?.count ?? 0;

  const [avgAgeResult] = await db
    .select({ avg: avg(patientsTable.age) })
    .from(patientsTable);
  const avgAge = parseFloat(avgAgeResult?.avg ?? "0");

  const stageRows = await db
    .select({
      stage: patientsTable.figoStage2018,
      count: count(),
    })
    .from(patientsTable)
    .groupBy(patientsTable.figoStage2018);

  const stageDistribution: Record<string, number> = {};
  for (const row of stageRows) {
    stageDistribution[row.stage ?? "Unknown"] = row.count;
  }

  const [outcomeResult] = await db
    .select({
      good: sql<number>`count(case when ${patientsTable.treatmentOutcome} = 1 then 1 end)`,
      total: count(),
    })
    .from(patientsTable);
  const outcomeRate = outcomeResult && outcomeResult.total > 0
    ? Number(outcomeResult.good) / outcomeResult.total
    : 0;

  const [tumorResult] = await db
    .select({ avg: avg(patientsTable.tumorSizeChange) })
    .from(patientsTable);
  const avgTumorSizeChange = parseFloat(tumorResult?.avg ?? "0");

  const [comorbidityResult] = await db
    .select({
      withComorbidity: sql<number>`count(case when ${patientsTable.hypertension} = 1 or ${patientsTable.diabetes} = 1 or ${patientsTable.cardiovascular} = 1 then 1 end)`,
      total: count(),
    })
    .from(patientsTable);
  const comorbidityRate = comorbidityResult && comorbidityResult.total > 0
    ? Number(comorbidityResult.withComorbidity) / comorbidityResult.total
    : 0;

  res.json({
    totalPatients,
    avgAge: Math.round(avgAge * 10) / 10,
    stageDistribution,
    outcomeRate: Math.round(outcomeRate * 1000) / 10,
    avgTumorSizeChange: Math.round(avgTumorSizeChange * 100) / 100,
    comorbidityRate: Math.round(comorbidityRate * 1000) / 10,
  });
});

router.get("/statistics/age-distribution", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      ageGroup: sql<string>`case 
        when ${patientsTable.age} = 0 then '<=40'
        when ${patientsTable.age} = 1 then '>40'
        else 'Unknown'
      end`,
      count: count(),
    })
    .from(patientsTable)
    .groupBy(sql`case 
      when ${patientsTable.age} = 0 then '<=40'
      when ${patientsTable.age} = 1 then '>40'
      else 'Unknown'
    end`);

  res.json(rows.map((r) => ({ name: r.ageGroup, value: r.count })));
});

router.get("/statistics/stage-distribution", async (_req, res): Promise<void> => {
  const stageMap: Record<string, string> = {
    "1": "I期",
    "2": "II期",
    "3": "III期",
    "4": "IV期",
  };

  const rows = await db
    .select({
      stage: patientsTable.figoStage2018,
      count: count(),
    })
    .from(patientsTable)
    .groupBy(patientsTable.figoStage2018);

  res.json(
    rows.map((r) => ({
      name: stageMap[r.stage ?? ""] ?? r.stage ?? "Unknown",
      value: r.count,
    }))
  );
});

router.get("/statistics/pathology-distribution", async (_req, res): Promise<void> => {
  const pathMap: Record<number, string> = {
    0: "腺癌",
    1: "鳞癌",
  };

  const rows = await db
    .select({
      type: patientsTable.pathologyType,
      count: count(),
    })
    .from(patientsTable)
    .groupBy(patientsTable.pathologyType);

  res.json(
    rows.map((r) => ({
      name: pathMap[r.type ?? -1] ?? `Type ${r.type}`,
      value: r.count,
    }))
  );
});

router.get("/statistics/treatment-outcome", async (_req, res): Promise<void> => {
  const outcomeMap: Record<number, string> = {
    0: "未缓解",
    1: "缓解",
  };

  const rows = await db
    .select({
      outcome: patientsTable.treatmentOutcome,
      count: count(),
    })
    .from(patientsTable)
    .groupBy(patientsTable.treatmentOutcome);

  res.json(
    rows.map((r) => ({
      name: outcomeMap[r.outcome ?? -1] ?? `Outcome ${r.outcome}`,
      value: r.count,
    }))
  );
});

router.get("/statistics/tumor-markers", async (_req, res): Promise<void> => {
  const [result] = await db
    .select({
      preSccAgMean: avg(patientsTable.preSccAg),
      postSccAgMean: avg(patientsTable.postSccAg),
      preCa125Mean: avg(patientsTable.preCa125),
      postCa125Mean: avg(patientsTable.postCa125),
      preCeaMean: avg(patientsTable.preCea),
      postCeaMean: avg(patientsTable.postCea),
      preCa199Mean: avg(patientsTable.preCa199),
      postCa199Mean: avg(patientsTable.postCa199),
    })
    .from(patientsTable);

  const round = (v: string | null) => Math.round(parseFloat(v ?? "0") * 100) / 100;

  res.json({
    sccAg: {
      preMean: round(result?.preSccAgMean ?? null),
      postMean: round(result?.postSccAgMean ?? null),
      preMedian: 0,
      postMedian: 0,
    },
    ca125: {
      preMean: round(result?.preCa125Mean ?? null),
      postMean: round(result?.postCa125Mean ?? null),
      preMedian: 0,
      postMedian: 0,
    },
    cea: {
      preMean: round(result?.preCeaMean ?? null),
      postMean: round(result?.postCeaMean ?? null),
      preMedian: 0,
      postMedian: 0,
    },
    ca199: {
      preMean: round(result?.preCa199Mean ?? null),
      postMean: round(result?.postCa199Mean ?? null),
      preMedian: 0,
      postMedian: 0,
    },
  });
});

router.get("/statistics/blood-indices", async (_req, res): Promise<void> => {
  const [result] = await db
    .select({
      plrMean: avg(patientsTable.plr),
      plrMin: sql<number>`min(${patientsTable.plr})`,
      plrMax: sql<number>`max(${patientsTable.plr})`,
      lmrMean: avg(patientsTable.lmr),
      lmrMin: sql<number>`min(${patientsTable.lmr})`,
      lmrMax: sql<number>`max(${patientsTable.lmr})`,
      pniMean: avg(patientsTable.pni),
      pniMin: sql<number>`min(${patientsTable.pni})`,
      pniMax: sql<number>`max(${patientsTable.pni})`,
      siiMean: avg(patientsTable.sii),
      siiMin: sql<number>`min(${patientsTable.sii})`,
      siiMax: sql<number>`max(${patientsTable.sii})`,
      pivMean: avg(patientsTable.piv),
      pivMin: sql<number>`min(${patientsTable.piv})`,
      pivMax: sql<number>`max(${patientsTable.piv})`,
    })
    .from(patientsTable);

  const round = (v: string | number | null) => Math.round(parseFloat(String(v ?? "0")) * 100) / 100;

  res.json({
    plr: { mean: round(result?.plrMean ?? null), median: 0, min: round(result?.plrMin ?? null), max: round(result?.plrMax ?? null) },
    lmr: { mean: round(result?.lmrMean ?? null), median: 0, min: round(result?.lmrMin ?? null), max: round(result?.lmrMax ?? null) },
    pni: { mean: round(result?.pniMean ?? null), median: 0, min: round(result?.pniMin ?? null), max: round(result?.pniMax ?? null) },
    sii: { mean: round(result?.siiMean ?? null), median: 0, min: round(result?.siiMin ?? null), max: round(result?.siiMax ?? null) },
    piv: { mean: round(result?.pivMean ?? null), median: 0, min: round(result?.pivMin ?? null), max: round(result?.pivMax ?? null) },
  });
});

router.get("/statistics/treatment-comparison", async (_req, res): Promise<void> => {
  const stageMap: Record<string, string> = {
    "1": "I期",
    "2": "II期",
    "3": "III期",
    "4": "IV期",
  };

  const rows = await db
    .select({
      stage: patientsTable.figoStage2018,
      preAvg: avg(patientsTable.preTreatmentTumorSize),
      postAvg: avg(patientsTable.postTreatmentTumorSize),
      changeAvg: avg(patientsTable.tumorSizeChange),
    })
    .from(patientsTable)
    .groupBy(patientsTable.figoStage2018);

  const round = (v: string | null) => Math.round(parseFloat(v ?? "0") * 100) / 100;

  res.json(
    rows.map((r) => ({
      stage: stageMap[r.stage ?? ""] ?? r.stage ?? "Unknown",
      preTreatmentAvg: round(r.preAvg),
      postTreatmentAvg: round(r.postAvg),
      changeAvg: round(r.changeAvg),
    }))
  );
});

router.get("/statistics/lymph-node-metastasis", async (_req, res): Promise<void> => {
  const [result] = await db
    .select({
      pelvic: sql<number>`sum(case when ${patientsTable.pelvicLymphNodeMetastasis} = 1 then 1 else 0 end)`,
      inguinal: sql<number>`sum(case when ${patientsTable.inguinalLymphNodeMetastasis} = 1 then 1 else 0 end)`,
      commonIliac: sql<number>`sum(case when ${patientsTable.commonIliacLymphNodeMetastasis} = 1 then 1 else 0 end)`,
      paraAortic: sql<number>`sum(case when ${patientsTable.paraAorticLymphNodeMetastasis} = 1 then 1 else 0 end)`,
      supraclavicular: sql<number>`sum(case when ${patientsTable.supraclavicularLymphNodeMetastasis} = 1 then 1 else 0 end)`,
    })
    .from(patientsTable);

  res.json([
    { name: "盆腔淋巴结", value: Number(result?.pelvic ?? 0) },
    { name: "腹股沟淋巴结", value: Number(result?.inguinal ?? 0) },
    { name: "髂总动脉旁淋巴结", value: Number(result?.commonIliac ?? 0) },
    { name: "腹主动脉旁淋巴结", value: Number(result?.paraAortic ?? 0) },
    { name: "锁骨上淋巴结", value: Number(result?.supraclavicular ?? 0) },
  ]);
});

export default router;
