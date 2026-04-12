import { useState, useCallback } from "react";
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
import { Plus, Play, ChevronLeft, ChevronRight, Grid3X3, BarChart2, Brain } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

export default function Radiomics() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
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
