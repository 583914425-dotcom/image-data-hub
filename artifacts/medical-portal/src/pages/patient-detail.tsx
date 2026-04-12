import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetPatient, useUpdatePatient } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, X, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatContactInfo(val?: string | null): string {
  if (!val) return "-";
  if (/^[\d.]+[eE][+\-]?\d+$/.test(val.trim())) {
    return Math.round(parseFloat(val)).toString();
  }
  return val;
}

function YesNo(v: number | null | undefined) {
  if (v == null) return "-";
  return v === 1 ? <span className="text-destructive font-medium">是</span> : "否";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-2 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-sm w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground flex-1">{value ?? "-"}</span>
    </div>
  );
}

function EditRow({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center py-1.5 border-b border-border/40 last:border-0 gap-3">
      <span className="text-muted-foreground text-sm w-44 shrink-0">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="h-7 text-sm py-0"
        step={type === "number" ? "any" : undefined}
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center py-1.5 border-b border-border/40 last:border-0 gap-3">
      <span className="text-muted-foreground text-sm w-44 shrink-0">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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

type Draft = {
  patientName: string;
  contactInfo: string;
  age: string;
  pregnancyHistory: string;
  hpvStatus: string;
  hypertension: string;
  diabetes: string;
  cardiovascular: string;
  otherComorbidities: string;
  pathologyType: string;
  differentiation: string;
  parametrialInvasion: string;
  vaginalInvasion: string;
  figoStage2009: string;
  figoStage2018: string;
  preTreatmentTumorSize: string;
  postTreatmentTumorSize: string;
  preSccAg: string;
  postSccAg: string;
  preCa125: string;
  postCa125: string;
  preCea: string;
  postCea: string;
  preCa199: string;
  postCa199: string;
  preHemoglobin: string;
  plateletCount: string;
  lymphocyteCount: string;
  neutrophilCount: string;
  monocyteCount: string;
  serumAlbumin: string;
  pelvicLymphNodeMetastasis: string;
  inguinalLymphNodeMetastasis: string;
  commonIliacLymphNodeMetastasis: string;
  paraAorticLymphNodeMetastasis: string;
  supraclavicularLymphNodeMetastasis: string;
  radiationDose: string;
  brachytherapyDose: string;
  concurrentChemoCycles: string;
  hyperthermia: string;
  immunotherapy: string;
  totalTreatmentDays: string;
  os: string;
  pfs: string;
  treatmentOutcome: string;
};

const YN_OPTIONS = [
  { value: "1", label: "是" },
  { value: "0", label: "否" },
];

const OUTCOME_OPTIONS = [
  { value: "", label: "未评价" },
  { value: "CR", label: "CR（完全缓解）" },
  { value: "PR", label: "PR（部分缓解）" },
  { value: "SD", label: "SD（疾病稳定）" },
  { value: "PD", label: "PD（疾病进展）" },
];

function n2s(v: number | null | undefined): string {
  return v != null ? String(v) : "";
}
function t2s(v: string | null | undefined): string {
  return v ?? "";
}

export default function PatientDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const patientId = parseInt(params.id ?? "0");
  const queryClient = useQueryClient();

  const { data: patient, isLoading, isError } = useGetPatient(patientId);
  const updateMutation = useUpdatePatient();

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const enterEdit = () => {
    if (!patient) return;
    setDraft({
      patientName: t2s(patient.patientName),
      contactInfo: formatContactInfo(patient.contactInfo),
      age: n2s(patient.age),
      pregnancyHistory: t2s(patient.pregnancyHistory),
      hpvStatus: t2s(patient.hpvStatus),
      hypertension: n2s(patient.hypertension),
      diabetes: n2s(patient.diabetes),
      cardiovascular: n2s(patient.cardiovascular),
      otherComorbidities: n2s(patient.otherComorbidities),
      pathologyType: t2s(patient.pathologyType),
      differentiation: t2s(patient.differentiation),
      parametrialInvasion: t2s(patient.parametrialInvasion),
      vaginalInvasion: t2s(patient.vaginalInvasion),
      figoStage2009: t2s(patient.figoStage2009),
      figoStage2018: t2s(patient.figoStage2018),
      preTreatmentTumorSize: n2s(patient.preTreatmentTumorSize),
      postTreatmentTumorSize: n2s(patient.postTreatmentTumorSize),
      preSccAg: n2s(patient.preSccAg),
      postSccAg: n2s(patient.postSccAg),
      preCa125: n2s(patient.preCa125),
      postCa125: n2s(patient.postCa125),
      preCea: n2s(patient.preCea),
      postCea: n2s(patient.postCea),
      preCa199: n2s(patient.preCa199),
      postCa199: n2s(patient.postCa199),
      preHemoglobin: n2s(patient.preHemoglobin),
      plateletCount: n2s(patient.plateletCount),
      lymphocyteCount: n2s(patient.lymphocyteCount),
      neutrophilCount: n2s(patient.neutrophilCount),
      monocyteCount: n2s(patient.monocyteCount),
      serumAlbumin: n2s(patient.serumAlbumin),
      pelvicLymphNodeMetastasis: n2s(patient.pelvicLymphNodeMetastasis),
      inguinalLymphNodeMetastasis: n2s(patient.inguinalLymphNodeMetastasis),
      commonIliacLymphNodeMetastasis: n2s(patient.commonIliacLymphNodeMetastasis),
      paraAorticLymphNodeMetastasis: n2s(patient.paraAorticLymphNodeMetastasis),
      supraclavicularLymphNodeMetastasis: n2s(patient.supraclavicularLymphNodeMetastasis),
      radiationDose: t2s(patient.radiationDose),
      brachytherapyDose: t2s(patient.brachytherapyDose),
      concurrentChemoCycles: n2s(patient.concurrentChemoCycles),
      hyperthermia: t2s(patient.hyperthermia),
      immunotherapy: t2s(patient.immunotherapy),
      totalTreatmentDays: n2s(patient.totalTreatmentDays),
      os: t2s(patient.os),
      pfs: t2s(patient.pfs),
      treatmentOutcome: t2s(patient.treatmentOutcome),
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!draft) return;
    const toNum = (s: string) => (s.trim() === "" ? null : parseFloat(s));
    const toInt = (s: string) => (s.trim() === "" ? null : parseInt(s));
    await updateMutation.mutateAsync({
      id: patientId,
      data: {
        patientName: draft.patientName || undefined,
        contactInfo: draft.contactInfo || null,
        age: toInt(draft.age) ?? undefined,
        pregnancyHistory: draft.pregnancyHistory || null,
        hpvStatus: draft.hpvStatus || null,
        hypertension: toInt(draft.hypertension) ?? 0,
        diabetes: toInt(draft.diabetes) ?? 0,
        cardiovascular: toInt(draft.cardiovascular) ?? 0,
        otherComorbidities: toInt(draft.otherComorbidities) ?? 0,
        pathologyType: draft.pathologyType || null,
        differentiation: draft.differentiation || null,
        parametrialInvasion: draft.parametrialInvasion || null,
        vaginalInvasion: draft.vaginalInvasion || null,
        figoStage2009: draft.figoStage2009 || null,
        figoStage2018: draft.figoStage2018 || null,
        preTreatmentTumorSize: toNum(draft.preTreatmentTumorSize),
        postTreatmentTumorSize: toNum(draft.postTreatmentTumorSize),
        preSccAg: toNum(draft.preSccAg),
        postSccAg: toNum(draft.postSccAg),
        preCa125: toNum(draft.preCa125),
        postCa125: toNum(draft.postCa125),
        preCea: toNum(draft.preCea),
        postCea: toNum(draft.postCea),
        preCa199: toNum(draft.preCa199),
        postCa199: toNum(draft.postCa199),
        preHemoglobin: toNum(draft.preHemoglobin),
        plateletCount: toNum(draft.plateletCount),
        lymphocyteCount: toNum(draft.lymphocyteCount),
        neutrophilCount: toNum(draft.neutrophilCount),
        monocyteCount: toNum(draft.monocyteCount),
        serumAlbumin: toNum(draft.serumAlbumin),
        pelvicLymphNodeMetastasis: toInt(draft.pelvicLymphNodeMetastasis) ?? 0,
        inguinalLymphNodeMetastasis: toInt(draft.inguinalLymphNodeMetastasis) ?? 0,
        commonIliacLymphNodeMetastasis: toInt(draft.commonIliacLymphNodeMetastasis) ?? 0,
        paraAorticLymphNodeMetastasis: toInt(draft.paraAorticLymphNodeMetastasis) ?? 0,
        supraclavicularLymphNodeMetastasis: toInt(draft.supraclavicularLymphNodeMetastasis) ?? 0,
        radiationDose: draft.radiationDose || null,
        brachytherapyDose: draft.brachytherapyDose || null,
        concurrentChemoCycles: toInt(draft.concurrentChemoCycles),
        hyperthermia: draft.hyperthermia || null,
        immunotherapy: draft.immunotherapy || null,
        totalTreatmentDays: toInt(draft.totalTreatmentDays),
        os: draft.os || null,
        pfs: draft.pfs || null,
        treatmentOutcome: draft.treatmentOutcome || null,
      },
    });
    await queryClient.invalidateQueries();
    setEditMode(false);
    setDraft(null);
    toast.success("保存成功");
  };

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

  const d = draft!;
  const set = (k: keyof Draft) => (v: string) => setDraft((prev) => prev ? { ...prev, [k]: v } : prev);

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} disabled={editMode}>
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
            {!editMode ? (
              <Button size="sm" variant="outline" onClick={enterEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                编辑
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={updateMutation.isPending}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {editMode && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            编辑模式：修改字段后点击右上角「保存」提交更改，「取消」放弃修改。
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="基本信息">
            {!editMode ? (
              <>
                <InfoRow label="年龄" value={`${patient.age} 岁`} />
                <InfoRow label="联系方式" value={formatContactInfo(patient.contactInfo)} />
                <InfoRow label="孕产情况" value={patient.pregnancyHistory} />
                <InfoRow label="HPV感染状态" value={patient.hpvStatus} />
                <InfoRow label="高血压" value={YesNo(patient.hypertension)} />
                <InfoRow label="糖尿病" value={YesNo(patient.diabetes)} />
                <InfoRow label="心血管疾病" value={YesNo(patient.cardiovascular)} />
                <InfoRow label="其他合并症" value={YesNo(patient.otherComorbidities)} />
              </>
            ) : (
              <>
                <EditRow label="年龄" value={d.age} onChange={set("age")} type="number" />
                <EditRow label="联系方式" value={d.contactInfo} onChange={set("contactInfo")} />
                <EditRow label="孕产情况" value={d.pregnancyHistory} onChange={set("pregnancyHistory")} placeholder="如 G2P1" />
                <EditRow label="HPV感染状态" value={d.hpvStatus} onChange={set("hpvStatus")} placeholder="是/否" />
                <SelectRow label="高血压" value={d.hypertension} onChange={set("hypertension")} options={YN_OPTIONS} />
                <SelectRow label="糖尿病" value={d.diabetes} onChange={set("diabetes")} options={YN_OPTIONS} />
                <SelectRow label="心血管疾病" value={d.cardiovascular} onChange={set("cardiovascular")} options={YN_OPTIONS} />
                <SelectRow label="其他合并症" value={d.otherComorbidities} onChange={set("otherComorbidities")} options={YN_OPTIONS} />
              </>
            )}
          </SectionCard>

          <SectionCard title="病理与分期">
            {!editMode ? (
              <>
                <InfoRow label="病理类型" value={patient.pathologyType} />
                <InfoRow label="分化情况" value={patient.differentiation} />
                <InfoRow label="宫旁浸润" value={patient.parametrialInvasion} />
                <InfoRow label="阴道下段受侵" value={patient.vaginalInvasion} />
                <InfoRow label="FIGO分期（2009）" value={patient.figoStage2009} />
                <InfoRow label="FIGO分期（2018）" value={patient.figoStage2018} />
              </>
            ) : (
              <>
                <EditRow label="病理类型" value={d.pathologyType} onChange={set("pathologyType")} placeholder="鳞癌/腺癌/腺鳞癌" />
                <EditRow label="分化情况" value={d.differentiation} onChange={set("differentiation")} />
                <EditRow label="宫旁浸润" value={d.parametrialInvasion} onChange={set("parametrialInvasion")} placeholder="无/左/右/双侧" />
                <EditRow label="阴道下段受侵" value={d.vaginalInvasion} onChange={set("vaginalInvasion")} placeholder="有/无" />
                <EditRow label="FIGO分期（2009）" value={d.figoStage2009} onChange={set("figoStage2009")} placeholder="如 IIB" />
                <EditRow label="FIGO分期（2018）" value={d.figoStage2018} onChange={set("figoStage2018")} placeholder="如 IIIC1" />
              </>
            )}
          </SectionCard>

          <SectionCard title="肿瘤指标">
            {!editMode ? (
              <>
                <InfoRow label="治疗前肿瘤大小（cm）" value={patient.preTreatmentTumorSize?.toFixed(1)} />
                <InfoRow label="治疗后肿瘤大小（cm）" value={patient.postTreatmentTumorSize?.toFixed(1)} />
                <InfoRow label="治疗前SCC-Ag（ng/mL）" value={patient.preSccAg?.toFixed(2)} />
                <InfoRow label="治疗后SCC-Ag" value={patient.postSccAg?.toFixed(2)} />
                <InfoRow label="治疗前CA125（U/mL）" value={patient.preCa125?.toFixed(2)} />
                <InfoRow label="治疗后CA125" value={patient.postCa125?.toFixed(2)} />
                <InfoRow label="治疗前CEA（ng/mL）" value={patient.preCea?.toFixed(2)} />
                <InfoRow label="治疗后CEA" value={patient.postCea?.toFixed(2)} />
                <InfoRow label="治疗前CA199（U/mL）" value={patient.preCa199?.toFixed(2)} />
                <InfoRow label="治疗后CA199" value={patient.postCa199?.toFixed(2)} />
                <InfoRow label="治疗前HbG（g/L）" value={patient.preHemoglobin?.toFixed(0)} />
              </>
            ) : (
              <>
                <EditRow label="治疗前肿瘤大小（cm）" value={d.preTreatmentTumorSize} onChange={set("preTreatmentTumorSize")} type="number" />
                <EditRow label="治疗后肿瘤大小（cm）" value={d.postTreatmentTumorSize} onChange={set("postTreatmentTumorSize")} type="number" />
                <EditRow label="治疗前SCC-Ag（ng/mL）" value={d.preSccAg} onChange={set("preSccAg")} type="number" />
                <EditRow label="治疗后SCC-Ag" value={d.postSccAg} onChange={set("postSccAg")} type="number" />
                <EditRow label="治疗前CA125（U/mL）" value={d.preCa125} onChange={set("preCa125")} type="number" />
                <EditRow label="治疗后CA125" value={d.postCa125} onChange={set("postCa125")} type="number" />
                <EditRow label="治疗前CEA（ng/mL）" value={d.preCea} onChange={set("preCea")} type="number" />
                <EditRow label="治疗后CEA" value={d.postCea} onChange={set("postCea")} type="number" />
                <EditRow label="治疗前CA199（U/mL）" value={d.preCa199} onChange={set("preCa199")} type="number" />
                <EditRow label="治疗后CA199" value={d.postCa199} onChange={set("postCa199")} type="number" />
                <EditRow label="治疗前HbG（g/L）" value={d.preHemoglobin} onChange={set("preHemoglobin")} type="number" />
              </>
            )}
          </SectionCard>

          <SectionCard title="血液指标">
            {!editMode ? (
              <>
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
              </>
            ) : (
              <>
                <EditRow label="血小板计数（×10⁹/L）" value={d.plateletCount} onChange={set("plateletCount")} type="number" />
                <EditRow label="淋巴细胞计数（×10⁹/L）" value={d.lymphocyteCount} onChange={set("lymphocyteCount")} type="number" />
                <EditRow label="中性粒细胞（×10⁹/L）" value={d.neutrophilCount} onChange={set("neutrophilCount")} type="number" />
                <EditRow label="单核细胞（×10⁹/L）" value={d.monocyteCount} onChange={set("monocyteCount")} type="number" />
                <EditRow label="血清白蛋白（g/L）" value={d.serumAlbumin} onChange={set("serumAlbumin")} type="number" />
                <InfoRow label="PLR（自动计算）" value={patient.plr?.toFixed(2)} />
                <InfoRow label="LMR（自动计算）" value={patient.lmr?.toFixed(2)} />
                <InfoRow label="PNI（自动计算）" value={patient.pni?.toFixed(2)} />
                <InfoRow label="SII（自动计算）" value={patient.sii?.toFixed(2)} />
                <InfoRow label="PIV（自动计算）" value={patient.piv?.toFixed(2)} />
              </>
            )}
          </SectionCard>

          <SectionCard title="淋巴结转移">
            {!editMode ? (
              <>
                <InfoRow label="盆腔淋巴结" value={YesNo(patient.pelvicLymphNodeMetastasis)} />
                <InfoRow label="腹股沟区淋巴结" value={YesNo(patient.inguinalLymphNodeMetastasis)} />
                <InfoRow label="髂总动脉旁淋巴结" value={YesNo(patient.commonIliacLymphNodeMetastasis)} />
                <InfoRow label="腹主动脉旁淋巴结" value={YesNo(patient.paraAorticLymphNodeMetastasis)} />
                <InfoRow label="锁骨上淋巴结" value={YesNo(patient.supraclavicularLymphNodeMetastasis)} />
              </>
            ) : (
              <>
                <SelectRow label="盆腔淋巴结" value={d.pelvicLymphNodeMetastasis} onChange={set("pelvicLymphNodeMetastasis")} options={YN_OPTIONS} />
                <SelectRow label="腹股沟区淋巴结" value={d.inguinalLymphNodeMetastasis} onChange={set("inguinalLymphNodeMetastasis")} options={YN_OPTIONS} />
                <SelectRow label="髂总动脉旁淋巴结" value={d.commonIliacLymphNodeMetastasis} onChange={set("commonIliacLymphNodeMetastasis")} options={YN_OPTIONS} />
                <SelectRow label="腹主动脉旁淋巴结" value={d.paraAorticLymphNodeMetastasis} onChange={set("paraAorticLymphNodeMetastasis")} options={YN_OPTIONS} />
                <SelectRow label="锁骨上淋巴结" value={d.supraclavicularLymphNodeMetastasis} onChange={set("supraclavicularLymphNodeMetastasis")} options={YN_OPTIONS} />
              </>
            )}
          </SectionCard>

          <SectionCard title="治疗方案与结果">
            {!editMode ? (
              <>
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
              </>
            ) : (
              <>
                <EditRow label="放疗剂量（Gy）" value={d.radiationDose} onChange={set("radiationDose")} />
                <EditRow label="近距离照射剂量（Gy）" value={d.brachytherapyDose} onChange={set("brachytherapyDose")} />
                <EditRow label="同步化疗周期" value={d.concurrentChemoCycles} onChange={set("concurrentChemoCycles")} type="number" />
                <EditRow label="热疗" value={d.hyperthermia} onChange={set("hyperthermia")} placeholder="有/无" />
                <EditRow label="免疫治疗" value={d.immunotherapy} onChange={set("immunotherapy")} placeholder="有/无" />
                <EditRow label="总治疗时间（天）" value={d.totalTreatmentDays} onChange={set("totalTreatmentDays")} type="number" />
                <EditRow label="OS（月）" value={d.os} onChange={set("os")} placeholder="如 24" />
                <EditRow label="PFS（月）" value={d.pfs} onChange={set("pfs")} placeholder="如 18" />
                <SelectRow label="治疗结果评价" value={d.treatmentOutcome} onChange={set("treatmentOutcome")} options={OUTCOME_OPTIONS} />
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
