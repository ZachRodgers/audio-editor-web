import { useStore } from "../state/store";

declare global {
  interface Window {
    lamejs?: any;
    MPEGMode?: any;
  }
}

function sampleAutomation(
  points: { t: number; v: number }[] | undefined,
  t: number
): number {
  if (!points || points.length === 0) return 1;
  const pts = points.slice().sort((a, b) => a.t - b.t);
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

async function renderOfflineToBuffer(maxSeconds = 600): Promise<AudioBuffer> {
  const s = useStore.getState();
  const endSec = Math.min(
    maxSeconds,
    Math.max(
      0,
      ...s.tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration))
    )
  );
  const sampleRate = 44100;
  const channels = 2;
  const length = Math.max(1, Math.ceil(endSec * sampleRate));
  // @ts-expect-error web audio global
  const ctx = new (window.OfflineAudioContext ||
    (window as any).webkitOfflineAudioContext)(channels, length, sampleRate);
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  s.tracks.forEach((track) => {
    const baseGain = track.muted ? 0 : track.gain;
    track.clips.forEach((clip) => {
      if (!clip.buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = clip.buffer;
      const g = ctx.createGain();
      const fade = ctx.createGain();
      // schedule automation as linear ramps on gain
      const pts = (
        Array.isArray(clip.automation) && clip.automation.length
          ? clip.automation
          : [
              { t: 0, v: 1 },
              { t: clip.duration, v: 1 },
            ]
      )
        .slice()
        .sort((a, b) => a.t - b.t);
      if (pts.length > 0) {
        const firstAbs = Math.max(0, clip.start + pts[0].t);
        g.gain.setValueAtTime(baseGain * pts[0].v, firstAbs);
        for (let i = 1; i < pts.length; i++) {
          const at = Math.max(0, clip.start + pts[i].t);
          g.gain.linearRampToValueAtTime(baseGain * pts[i].v, at);
        }
      } else {
        g.gain.value = baseGain;
      }
      // fades
      const startAbs = Math.max(0, clip.start);
      const endAbs = Math.max(startAbs, clip.start + clip.duration);
      const fiEnd = Math.min(endAbs, startAbs + Math.max(0, clip.fadeIn || 0));
      const foStart = Math.max(
        startAbs,
        endAbs - Math.max(0, clip.fadeOut || 0)
      );
      fade.gain.setValueAtTime(0, startAbs);
      fade.gain.linearRampToValueAtTime(1, fiEnd);
      fade.gain.setValueAtTime(1, foStart);
      fade.gain.linearRampToValueAtTime(0, endAbs);

      src.connect(g).connect(fade).connect(master);
      const offset = Math.max(0, clip.offset);
      const duration = Math.max(
        0,
        Math.min(clip.duration, clip.buffer.duration - offset)
      );
      try {
        src.start(Math.max(0, clip.start), offset, duration);
      } catch {}
    });
  });

  const rendered = await ctx.startRendering();
  return rendered;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export async function exportProjectToMp3(): Promise<Blob> {
  const s = useStore.getState();
  s.toast("Rendering project…", false, 5000);
  const buffer = await renderOfflineToBuffer(600);
  const Lame = window.lamejs;
  if (!Lame?.Mp3Encoder) {
    throw new Error("lamejs not loaded");
  }
  const numChannels = Math.max(1, Math.min(2, buffer.numberOfChannels || 2));
  const sampleRate = buffer.sampleRate || 44100;
  const kbps = 128;
  const encoder = new Lame.Mp3Encoder(numChannels, sampleRate, kbps);
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const l = floatTo16BitPCM(left.subarray(i, i + blockSize));
    if (numChannels === 2) {
      const r = floatTo16BitPCM(right.subarray(i, i + blockSize));
      const mp3buf = encoder.encodeBuffer(l, r);
      if (mp3buf && mp3buf.length > 0) chunks.push(new Uint8Array(mp3buf));
    } else {
      const mp3buf = encoder.encodeBuffer(l);
      if (mp3buf && mp3buf.length > 0) chunks.push(new Uint8Array(mp3buf));
    }
  }
  const end = encoder.flush();
  if (end && end.length > 0) chunks.push(new Uint8Array(end));
  const blob = new Blob(chunks, { type: "audio/mpeg" });
  s.toast("Export ready", false, 3000);
  return blob;
}
