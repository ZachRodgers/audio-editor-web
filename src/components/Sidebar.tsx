import { useStore } from "../state/store";
import { Volume2, Volume1, Volume, VolumeX } from "lucide-react";
import { IconButton } from "./IconButton";

function volIconName(g: number) {
    if (g <= 0) return VolumeX;
    if (g < 0.34) return Volume;
    if (g < 0.67) return Volume1;
    return Volume2;
}

export function Sidebar() {
    const tracks = useStore(s => s.tracks);
    const addTrack = useStore(s => s.addTrack);
    const sidebarCollapsed = useStore(s => s.sidebarCollapsed);
    const toggleSidebar = useStore(s => s.toggleSidebar);
    const setTrackGain = useStore(s => s.setTrackGain);
    const toggleMute = useStore(s => s.toggleMute);
    const keyframeActive = useStore(s => !!s.keyframeClipId);

    return (
        <aside className={`${sidebarCollapsed ? 'w-0 border-r-0' : ''} sidebar-root flex flex-col`} style={{ width: sidebarCollapsed ? 0 : 200, opacity: keyframeActive ? 0.3 : 1, pointerEvents: keyframeActive ? 'none' : 'auto' }}>
            <div className="side-top flex items-center justify-between px-2 border-b">
                <span className="text-xs muted">Tracks</span>
                <IconButton title="Collapse sidebar" onClick={toggleSidebar}>◀</IconButton>
            </div>
            <div className="trackList p-2 overflow-auto flex-1 flex flex-col gap-2">
                {tracks.map((t) => {
                    const VolIcon = volIconName(t.muted ? 0 : t.gain);
                    return (
                        <div key={t.id} className="trackRow trackRowHeight flex items-center gap-2 rounded-xl p-2 border overflow-visible">
                            <div className="flex-1" />
                            <IconButton title={t.muted ? 'Unmute' : 'Mute'} onClick={() => toggleMute(t.id)}><VolIcon className="w-4 h-4" /></IconButton>
                            <input className="range" title="Track volume" type="range" min="0" max="1" step="0.01" value={t.gain} onChange={(e) => setTrackGain(t.id, parseFloat((e.target as HTMLInputElement).value))} />
                        </div>
                    );
                })}
                <button onClick={addTrack} className="trackRow addRow trackRowHeight border-dashed border rounded-xl p-2 text-left text-sm">+ New track</button>
            </div>
        </aside>
    );
}
