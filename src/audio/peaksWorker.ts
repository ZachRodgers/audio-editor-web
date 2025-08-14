self.onmessage = (e: MessageEvent) => {
  const { samples, buckets } = e.data as {
    samples: Float32Array;
    buckets: number;
  };
  const len = samples.length;
  const size = Math.max(1, Math.floor(len / Math.max(1, buckets)));
  const peaks = new Float32Array(Math.max(1, Math.floor(len / size)));
  let p = 0;
  for (let i = 0; i < len; i += size) {
    let min = 1,
      max = -1;
    for (let j = 0; j < size && i + j < len; j++) {
      const v = samples[i + j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[p++] = Math.max(Math.abs(min), Math.abs(max));
  }
  postMessage({ peaks });
};
