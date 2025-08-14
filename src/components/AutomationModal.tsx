import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../state/store';

export function AutomationModal() {
    const keyframeClipId = useStore(s => s.keyframeClipId);
    const tracks = useStore(s => s.tracks);
    const close = useStore(s => s.closeKeyframe);
    const updateClip = useStore(s => s.updateClip);
    const overlayRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const clip = tracks.flatMap(t => t.clips).find(c => c.id === keyframeClipId);
    const points = (clip?.automation?.length ? clip.automation : clip ? [{ t: 0, v: 1 }, { t: clip.duration, v: 1 }] : []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current; if (!canvas || !clip) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const w = canvas.width = canvas.clientWidth;
        const h = canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        for (let i = 0; i <= 10; i++) { const y = (i / 10) * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        const pts = points;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--hi') || '#3b82f6';
        ctx.lineWidth = 2; ctx.beginPath();
        pts.forEach((p, i) => { const x = (p.t / clip.duration) * w; const y = (1 - p.v) * h; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        pts.forEach((p) => { const x = (p.t / clip.duration) * w, y = (1 - p.v) * h; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
    }, [clip, points]);

    useEffect(() => { draw(); }, [draw]);

    const applyPoints = (pts: { t: number; v: number }[]) => { if (clip) updateClip(clip.id, { automation: pts }); };

    const getIndexHit = (x: number, y: number) => {
        if (!clip) return -1;
        const w = canvasRef.current!.clientWidth; const h = canvasRef.current!.clientHeight;
        for (let i = 0; i < points.length; i++) {
            const px = (points[i].t / clip.duration) * w; const py = (1 - points[i].v) * h;
            const dx = x - px; const dy = y - py; if (dx * dx + dy * dy <= 12 * 12) return i;
        }
        return -1;
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (!clip) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const idx = getIndexHit(x, y);
        if (idx >= 0) {
            setDragIdx(idx);
        } else {
            const t = Math.max(0, Math.min(clip.duration, (x / rect.width) * clip.duration));
            const v = Math.max(0, Math.min(1, 1 - (y / rect.height)));
            const pts = [...points, { t, v }].sort((a, b) => a.t - b.t);
            applyPoints(pts);
        }
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (dragIdx == null || !clip) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        let t = Math.max(0, Math.min(clip.duration, (x / rect.width) * clip.duration));
        let v = Math.max(0, Math.min(1, 1 - (y / rect.height)));
        const pts = points.slice();
        // endpoints: only vertical movement
        if (dragIdx === 0) { t = 0; }
        if (dragIdx === pts.length - 1) { t = clip.duration; }
        pts[dragIdx] = { t, v };
        pts.sort((a, b) => a.t - b.t);
        applyPoints(pts);
    };

    const onMouseUp = () => setDragIdx(null);

    if (!clip) return null;

    const reset = () => applyPoints([{ t: 0, v: 1 }, { t: clip.duration, v: 1 }]);

    return (
        <div ref={overlayRef} className={`fixed inset-0 ${keyframeClipId ? '' : 'hidden'}`} style={{ background: 'rgba(0,0,0,.6)', zIndex: 9998 }} onMouseDown={(e) => { if (e.target === overlayRef.current) close(); }}>
            <div className="absolute left-0 right-0" style={{ top: 60, height: '75vh', pointerEvents: 'auto' }}>
                <div className="relative mx-6 rounded-xl border" style={{ background: 'var(--panel2)', borderColor: 'var(--border)', height: '100%' }}>
                    <div className="absolute inset-0" style={{ padding: 12 }}>
                        <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{ width: '100%', height: '100%', borderRadius: 10, background: 'var(--panel3)', padding: 10, boxSizing: 'border-box' }} />
                    </div>
                    <div className="absolute right-3 top-3 flex gap-2">
                        <button className="btn" onClick={reset}>Reset</button>
                        <button className="btn" onClick={close}>Done</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
