import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Layers } from "lucide-react";
import { Niivue, SLICE_TYPE } from "@niivue/niivue";

interface NiftiViewerProps {
  recordId: number;
  label: string;
  open: boolean;
  onClose: () => void;
}

export function NiftiViewer({ recordId, label, open, onClose }: NiftiViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      setHasMask(false);

      try {
        const res = await fetch(`/api/imaging/${recordId}/view-url`);
        if (!res.ok) throw new Error("无法获取文件链接");
        const { url, maskUrl } = await res.json();
        if (cancelled) return;

        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        if (cancelled || !canvasRef.current) return;

        if (nvRef.current) {
          try { nvRef.current.gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch {}
          nvRef.current = null;
        }

        const nv = new Niivue({
          backColor: [0.08, 0.08, 0.08, 1],
          crosshairColor: [0.1, 0.9, 0.9, 1],
          isColorbar: false,
          isOrientCube: false,
          multiplanarLayout: 0,
        });
        nvRef.current = nv;

        await nv.attachToCanvas(canvasRef.current);
        nv.setSliceType(SLICE_TYPE.MULTIPLANAR);

        const volumes = [{ url, colormap: "gray", opacity: 1 }];
        if (maskUrl) {
          volumes.push({ url: maskUrl, colormap: "red", opacity: 0.5 });
          setHasMask(true);
        }

        await nv.loadVolumes(volumes);
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [open, recordId]);

  useEffect(() => {
    if (!open && nvRef.current) {
      try { nvRef.current.gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch {}
      nvRef.current = null;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-2 flex flex-row items-center gap-3">
          <DialogTitle className="text-base font-semibold flex-1">
            影像查看 — {label}
          </DialogTitle>
          {hasMask && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-full">
              <Layers className="h-3 w-3" />
              含 Mask 叠加
            </span>
          )}
        </DialogHeader>

        <div className="relative bg-[#141414]" style={{ height: 520 }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-white/60">正在加载 NIfTI 文件…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-white/60">{error}</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: loading || error ? "none" : "block" }}
          />
        </div>

        <div className="px-5 py-2 text-xs text-muted-foreground border-t border-border bg-background flex items-center gap-4">
          <span>多平面视图（轴位 / 冠状 / 矢状）· 可拖动十字线定位切片</span>
          {hasMask && <span className="text-red-500">🔴 红色半透明区域为勾画 Mask</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
