import { useParams, useLocation } from "wouter";
import { useGetPatient } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-2 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-sm w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "-"}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function YesNo(v: number | null | undefined) {
  if (v == null) return "-";
  return v === 1 ? <span className="text-destructive font-medium">是</span> : "否";
}

export default function PatientDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const patientId = parseInt(params.id ?? "0");

  const { data: patient, isLoading, isError } = useGetPatient(patientId);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </AppLayout>
    );
  }

  if (isError || !patient) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">患者不存在或加载失败</div>
      </AppLayout>
    );
  }

  const outcomeColor =
    patient.treatmentOutcome === "CR" ? "bg-green-100 text-green-700" :
    patient.treatmentOutcome === "PR" ? "bg-blue-100 text-blue-700" :
    patient.treatmentOutcome === "SD" ? "bg-yellow-100 text-yellow-700" :
    patient.treatmentOutcome === "PD" ? "bg-red-100 text-red-700" :
    "bg-muted text-muted-foreground";

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patient.patientName}</h1>
            <p className="text-muted-foreground mt-1">病案号：{patient.caseNumber}　序号：{patient.sequenceNumber}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-primary/10 text-primary">
              {patient.figoStage2018 ?? "分期未知"}
            </span>
            {patient.treatmentOutcome && (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${outcomeColor}`}>
                {patient.treatmentOutcome}
              </span>
            )}
            <span className="text-2xl font-bold text-muted-foreground">{patient.age} 岁</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="基本信息">
            <InfoRow label="年龄" value={`${patient.age} 岁`} />
            <InfoRow label="联系方式" value={patient.contactInfo} />
            <InfoRow label="孕产情况" value={patient.pregnancyHistory} />
            <InfoRow label="HPV感染状态" value={patient.hpvStatus} />
            <InfoRow label="高血压" value={YesNo(patient.hypertension)} />
            <InfoRow label="糖尿病" value={YesNo(patient.diabetes)} />
            <InfoRow label="心血管疾病" value={YesNo(patient.cardiovascular)} />
            <InfoRow label="其他合并症" value={YesNo(patient.otherComorbidities)} />
          </SectionCard>

          <SectionCard title="病理与分期">
            <InfoRow label="病理类型" value={patient.pathologyType} />
            <InfoRow label="分化情况" value={patient.differentiation} />
            <InfoRow label="宫旁浸润" value={patient.parametrialInvasion} />
            <InfoRow label="阴道下段受侵" value={patient.vaginalInvasion} />
            <InfoRow label="FIGO分期（2009）" value={patient.figoStage2009} />
            <InfoRow label="FIGO分期（2018）" value={patient.figoStage2018} />
          </SectionCard>

          <SectionCard title="肿瘤指标">
            <InfoRow label="治疗前肿瘤大小（cm）" value={patient.preTreatmentTumorSize?.toFixed(1)} />
            <InfoRow label="治疗后肿瘤大小（cm）" value={patient.postTreatmentTumorSize?.toFixed(1)} />
            <InfoRow label="肿瘤大小变化（cm）" value={patient.tumorSizeChange?.toFixed(2)} />
            <InfoRow label="治疗前SCC-Ag（ng/mL）" value={patient.preSccAg?.toFixed(2)} />
            <InfoRow label="治疗后SCC-Ag" value={patient.postSccAg?.toFixed(2)} />
            <InfoRow label="治疗前CA125（U/mL）" value={patient.preCa125?.toFixed(2)} />
            <InfoRow label="治疗后CA125" value={patient.postCa125?.toFixed(2)} />
            <InfoRow label="治疗前CEA（ng/mL）" value={patient.preCea?.toFixed(2)} />
            <InfoRow label="治疗后CEA" value={patient.postCea?.toFixed(2)} />
            <InfoRow label="治疗前CA199（U/mL）" value={patient.preCa199?.toFixed(2)} />
            <InfoRow label="治疗后CA199" value={patient.postCa199?.toFixed(2)} />
            <InfoRow label="治疗前HbG（g/L）" value={patient.preHemoglobin?.toFixed(0)} />
          </SectionCard>

          <SectionCard title="血液指标">
            <InfoRow label="血小板计数（×10⁹/L）" value={patient.plateletCount?.toFixed(0)} />
            <InfoRow label="淋巴细胞计数（×10⁹/L）" value={patient.lymphocyteCount?.toFixed(2)} />
            <InfoRow label="中性粒细胞（×10⁹/L）" value={patient.neutrophilCount?.toFixed(2)} />
            <InfoRow label="单核细胞（×10⁹/L）" value={patient.monocyteCount?.toFixed(2)} />
            <InfoRow label="血清白蛋白（g/L）" value={patient.serumAlbumin?.toFixed(1)} />
            <InfoRow label="PLR（血小板/淋巴比）" value={patient.plr?.toFixed(2)} />
            <InfoRow label="LMR（淋巴/单核比）" value={patient.lmr?.toFixed(2)} />
            <InfoRow label="PNI（预后营养指数）" value={patient.pni?.toFixed(2)} />
            <InfoRow label="SII（系统性免疫炎症指数）" value={patient.sii?.toFixed(2)} />
            <InfoRow label="PIV" value={patient.piv?.toFixed(2)} />
          </SectionCard>

          <SectionCard title="淋巴结转移">
            <InfoRow label="盆腔淋巴结" value={YesNo(patient.pelvicLymphNodeMetastasis)} />
            <InfoRow label="腹股沟区淋巴结" value={YesNo(patient.inguinalLymphNodeMetastasis)} />
            <InfoRow label="髂总动脉旁淋巴结" value={YesNo(patient.commonIliacLymphNodeMetastasis)} />
            <InfoRow label="腹主动脉旁淋巴结" value={YesNo(patient.paraAorticLymphNodeMetastasis)} />
            <InfoRow label="锁骨上淋巴结" value={YesNo(patient.supraclavicularLymphNodeMetastasis)} />
          </SectionCard>

          <SectionCard title="治疗方案与结果">
            <InfoRow label="放疗剂量（Gy）" value={patient.radiationDose} />
            <InfoRow label="近距离照射剂量（Gy）" value={patient.brachytherapyDose} />
            <InfoRow label="同步化疗周期" value={patient.concurrentChemoCycles != null ? `${patient.concurrentChemoCycles} 周期` : null} />
            <InfoRow label="热疗" value={patient.hyperthermia} />
            <InfoRow label="免疫治疗" value={patient.immunotherapy} />
            <InfoRow label="总治疗时间（天）" value={patient.totalTreatmentDays} />
            <InfoRow label="OS" value={patient.os} />
            <InfoRow label="PFS" value={patient.pfs} />
            <InfoRow label="治疗结果评价" value={
              patient.treatmentOutcome ? (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${outcomeColor}`}>
                  {patient.treatmentOutcome}
                </span>
              ) : null
            } />
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
