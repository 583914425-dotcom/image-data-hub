import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/imaging/${recordId}/view-url`);
        if (!res.ok) throw new Error("无法获取文件链接");
        const { url } = await res.json();
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
        await nv.loadVolumes([{ url, colormap: "gray", opacity: 1 }]);

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
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
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-semibold">
            影像查看 — {label}
          </DialogTitle>
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

        <div className="px-5 py-2 text-xs text-muted-foreground border-t border-border bg-background">
          多平面视图（轴位 / 冠状 / 矢状） · 可拖动十字线定位切片
        </div>
      </DialogContent>
    </Dialog>
  );
}
