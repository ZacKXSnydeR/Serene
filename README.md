# Cyrus Interface

This is an enterprise-standard Tauri + React + TypeScript + TailwindCSS application boilerplate.

## 📂 Project Structure

```text
src/
├── assets/        # Static assets like images, fonts, icons
├── components/    # Reusable UI components
│   ├── layout/    # Structural components (Navbar, Sidebar, etc.)
│   └── ui/        # Base UI elements (Button, Input, Modal, etc.)
├── features/      # Feature-based modules (Domain-driven structure)
├── hooks/         # Custom React hooks
├── layouts/       # Page layout templates
├── services/      # External integrations (API, Tauri invokes, etc.)
├── store/         # Global state management
├── styles/        # Global CSS, Tailwind entry points
├── types/         # Global TypeScript definitions
├── utils/         # Helper functions and utilities
├── App.tsx        # Main application root
└── main.tsx       # Application entry point
```

## 🚀 Getting Started

### Development

To start the development server with Tauri:

```bash
npm run tauri dev
```

If you only want to run the web interface (without Tauri window):

```bash
npm run dev
```

### Build

To build the application for production:

```bash
npm run tauri build
```

## 🛠️ Stack

- **Tauri 2.0**: Native desktop app shell.
- **Vite**: Ultra-fast frontend build tool.
- **React 19**: Modern UI library.
- **TypeScript**: Static typing for safer code.
- **TailwindCSS 4**: Utility-first CSS framework (configured via `@tailwindcss/vite`).
