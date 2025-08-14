# Parallel Audio Editor

A modern, feature-rich audio editor built with React, TypeScript, and Web Audio API. This project provides a professional-grade audio editing experience with waveform visualization, multi-track support, and real-time audio processing.

## Features

### Core Functionality

- **Multi-track Audio Editing**: Create and manage multiple audio tracks
- **Waveform Visualization**: Real-time waveform display with peak computation
- **Drag & Drop**: Import audio files directly by dragging them onto the timeline
- **Clip Management**: Select, move, copy, paste, and delete audio clips
- **Transport Controls**: Play, pause, jump to start, and navigate between clips

### Advanced Editing

- **Split Clips**: Split audio clips at the playhead position
- **Automation**: Add automation points to clips for volume/parameter control
- **Fade Handles**: Visual fade in/out controls on selected clips
- **Undo/Redo**: Full history support with keyboard shortcuts

### User Interface

- **Theme Support**: Light and dark themes with smooth transitions
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Comprehensive keyboard navigation and editing
- **Zoom Controls**: Adjustable timeline zoom with dynamic tick scaling
- **Sidebar**: Collapsible track management panel

### Audio Processing

- **Web Audio API**: Native browser audio processing
- **Peak Computation**: Background waveform peak calculation using Web Workers
- **Multi-format Support**: MP3, WAV, OGG, M4A, AAC, FLAC, WebM
- **Real-time Playback**: Smooth audio playback with precise timing

## Keyboard Shortcuts

### Transport

- `Space` - Play/Pause
- `←` `→` - Nudge playhead (fine)
- `Ctrl` + `←` `→` - Fast nudge
- `Shift` + `←` `→` - Coarse nudge

### Clips

- `Click` - Select clip
- `Double-click` - Jump to clip start
- `←` `→` - Nudge selected clip
- `Delete` - Delete selected clip

### Edit

- `Ctrl` + `C` - Copy clip
- `Ctrl` + `V` - Paste at playhead
- `Ctrl` + `D` - Duplicate clip
- `S` - Split at playhead

### History

- `Ctrl` + `Z` - Undo
- `Ctrl` + `Shift` + `Z` - Redo
- `Ctrl` + `Y` - Redo

### UI

- `T` - Toggle sidebar
- `Esc` - Clear selection
- `⌨️` - Open keyboard shortcuts modal

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd parallel-audio-editor
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm run test
```

## Project Structure

```
src/
├── components/          # React components
│   ├── App.tsx         # Main application component
│   ├── Toolbar.tsx     # Top toolbar with controls
│   ├── Sidebar.tsx     # Track management sidebar
│   ├── TrackLane.tsx   # Main timeline area
│   ├── Ruler.tsx       # Timeline ruler with zoom
│   ├── Toasts.tsx      # Notification system
│   ├── KeybindsModal.tsx # Keyboard shortcuts modal
│   └── AutomationModal.tsx # Clip automation editor
├── state/              # State management
│   └── store.ts        # Zustand store with types
├── audio/              # Audio processing
│   ├── context.ts      # AudioContext management
│   ├── waveform.ts     # Waveform drawing utilities
│   ├── peaksWorker.ts  # Web Worker for peak computation
│   └── scheduler.ts    # Audio playback scheduling
├── hooks/              # Custom React hooks
│   ├── useHotkeys.ts   # Global keyboard shortcuts
│   └── useZoom.ts      # Zoom level management
└── styles/             # Styling
    └── index.css       # Global styles and themes
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Web Audio API** - Audio processing
- **Web Workers** - Background processing
- **Vitest** - Testing framework

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with modern web technologies for optimal performance
- Inspired by professional audio editing software
- Designed for both beginners and advanced users
