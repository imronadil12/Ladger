# Org Chart Studio (Ladger)

A high-precision corporate organizational chart studio built for creating, styling, auto-arranging, and exporting publication-grade organizational structures in vector-accurate A3 landscape.

Includes preconfigured, brand-compliant templates for **BBS** (Forest Green & Gold) and **SFC** (Burgundy & Gold), complete with custom branding, executive hierarchy bands, stacked staff reporting lines, and print-ready export pipelines.

---

## ✨ Features

### 📐 Precision Vector Layout Engine
- **Automated Hierarchy Arrangement**: Auto-calculates multi-tier cluster distributions, avoiding collisions while preserving subtree groupings.
- **Vertical Middle Centering**: The entire organizational chart is centered dynamically in the vertical middle of the page with equal top and bottom margins.
- **Consistent Container Metrics**: Standardized padding across all positions, unified box heights based on line count, and a minimum title container width of 200pt.
- **Staff Reporting Alignment**: Stacked staff roles indented under managers with exact 24pt horizontal arrow connectors and 24pt right margins.
- **Non-Contact Manager Connectors**: Connector spines initiate 8pt below manager containers, maintaining pristine separation consistent with executive bands.

### 📋 Live Hierarchy Outline
- **Visual Position List**: Streamlined left-panel hierarchy displaying all positions with hierarchy depth indentation and role style indicators.
- **Position Selection**: Instant selection and inspection of any role directly from the hierarchy outline.
- **Top-Level Position Addition**: Quick addition of root positions directly from the outline header.

### ⌨️ Modern Canvas & Keyboard Controls
- **Keyboard Undo & Redo**: Full history stack accessible via `⌘Z` / `⌘⇧Z` (macOS) and `Ctrl+Z` / `Ctrl+Y` (Windows/Linux), safely respecting active text input fields.
- **Scroll-to-Zoom**: Smooth zooming using mouse wheel or trackpad pinch gestures with normalized sensitivity.
- **Magnetic 100% Snap**: Zoom snaps cleanly to 100% when passing within ±4% threshold; click the zoom readout to toggle directly between 100% and fit.

### 🖨️ High-Resolution Vector & Print Exports
- **A3 Landscape PDF**: Crisp, vector-rendered A3 PDF output (1190.55 × 841.89 pt) adhering to professional corporate standards.
- **300 DPI Ultra-HD PNG**: High-resolution bitmap export (4961 × 3508 px) generated via direct SVG-to-Canvas rasterization.
- **Editable Project Backups**: Save and import complete workspace projects as `.orgchart.json` files.
- **Local Autosave**: Automatic local persistence through IndexedDB with zero cloud dependency.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/imronadil12/Ladger.git
   cd Ladger
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open `http://127.0.0.1:5173/` in your browser.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the local Vite development server with hot module replacement |
| `npm run build` | Compile TypeScript and bundle production assets with Vite |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Run ESLint across all TypeScript and React source files |
| `npm run typecheck` | Run `tsc -b` to verify strict TypeScript type integrity |

---

## 📊 Default Layout Settings

| Setting | Default Value | Description |
| :--- | :--- | :--- |
| **Title Font Size** | `16 pt` | Uniform typography font size across all positions |
| **Horizontal Gap** | `24 pt` | Horizontal separation between sibling positions |
| **Vertical Gap** | `48 pt` | Vertical separation between hierarchy tiers |
| **Staff Gap** | `16 pt` | Vertical gap between stacked staff cards |
| **Min Container Width** | `200 pt` | Enforced minimum width for executive and manager cards |
| **Arrow Connector Length** | `24 pt` | Exact length from vertical spine to staff card |

---

## 📁 Project Architecture

```
Ladger/
├── public/
│   ├── assets/              # Logos, watermarks, and brand artwork
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Workspace.tsx    # Workbench UI, hierarchy tree, canvas, and inspector
│   │   └── ...
│   ├── data/
│   │   └── seeds.ts         # Approved BBS & SFC seed hierarchies and default settings
│   ├── lib/
│   │   ├── chart.ts         # Graph theory algorithms, auto-layout, and tree mutations
│   │   ├── export.ts        # PDF (jsPDF) & 300 DPI PNG export pipelines
│   │   ├── render.ts        # SVG generator for orthogonal paths, connectors & roles
│   │   ├── role-layout.ts   # Typography fitting, standardized metrics & geometry
│   │   └── storage.ts       # IndexedDB persistence and JSON import/export
│   ├── types.ts             # TypeScript interfaces for charts, roles, and branding
│   ├── App.tsx              # Root application state, keyboard shortcuts & history
│   ├── main.tsx             # Entry point
│   └── styles.css           # Workspace styling & design system tokens
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
