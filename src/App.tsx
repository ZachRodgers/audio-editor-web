import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { Ruler } from './components/Ruler'
import { TrackLane } from './components/TrackLane'
import { Toasts } from './components/Toasts'
import { useStore } from './state/store'
import { useHotkeys } from './hooks/useHotkeys'
import { ensureAudioScheduler, onPause } from './audio/scheduler'
import { snapTime } from './audio/snapping'

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const playing = useStore(s => s.transport.playing)
  useEffect(() => {
    const t = (localStorage.getItem('mini-audio-theme') || 'dark') as 'dark' | 'light'
    document.documentElement.setAttribute('data-theme', t)
    setIsDark(t === 'dark')
  }, [])
  const toggleTheme = useMemo(() => () => {
    const t = isDark ? 'light' : 'dark'
    localStorage.setItem('mini-audio-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    setIsDark(t === 'dark')
  }, [isDark])

  useEffect(() => {
    if (playing) ensureAudioScheduler(); else onPause();
  }, [playing])

  const toasts = useStore(s => s.toasts)
  const selectedClipId = useStore(s => s.selectedClipId)
  const selectClip = useStore(s => s.selectClip)
  const setTime = useStore(s => s.setTime)
  useHotkeys((e) => {
    if (e.code === 'Space') { e.preventDefault(); const s = useStore.getState(); s.transport.playing ? s.pause() : s.play(); }
    if (e.key.toLowerCase() === 't') { useStore.getState().toggleSidebar(); }
    if (e.key === 'Escape') { selectClip(null); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      const fast = (e.ctrlKey || e.metaKey) ? 0.20 : e.shiftKey ? 0.5 : 0.02;
      if (!selectedClipId) { setTime(Math.max(0, useStore.getState().transport.time + dir * fast)); } else {
        const s = useStore.getState();
        const clip = s.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
        if (clip) {
          const newStart = Math.max(0, clip.start + dir * fast);
          const { time: snappedTime } = snapTime(newStart, s.tracks, clip.id, 0.1);
          s.updateClip(clip.id, { start: snappedTime });
        }
      }
    }
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (selectedClipId) useStore.getState().copyClip(selectedClipId); }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const s = useStore.getState();
      let idx = 0;
      if (selectedClipId) {
        const ti = s.tracks.findIndex(t => t.clips.some(c => c.id === selectedClipId));
        if (ti >= 0) idx = ti;
      }
      if (s.clipboard) s.pasteAt(s.transport.time, idx);
    }
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const s = useStore.getState();
      if (s.selectedClipId) {
        s.copyClip(s.selectedClipId);
        let idx = 0;
        const ti = s.tracks.findIndex(t => t.clips.some(c => c.id === s.selectedClipId));
        if (ti >= 0) idx = ti;
        s.pasteAt(s.transport.time, idx);
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const s = useStore.getState();
      if (s.selectedClipId) {
        e.preventDefault();
        s.deleteClip(s.selectedClipId);
      }
    }
    if (e.key === 's') { e.preventDefault(); const s = useStore.getState(); if (s.selectedClipId) s.splitClip(s.selectedClipId, s.transport.time); }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); useStore.getState().undo(); }
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === 'y' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); useStore.getState().redo(); }
  })
  return (
    <div className="flex flex-col h-full">
      <Toolbar isDark={isDark} onToggleTheme={toggleTheme} />
      <div className="flex flex-1" id="workspace">
        <Sidebar />
        <main className="main flex flex-col flex-1 min-w-0">
          <Ruler />
          <TrackLane />
        </main>
      </div>
      <Toasts items={toasts} />
    </div>
  )
}
