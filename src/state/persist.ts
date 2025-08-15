import { useStore } from "./store";

type PersistedAutomationPoint = { t: number; v: number };
type PersistedClip = {
  id: string;
  trackId: string;
  name: string;
  start: number;
  offset: number;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  automation: PersistedAutomationPoint[];
  peaks?: number[];
};
type PersistedTrack = {
  id: string;
  name: string;
  gain: number;
  muted: boolean;
  clips: PersistedClip[];
};
type PersistedState = {
  version: 1;
  tracks: PersistedTrack[];
  transportPxPerSecond: number;
  duration?: number;
  selectedClipId: string | null;
  sidebarCollapsed: boolean;
  clipboard?: PersistedClip;
};

const META_KEY = "audio-editor-project-v1";
const DB_NAME = "audio-editor-buffers";
const DB_STORE = "buffers";

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function putBuffer(id: string, buffer: AudioBuffer) {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const channels: ArrayBuffer[] = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      channels.push(new Float32Array(data).buffer);
    }
    store.put({
      id,
      sampleRate: buffer.sampleRate,
      length: buffer.length,
      numberOfChannels: buffer.numberOfChannels,
      channels,
    });
    await new Promise((res, rej) => {
      tx.oncomplete = () => res(null);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } catch {}
}

async function getAllBuffers(): Promise<Record<string, AudioBuffer>> {
  const out: Record<string, AudioBuffer> = {};
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    const rows: any[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as any[]);
      req.onerror = () => reject(req.error);
    });
    rows.forEach((row) => {
      const { id, sampleRate, length, numberOfChannels, channels } = row as any;
      const buf = new AudioBuffer({ length, numberOfChannels, sampleRate });
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const src = new Float32Array(channels[ch]);
        buf.copyToChannel(src, ch);
      }
      out[id] = buf;
    });
  } catch {}
  return out;
}

async function deleteMissingBuffers(validIds: Set<string>) {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const req = store.getAllKeys();
    const keys: IDBValidKey[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as IDBValidKey[]);
      req.onerror = () => reject(req.error);
    });
    keys.forEach((k) => {
      const id = String(k);
      if (!validIds.has(id)) store.delete(k);
    });
  } catch {}
}

function serialize(): PersistedState {
  const s = useStore.getState();
  return {
    version: 1,
    tracks: s.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      gain: t.gain,
      muted: t.muted,
      clips: t.clips.map((c) => ({
        id: c.id,
        trackId: c.trackId,
        name: c.name,
        start: c.start,
        offset: c.offset,
        duration: c.duration,
        fadeIn: c.fadeIn,
        fadeOut: c.fadeOut,
        automation: (Array.isArray(c.automation) ? c.automation : []).map(
          (p) => ({ t: p.t, v: p.v })
        ),
        peaks: c.peaks,
      })),
    })),
    transportPxPerSecond: s.transport.pxPerSecond,
    duration: s.duration,
    selectedClipId: s.selectedClipId,
    sidebarCollapsed: s.sidebarCollapsed,
    clipboard: s.clipboard
      ? {
          id: s.clipboard.id,
          trackId: s.clipboard.trackId,
          name: s.clipboard.name,
          start: s.clipboard.start,
          offset: s.clipboard.offset,
          duration: s.clipboard.duration,
          fadeIn: s.clipboard.fadeIn,
          fadeOut: s.clipboard.fadeOut,
          automation: (Array.isArray(s.clipboard.automation)
            ? s.clipboard.automation
            : []
          ).map((p) => ({ t: p.t, v: p.v })),
          peaks: s.clipboard.peaks,
        }
      : undefined,
  };
}

function deserialize(data: PersistedState) {
  const tracks = data.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    gain: t.gain,
    muted: t.muted,
    clips: t.clips.map((c) => ({
      id: c.id,
      trackId: c.trackId,
      name: c.name,
      buffer: null,
      start: c.start,
      offset: c.offset,
      duration: c.duration,
      fadeIn: c.fadeIn,
      fadeOut: c.fadeOut,
      automation: c.automation,
      peaks: c.peaks,
    })),
  }));
  useStore.setState(
    (s) =>
      ({
        tracks,
        transport: { ...s.transport, pxPerSecond: data.transportPxPerSecond },
        duration: data.duration,
        selectedClipId: data.selectedClipId,
        sidebarCollapsed: data.sidebarCollapsed,
        clipboard: data.clipboard
          ? {
              id: data.clipboard.id,
              trackId: data.clipboard.trackId,
              name: data.clipboard.name,
              buffer: null,
              start: data.clipboard.start,
              offset: data.clipboard.offset,
              duration: data.clipboard.duration,
              fadeIn: data.clipboard.fadeIn,
              fadeOut: data.clipboard.fadeOut,
              automation: data.clipboard.automation,
              peaks: data.clipboard.peaks,
            }
          : undefined,
      }) as any
  );
}

let savePending = false;
let savedIds = new Set<string>();
let lastMetaJson = "";

function scheduleSave() {
  if (savePending) return;
  savePending = true;
  setTimeout(async () => {
    savePending = false;
    const meta = serialize();
    const json = JSON.stringify(meta);
    if (json !== lastMetaJson) {
      try {
        localStorage.setItem(META_KEY, json);
        lastMetaJson = json;
      } catch {}
    }
    const s = useStore.getState();
    const allIds = new Set<string>();
    s.tracks.forEach((t) => t.clips.forEach((c) => allIds.add(c.id)));
    if (s.clipboard) allIds.add(s.clipboard.id);
    await Promise.all(
      s.tracks
        .flatMap((t) => t.clips)
        .filter((c) => c.buffer && !savedIds.has(c.id))
        .map(async (c) => {
          await putBuffer(c.id, c.buffer!);
          savedIds.add(c.id);
        })
    );
    await deleteMissingBuffers(allIds);
  }, 250);
}

export async function initPersistence() {
  let restored = false;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const data = JSON.parse(raw) as PersistedState;
      if (data && data.version === 1) {
        deserialize(data);
        restored = true;
      }
    }
  } catch {}

  // hydrate buffers
  try {
    const buffers = await getAllBuffers();
    const map = new Map(Object.entries(buffers));
    useStore.setState(
      (s) =>
        ({
          tracks: s.tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) => ({
              ...c,
              buffer: map.get(c.id) ?? c.buffer,
            })) as any,
          })),
          clipboard: s.clipboard
            ? ({
                ...s.clipboard,
                buffer: map.get(s.clipboard.id) ?? null,
              } as any)
            : undefined,
        }) as any
    );
    savedIds = new Set(map.keys());
  } catch {}

  // start subscription for autosave after initial restore
  useStore.subscribe(() => scheduleSave());
  // Save immediately if nothing was restored to capture initial state
  if (!restored) scheduleSave();
}
