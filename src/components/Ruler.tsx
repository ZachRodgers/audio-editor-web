import { useMemo, useRef, useEffect } from "react";
import { useStore } from "../state/store";

export function Ruler() {
    const pxPerSecond = useStore(s => s.transport.pxPerSecond);
    const duration = useStore(s => s.duration ?? 60);
    const setTime = useStore(s => s.setTime);
    const scrubbingRef = useRef(false);

    const { majorTicks, minorTicks, labels } = useMemo(() => {
        const max = Math.ceil(duration);
        // compute major step from zoom
        let major = 10; // seconds
        if (pxPerSecond >= 600) major = 0.5;
        else if (pxPerSecond >= 450) major = 1;
        else if (pxPerSecond >= 300) major = 2;
        else if (pxPerSecond >= 180) major = 5;
        else if (pxPerSecond >= 120) major = 10;
        else major = 15;
        const minor = Math.max(major / 5, 0.1);

        const majors: number[] = [];
        const minors: number[] = [];
        const lbls: { x: number; text: string }[] = [];

        const total = Math.max(max, 1);
        // minor ticks
        for (let t = 0; t <= total + 1e-6; t += minor) {
            const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
            const x = t * pxPerSecond;
            if (isMajor) majors.push(x); else minors.push(x);
            // labels
            const labelEveryHalf = major <= 0.5;
            const showHalf = labelEveryHalf && Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
            const showWhole = Math.abs(t - Math.round(t)) < 1e-6;
            const label5s = major >= 5 && showWhole && Math.round(t) % 5 === 0;
            const label1s = major < 5 && showWhole;
            const label05 = labelEveryHalf && showHalf;
            if ((label05 || label1s || label5s) && (isMajor || label05)) {
                lbls.push({ x, text: formatTime(t) });
            }
        }
        return { majorTicks: majors, minorTicks: minors, labels: lbls };
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
                {minorTicks.map((x, i) => (
                    <div key={`m${i}`} style={{ left: x, top: 22, height: "30%", width: 1, position: "absolute", background: "var(--border)" }} />
                ))}
                {majorTicks.map((x, i) => (
                    <div key={`M${i}`} style={{ left: x, top: 0, height: "100%", width: 1, position: "absolute", background: "var(--border)" }} />
                ))}
                {labels.map((l, i) => (
                    <div key={`L${i}`} className="label absolute text-xs" style={{ left: (l.x + 4), top: 8, color: "var(--muted)" }}>{l.text}</div>
                ))}
            </div>
        </div>
    );
}

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.round((sec % 60) * 10) / 10; // allow .5s
    const whole = Math.floor(s);
    const frac = Math.round((s - whole) * 10);
    return `${m}:${whole.toString().padStart(2, "0")}${frac ? "." + frac : ""}`;
}
