import { useState, useCallback } from "react";

export function useZoom(initial = 140) {
  const [pxPerSecond, setPx] = useState(initial);
  const set = useCallback(
    (v: number) => setPx(Math.max(50, Math.min(600, Math.round(v)))),
    []
  );
  return { pxPerSecond, setPxPerSecond: set };
}
