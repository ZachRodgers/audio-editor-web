import { ensureAudioContext } from "./context";
import { useStore } from "../state/store";

let rafId: number | null = null;
let lastCtxTime = 0;
const playingSources = new Map<
  string,
  { src: AudioBufferSourceNode; gain: GainNode; stopAt: number }
>();

function sampleAutomation(
  automation: { t: number; v: number }[],
  t: number
): number {
  if (!automation || automation.length === 0) return 1;
  const pts = automation.slice().sort((a, b) => a.t - b.t);
  if (t <= pts[0].t) return pts[0].v;
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return a.v + (b.v - a.v) * u;
    }
  }
  return 1;
}

function startClipIfNeeded(clipId: string, nowSec: number) {
  const s = useStore.getState();
  const all = s.tracks.flatMap((t) =>
    t.clips.map((c) => ({ clip: c, track: t }))
  );
  const pair = all.find((p) => p.clip.id === clipId);
  if (!pair || !pair.clip.buffer) return;
  const { clip, track } = pair;
  const startAbs = clip.start;
  const endAbs = clip.start + clip.duration;
  if (nowSec < startAbs || nowSec >= endAbs) return;
  if (playingSources.has(clip.id)) return;
  const ctx = ensureAudioContext();
  const offset = Math.max(0, nowSec - startAbs + clip.offset);
  const remaining = Math.max(0, endAbs - nowSec);
  try {
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    const g = ctx.createGain();
    // apply track gain * automation at current offset
    const localT = offset;
    const kf = sampleAutomation(clip.automation, localT);
    g.gain.value = (track.muted ? 0 : track.gain) * kf;
    src.connect(g).connect((ctx as any).destination);
    src.start(0, offset, remaining);
    const stopAt = nowSec + remaining;
    playingSources.set(clip.id, { src, gain: g, stopAt });
    src.onended = () => {
      playingSources.delete(clip.id);
    };
  } catch (e) {}
}

function stopAllSources() {
  playingSources.forEach(({ src, gain }) => {
    try {
      src.stop(0);
    } catch {}
    try {
      src.disconnect();
    } catch {}
    try {
      gain.disconnect();
    } catch {}
  });
  playingSources.clear();
}

function tick() {
  const s = useStore.getState();
  const ctx = ensureAudioContext();
  const ctxNow = (ctx as any).currentTime ?? 0;
  if (lastCtxTime === 0) lastCtxTime = ctxNow;
  const delta = ctxNow - lastCtxTime;
  lastCtxTime = ctxNow;
  if (s.transport.playing) {
    const nextTime =
      s.transport.time + delta * (s.transport.backShuttle ? -1 : 1);
    const clamped = Math.max(0, nextTime);
    useStore.setState({ transport: { ...s.transport, time: clamped } });
    // keep gains updated per automation & track gain
    playingSources.forEach((node, id) => {
      const pair = s.tracks
        .flatMap((t) => t.clips.map((c) => ({ clip: c, track: t })))
        .find((p) => p.clip.id === id);
      if (!pair) return;
      const { clip, track } = pair;
      const localT = Math.max(0, clamped - clip.start);
      const kf = sampleAutomation(clip.automation, localT);
      node.gain.gain.value = (track.muted ? 0 : track.gain) * kf;
    });
    // start and stop
    s.tracks.forEach((t) =>
      t.clips.forEach((c) => startClipIfNeeded(c.id, clamped))
    );
    playingSources.forEach((v, id) => {
      if (v.stopAt <= clamped || s.transport.backShuttle) {
        try {
          v.src.stop(0);
        } catch {}
        playingSources.delete(id);
      }
    });
  } else {
    lastCtxTime = ctxNow;
  }
  rafId = requestAnimationFrame(tick);
}

export function ensureAudioScheduler() {
  if (rafId == null) {
    lastCtxTime = 0;
    rafId = requestAnimationFrame(tick);
  }
}
export function onPause() {
  stopAllSources();
}
