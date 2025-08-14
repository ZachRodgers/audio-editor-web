import { Sun, Moon, Plus, SkipBack, SkipForward, Play, Pause, Undo2, Redo2, Copy, ClipboardPaste, Files, Keyboard, Scissors, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";
import { useStore } from "../state/store";
import { KeybindsModal } from "./KeybindsModal";

export function Toolbar({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const setTime = useStore(s => s.setTime);
  const play = useStore(s => s.play);
  const pause = useStore(s => s.pause);
  const playing = useStore(s => s.transport.playing);
  const keyframeActive = useStore(s => !!s.keyframeClipId);
  const pxPerSecond = useStore(s => s.transport.pxPerSecond);
  const setZoom = useStore(s => s.setZoom);

  return (
    <>
      <div className="toolbar sticky top-0 z-10 flex items-center gap-3 p-2 border-b">
        {/* Left group: AddMedia(+), Duplicate, Copy, Paste, Split, Delete, Undo, Redo, Zoom */}
        <div className={`flex items-center gap-2 flex-1 ${keyframeActive ? 'opacity-30 pointer-events-none' : ''}`}>
          <label className="iconbtn inline-flex items-center justify-center w-9 h-9 rounded-xl border" title="Add media">
            <input className="hidden" accept="audio/*" multiple type="file" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              const ctx = (await import('../audio/context')).getAudioContext();
              const { computePeaks } = await import('../audio/waveform');
              const pps = useStore.getState().transport.pxPerSecond;
              for (const f of files) {
                try {
                  const ab = await f.arrayBuffer();
                  const buf = await ctx.decodeAudioData(ab.slice(0));
                  const buckets = Math.max(100, Math.floor(buf.duration * pps));
                  const peaks = await computePeaks(buf, buckets);
                  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                  const track = useStore.getState().tracks[0];
                  useStore.getState().addClip({ id, name: f.name.replace(/\.[^/.]+$/, ''), buffer: buf, start: useStore.getState().transport.time, offset: 0, duration: buf.duration, trackId: track.id, fadeIn: 0, fadeOut: 0, automation: [], peaks });
                } catch { useStore.getState().toast(`Could not add ${f.name}`, true); }
              }
              (e.target as HTMLInputElement).value = '';
            }} />
            <Plus className="w-4 h-4" />
          </label>
          <IconButton title="Duplicate" onClick={() => { const s = useStore.getState(); if (s.selectedClipId) { s.copyClip(s.selectedClipId); const ti = s.tracks.findIndex(t => t.clips.some(c => c.id === s.selectedClipId)); s.pasteAt(s.transport.time, ti >= 0 ? ti : 0); } }}><Files className="w-4 h-4" /></IconButton>
          <IconButton title="Copy" onClick={() => { const s = useStore.getState(); if (s.selectedClipId) s.copyClip(s.selectedClipId); }}><Copy className="w-4 h-4" /></IconButton>
          <IconButton title="Paste" onClick={() => { const s = useStore.getState(); let idx = 0; if (s.selectedClipId) { const ti = s.tracks.findIndex(t => t.clips.some(c => c.id === s.selectedClipId)); if (ti >= 0) idx = ti; } if (s.clipboard) s.pasteAt(s.transport.time, idx); }}><ClipboardPaste className="w-4 h-4" /></IconButton>
          <IconButton title="Split at playhead" onClick={() => { const s = useStore.getState(); if (s.selectedClipId) s.splitClip(s.selectedClipId, s.transport.time); else s.splitAllAt(s.transport.time); }}><Scissors className="w-4 h-4" /></IconButton>
          <IconButton title="Delete" onClick={() => { const s = useStore.getState(); if (s.selectedClipId) s.deleteClip(s.selectedClipId); else { const host = document.createElement('div'); host.className = 'modal'; host.innerHTML = `<div class=\"dialog\"><header class=\"flex items-center gap-2 p-2 border-b\"><div class=\"title\">Clear all clips?</div></header><div class=\"content p-3\">This will remove all clips from all tracks.</div><footer class=\"flex gap-2 justify-end p-2 border-t\"><button id=\"no\" class=\"btn\">No</button><button id=\"yes\" class=\"btn\">Yes</button></footer></div>`; document.body.appendChild(host); host.querySelector('#no')?.addEventListener('click', () => { document.body.removeChild(host); }); host.querySelector('#yes')?.addEventListener('click', () => { useStore.setState(st => ({ tracks: st.tracks.map(t => ({ ...t, clips: [] })), selectedClipId: null } as any)); document.body.removeChild(host); }); } }}><Trash2 className="w-4 h-4" /></IconButton>
          <IconButton title="Undo" onClick={() => useStore.getState().undo()}><Undo2 className="w-4 h-4" /></IconButton>
          <IconButton title="Redo" onClick={() => useStore.getState().redo()}><Redo2 className="w-4 h-4" /></IconButton>
        </div>

        {/* Center group: Skip to start, Play/Pause, Next clip start */}
        <div className="flex items-center gap-3 justify-center flex-1">
          <IconButton title="Jump to start" onClick={() => setTime(0)}><SkipBack className="w-4 h-4" /></IconButton>
          <IconButton title="Play/Pause" onClick={() => playing ? pause() : play()}>{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</IconButton>
          <IconButton title="Next clip start" onClick={() => { const s = useStore.getState(); const allClips = s.tracks.flatMap(t => t.clips); const nextClip = allClips.filter(c => c.start > s.transport.time).sort((a, b) => a.start - b.start)[0]; if (nextClip) s.setTime(nextClip.start); }}><SkipForward className="w-4 h-4" /></IconButton>
        </div>

        {/* Right group: Keyboard, Theme */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="iconbtn h-9 px-3 rounded-xl border flex items-center">
            <input aria-label="Zoom" className="range" type="range" min={50} max={600} value={pxPerSecond} onChange={(e) => setZoom(parseInt((e.target as HTMLInputElement).value))} />
          </div>
          <IconButton title="Keyboard" aria-label="Keybinds" onClick={() => document.querySelector('.keybinds-modal')?.classList.remove('hidden')}><Keyboard className="w-4 h-4" /></IconButton>
          <IconButton title="Theme" aria-label="Theme" onClick={onToggleTheme}>{isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</IconButton>

        </div>
      </div>
      <KeybindsModal />
    </>
  );
}
