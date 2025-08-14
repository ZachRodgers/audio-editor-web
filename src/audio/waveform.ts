export function drawWaveform(canvas: HTMLCanvasElement, peaks: number[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = (canvas.width = canvas.clientWidth || 1);
  const h = (canvas.height = canvas.clientHeight || 1);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle =
    getComputedStyle(document.documentElement).getPropertyValue("--wf") ||
    "#8ab4f8";
  ctx.beginPath();
  const mid = h / 2;
  for (let x = 0; x < w; x++) {
    const i = Math.floor((x / Math.max(1, w - 1)) * (peaks.length - 1));
    const v = peaks[i] ?? 0;
    ctx.moveTo(x + 0.5, mid - v * mid);
    ctx.lineTo(x + 0.5, mid + v * mid);
  }
  ctx.stroke();
}

export async function computePeaks(
  buffer: AudioBuffer,
  buckets: number
): Promise<number[]> {
  const worker = new Worker(new URL("./peaksWorker.ts", import.meta.url), {
    type: "module",
  });
  const channelData =
    buffer.numberOfChannels > 1 ? mixToMono(buffer) : buffer.getChannelData(0);
  const samples = new Float32Array(channelData);
  return new Promise((resolve) => {
    worker.onmessage = (e: MessageEvent) => {
      resolve(Array.from(e.data.peaks || []));
      worker.terminate();
    };
    worker.postMessage({ samples, buckets });
  });
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length;
  const out = new Float32Array(len);
  const ch0 = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) out[i] = ch0[i];
  for (let c = 1; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] = (out[i] + ch[i]) * 0.5;
  }
  return out;
}
