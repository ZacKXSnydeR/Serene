# Serene

An open-source, cross-platform music streaming client.

Serene integrates a local SQLite library with YouTube Music's backend to provide an ad-free, offline-capable listening experience. Built with Tauri, React, and Python.

## Features

- **Local Library**: SQLite-backed offline storage for playlists, history, and liked songs.
- **Remote Sync**: Bi-directional synchronization with YouTube Music accounts.
- **Native Shell**: Runs on Tauri for reduced memory footprint compared to Electron alternatives.
- **Python IPC**: API routing and data extraction handled by an embedded Python sidecar.
- **Custom UI**: Interface built entirely from scratch using React and Vanilla CSS.

## Stack

- **Frontend**: React, TypeScript, Zustand, Vanilla CSS
- **Backend**: Rust (Tauri), SQLite
- **Sidecar**: Python (ytmusicapi, PyInstaller)

## Development

Requires Node.js (v18+), Rust, and Python 3.10+.

```bash
# Install dependencies
npm install

# Setup Python environment
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Build Python sidecar
npm run build:python

# Start development server
npm run tauri dev
```

## Build

```bash
npm run tauri build
```
Builds the production installer. Python sidecar compilation and database migrations are handled automatically.

## License

MIT
