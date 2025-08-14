import { useMemo, useRef, useEffect } from "react";
import { useStore } from "../state/store";

export function Ruler() {
    const pxPerSecond = useStore(s => s.transport.pxPerSecond);
    const duration = useStore(s => s.duration ?? 60);
    const setTime = useStore(s => s.setTime);
    const scrubbingRef = useRef(false);

    const ticks = useMemo(() => {
        const max = Math.ceil(duration);
        let step = 1;
        if (pxPerSecond < 120) step = 5;
        if (pxPerSecond < 80) step = 10;
        const pts: { x: number; label?: string; major: boolean }[] = [];
        for (let s = 0; s <= max; s += step) {
            const x = s * pxPerSecond;
            const major = s % 5 === 0;
            pts.push({ x, major, label: major ? formatTime(s) : undefined });
        }
        return pts;
    }, [pxPerSecond, duration]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!scrubbingRef.current) return;
            const host = document.querySelector('.ruler') as HTMLDivElement;
            if (!host) return;
            const rect = host.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setTime(Math.max(0, x / pxPerSecond));
            e.preventDefault();
        };
        const onUp = () => { scrubbingRef.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [pxPerSecond, setTime]);

    return (
        <div
            className="ruler h-9 border-b flex items-center select-none"
            style={{ background: "var(--panel3)", borderColor: "var(--border)" }}
            onMouseDown={(e) => {
                const host = e.currentTarget as HTMLDivElement;
                const rect = host.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setTime(x / pxPerSecond);
                scrubbingRef.current = true;
            }}
            onContextMenu={(e) => { e.preventDefault(); }}
        >
            <div className="ticks relative flex-1 h-full">
                {ticks.map((t, i) => (
                    <div key={i} style={{ left: t.x, top: t.major ? 0 : 16, height: t.major ? "100%" : "50%", width: 1, position: "absolute", background: "var(--border)" }} />
                ))}
                {ticks.filter(t => t.label).map((t, i) => (
                    <div key={"l" + i} className="label absolute text-xs" style={{ left: (t.x + 4), top: 8, color: "var(--muted)" }}>{t.label}</div>
                ))}
            </div>
        </div>
    );
}

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}
