# Agent integration contract

The shared types are in `src/types.ts`. Changes must be coordinated with the root
agent. React + TypeScript + Vite app, all local, no backend/accounts/deployment.

## Data/layout agent ownership

Own `src/data/**`, `src/lib/chart.ts`, `src/lib/render.ts`, `public/assets/**`.
Extract approved SFC and BBS assets/roles from existing Python builders and HTML.
Do not change existing builders or reference HTML. Export these APIs:

```ts
// src/data/seeds.ts
export const seedLibrary: Library;
// src/lib/chart.ts: immutable operations, throw Error with user-readable message
export function validateChart(chart: Chart): void;
export function setRoleParents(chart: Chart, roleId: string, parentIds: string[]): Chart;
export function addRole(chart: Chart, parentId?: string): Chart;
export function removeRole(chart: Chart, roleId: string): Chart;
export function reorderRole(chart: Chart, roleId: string, direction: -1 | 1): Chart;
export function autoLayout(chart: Chart): Chart;
// src/lib/render.ts: standalone SVG; text uses font-family Gotham or Poppins.
export function renderChartSvg(chart: Chart, company: Company): string;
```

SVG root has id `chart-svg`; role groups have `data-role-id` and accessible labels.
Pure SVG only, no foreignObject. Text baseline coordinates explicit for export.
Put font files at `public/assets/Gotham-Bold.otf` and `Poppins-Medium.otf` for
export outlining; CSS font files can additionally be woff2. Use embedded data URLs
for logos and watermarks. Preserve 21 SFC roles, 20 BBS roles, and SFC multi-parent
connections. BBS clear space and centered watermark are approved.

## UI agent ownership

Own `src/components/**`, `src/styles.css`. Main export:

```ts
export interface WorkspaceProps {
  library: Library; chart: Chart; company: Company;
  svg: string;
  selectedRoleId: string | null;
  onSelectRole: (id: string | null) => void;
  actions: WorkspaceActions;
  canUndo: boolean; canRedo: boolean;
  saveStatus: string; exporting: boolean;
  notice: { type: 'error' | 'success'; message: string } | null;
}
export default function Workspace(props: WorkspaceProps): React.ReactNode;
```

Root owns App.tsx and controller. SVG injected into canvas wrapper; delegate role
selection using `data-role-id`. UI owns zoom/pan, hierarchy, library, inspector,
new-chart dialog, and file inputs. Clear tooltips/labels and responsive panels.
Use lucide-react for icons. Warm neutral editor, minimal chrome, brand colors on
document. Expose role title, line breaks, kind, reporting parents, sibling order,
position; company branding and logo upload; exports and project backup/import.
Logo upload should set embedded data URL. Provide watermark controls, logo size
and clear space in mm; SVG page units are points, mm = points * 25.4 / 72.

## Persistence/export agent ownership

Own `src/lib/storage.ts`, `src/lib/export.ts`, own focused tests if useful.
Export:

```ts
export async function loadLibrary(): Promise<Library | null>;
export async function saveLibrary(library: Library): Promise<void>;
export function downloadProject(library: Library): void;
export async function readProject(file: File): Promise<Library>;
export async function exportChart(svg: SVGSVGElement, chart: Chart, format: ExportFormat): Promise<void>;
```

Prefer IndexedDB for artwork capacity; validate imported structure, limits, IDs,
edges/cycles; reject unsafe/external image URLs. Project files include all data.
PNG 300 DPI, PDF A3 landscape, no UI. Root installs jspdf, svg2pdf.js, opentype.js;
outline SVG text using the local OTF fonts for reliable PDF and PNG matching.
Bundle embedded logos/images, handle errors, avoid foreignObject renderers. Do
not depend on Python or Downloads in runtime. Root owns build dependencies.

## Root ownership

Own package/config files, `src/types.ts`, `src/App.tsx`, `src/main.tsx`, integration,
verification, documentation, and preview server. Existing files under `reference/`
are preserved. App replaces root index.html; bbs.html may become a compatibility
redirect only after the new route works. No commits or deployment requested.
