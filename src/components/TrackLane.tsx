import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { drawWaveform, computePeaks } from "../audio/waveform";
import { ensureAudioContext } from "../audio/context";

let openCtxMenu: HTMLDivElement | null = null;

export function TrackLane() {
    const tracks = useStore(s => s.tracks);
    const pps = useStore(s => s.transport.pxPerSecond);
    const time = useStore(s => s.transport.time);
    const duration = useStore(s => s.duration ?? 60);
    const addTrack = useStore(s => s.addTrack);
    // const pasteAt = useStore(s => s.pasteAt);
    const keyframeClipId = useStore(s => s.keyframeClipId);
    const closeKeyframe = useStore(s => s.closeKeyframe);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current; if (!el) return;
        const canvases = el.querySelectorAll<HTMLCanvasElement>('canvas[data-peaks]');
        canvases.forEach((c) => {
            const json = c.dataset.peaks; if (!json) return;
            const peaks = JSON.parse(json) as number[];
            drawWaveform(c, peaks);
        });
    }, [tracks, pps]);

    // ensure expanded editor is fully visible with some padding
    useEffect(() => {
        if (!keyframeClipId || !containerRef.current) return;
        const host = containerRef.current;
        const clipEl = host.querySelector(`.clip[data-clip-id="${keyframeClipId}"]`) as HTMLElement | null;
        if (!clipEl) return;
        const hostRect = host.getBoundingClientRect();
        const clipRect = clipEl.getBoundingClientRect();
        const topOffset = 24; // some breathing room
        if (clipRect.top < hostRect.top + topOffset || clipRect.bottom > hostRect.bottom - topOffset) {
            const scrollDelta = (clipRect.top - hostRect.top) - topOffset;
            host.scrollBy({ top: scrollDelta, behavior: 'smooth' });
        }
    }, [keyframeClipId]);

    const editingTrackIndex = useMemo(() => {
        if (!keyframeClipId) return -1;
        return tracks.findIndex(t => t.clips.some(c => c.id === keyframeClipId));
    }, [keyframeClipId, tracks]);

    const overlaps = useMemo(() => {
        const arr: { left: number; width: number; top: number }[] = [];
        tracks.forEach((t, idx) => {
            const clips = [...t.clips].sort((a, b) => a.start - b.start);
            for (let i = 0; i < clips.length - 1; i++) {
                const a = clips[i];
                const b = clips[i + 1];
                const aEnd = a.start + a.duration;
                if (b.start < aEnd) {
                    const left = b.start * pps;
                    const width = (aEnd - b.start) * pps;
                    arr.push({ left, width, top: idx * 96 + 26 });
                }
            }
        });
        return arr;
    }, [tracks, pps]);

    const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        const audioFiles = files.filter(f => (f.type && f.type.startsWith('audio/')) || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm)$/i.test(f.name || ''));
        if (audioFiles.length === 0) { useStore.getState().toast('No audio files detected', true); return; }
        const host = e.currentTarget as HTMLDivElement;
        const rect = host.getBoundingClientRect();
        const x = e.clientX - rect.left + host.scrollLeft;
        const at = x / pps;
        const y = e.clientY - rect.top + host.scrollTop;
        let trackIdx = Math.floor(y / 96);
        while (trackIdx >= useStore.getState().tracks.length) { addTrack(); }
        const ctx = ensureAudioContext();
        for (let i = 0; i < audioFiles.length; i++) {
            const f = audioFiles[i];
            const buf = await f.arrayBuffer();
            let audio: AudioBuffer | null = null;
            try { audio = await ctx.decodeAudioData(buf.slice(0)); } catch (err) { audio = null; }
            if (!audio) { useStore.getState().toast(`Could not decode ${f.name}`, true); continue; }
            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const buckets = Math.max(100, Math.floor(audio.duration * pps));
            const peaks = await computePeaks(audio, buckets);
            const targetIndex = Math.min(trackIdx + i, useStore.getState().tracks.length - 1);
            const track = useStore.getState().tracks[targetIndex] ?? useStore.getState().tracks[0];
            useStore.getState().addClip({ id, name: f.name.replace(/\.[^/.]+$/, ''), buffer: audio, start: at, offset: 0, duration: audio.duration, trackId: track.id, fadeIn: 0, fadeOut: 0, automation: [], peaks });
        }
    }, [pps, addTrack]);

    const prevent = (e: React.DragEvent) => { e.preventDefault(); };

    const openBackgroundMenu = (x: number, y: number, host: HTMLDivElement) => {
        if (openCtxMenu) { try { document.body.removeChild(openCtxMenu); } catch { } openCtxMenu = null; }
        const rect = host.getBoundingClientRect();
        const clickX = x - rect.left + host.scrollLeft;
        const clickY = y - rect.top + host.scrollTop;
        const at = clickX / pps;
        let trackIdx = Math.floor(clickY / 96);
        while (trackIdx >= useStore.getState().tracks.length) { useStore.getState().addTrack(); }
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`; menu.style.top = `${y}px`;
        menu.style.background = getComputedStyle(document.documentElement).getPropertyValue('--panel2');
        menu.style.border = `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border')}`;
        menu.style.borderRadius = '8px'; menu.style.boxShadow = 'var(--shadow)'; menu.style.padding = '6px'; menu.style.zIndex = '9999';
        const addItem = (label: string, cb: () => void) => { const i = document.createElement('div'); i.textContent = label; i.style.padding = '6px 10px'; i.style.cursor = 'pointer'; i.onmouseenter = () => (i.style.background = getComputedStyle(document.documentElement).getPropertyValue('--panel3')); i.onmouseleave = () => (i.style.background = 'transparent'); i.onclick = () => { cb(); cleanup(); }; menu.appendChild(i); };
        const cleanup = () => { if (openCtxMenu) { try { document.body.removeChild(openCtxMenu); } catch { } openCtxMenu = null; window.removeEventListener('click', cleanup); } };
        addItem('Paste', () => useStore.getState().pasteAt(at, trackIdx));
        addItem('Split', () => useStore.getState().splitAllAt(useStore.getState().transport.time));
        document.body.appendChild(menu); openCtxMenu = menu; setTimeout(() => window.addEventListener('click', cleanup), 0);
    };

    return (
        <div ref={containerRef} className={`scroller relative flex-1 overflow-auto ${keyframeClipId ? 'pointer-events-auto' : ''}`} style={{ background: "var(--panel)" }} onDragOver={prevent} onDragEnter={prevent} onDrop={onDrop} onContextMenu={(e) => { e.preventDefault(); const host = e.currentTarget as HTMLDivElement; openBackgroundMenu(e.clientX, e.clientY, host); }} onMouseDown={(e) => { if (keyframeClipId && !(e.target as HTMLElement).closest('.clip')) closeKeyframe(); }}>
            <div className="timeline relative" style={{ height: (tracks.length + 1) * 96, width: (duration * pps + 200), paddingBottom: keyframeClipId ? '18vh' : 0 }}>
                {tracks.map((t, idx) => {
                    const isEditingTrack = idx === editingTrackIndex;
                    const rowHeight = isEditingTrack ? '75vh' : '96px';
                    return (
                        <div key={t.id} className={`track absolute left-0 right-0 border-b border-dashed`} style={{ top: idx * 96, borderColor: "var(--border)", height: rowHeight as any, transition: 'height .25s ease', pointerEvents: isEditingTrack || editingTrackIndex < 0 ? 'auto' : 'none', zIndex: isEditingTrack ? 9000 : 3000, opacity: (editingTrackIndex >= 0 && !isEditingTrack) ? 0.3 : 1 }}>
                            <div className="title absolute left-2 top-1 text-xs" style={{ color: "var(--muted)" }}>{t.name}</div>
                            {[...t.clips].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)).map((c, i) => (
                                <ClipComponent key={c.id} clip={c} pps={pps} trackIndex={idx} zIndex={(keyframeClipId === c.id ? 9500 : (100 + i))} isEditingClip={keyframeClipId === c.id} onCloseEdit={closeKeyframe} />
                            ))}
                        </div>
                    );
                })}
                <div className="newTrackZone absolute left-0 right-0 opacity-50 hover:opacity-100 transition-opacity" style={{ top: tracks.length * 96, height: 96, border: `2px dashed var(--border)`, color: "var(--muted)", display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>Drop here to create a track</div>
                {overlaps.map((o, i) => (
                    <div key={i} className="absolute bg-red-500/40 rounded pointer-events-none" style={{ left: o.left, top: o.top, width: o.width, height: 58, zIndex: 10000 }} />
                ))}
            </div>
            <div className="playhead absolute top-0 bottom-0" style={{ width: 2, background: "var(--warn)", left: time * pps }} />
            <div className="ghost hidden absolute h-[58px] border rounded-lg" />
            <div className="overlap hidden absolute rounded" />
        </div>
    );
}

