import { create } from "zustand";

export type AutomationPoint = { t: number; v: number };
export type Clip = {
  id: string;
  trackId: string;
  name: string;
  buffer: AudioBuffer | null;
  start: number;
  offset: number;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  automation: AutomationPoint[];
  peaks?: number[];
};
export type Track = {
  id: string;
  name: string;
  gain: number;
  muted: boolean;
  clips: Clip[];
};
export type Transport = {
  time: number;
  playing: boolean;
  backShuttle: boolean;
  pxPerSecond: number;
};
export type HistoryAction = { undo: () => void; redo: () => void };

type State = {
  tracks: Track[];
  transport: Transport;
  duration?: number;
  selectedClipId: string | null;
  history: HistoryAction[];
  future: HistoryAction[];
  sidebarCollapsed: boolean;
  toasts: { id: number; text: string; err?: boolean }[];
  clipboard?: Clip;
  keyframeClipId: string | null;
  addTrack: () => void;
  selectClip: (id: string | null) => void;
  push: (a: HistoryAction) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (px: number) => void;
  addClip: (clip: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  updateClipTransient: (id: string, patch: Partial<Clip>) => void;
  deleteClip: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toast: (text: string, err?: boolean) => void;
  setTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  copyClip: (id: string) => void;
  pasteAt: (time: number, trackIndex?: number) => void;
  splitClip: (id: string, time: number) => void;
  splitAllAt: (time: number) => void;
  setTrackGain: (trackId: string, gain: number) => void;
  toggleMute: (trackId: string) => void;
  openKeyframe: (id: string) => void;
  closeKeyframe: () => void;
};

function pruneUnusedTracks(tracks: Track[]): Track[] {
  // Keep the first two tracks; remove any later tracks with no clips
  return tracks.filter((t, idx) => idx < 2 || t.clips.length > 0);
}

export const useStore = create<State>((set, get) => ({
  tracks: [
    { id: "t1", name: "Track 1", gain: 1, muted: false, clips: [] },
    { id: "t2", name: "Track 2", gain: 1, muted: false, clips: [] },
  ],
  transport: { time: 0, playing: false, backShuttle: false, pxPerSecond: 140 },
  selectedClipId: null,
  history: [],
  future: [],
  sidebarCollapsed: false,
  toasts: [],
  clipboard: undefined,
  keyframeClipId: null,
  addTrack: () =>
    set((s) => {
      const prev = s.tracks;
      const next = [
        ...s.tracks,
        {
          id: `t${s.tracks.length + 1}`,
          name: `Track ${s.tracks.length + 1}`,
          gain: 1,
          muted: false,
          clips: [],
        },
      ];
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return { tracks: next };
    }),
  selectClip: (id) => set({ selectedClipId: id }),
  push: (a) => set((s) => ({ history: [...s.history, a], future: [] })),
  undo: () => {
    const s = get();
    const a = s.history[s.history.length - 1];
    if (!a) return;
    a.undo();
    set({ history: s.history.slice(0, -1), future: [a, ...s.future] });
  },
  redo: () => {
    const s = get();
    const [a, ...rest] = s.future;
    if (!a) return;
    a.redo();
    set({ history: [...s.history, a], future: rest });
  },
  setZoom: (px) =>
    set((s) => ({
      transport: {
        ...s.transport,
        pxPerSecond: Math.max(50, Math.min(600, Math.round(px))),
      },
    })),
  addClip: (clip) =>
    set((s) => {
      const prev = s.tracks;
      let next = s.tracks.map((t) =>
        t.id === clip.trackId ? { ...t, clips: [...t.clips, clip] } : t
      );
      next = pruneUnusedTracks(next);
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return {
        tracks: next,
        duration: Math.max(s.duration ?? 60, clip.start + clip.duration + 5),
      };
    }),
  updateClip: (id, patch) =>
    set((s) => {
      let sourceTrackIndex = -1;
      let original: Clip | undefined;
      s.tracks.forEach((t, i) => {
        const found = t.clips.find((c) => c.id === id);
        if (found) {
          sourceTrackIndex = i;
          original = found;
        }
      });
      if (!original || sourceTrackIndex === -1) return {} as any;
      const targetTrackId = patch.trackId ?? original.trackId;
      const updated: Clip = { ...original, ...patch, trackId: targetTrackId };
      const prev = s.tracks;
      const tracks = s.tracks.map((t) => ({ ...t, clips: [...t.clips] }));
      tracks[sourceTrackIndex].clips = tracks[sourceTrackIndex].clips.filter(
        (c) => c.id !== id
      );
      let destIndex = tracks.findIndex((t) => t.id === targetTrackId);
      if (destIndex === -1) destIndex = sourceTrackIndex;
      tracks[destIndex] = {
        ...tracks[destIndex],
        clips: [...tracks[destIndex].clips, updated],
      };
      let max = s.duration ?? 60;
      tracks.forEach((t) =>
        t.clips.forEach((c) => {
          max = Math.max(max, c.start + c.duration + 5);
        })
      );
      const next = pruneUnusedTracks(tracks);
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return { tracks: next, duration: max } as Partial<State> as any;
    }),
  updateClipTransient: (id, patch) =>
    set((s) => {
      let sourceTrackIndex = -1;
      let original: Clip | undefined;
      s.tracks.forEach((t, i) => {
        const found = t.clips.find((c) => c.id === id);
        if (found) {
          sourceTrackIndex = i;
          original = found;
        }
      });
      if (!original || sourceTrackIndex === -1) return {} as any;
      const targetTrackId = patch.trackId ?? original.trackId;
      const updated: Clip = { ...original, ...patch, trackId: targetTrackId };
      const tracks = s.tracks.map((t) => ({ ...t, clips: [...t.clips] }));
      tracks[sourceTrackIndex].clips = tracks[sourceTrackIndex].clips.filter((c) => c.id !== id);
      let destIndex = tracks.findIndex((t) => t.id === targetTrackId);
      if (destIndex === -1) destIndex = sourceTrackIndex;
      tracks[destIndex] = { ...tracks[destIndex], clips: [...tracks[destIndex].clips, updated] };
      let max = s.duration ?? 60;
      tracks.forEach((t) => t.clips.forEach((c) => { max = Math.max(max, c.start + c.duration + 5); }));
      const next = pruneUnusedTracks(tracks);
      return { tracks: next, duration: max } as Partial<State> as any;
    }),
  deleteClip: (id) =>
    set((s) => {
      const prev = s.tracks;
      let next = s.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== id),
      }));
      next = pruneUnusedTracks(next);
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return {
        tracks: next,
        selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
      };
    }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set(() => ({ sidebarCollapsed: v })),
  toast: (text, err) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Date.now() + Math.random(), text, err }],
    })),
  setTime: (t) =>
    set((s) => ({ transport: { ...s.transport, time: Math.max(0, t) } })),
  play: () =>
    set((s) => ({
      transport: { ...s.transport, playing: true, backShuttle: false },
    })),
  pause: () => set((s) => ({ transport: { ...s.transport, playing: false } })),
  copyClip: (id) =>
    set((s) => {
      for (const t of s.tracks) {
        const c = t.clips.find((c) => c.id === id);
        if (c)
          return {
            clipboard: {
              ...c,
              automation: c.automation.map((p) => ({ ...p })),
            },
          } as Partial<State> as any;
      }
      return {} as any;
    }),
  pasteAt: (time, trackIndex) =>
    set((s) => {
      if (!s.clipboard) return {} as any;
      const tidx = Math.max(0, Math.min(trackIndex ?? 0, s.tracks.length - 1));
      const track = s.tracks[tidx];
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const clip: Clip = { ...s.clipboard, id, start: time, trackId: track.id };
      const prev = s.tracks;
      let next = s.tracks.map((t) =>
        t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t
      );
      next = pruneUnusedTracks(next);
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return {
        tracks: next,
        duration: Math.max(s.duration ?? 60, time + clip.duration + 5),
        selectedClipId: id,
      };
    }),
  splitClip: (id, time) =>
    set((s) => {
      for (const t of s.tracks) {
        const clipIndex = t.clips.findIndex((c) => c.id === id);
        if (clipIndex === -1) continue;
        const clip = t.clips[clipIndex];
        const splitTime = time - clip.start;
        if (splitTime <= 0 || splitTime >= clip.duration) return {} as any;
        const leftClip = { ...clip, duration: splitTime };
        const rightClip = {
          ...clip,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          start: clip.start + splitTime,
          offset: clip.offset + splitTime,
          duration: clip.duration - splitTime,
        };
        const prev = s.tracks;
        let next = s.tracks.map((tr) =>
          tr.id === t.id
            ? {
                ...tr,
                clips: [
                  ...tr.clips.slice(0, clipIndex),
                  leftClip,
                  ...tr.clips.slice(clipIndex + 1),
                  rightClip,
                ],
              }
            : tr
        );
        next = pruneUnusedTracks(next);
        get().push({
          undo: () => set({ tracks: prev }),
          redo: () => set({ tracks: next }),
        });
        return { tracks: next, selectedClipId: rightClip.id };
      }
      return {} as any;
    }),
  splitAllAt: (time) =>
    set((s) => {
      const prev = s.tracks;
      let next = s.tracks.map((t) => {
        const out: typeof t.clips = [];
        t.clips.forEach((c) => {
          const rel = time - c.start;
          if (rel > 0 && rel < c.duration) {
            out.push({ ...c, duration: rel });
            out.push({
              ...c,
              id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              start: c.start + rel,
              offset: c.offset + rel,
              duration: c.duration - rel,
            });
          } else {
            out.push(c);
          }
        });
        return { ...t, clips: out };
      });
      next = pruneUnusedTracks(next);
      get().push({
        undo: () => set({ tracks: prev }),
        redo: () => set({ tracks: next }),
      });
      return { tracks: next };
    }),
  setTrackGain: (trackId, gain) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, gain } : t)),
    })),
  toggleMute: (trackId) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    })),
  openKeyframe: (id) => set({ keyframeClipId: id }),
  closeKeyframe: () => set({ keyframeClipId: null }),
}));
