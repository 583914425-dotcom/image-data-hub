import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useListImagingRecords,
  useCreateImagingRecord,
  useDeleteImagingRecord,
  getListImagingRecordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Image, ChevronLeft, ChevronRight } from "lucide-react";

const IMAGING_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

export default function Imaging() {
  const [page, setPage] = useState(1);
  const [modalityFilter, setModalityFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patientId: "",
    modality: "MRI",
    bodyPart: "",
    studyDate: "",
    description: "",
    findings: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    page,
    limit: 20,
    ...(modalityFilter ? { modality: modalityFilter } : {}),
    ...(yearFilter ? { imagingYear: yearFilter } : {}),
  };

  const { data, isLoading } = useListImagingRecords(params);
  const createMutation = useCreateImagingRecord();
  const deleteMutation = useDeleteImagingRecord();

  const handleCreate = useCallback(() => {
    if (!newRecord.patientId || !newRecord.bodyPart || !newRecord.studyDate) {
      toast({ title: "请填写必要字段", variant: "destructive" });
      return;
    }

    createMutation.mutate(
      {
        data: {
          patientId: parseInt(newRecord.patientId),
          modality: newRecord.modality,
          bodyPart: newRecord.bodyPart,
          studyDate: new Date(newRecord.studyDate).toISOString(),
          description: newRecord.description || null,
          findings: newRecord.findings || null,
          imageUrl: null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
          toast({ title: "影像记录创建成功" });
          setAddOpen(false);
          setNewRecord({ patientId: "", modality: "MRI", bodyPart: "", studyDate: "", description: "", findings: "" });
        },
      }
    );
  }, [newRecord, createMutation, queryClient, params, toast]);

  const handleDelete = useCallback((id: number) => {
    if (!confirm("确定删除该影像记录？")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
          toast({ title: "删除成功" });
        },
      }
    );
  }, [deleteMutation, queryClient, params, toast]);

  return (
    <AppLayout>
      <div className="p-8 max-w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">影像资料</h1>
            <p className="text-muted-foreground mt-1">影像检查数据的管理与查看</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-imaging">
                <Plus className="h-4 w-4 mr-2" />
                新增影像记录
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新增影像记录</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>患者ID</Label>
                  <Input
                    type="number"
                    value={newRecord.patientId}
                    onChange={(e) => setNewRecord({ ...newRecord, patientId: e.target.value })}
                    placeholder="输入患者ID"
                    data-testid="input-patient-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检查方式</Label>
                  <Select value={newRecord.modality} onValueChange={(v) => setNewRecord({ ...newRecord, modality: v })}>
                    <SelectTrigger data-testid="select-modality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="CT">CT</SelectItem>
                      <SelectItem value="PET-CT">PET-CT</SelectItem>
                      <SelectItem value="Ultrasound">超声</SelectItem>
                      <SelectItem value="X-Ray">X线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>检查部位</Label>
                  <Input
                    value={newRecord.bodyPart}
                    onChange={(e) => setNewRecord({ ...newRecord, bodyPart: e.target.value })}
                    placeholder="如：宫颈、盆腔"
                    data-testid="input-body-part"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检查日期</Label>
                  <Input
                    type="date"
                    value={newRecord.studyDate}
                    onChange={(e) => setNewRecord({ ...newRecord, studyDate: e.target.value })}
                    data-testid="input-study-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检查描述</Label>
                  <Textarea
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder="检查序列/方案描述"
                    data-testid="input-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检查发现</Label>
                  <Textarea
                    value={newRecord.findings}
                    onChange={(e) => setNewRecord({ ...newRecord, findings: e.target.value })}
                    placeholder="影像所见"
                    data-testid="input-findings"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending} data-testid="button-submit-imaging">
                  {createMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={modalityFilter || "all"} onValueChange={(v) => { setModalityFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-modality-filter">
                  <SelectValue placeholder="检查方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方式</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="PET-CT">PET-CT</SelectItem>
                  <SelectItem value="Ultrasound">超声</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={yearFilter ? String(yearFilter) : "all"}
                onValueChange={(v) => { setYearFilter(v === "all" ? undefined : parseInt(v)); setPage(1); }}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-year-filter">
                  <SelectValue placeholder="影像年份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年份</SelectItem>
                  {IMAGING_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y} 年</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="ml-auto text-sm text-muted-foreground">
                {data ? `共 ${data.total} 条记录` : ""}
              </p>
            </div>
          </div>
          <CardContent className="pt-0 px-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : data?.records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无影像记录</p>
                <p className="text-sm mt-1">
                  {yearFilter || modalityFilter ? "请尝试调整筛选条件" : '点击「新增影像记录」开始添加'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">患者姓名</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查方式</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查部位</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">影像年份</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查日期</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">描述</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">发现</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.records.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors" data-testid={`row-imaging-${r.id}`}>
                          <td className="py-3 px-3 text-muted-foreground">{r.id}</td>
                          <td className="py-3 px-3 font-medium">{r.patientName}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                              {r.modality}
                            </span>
                          </td>
                          <td className="py-3 px-3">{r.bodyPart}</td>
                          <td className="py-3 px-3">
                            {r.imagingYear ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
                                {r.imagingYear}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{new Date(r.studyDate).toLocaleDateString("zh-CN")}</td>
                          <td className="py-3 px-3 max-w-[180px] truncate">{r.description ?? "-"}</td>
                          <td className="py-3 px-3 max-w-[180px] truncate">{r.findings ?? "-"}</td>
                          <td className="py-3 px-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(r.id)}
                              className="h-8 w-8 p-0 text-destructive"
                              data-testid={`button-delete-imaging-${r.id}`}
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
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      共 {data.total} 条，第 {data.page}/{data.totalPages} 页
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
      </div>
    </AppLayout>
  );
}