function ClipComponent({ clip, pps, trackIndex, zIndex, isEditingClip, onCloseEdit }: { clip: any; pps: number; trackIndex: number; zIndex: number; isEditingClip?: boolean; onCloseEdit?: () => void }) {
    const selectedClipId = useStore(s => s.selectedClipId);
    const selectClip = useStore(s => s.selectClip);
    const deleteClip = useStore(s => s.deleteClip);
    const splitClip = useStore(s => s.splitClip);
    const updateClip = useStore(s => s.updateClip);
    const copyClip = useStore(s => s.copyClip);
    const pasteAt = useStore(s => s.pasteAt);
    const openKeyframe = useStore(s => s.openKeyframe);
    const time = useStore(s => s.transport.time);
    const isSelected = selectedClipId === clip.id;
    const left = clip.start * pps;
    const width = Math.max(30, clip.duration * pps);

    const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); selectClip(clip.id); };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        selectClip(clip.id);
        if (openCtxMenu) { try { document.body.removeChild(openCtxMenu); } catch { } openCtxMenu = null; }
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.style.background = getComputedStyle(document.documentElement).getPropertyValue('--panel2');
        menu.style.border = `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border')}`;
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = 'var(--shadow)';
        menu.style.padding = '6px';
        menu.style.zIndex = '9999';
        const addItem = (label: string, cb: () => void) => { const item = document.createElement('div'); item.textContent = label; item.style.padding = '6px 10px'; item.style.cursor = 'pointer'; item.onmouseenter = () => (item.style.background = getComputedStyle(document.documentElement).getPropertyValue('--panel3')); item.onmouseleave = () => (item.style.background = 'transparent'); item.onclick = () => { cb(); cleanup(); }; menu.appendChild(item); };
        const cleanup = () => { if (openCtxMenu) { try { document.body.removeChild(openCtxMenu); } catch { } openCtxMenu = null; window.removeEventListener('click', cleanup); } };
        addItem('Copy', () => copyClip(clip.id));
        addItem('Paste', () => pasteAt(time));
        addItem('Duplicate', () => { copyClip(clip.id); pasteAt(time); });
        addItem('Delete', () => deleteClip(clip.id));
        addItem('Split', () => splitClip(clip.id, time));
        addItem('Keyframe', () => openKeyframe(clip.id));
        document.body.appendChild(menu); openCtxMenu = menu; setTimeout(() => window.addEventListener('click', cleanup), 0);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (isEditingClip) return; // disable moving while editing keyframes
        if ((e.target as HTMLElement).closest('.automation-btn')) return;
        selectClip(clip.id);
        const startX = e.clientX; const startY = e.clientY;
        const startTime = clip.start; const startTrack = trackIndex;
        let pendingTargetIdx = startTrack;
        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX; const dy = ev.clientY - startY;
            const dt = dx / pps; const newStart = Math.max(0, startTime + dt);
            const rawIdx = Math.max(0, startTrack + Math.round(dy / 96));
            pendingTargetIdx = rawIdx; // may be beyond current length
            const cappedIdx = Math.min(rawIdx, useStore.getState().tracks.length - 1);
            const track = useStore.getState().tracks[cappedIdx];
            useStore.getState().updateClipTransient(clip.id, { start: newStart, trackId: track.id });
        };
        const onUp = () => {
            // If user dragged beyond the last track, create just enough tracks now and move once
            const state = useStore.getState();
            if (pendingTargetIdx >= state.tracks.length) {
                const needed = pendingTargetIdx - state.tracks.length + 1;
                for (let i = 0; i < needed; i++) useStore.getState().addTrack();
            }
            const target = useStore.getState().tracks[Math.min(pendingTargetIdx, useStore.getState().tracks.length - 1)];
            if (target) useStore.getState().updateClip(clip.id, { trackId: target.id });
            window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    };

    const handleDoubleClick = () => { openKeyframe(clip.id); };

    // In-place keyframe editor overlay
    // local hover/drag state handled inside KeyframeCanvas
    const pts = (Array.isArray(clip.automation) && clip.automation.length ? clip.automation : [{ t: 0, v: 1 }, { t: clip.duration, v: 1 }]).slice().sort((a: any, b: any) => a.t - b.t);
    const applyPts = (next: any[]) => updateClip(clip.id, { automation: next });
    // hitIndex no longer needed here; implemented inside KeyframeCanvas

    return (
        <div
            className={`clip absolute top-[26px] ${isEditingClip ? 'h-[calc(75vh-40px)]' : 'h-[58px]'} bg-[var(--clip)] border border-[var(--clip-border)] rounded-xl shadow-[var(--shadow)] ${isEditingClip ? 'cursor-default' : 'cursor-grab'} overflow-hidden ${isSelected ? 'ring-2 ring-[var(--hi)]' : ''}`}
            style={{ left, width, zIndex, opacity: isEditingClip ? 1 : (useStore.getState().keyframeClipId ? 0.3 : 1) }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseDown={onMouseDown}
            tabIndex={0}
            data-clip-id={clip.id}
        >
            <div className="name absolute left-2 top-1 text-xs text-[var(--muted)] pointer-events-none">{clip.name}</div>
            <div className="wfwrap absolute inset-0 overflow-hidden">
                <canvas className="wf absolute left-0 top-0 h-full w-full" data-peaks={clip.peaks ? JSON.stringify(clip.peaks) : undefined} style={{ opacity: isEditingClip ? 0.25 : 0.6 }}></canvas>
                {!isEditingClip && Array.isArray(clip.automation) && clip.automation.length > 0 && (
                    <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${width} 58`} preserveAspectRatio="none">
                        {(() => { const path = pts.map((p: any, i: number) => { const x = (p.t / clip.duration) * width, y = (1 - p.v) * (58); return `${i === 0 ? 'M' : 'L'} ${x} ${y}`; }).join(' '); return <path d={path} stroke="var(--hi)" fill="none" strokeWidth={1.5} /> })()}
                    </svg>
                )}
                {isEditingClip && (
                    <div className="absolute inset-0" style={{ paddingLeft: 6, paddingTop: 8 }}>
                        <KeyframeCanvas clip={clip} pts={pts} onChange={applyPts} onDone={onCloseEdit} />
                    </div>
                )}
            </div>
        </div>
    );
}

function KeyframeCanvas({ clip, pts, onChange, onDone }: { clip: any; pts: any[]; onChange: (p: any[]) => void; onDone?: () => void }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    useEffect(() => { const el = ref.current; if (!el) return; const ctx = el.getContext('2d'); if (!ctx) return; const draw = () => { const w = el.width = el.clientWidth; const h = el.height = el.clientHeight; ctx.clearRect(0, 0, w, h); ctx.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 1; i <= 3; i++) { const y = (i / 4) * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--hi') || '#3b82f6'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p: any, i: number) => { const x = (p.t / clip.duration) * w; const y = (1 - p.v) * h; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; pts.forEach((p: any, i: number) => { const edgeInset = 8; let x = (p.t / clip.duration) * w; if (i === 0) x = edgeInset; if (i === pts.length - 1) x = w - edgeInset; const y = (1 - p.v) * h; ctx.beginPath(); ctx.arc(x, y, (hoverIdx === i ? 9 : 7), 0, Math.PI * 2); ctx.fill(); }); }; draw(); const ro = new ResizeObserver(draw); ro.observe(el); return () => ro.disconnect(); }, [pts, clip.duration, hoverIdx]);
    const hit = (x: number, y: number, w: number, h: number) => { for (let i = 0; i < pts.length; i++) { const edgeInset = 8; let px = (pts[i].t / clip.duration) * w; if (i === 0) px = edgeInset; if (i === pts.length - 1) px = w - edgeInset; const py = (1 - pts[i].v) * h; const dx = x - px, dy = y - py; if (dx * dx + dy * dy <= 12 * 12) return i; } return -1; };
    const onDown = (e: React.MouseEvent) => { const r = ref.current!.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; const idx = hit(x, y, ref.current!.clientWidth, ref.current!.clientHeight); if (idx >= 0) setDragIdx(idx); else { const t = Math.max(0, Math.min(clip.duration, (x / ref.current!.clientWidth) * clip.duration)); const v = Math.max(0, Math.min(1, 1 - (y / ref.current!.clientHeight))); const next = [...pts, { t, v }].sort((a: any, b: any) => a.t - b.t); onChange(next); } };
    const onMove = (e: React.MouseEvent) => { const r = ref.current!.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; setHoverIdx(hit(x, y, ref.current!.clientWidth, ref.current!.clientHeight)); if (dragIdx == null) return; let t = Math.max(0, Math.min(clip.duration, (x / ref.current!.clientWidth) * clip.duration)); let v = Math.max(0, Math.min(1, 1 - (y / ref.current!.clientHeight))); const next = [...pts]; if (dragIdx === 0) t = 0; if (dragIdx === next.length - 1) t = clip.duration; next[dragIdx] = { t, v }; next.sort((a: any, b: any) => a.t - b.t); onChange(next); };
    const onUp = () => setDragIdx(null);
    return (
        <div className="absolute left-0 right-0 top-0 bottom-0">
            <canvas ref={ref} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} style={{ width: '100%', height: '100%', background: 'transparent' }} />
            <div className="absolute right-3 top-3 flex gap-2">
                <button className="btn" onClick={() => onChange([{ t: 0, v: 1 }, { t: clip.duration, v: 1 }])}>Reset</button>
                <button className="btn" onClick={onDone}>Done</button>
            </div>
        </div>
    );
}
