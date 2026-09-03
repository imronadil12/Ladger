# Org Chart Studio

One local app for creating, editing, saving, and exporting the SFC and BBS
organizational charts.

## Run the app

```bash
npm install
npm run dev -- --port 4173
```

Open `http://127.0.0.1:4173/`. The former BBS URL, `/bbs.html`, redirects to the
BBS chart inside the app.

## Current features

- Chart library with the approved **SFC** and **BBS** templates.
- Live hierarchy and A3 landscape page preview.
- Position titles, explicit line breaks, styles, reporting relationships,
  sibling order, placement, and dimensions.
- Add and remove positions, with descendants moved to the removed position's
  parent. Circular reporting lines are rejected.
- Company name, colors, logo, logo clear space, watermark, footer, and image
  placement controls.
- Undo, redo, automatic arrangement, and local autosave through IndexedDB.
- Editable `.orgchart.json` project backup and import.
- Live **300 DPI PNG** and **A3 PDF** exports generated from the current chart.

The BBS template retains its 60 mm logo with 10 mm clear space, centered
watermark, forest-green and gold palette, 20 roles, and approved hierarchy. The
SFC template retains its 21 roles, burgundy and gold design, and shared director
reporting structure.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Project structure

- `src/data/seeds.ts` — approved SFC and BBS templates.
- `src/lib/chart.ts` — graph validation and immutable chart operations.
- `src/lib/render.ts` — shared SVG renderer for preview and exports.
- `src/lib/storage.ts` — local autosave and project-file validation.
- `src/lib/export.ts` — 300 DPI PNG and A3 PDF generation.
- `src/components/Workspace.tsx` — chart library, canvas, and inspector.
- `reference/` — the previous standalone HTML files retained for visual
  comparison.
- `scripts/` and `output/` — prior standalone builders and their generated files.

The app runtime uses assets under `public/assets/`; it does not depend on files
in Downloads or `tmp`.
