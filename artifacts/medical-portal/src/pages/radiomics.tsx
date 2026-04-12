import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useListRadiomicsFeatures,
  useCreateRadiomicsFeature,
  useRunRadiomicsAnalysis,
  useGetRadiomicsCorrelation,
  getListRadiomicsFeaturesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, ChevronLeft, ChevronRight, Grid3X3, BarChart2, Brain, Upload, FileText, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface ParsedFeature {
  imagingCode: string;
  imagingId: number | null;
  patientId: number | null;
  featureClass: string;
  featureName: string;
  featureValue: number;
}

function parseFeatureColumn(colName: string): { featureClass: string; featureName: string } | null {
  const m = colName.match(/^original_([a-zA-Z0-9]+)_(.+)$/);
  if (!m) return null;
  const classMap: Record<string, string> = {
    shape: "Shape",
    shape2d: "Shape",
    firstorder: "FirstOrder",
    glcm: "GLCM",
    glrlm: "GLRLM",
    glszm: "GLSZM",
    gldm: "GLDM",
    ngtdm: "NGTDM",
  };
  const featureClass = classMap[m[1].toLowerCase()] ?? m[1];
  return { featureClass, featureName: m[2] };
}

function extractCodeFromPath(p: string): string {
  const name = p.split("/").pop() ?? p;
  return name.replace(/\.nii\.gz$/i, "").replace(/\.nii$/i, "");
}

