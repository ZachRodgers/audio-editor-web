# Audio Editor

A modern, fast audio editor built with React, TypeScript, and the Web Audio API.

## Features

- **Multi-track Editing** infinite tracks and layers with snapping
- **Drag-and-drop Import** for common formats (WAV, MP3, OGG, AAC, FLAC, WebM)
- **Clip Editing**: select, move, split, duplicate, delete, copy, paste, undo, redo
- **Volume Keyframing**: double click to add keyframe to volume levels
- **Overlap Protection**: overlapping tracks will not be deleted and instead shown in red

## Upcoming Features

- Clips from URLs
- Project saving
- Project browser memory

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
git clone <repository-url>
cd parallel-audio-editor
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **Zustand**
- **Tailwind CSS**
- **Lucide React**
- **Web Audio API**
- **Web Workers**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

MIT License
