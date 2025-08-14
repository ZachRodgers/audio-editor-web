export interface SnapPoint {
  time: number;
  type: "start" | "end" | "grid";
  strength: number;
}

export function findSnapPoints(
  tracks: any[],
  currentClipId: string,
  currentTime: number,
  snapThreshold: number = 0.1
): SnapPoint[] {
  const snapPoints: SnapPoint[] = [];

  // Find snap points from other clips only
  tracks.forEach((track) => {
    track.clips.forEach((clip: any) => {
      if (clip.id === currentClipId) return;

      // Snap to clip starts and ends
      snapPoints.push({
        time: clip.start,
        type: "start",
        strength: 0.8,
      });

      snapPoints.push({
        time: clip.start + clip.duration,
        type: "end",
        strength: 0.8,
      });
    });
  });

  return snapPoints;
}

export function findClosestSnap(
  targetTime: number,
  snapPoints: SnapPoint[],
  snapThreshold: number = 0.1
): { time: number; strength: number } | null {
  let closest: { time: number; strength: number } | null = null;
  let minDistance = snapThreshold;

  snapPoints.forEach((point) => {
    const distance = Math.abs(targetTime - point.time);
    if (distance < minDistance) {
      minDistance = distance;
      closest = { time: point.time, strength: point.strength };
    }
  });

  return closest;
}

export function snapTime(
  targetTime: number,
  tracks: any[],
  currentClipId: string,
  snapThreshold: number = 0.1
): { time: number; snapped: boolean; snapPoint?: SnapPoint } {
  const snapPoints = findSnapPoints(
    tracks,
    currentClipId,
    targetTime,
    snapThreshold
  );
  const closestSnap = findClosestSnap(targetTime, snapPoints, snapThreshold);

  if (closestSnap) {
    const snapPoint = snapPoints.find((p) => p.time === closestSnap.time);
    return { time: closestSnap.time, snapped: true, snapPoint };
  }

  return { time: targetTime, snapped: false };
}
