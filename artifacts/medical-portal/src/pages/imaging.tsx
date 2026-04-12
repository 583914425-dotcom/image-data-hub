import { useState, useCallback, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  Plus, Trash2, Image, ChevronLeft, ChevronRight,
  Search, Upload, CheckCircle2, Loader2, XCircle, FolderUp, AlertCircle, Eye, Download,
} from "lucide-react";
import { NiftiViewer } from "@/components/NiftiViewer";

const IMAGING_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

function formatRecordId(imagingYear?: number | null, imagingDeptId?: string | null, id?: number): string {
  if (imagingYear && imagingDeptId) return `${imagingYear}_${imagingDeptId}`;
  if (imagingDeptId) return imagingDeptId;
  return String(id ?? "");
}

function parseNiftiFilename(filename: string): { year: number; deptId: string; display: string } | null {
  const base = filename.replace(/\.nii\.gz$/, "").replace(/\.nii$/, "");
  const match = base.match(/^(\d{4})_([A-Za-z]*)(\d+)$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const display = `${match[2]}${match[3]}`;
  const deptId = match[3];
  return { year, deptId, display };
}

type FileStatus = "pending" | "uploading" | "done" | "error" | "unmatched";

interface BatchFile {
  file: File;
  parsed: { year: number; deptId: string; display: string } | null;
  recordId: number | null;
  status: FileStatus;
  progress: number;
  error?: string;
}

export default function Imaging() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patientId: "", modality: "MRI", bodyPart: "", studyDate: "", description: "", findings: "",
  });
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [maskUploadingId, setMaskUploadingId] = useState<number | null>(null);
  const [maskUploadProgress, setMaskUploadProgress] = useState<number>(0);
  const [viewingRecord, setViewingRecord] = useState<{ id: number; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskFileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);
  const maskUploadTargetRef = useRef<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    page, limit: 20,
    ...(search ? { patientName: search } : {}),
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
      { data: { patientId: parseInt(newRecord.patientId), modality: newRecord.modality, bodyPart: newRecord.bodyPart, studyDate: new Date(newRecord.studyDate).toISOString(), description: newRecord.description || null, findings: newRecord.findings || null, imageUrl: null } },
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
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
        toast({ title: "删除成功" });
      },
    });
  }, [deleteMutation, queryClient, params, toast]);

  const handleUploadClick = useCallback((id: number) => {
    uploadTargetRef.current = id;
    fileInputRef.current?.click();
  }, []);

  const handleMaskUploadClick = useCallback((id: number) => {
    maskUploadTargetRef.current = id;
    maskFileInputRef.current?.click();
  }, []);

  const handleExportImaging = useCallback(async () => {
    toast({ title: "正在导出...", description: "正在获取全部影像数据" });
    const resp = await fetch("/api/imaging/export");
    if (!resp.ok) { toast({ title: "导出失败", variant: "destructive" }); return; }
    const records = await resp.json();
    const XLSX = await import("xlsx");
    const rows = records.map((r: Record<string, unknown>) => ({
      影像编号: r.imagingDeptId ? `${r.imagingYear}_${r.imagingDeptId}` : r.id,
      患者姓名: r.patientName,
      检查方式: r.modality,
      检查部位: r.bodyPart,
      影像年份: r.imagingYear,
      "已上传NIfTI": r.hasNifti ? "是" : "否",
      "已上传Mask": r.hasMask ? "是" : "否",
      描述: r.description ?? "",
      所见: r.findings ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "影像列表");
    XLSX.writeFile(wb, `影像资料_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`);
    toast({ title: "导出成功", description: `已导出全部 ${rows.length} 条影像记录` });
  }, [toast]);

  const handleMaskFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const recordId = maskUploadTargetRef.current;
    if (!file || !recordId) return;
    e.target.value = "";
    if (!file.name.endsWith(".nii.gz") && !file.name.endsWith(".nii")) {
      toast({ title: "请选择 .nii.gz 或 .nii 格式文件", variant: "destructive" });
      return;
    }
    setMaskUploadingId(recordId);
    setMaskUploadProgress(0);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/gzip" }),
      });
      if (!urlRes.ok) throw new Error("获取上传地址失败");
      const { uploadURL, objectPath } = await urlRes.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setMaskUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上传失败 ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", "application/gzip");
        xhr.send(file);
      });
      await fetch(`/api/imaging/${recordId}/mask-url`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maskUrl: objectPath }) });
      queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
      toast({ title: "Mask 文件上传成功", description: file.name });
    } catch (err) {
      toast({ title: "上传失败", description: String(err), variant: "destructive" });
    } finally {
      setMaskUploadingId(null);
      setMaskUploadProgress(0);
      maskUploadTargetRef.current = null;
    }
  }, [queryClient, params, toast]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const recordId = uploadTargetRef.current;
    if (!file || !recordId) return;
    e.target.value = "";
    if (!file.name.endsWith(".nii.gz") && !file.name.endsWith(".nii")) {
      toast({ title: "请选择 .nii.gz 或 .nii 格式文件", variant: "destructive" });
      return;
    }
    setUploadingId(recordId);
    setUploadProgress(0);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/gzip" }),
      });
      if (!urlRes.ok) throw new Error("获取上传地址失败");
      const { uploadURL, objectPath } = await urlRes.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上传失败 ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", "application/gzip");
        xhr.send(file);
      });
      await fetch(`/api/imaging/${recordId}/image-url`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: objectPath }) });
      queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
      toast({ title: "NIfTI 文件上传成功", description: file.name });
    } catch (err) {
      toast({ title: "上传失败", description: String(err), variant: "destructive" });
    } finally {
      setUploadingId(null);
      setUploadProgress(0);
      uploadTargetRef.current = null;
    }
  }, [queryClient, params, toast]);

  const handleBatchFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const allRes = await fetch("/api/imaging?limit=300&page=1");
    const allData = await allRes.json();
    const recordMap = new Map<string, number>();
    for (const r of allData.records ?? []) {
      if (r.imagingYear && r.imagingDeptId) {
        recordMap.set(`${r.imagingYear}_${r.imagingDeptId}`, r.id);
      }
    }

    const items: BatchFile[] = files.map((file) => {
      const parsed = parseNiftiFilename(file.name);
      const key = parsed ? `${parsed.year}_${parsed.deptId}` : null;
      const recordId = key ? (recordMap.get(key) ?? null) : null;
      const status: FileStatus = parsed && recordId ? "pending" : "unmatched";
      return { file, parsed: parsed ? { year: parsed.year, deptId: parsed.deptId, display: parsed.display } : null, recordId, status, progress: 0 };
    });

    setBatchFiles(items);
  }, []);

  const uploadOneFile = useCallback(async (item: BatchFile, idx: number) => {
    setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, status: "uploading", progress: 0 } : f));
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.file.name, size: item.file.size, contentType: "application/gzip" }),
      });
      if (!urlRes.ok) throw new Error("获取上传地址失败");
      const { uploadURL, objectPath } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, progress: pct } : f));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", "application/gzip");
        xhr.send(item.file);
      });

      await fetch(`/api/imaging/${item.recordId}/image-url`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: objectPath }),
      });
      setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, status: "error", error: String(err) } : f));
    }
  }, []);

  const runBatchUpload = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);

    const pending = batchFiles
      .map((f, idx) => ({ f, idx }))
      .filter(({ f }) => f.status === "pending");

    const CONCURRENCY = 3;
    let cursor = 0;

    async function worker() {
      while (cursor < pending.length) {
        const { f, idx } = pending[cursor++];
        await uploadOneFile(f, idx);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setBatchRunning(false);
    queryClient.invalidateQueries({ queryKey: getListImagingRecordsQueryKey(params) });
    toast({ title: "批量上传完成 ✓", description: `已成功上传所有匹配文件` });
  }, [batchFiles, batchRunning, uploadOneFile, queryClient, params, toast]);

  const batchMatched = batchFiles.filter((f) => f.status === "pending" || f.status === "uploading" || f.status === "done" || f.status === "error").length;
  const batchDone = batchFiles.filter((f) => f.status === "done").length;
  const batchUnmatched = batchFiles.filter((f) => f.status === "unmatched").length;

  return (
    <AppLayout>
      <div className="p-8 max-w-full mx-auto space-y-6">
        <input ref={fileInputRef} type="file" accept=".nii.gz,.nii" className="hidden" onChange={handleFileSelected} />
        <input ref={maskFileInputRef} type="file" accept=".nii.gz,.nii" className="hidden" onChange={handleMaskFileSelected} />
        <input ref={batchInputRef} type="file" accept=".nii.gz,.nii" multiple className="hidden" onChange={handleBatchFilesSelected} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">影像资料</h1>
            <p className="text-muted-foreground mt-1">影像检查数据的管理与查看</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportImaging}>
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </Button>
            <Dialog open={batchOpen} onOpenChange={(v) => { setBatchOpen(v); if (!v && !batchRunning) { setBatchFiles([]); } }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderUp className="h-4 w-4 mr-2" />
                  批量上传 NIfTI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>批量上传 NIfTI 文件</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  {batchFiles.length === 0 ? (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => batchInputRef.current?.click()}
                    >
                      <FolderUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-lg font-medium">点击选择文件</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        支持多选，接受 <code className="bg-muted px-1 rounded">.nii.gz</code> 格式
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        文件名须为 <code className="bg-muted px-1 rounded">2019_101.nii.gz</code> 格式，系统自动匹配对应记录
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm">
                          <span className="text-foreground font-medium">共 {batchFiles.length} 个文件</span>
                          <span className="text-green-600">✓ 匹配 {batchMatched} 个</span>
                          {batchUnmatched > 0 && <span className="text-orange-500">⚠ 未匹配 {batchUnmatched} 个</span>}
                          {batchDone > 0 && <span className="text-primary">↑ 已上传 {batchDone} 个</span>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => { setBatchFiles([]); batchInputRef.current?.click(); }}
                          disabled={batchRunning}
                        >
                          重新选择
                        </Button>
                      </div>

                      {batchRunning && (
                        <Progress value={batchFiles.length > 0 ? (batchDone / batchMatched) * 100 : 0} className="h-2" />
                      )}

                      <div className="overflow-y-auto flex-1 space-y-1 rounded-md border border-border p-2 max-h-[340px]">
                        {batchFiles.map((f, i) => (
                          <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${f.status === "unmatched" ? "bg-orange-50 dark:bg-orange-950/20" : "bg-muted/40"}`}>
                            <div className="w-5 shrink-0">
                              {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {f.status === "uploading" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                              {f.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                              {f.status === "pending" && <Upload className="h-4 w-4 text-muted-foreground" />}
                              {f.status === "unmatched" && <AlertCircle className="h-4 w-4 text-orange-500" />}
                            </div>
                            <span className="font-mono text-xs flex-1 truncate">{f.file.name}</span>
                            {f.parsed && (
                              <span className="text-xs text-primary shrink-0">
                                {f.parsed.year}_{f.parsed.display}
                              </span>
                            )}
                            {f.status === "uploading" && (
                              <span className="text-xs text-primary shrink-0 w-10 text-right">{f.progress}%</span>
                            )}
                            {f.status === "unmatched" && (
                              <span className="text-xs text-orange-500 shrink-0">无匹配记录</span>
                            )}
                            {f.status === "error" && (
                              <span className="text-xs text-destructive shrink-0 max-w-[120px] truncate">{f.error}</span>
                            )}
                            {f.status === "done" && (
                              <span className="text-xs text-green-600 shrink-0">完成</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={runBatchUpload}
                          disabled={batchRunning || batchMatched === 0 || batchDone === batchMatched}
                        >
                          {batchRunning ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />上传中 {batchDone}/{batchMatched}（3 并行）</>
                          ) : batchDone === batchMatched && batchMatched > 0 ? (
                            <><CheckCircle2 className="h-4 w-4 mr-2" />全部上传完成</>
                          ) : (
                            <><Upload className="h-4 w-4 mr-2" />开始上传 {batchMatched} 个文件</>
                          )}
                        </Button>
                        {batchRunning && (
                          <Button variant="outline" onClick={() => setBatchOpen(false)} title="最小化到后台，上传继续进行">
                            最小化
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-imaging">
                  <Plus className="h-4 w-4 mr-2" />
                  新增影像记录
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>新增影像记录</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>患者ID</Label>
                    <Input type="number" value={newRecord.patientId} onChange={(e) => setNewRecord({ ...newRecord, patientId: e.target.value })} placeholder="输入患者ID" />
                  </div>
                  <div className="space-y-2">
                    <Label>检查方式</Label>
                    <Select value={newRecord.modality} onValueChange={(v) => setNewRecord({ ...newRecord, modality: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input value={newRecord.bodyPart} onChange={(e) => setNewRecord({ ...newRecord, bodyPart: e.target.value })} placeholder="如：宫颈、盆腔" />
                  </div>
                  <div className="space-y-2">
                    <Label>检查日期</Label>
                    <Input type="date" value={newRecord.studyDate} onChange={(e) => setNewRecord({ ...newRecord, studyDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>检查描述</Label>
                    <Textarea value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} placeholder="检查序列/方案描述" />
                  </div>
                  <div className="space-y-2">
                    <Label>检查发现</Label>
                    <Textarea value={newRecord.findings} onChange={(e) => setNewRecord({ ...newRecord, findings: e.target.value })} placeholder="影像所见" />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索患者姓名..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={modalityFilter || "all"} onValueChange={(v) => { setModalityFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="检查方式" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方式</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="PET-CT">PET-CT</SelectItem>
                  <SelectItem value="Ultrasound">超声</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter ? String(yearFilter) : "all"} onValueChange={(v) => { setYearFilter(v === "all" ? undefined : parseInt(v)); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="影像年份" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年份</SelectItem>
                  {IMAGING_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y} 年</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="ml-auto text-sm text-muted-foreground">{data ? `共 ${data.total} 条记录` : ""}</p>
            </div>
          </div>
          <CardContent className="pt-0 px-0">
            {isLoading ? (
              <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : data?.records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无影像记录</p>
                <p className="text-sm mt-1">{yearFilter || modalityFilter || search ? "请尝试调整筛选条件" : '点击「新增影像记录」开始添加'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">影像编号</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">患者姓名</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查方式</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查部位</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">影像年份</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">检查日期</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">NIfTI 文件</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Mask 勾画</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.records.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-xs font-medium text-primary">
                            {formatRecordId(r.imagingYear, r.imagingDeptId, r.id)}
                          </td>
                          <td className="py-3 px-3 font-medium">{r.patientName}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">{r.modality}</span>
                          </td>
                          <td className="py-3 px-3">{r.bodyPart}</td>
                          <td className="py-3 px-3">
                            {r.imagingYear ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">{r.imagingYear}</span>
                            ) : "-"}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {(() => {
                              const d = new Date(r.studyDate);
                              const isPlaceholder = d.getMonth() === 0 && d.getDate() === 1;
                              if (isPlaceholder && r.imagingYear) return `${r.imagingYear} 年`;
                              return d.toLocaleDateString("zh-CN");
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {r.imageUrl ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" />已上传
                                </span>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => setViewingRecord({ id: r.id, label: formatRecordId(r.imagingYear, r.imagingDeptId, r.id) })}
                                  className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />查看
                                </Button>
                              </div>
                            ) : uploadingId === r.id ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />{uploadProgress}%
                              </span>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleUploadClick(r.id)} className="h-7 px-2 text-xs text-muted-foreground hover:text-primary">
                                <Upload className="h-3.5 w-3.5 mr-1" />上传
                              </Button>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {r.maskUrl ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />已上传
                              </span>
                            ) : maskUploadingId === r.id ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />{maskUploadProgress}%
                              </span>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleMaskUploadClick(r.id)} className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500">
                                <Upload className="h-3.5 w-3.5 mr-1" />上传
                              </Button>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="h-8 w-8 p-0 text-destructive">
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
                    <p className="text-sm text-muted-foreground">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {batchRunning && !batchOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-background border border-border shadow-lg rounded-xl px-4 py-3 cursor-pointer hover:border-primary transition-colors"
          onClick={() => setBatchOpen(true)}
        >
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <div className="min-w-[160px]">
            <p className="text-sm font-medium leading-tight">后台上传中…</p>
            <p className="text-xs text-muted-foreground mt-0.5">{batchDone} / {batchMatched} 个文件完成</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${batchMatched > 0 ? (batchDone / batchMatched) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-primary font-medium shrink-0">展开</span>
        </div>
      )}

      {!batchRunning && batchDone > 0 && !batchOpen && batchFiles.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-background border border-green-500/40 shadow-lg rounded-xl px-4 py-3 cursor-pointer hover:border-green-500 transition-colors"
          onClick={() => { setBatchFiles([]); }}
        >
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700 leading-tight">上传完成</p>
            <p className="text-xs text-muted-foreground mt-0.5">共 {batchDone} 个文件 · 点击关闭</p>
          </div>
        </div>
      )}

      {viewingRecord && (
        <NiftiViewer
          recordId={viewingRecord.id}
          label={viewingRecord.label}
          open={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      )}
    </AppLayout>
  );
}
