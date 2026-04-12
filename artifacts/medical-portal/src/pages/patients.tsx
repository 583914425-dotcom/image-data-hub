import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useListPatients,
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
  useImportPatients,
  getListPatientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Upload, Trash2, Edit, ChevronLeft, ChevronRight, Download } from "lucide-react";

export default function Patients() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [figoFilter, setFigoFilter] = useState<string>("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(figoFilter ? { figoStage2018: figoFilter } : {}),
    ...(outcomeFilter ? { treatmentOutcome: outcomeFilter } : {}),
  };

  const { data, isLoading } = useListPatients(params);
  const deleteMutation = useDeletePatient();
  const createMutation = useCreatePatient();
  const importMutation = useImportPatients();

  const handleDelete = useCallback((id: number) => {
    if (!confirm("确定要删除该记录吗？")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey(params) });
          toast({ title: "删除成功" });
        },
      }
    );
  }, [deleteMutation, queryClient, params, toast]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const XLSX = await import("xlsx");
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    const parseNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "/" || v === "" || String(v).startsWith("＜")) return null;
      const n = parseFloat(String(v).trim());
      return isNaN(n) ? null : n;
    };

    const patients = rows.map((row: Record<string, unknown>) => ({
      caseNumber: String(row["病案号"] ?? ""),
      sequenceNumber: parseInt(String(row["序号"] ?? "0")),
      patientName: String(row["病人姓名"] ?? ""),
      contactInfo: row["联系方式"] ? String(row["联系方式"]) : null,
      age: parseInt(String(row["年龄"] ?? "0")),
      hypertension: parseInt(String(row["高血压"] ?? "0")),
      diabetes: parseInt(String(row["糖尿病"] ?? "0")),
      cardiovascular: parseInt(String(row["心血管疾病"] ?? "0")),
      otherComorbidities: parseInt(String(row["其他合并症"] ?? "0")),
      pregnancyHistory: row["孕产情况"] && row["孕产情况"] !== "/" ? String(row["孕产情况"]) : null,
      hpvStatus: row["HPV感染状态"] && row["HPV感染状态"] !== "/" ? String(row["HPV感染状态"]) : null,
      preTreatmentTumorSizeCategory: parseNum(row["治疗前肿瘤大小赋值"]) !== null ? parseInt(String(row["治疗前肿瘤大小赋值"])) : null,
      preTreatmentTumorSize: parseNum(row["治疗前肿瘤大小（cm)"]),
      postTreatmentTumorSize: parseNum(row["治疗后肿瘤大小(cm)"]),
      tumorSizeChange: parseNum(row["治疗前后肿瘤大小变化（cm）"]),
      preSccAg: parseNum(row["治疗前SCC-Ag（ng/ml）"]),
      postSccAg: parseNum(row["治疗后SCC-Ag（3个月）"]),
      preCa125: parseNum(row["治疗前CA125 （U/ml)"]),
      postCa125: parseNum(row["治疗后CA125 （U/ml)"]),
      preCea: parseNum(row["治疗前CEA（ng/ml）"]),
      postCea: parseNum(row["治疗后CEA（ng/ml）"]),
      preCa199: parseNum(row["治疗前CA199 （U/ml)"]),
      postCa199: parseNum(row["治疗后CA199 （U/ml)"]),
      plateletCount: parseNum(row["血小板计数（10^9/L）"]),
      lymphocyteCount: parseNum(row["淋巴细胞计数（10^9/L）"]),
      neutrophilCount: parseNum(row["中性粒细胞计数（10^9/L）"]),
      monocyteCount: parseNum(row["单核细胞计数（10^9/L）"]),
      serumAlbumin: parseNum(row["血清白蛋白（g/L）"]),
      plr: parseNum(row["PLR"]),
      lmr: parseNum(row["LMR"]),
      pni: parseNum(row["PNI"]),
      sii: parseNum(row["SII"]),
      piv: parseNum(row["PIV"]),
      preHemoglobin: parseNum(row["治疗前HbG（g/L）"]),
      figoStage2009: row["FIGO分期（2009）"] ? String(row["FIGO分期（2009）"]) : null,
      figoStage2018: row["FIGO分期（2018）"] ? String(row["FIGO分期（2018）"]) : null,
      pathologyType: row["病理类型"] && row["病理类型"] !== "/" ? String(row["病理类型"]) : null,
      differentiation: row["分化情况"] && row["分化情况"] !== "/" ? String(row["分化情况"]) : null,
      parametrialInvasion: row["宫旁浸润"] && row["宫旁浸润"] !== "/" ? String(row["宫旁浸润"]) : null,
      vaginalInvasion: row["阴道下段受侵"] && row["阴道下段受侵"] !== "/" ? String(row["阴道下段受侵"]) : null,
      pelvicLymphNodeMetastasis: parseInt(String(row["盆腔淋巴结转移"] ?? "0")),
      inguinalLymphNodeMetastasis: parseInt(String(row["腹股沟区淋巴结转移"] ?? "0")),
      commonIliacLymphNodeMetastasis: parseInt(String(row["髂总动脉旁淋巴结转移"] ?? "0")),
      paraAorticLymphNodeMetastasis: parseInt(String(row["腹主动脉旁淋巴结转移"] ?? "0")),
      supraclavicularLymphNodeMetastasis: parseInt(String(row["锁骨上淋巴结转移"] ?? "0")),
      radiationDose: row["放疗剂量（Gy）"] ? String(row["放疗剂量（Gy）"]) : null,
      brachytherapyDose: row["近距离照射剂量（Gy）"] ? String(row["近距离照射剂量（Gy）"]) : null,
      concurrentChemoCycles: parseNum(row["同步化疗周期"]) !== null ? parseInt(String(row["同步化疗周期"])) : null,
      hyperthermia: parseInt(String(row["热疗"] ?? "0")),
      immunotherapy: parseInt(String(row["免疫治疗"] ?? "0")),
      totalTreatmentDays: parseNum(row["总治疗时间（d)"]) !== null ? parseInt(String(row["总治疗时间（d)"])) : null,
      os: row["OS"] ? String(row["OS"]) : null,
      pfs: row["PFS"] ? String(row["PFS"]) : null,
      treatmentOutcome: parseNum(row["治疗结果评价"]) !== null ? parseInt(String(row["治疗结果评价"])) : null,
    }));

    importMutation.mutate(
      { data: { patients } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey(params) });
          toast({
            title: "导入完成",
            description: `成功导入 ${result.imported} 条，失败 ${result.failed} 条`,
          });
          setImportOpen(false);
        },
        onError: () => {
          toast({ title: "导入失败", variant: "destructive" });
        },
      }
    );
  }, [importMutation, queryClient, params, toast]);

  const handleExport = useCallback(async () => {
    if (!data?.patients?.length) return;
    const XLSX = await import("xlsx");
    const rows = data.patients.map((p) => ({
      序号: p.sequenceNumber,
      病案号: p.caseNumber,
      姓名: p.patientName,
      年龄: p.age,
      "FIGO分期(2018)": p.figoStage2018 ?? "",
      "FIGO分期(2009)": p.figoStage2009 ?? "",
      病理类型: p.pathologyType ?? "",
      治疗结果: p.treatmentOutcome ?? "",
      "治疗前肿瘤大小(cm)": p.preTreatmentTumorSize ?? "",
      "治疗后肿瘤大小(cm)": p.postTreatmentTumorSize ?? "",
      热疗: p.hyperthermia ?? "",
      免疫治疗: p.immunotherapy ?? "",
      OS: p.os ?? "",
      PFS: p.pfs ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "患者列表");
    XLSX.writeFile(wb, `患者列表_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`);
    toast({ title: "导出成功", description: `已导出 ${rows.length} 条当前页记录` });
  }, [data, toast]);


  return (
    <AppLayout>
      <div className="p-8 max-w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">数据管理</h1>
            <p className="text-muted-foreground mt-1">患者病例数据的查询、录入和管理</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!data?.patients?.length}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import">
                  <Upload className="h-4 w-4 mr-2" />
                  导入Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>导入Excel数据</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    请选择包含患者数据的Excel文件（.xlsx格式），文件将按照标准列名自动解析。
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFile}
                    disabled={importMutation.isPending}
                    data-testid="input-import-file"
                  />
                  {importMutation.isPending && (
                    <p className="text-sm text-muted-foreground">正在导入数据，请稍候...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索患者姓名..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={figoFilter} onValueChange={(v) => { setFigoFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[160px]" data-testid="select-figo">
                  <SelectValue placeholder="FIGO分期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分期</SelectItem>
                  <SelectItem value="IB3">IB3</SelectItem>
                  <SelectItem value="IIA1">IIA1</SelectItem>
                  <SelectItem value="IIA2">IIA2</SelectItem>
                  <SelectItem value="IIB">IIB</SelectItem>
                  <SelectItem value="IIIA">IIIA</SelectItem>
                  <SelectItem value="IIIB">IIIB</SelectItem>
                  <SelectItem value="IIIC1">IIIC1</SelectItem>
                  <SelectItem value="IIIC2">IIIC2</SelectItem>
                  <SelectItem value="IVA">IVA</SelectItem>
                  <SelectItem value="IV">IV</SelectItem>
                </SelectContent>
              </Select>
              <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-outcome">
                  <SelectValue placeholder="治疗结果" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部结果</SelectItem>
                  <SelectItem value="PR">PR（部分缓解）</SelectItem>
                  <SelectItem value="CR">CR（完全缓解）</SelectItem>
                  <SelectItem value="SD">SD（稳定）</SelectItem>
                  <SelectItem value="PD">PD（进展）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">序号</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">病案号</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">姓名</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">年龄</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">FIGO分期(2018)</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">病理类型</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">治疗前肿瘤(cm)</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">治疗后肿瘤(cm)</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">治疗结果</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.patients.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`row-patient-${p.id}`} onClick={() => navigate(`/patients/${p.id}`)}>
                          <td className="py-3 px-2">{p.sequenceNumber}</td>
                          <td className="py-3 px-2 font-mono text-xs">{p.caseNumber}</td>
                          <td className="py-3 px-2 font-medium">{p.patientName}</td>
                          <td className="py-3 px-2">{p.age}</td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                              {p.figoStage2018 ?? "-"}
                            </span>
                          </td>
                          <td className="py-3 px-2">{p.pathologyType ?? "-"}</td>
                          <td className="py-3 px-2">{p.preTreatmentTumorSize?.toFixed(1) ?? "-"}</td>
                          <td className="py-3 px-2">{p.postTreatmentTumorSize?.toFixed(1) ?? "-"}</td>
                          <td className="py-3 px-2">
                            {p.treatmentOutcome ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.treatmentOutcome === "CR" ? "bg-green-100 text-green-700" :
                                p.treatmentOutcome === "PR" ? "bg-blue-100 text-blue-700" :
                                p.treatmentOutcome === "SD" ? "bg-yellow-100 text-yellow-700" :
                                p.treatmentOutcome === "PD" ? "bg-red-100 text-red-700" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {p.treatmentOutcome}
                              </span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-3 px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                              className="h-8 w-8 p-0 text-destructive"
                              data-testid={`button-delete-${p.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
