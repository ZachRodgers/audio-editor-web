import { useEffect, useRef } from 'react';

export function KeybindsModal() {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') modalRef.current?.classList.add('hidden');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const close = () => modalRef.current?.classList.add('hidden');

    return (
        <div className="modal hidden keybinds-modal" aria-hidden="true" ref={modalRef} onMouseDown={(e) => { if (e.target === modalRef.current) close(); }}>
            <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="keybindsTitle">
                <header>
                    <div className="title" id="keybindsTitle">Keyboard Shortcuts</div>
                    <button className="btn" onClick={close}>✕</button>
                </header>
                <div className="content">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <h3 className="font-semibold mb-2">Transport</h3>
                            <div className="space-y-1">
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd> Play/Pause</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">←</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">→</kbd> Nudge playhead</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">←</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">→</kbd> Fast nudge</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">←</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">→</kbd> Coarse nudge</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Clips</h3>
                            <div className="space-y-1">
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Click</kbd> Select clip</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Double-click</kbd> Jump to clip start</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">←</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">→</kbd> Nudge selected clip</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Delete</kbd> Delete selected clip</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Edit</h3>
                            <div className="space-y-1">
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">C</kbd> Copy clip</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">V</kbd> Paste at playhead</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">D</kbd> Duplicate clip</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">S</kbd> Split at playhead</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">History</h3>
                            <div className="space-y-1">
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Z</kbd> Undo</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Z</kbd> Redo</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Y</kbd> Redo</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">UI</h3>
                            <div className="space-y-1">
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">T</kbd> Toggle sidebar</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> Clear selection</div>
                                <div><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Drag & Drop</kbd> Add audio files</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
