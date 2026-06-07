# Serene

A highly-optimized, native desktop client for YouTube Music built with Tauri, React, and Python.

Serene bridges the gap between local library management and cloud streaming, offering a fluid, offline-first experience wrapped in a modern, vanilla CSS-driven interface.

## Features

- **Offline-First Architecture**: Features a robust local SQLite database that maintains your playlists, listening history, and liked songs even without an internet connection.
- **Bi-Directional Sync**: Seamlessly pushes local library changes to the official YouTube Music servers upon authentication.
- **Native Performance**: Built on Tauri for minimal resource footprint and near-instant load times.
- **Bundled Python Sidecar**: Offloads complex API interactions and heavy data processing to an embedded Python server (`ytmusicapi`), packaged via PyInstaller.
- **Fluid UI/UX**: Designed from the ground up with custom vanilla CSS to deliver 60fps micro-animations, glassmorphism, and a highly polished dark-mode aesthetic.
- **Advanced Playback Engine**: Custom React state management for queue handling, shuffling, and seamless Youtube video stream extraction.

## Architecture

- **Frontend**: React 19, TypeScript, Zustand (State Management)
- **Backend (Host)**: Rust (Tauri 2.0)
- **Sidecar API**: Python (Flask, `ytmusicapi`)
- **Database**: SQLite (via Tauri plugins)
- **Styling**: Vanilla CSS

## Development

Prerequisites:
- Node.js (v18+)
- Rust & Cargo
- Python 3.10+
- Visual Studio Build Tools (Windows)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the Python virtual environment and sidecar:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   
   # Build the Python executable for Tauri
   npm run build:python
   ```

3. Start the development environment:
   ```bash
   npm run tauri dev
   ```

## Build

To compile a production-ready installer (`.msi` or `.exe`):

```bash
npm run tauri build
```

*Note: Building the production app will automatically package the Python sidecar and bundle the SQLite migrations.*

## License

MIT