async function parseCsv(text: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

export default function Radiomics() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvParsed, setCsvParsed] = useState<ParsedFeature[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [analysisType, setAnalysisType] = useState<string>("correlation");
  const [newFeature, setNewFeature] = useState({
    patientId: "",
    featureClass: "Shape",
    featureName: "",
    featureValue: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = { page, limit: 20 };
  const { data, isLoading } = useListRadiomicsFeatures(params);
  const { data: correlation } = useGetRadiomicsCorrelation();
  const createMutation = useCreateRadiomicsFeature();
  const analysisMutation = useRunRadiomicsAnalysis();

  const handleCsvFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const text = await file.text();
    const { headers, rows } = await parseCsv(text);

    const allImaging: Array<{
      id: number; patientId: number; imagingYear: number | null; imagingDeptId: string | null;
    }> = await fetch("/api/imaging/export").then((r) => r.json());

    const codeToRecord = new Map<string, { id: number; patientId: number }>();
    for (const rec of allImaging) {
      if (rec.imagingYear && rec.imagingDeptId) {
        codeToRecord.set(`${rec.imagingYear}_${rec.imagingDeptId}`, { id: rec.id, patientId: rec.patientId });
      }
    }

    const imageCol = headers.find((h) => h.toLowerCase() === "image" || h.toLowerCase() === "image path");
    const codeCol = headers.find((h) => ["编号", "imaging_code", "imaging_dept_id", "code"].includes(h.toLowerCase()));
    const featureCols = headers.filter((h) => h.startsWith("original_"));

    const features: ParsedFeature[] = [];
    for (const row of rows) {
      let code = "";
      if (imageCol && row[imageCol]) {
        code = extractCodeFromPath(row[imageCol]);
      } else if (codeCol && row[codeCol]) {
        code = row[codeCol];
      }
      if (!code) continue;
      const match = codeToRecord.get(code);
      for (const col of featureCols) {
        const parsed = parseFeatureColumn(col);
        if (!parsed) continue;
        const val = parseFloat(row[col]);
        if (isNaN(val)) continue;
        features.push({
          imagingCode: code,
          imagingId: match?.id ?? null,
          patientId: match?.patientId ?? null,
          featureClass: parsed.featureClass,
          featureName: parsed.featureName,
          featureValue: val,
        });
      }
    }
    setCsvParsed(features);
    e.target.value = "";
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (csvParsed.length === 0) return;
    const matched = csvParsed.filter((f) => f.patientId !== null);
    if (matched.length === 0) {
      toast({ title: "无法匹配", description: "没有找到匹配的影像记录，请检查影像编号格式", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const resp = await fetch("/api/radiomics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: matched.map((f) => ({
            imagingId: f.imagingId,
            patientId: f.patientId,
            featureClass: f.featureClass,
            featureName: f.featureName,
            featureValue: f.featureValue,
          })),
        }),
      });
      if (!resp.ok) throw new Error("Import failed");
      const result = await resp.json();
      queryClient.invalidateQueries({ queryKey: getListRadiomicsFeaturesQueryKey({ page: 1, limit: 20 }) });
      toast({ title: "导入成功", description: `已导入 ${result.inserted} 个特征值` });
      setImportOpen(false);
      setCsvParsed([]);
      setCsvFileName("");
    } catch {
      toast({ title: "导入失败", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }, [csvParsed, queryClient, toast]);

  const handleCreate = useCallback(() => {
    if (!newFeature.patientId || !newFeature.featureName || !newFeature.featureValue) {
      toast({ title: "请填写必要字段", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          patientId: parseInt(newFeature.patientId),
          featureClass: newFeature.featureClass,
          featureName: newFeature.featureName,
          featureValue: parseFloat(newFeature.featureValue),
          imagingId: null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRadiomicsFeaturesQueryKey(params) });
          toast({ title: "特征创建成功" });
          setAddOpen(false);
          setNewFeature({ patientId: "", featureClass: "Shape", featureName: "", featureValue: "" });
        },
      }
    );
  }, [newFeature, createMutation, queryClient, params, toast]);

  const handleRunAnalysis = useCallback(() => {
    analysisMutation.mutate(
      {
        data: {
          analysisType: analysisType as "correlation" | "pca" | "clustering" | "feature_importance",
        },
      },
      {
        onSuccess: (result) => {
          toast({ title: "分析完成", description: result.summary });
        },
      }
    );
  }, [analysisType, analysisMutation, toast]);

  return (
    <AppLayout>
      <div className="p-8 max-w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">影像组学</h1>
            <p className="text-muted-foreground mt-1">影像组学特征提取与分析</p>
          </div>
          <div className="flex gap-2">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setCsvParsed([]); setCsvFileName(""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                批量导入 CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>批量导入影像组学特征</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {csvParsed.length === 0 ? (
                  <div>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium">点击选择 CSV 文件</p>
                      <p className="text-sm text-muted-foreground mt-1">支持 PyRadiomics 批量输出格式</p>
                    </div>
                    <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">CSV 格式说明</p>
                      <p>• PyRadiomics 输出格式：含 <code>Image</code> 列（文件路径）和 <code>original_*</code> 列</p>
                      <p>• 或自定义格式：含 <code>imaging_code</code> 列（如 2019_101）和 <code>original_*</code> 列</p>
                      <p>• 特征列命名规则：<code>{"original_{shape|firstorder|glcm|…}_{featureName}"}</code></p>
                      <p>• 影像编号与数据库中已有的影像记录自动匹配（{"year_deptId"} 格式，如 2019_101）</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{csvFileName}</p>
                        <p className="text-sm text-muted-foreground">
                          共解析 {csvParsed.length} 个特征值，其中{" "}
                          <span className="text-green-600 font-medium">{csvParsed.filter((f) => f.imagingId !== null).length}</span>{" "}
                          个已匹配到影像记录
                          {csvParsed.some((f) => f.imagingId === null) && (
                            <span className="text-amber-600">
                              ，{csvParsed.filter((f) => f.imagingId === null).length} 个未匹配
                            </span>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setCsvParsed([]); setCsvFileName(""); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto border border-border rounded-md">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium">影像编号</th>
                            <th className="text-left py-2 px-3 font-medium">特征类别</th>
                            <th className="text-left py-2 px-3 font-medium">特征名称</th>
                            <th className="text-right py-2 px-3 font-medium">特征值</th>
                            <th className="text-center py-2 px-3 font-medium">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvParsed.slice(0, 100).map((f, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1.5 px-3 font-mono">{f.imagingCode}</td>
                              <td className="py-1.5 px-3">{f.featureClass}</td>
                              <td className="py-1.5 px-3 max-w-[150px] truncate">{f.featureName}</td>
                              <td className="py-1.5 px-3 text-right font-mono">{f.featureValue.toFixed(4)}</td>
                              <td className="py-1.5 px-3 text-center">
                                {f.imagingId !== null ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-amber-500">?</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {csvParsed.length > 100 && (
                            <tr><td colSpan={5} className="py-2 px-3 text-center text-muted-foreground">... 仅显示前100条预览</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Button onClick={handleImportConfirm} disabled={importing} className="w-full">
                      {importing ? "导入中..." : `确认导入 ${csvParsed.filter((f) => f.imagingId !== null).length} 个特征值`}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-feature">
                <Plus className="h-4 w-4 mr-2" />
                新增特征
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新增影像组学特征</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>患者ID</Label>
                  <Input
                    type="number"
                    value={newFeature.patientId}
                    onChange={(e) => setNewFeature({ ...newFeature, patientId: e.target.value })}
                    data-testid="input-radiomics-patient-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>特征类别</Label>
                  <Select value={newFeature.featureClass} onValueChange={(v) => setNewFeature({ ...newFeature, featureClass: v })}>
                    <SelectTrigger data-testid="select-feature-class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Shape">Shape (形态学特征)</SelectItem>
                      <SelectItem value="FirstOrder">FirstOrder (一阶统计特征)</SelectItem>
                      <SelectItem value="GLCM">GLCM (灰度共生矩阵)</SelectItem>
                      <SelectItem value="GLRLM">GLRLM (灰度游程矩阵)</SelectItem>
                      <SelectItem value="GLSZM">GLSZM (灰度区域大小矩阵)</SelectItem>
                      <SelectItem value="GLDM">GLDM (灰度依赖矩阵)</SelectItem>
                      <SelectItem value="NGTDM">NGTDM (邻域灰度差分矩阵)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>特征名称</Label>
                  <Input
                    value={newFeature.featureName}
                    onChange={(e) => setNewFeature({ ...newFeature, featureName: e.target.value })}
                    placeholder="如：Sphericity, Elongation"
                    data-testid="input-feature-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>特征值</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={newFeature.featureValue}
                    onChange={(e) => setNewFeature({ ...newFeature, featureValue: e.target.value })}
                    data-testid="input-feature-value"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending} data-testid="button-submit-feature">
                  {createMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="features" className="space-y-6">
          <TabsList>
            <TabsTrigger value="features" className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              特征数据
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <Brain className="h-4 w-4" />
              分析工具
            </TabsTrigger>
            <TabsTrigger value="correlation" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              相关性矩阵
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : data?.features.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">暂无影像组学特征</p>
                    <p className="text-sm mt-1">点击"新增特征"开始添加</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">患者姓名</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">特征类别</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">特征名称</th>
                            <th className="text-right py-3 px-2 font-medium text-muted-foreground">特征值</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">创建时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.features.map((f) => (
                            <tr key={f.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors" data-testid={`row-feature-${f.id}`}>
                              <td className="py-3 px-2">{f.id}</td>
                              <td className="py-3 px-2 font-medium">{f.patientName}</td>
                              <td className="py-3 px-2">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
                                  {f.featureClass}
                                </span>
                              </td>
                              <td className="py-3 px-2">{f.featureName}</td>
                              <td className="py-3 px-2 text-right font-mono">{f.featureValue.toFixed(4)}</td>
                              <td className="py-3 px-2 text-muted-foreground">{new Date(f.createdAt).toLocaleDateString("zh-CN")}</td>
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
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">运行分析</CardTitle>
                  <CardDescription>选择分析类型对影像组学特征进行分析</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>分析类型</Label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger data-testid="select-analysis-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correlation">相关性分析</SelectItem>
                        <SelectItem value="pca">主成分分析 (PCA)</SelectItem>
                        <SelectItem value="clustering">聚类分析</SelectItem>
                        <SelectItem value="feature_importance">特征重要性</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={analysisMutation.isPending}
                    className="w-full"
                    data-testid="button-run-analysis"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {analysisMutation.isPending ? "分析中..." : "运行分析"}
                  </Button>
                </CardContent>
              </Card>

              {analysisMutation.data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">分析结果</CardTitle>
                    <CardDescription>{analysisMutation.data.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analysisMutation.data.results.map((r) => ({
                        name: r.label.length > 15 ? r.label.substring(0, 15) + "..." : r.label,
                        value: r.values[0] ?? 0,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(185, 81%, 29%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="correlation">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">特征相关性矩阵</CardTitle>
                <CardDescription>影像组学特征间的Pearson相关系数</CardDescription>
              </CardHeader>
              <CardContent>
                {correlation && correlation.features.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-medium text-muted-foreground sticky left-0 bg-card"></th>
                          {correlation.features.map((f) => (
                            <th key={f} className="p-2 text-center font-medium text-muted-foreground min-w-[60px]" style={{ writingMode: "vertical-rl" }}>
                              {f}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correlation.features.map((f, i) => (
                          <tr key={f}>
                            <td className="p-2 font-medium text-muted-foreground sticky left-0 bg-card whitespace-nowrap">{f}</td>
                            {correlation.matrix[i]?.map((val, j) => {
                              const abs = Math.abs(val);
                              const hue = val >= 0 ? 185 : 0;
                              const lightness = 95 - abs * 40;
                              return (
                                <td
                                  key={j}
                                  className="p-2 text-center"
                                  style={{ backgroundColor: `hsl(${hue}, 70%, ${lightness}%)` }}
                                >
                                  {val.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">暂无相关性数据</p>
                    <p className="text-sm mt-1">请先添加足够的影像组学特征数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
