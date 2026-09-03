import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlignHorizontalSpaceAround, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, Check, ChevronDown,
  Download, FileArchive, FileImage, FilePlus2, ImagePlus, LayoutTemplate, MoreHorizontal, Plus,
  Redo2, RotateCcw, Save, Settings2, Sliders, Trash2, Undo2, Upload, Users, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { Branding, Chart, Company, Library, Role, RoleKind, WorkspaceActions } from '../types';
import { DEFAULT_LAYOUT_SETTINGS } from '../data/seeds';

export interface WorkspaceProps {
  library: Library;
  chart: Chart;
  company: Company;
  svg: string;
  selectedRoleId: string | null;
  onSelectRole: (id: string | null) => void;
  actions: WorkspaceActions;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: string;
  exporting: boolean;
  notice: { type: 'error' | 'success'; message: string } | null;
}

type CommitInputProps = {
  label: string;
  value: string | number;
  onCommit: (value: string) => void;
  type?: 'text' | 'number' | 'color';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  multiline?: boolean;
};

function CommitInput({ label, value, onCommit, type = 'text', min, max, step, suffix, multiline }: CommitInputProps) {
  const common = {
    defaultValue: value,
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => onCommit(event.currentTarget.value),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Escape') { event.currentTarget.value = String(value); event.currentTarget.blur(); }
      if (event.key === 'Enter' && (!multiline || !event.shiftKey)) { event.preventDefault(); event.currentTarget.blur(); }
    },
  };
  return <label className="field"><span>{label}</span><div className="field-control">
    {multiline ? <textarea key={String(value)} {...common} rows={3} /> : <input key={String(value)} {...common} type={type} min={min} max={max} step={step} />}
    {suffix ? <em>{suffix}</em> : null}
  </div></label>;
}

function IconButton({ label, children, disabled, onClick, active }: { label: string; children: ReactNode; disabled?: boolean; onClick: () => void; active?: boolean }) {
  return <button className={`icon-button${active ? ' is-active' : ''}`} type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

function roleDepths(chart: Chart) {
  const parents = new Map<string, string[]>();
  chart.connections.forEach((connection) => parents.set(connection.targetId, [...(parents.get(connection.targetId) ?? []), connection.sourceId]));
  const memo = new Map<string, number>();
  const get = (id: string, trail = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (trail.has(id)) return 0;
    const list = parents.get(id) ?? [];
    const depth = list.length ? Math.min(...list.map((parent) => get(parent, new Set([...trail, id])))) + 1 : 0;
    memo.set(id, depth); return depth;
  };
  chart.roles.forEach((role) => get(role.id));
  return memo;
}

function NewChartDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (template: 'bbs' | 'sfc', name: string) => void }) {
  const [template, setTemplate] = useState<'bbs' | 'sfc'>('bbs');
  const [name, setName] = useState('New organizational chart');
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-chart-title">
      <div><span className="eyebrow">New chart</span><h2 id="new-chart-title">Start from a template</h2><p>Use an approved layout and edit it for the next company.</p></div>
      <div className="template-options">
        {(['bbs', 'sfc'] as const).map((id) => <button type="button" key={id} className={`template-card${template === id ? ' selected' : ''}`} onClick={() => setTemplate(id)}>
          <span className={`template-swatch ${id}`}><LayoutTemplate size={22} /></span><span><strong>{id.toUpperCase()}</strong><small>{id === 'bbs' ? 'Forest green and gold' : 'Warm burgundy and gold'}</small></span>{template === id ? <Check size={16} /> : null}
        </button>)}
      </div>
      <label className="field"><span>Chart name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="button" disabled={!name.trim()} onClick={() => onCreate(template, name.trim())}>Create chart</button></div>
    </div>
  </div>;
}

function LibraryPanel({ library, chart, selectedRoleId, onSelectRole, actions }: Pick<WorkspaceProps, 'library' | 'chart' | 'selectedRoleId' | 'onSelectRole' | 'actions'>) {
  const depths = useMemo(() => roleDepths(chart), [chart]);
  const roles = useMemo(() => [...chart.roles].sort((a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0) || a.order - b.order || a.x - b.x), [chart.roles, depths]);
  const [menu, setMenu] = useState(false);
  return <aside className="library-panel">
    <div className="brand-mark"><span>OC</span><div><strong>Org Chart</strong><small>Studio</small></div></div>
    <div className="library-heading"><span>Charts</span><button type="button" onClick={() => document.dispatchEvent(new CustomEvent('open-new-chart'))} aria-label="New chart"><Plus size={16} /></button></div>
    <div className="chart-picker">
      <button type="button" className="chart-picker-button" onClick={() => setMenu((value) => !value)} aria-expanded={menu}><span className={`company-dot ${chart.templateId}`} /> <span><strong>{chart.name}</strong><small>{chart.roles.length} positions</small></span><ChevronDown size={15} /></button>
      {menu ? <div className="chart-menu">{library.charts.map((item) => <button type="button" key={item.id} className={item.id === chart.id ? 'active' : ''} onClick={() => { actions.selectChart(item.id); setMenu(false); }}><span className={`company-dot ${item.templateId}`} /><span>{item.name}</span>{item.id === chart.id ? <Check size={14} /> : null}</button>)}</div> : null}
    </div>
    <div className="chart-actions"><button type="button" onClick={actions.duplicateChart}><FilePlus2 size={14} /> Duplicate</button><button type="button" onClick={() => { const name = window.prompt('Chart name', chart.name); if (name?.trim()) actions.renameChart(name.trim()); }}><Settings2 size={14} /> Rename</button></div>
    <div className="outline-heading"><span>Hierarchy</span><button type="button" title="Add top-level position" onClick={() => actions.addRole()}><Plus size={15} /></button></div>
    <div className="role-list" role="tree" aria-label="Positions">{roles.map((role) => {
      const depth = depths.get(role.id) ?? 0;
      return <button type="button" role="treeitem" aria-selected={selectedRoleId === role.id} key={role.id} className={`role-row${selectedRoleId === role.id ? ' selected' : ''}`} style={{ '--depth': depth } as React.CSSProperties} onClick={() => onSelectRole(role.id)}><span className={`role-kind ${role.kind}`} /><span>{role.title}</span></button>;
    })}</div>
    <div className="library-footer"><span className="local-pill"><Save size={13} /> Saved on this Mac</span></div>
  </aside>;
}

function TopBar({ chart, actions, canUndo, canRedo, saveStatus, exporting }: Pick<WorkspaceProps, 'chart' | 'actions' | 'canUndo' | 'canRedo' | 'saveStatus' | 'exporting'>) {
  return <header className="topbar">
    <div className="document-title"><span className={`company-dot ${chart.templateId}`} /><div><strong>{chart.name}</strong><small>{saveStatus}</small></div></div>
    <div className="topbar-cluster"><IconButton label="Undo" disabled={!canUndo} onClick={actions.undo}><Undo2 size={17} /></IconButton><IconButton label="Redo" disabled={!canRedo} onClick={actions.redo}><Redo2 size={17} /></IconButton><span className="toolbar-divider" /><button className="toolbar-button" type="button" onClick={actions.autoLayout}><AlignHorizontalSpaceAround size={16} /> Auto arrange</button></div>
    <div className="topbar-cluster export-cluster"><button className="toolbar-button" type="button" onClick={actions.exportProject}><FileArchive size={16} /> Backup</button><label className="toolbar-button file-button"><Upload size={16} /> Import<input type="file" accept=".json,.orgchart.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) actions.importProject(file); event.currentTarget.value = ''; }} /></label><button className="toolbar-button" disabled={exporting} type="button" onClick={() => actions.exportChart('png')}><FileImage size={16} /> PNG</button><button className="button primary export" disabled={exporting} type="button" onClick={() => actions.exportChart('pdf')}><Download size={16} /> {exporting ? 'Preparing…' : 'Export PDF'}</button></div>
  </header>;
}

function Canvas({ svg, chart, selectedRoleId, onSelectRole }: Pick<WorkspaceProps, 'svg' | 'chart' | 'selectedRoleId' | 'onSelectRole'>) {
  const [zoom, setZoom] = useState(0.78);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectFromEvent = (target: EventTarget | null) => {
    const element = target instanceof Element ? target.closest<SVGGElement>('[data-role-id]') : null;
    onSelectRole(element?.dataset.roleId ?? null);
  };
  return <main className="canvas-area">
    <div className="canvas-toolbar"><span>A3 landscape</span><div><IconButton label="Zoom out" onClick={() => setZoom((value) => Math.max(.42, value - .1))}><ZoomOut size={16} /></IconButton><button className="zoom-readout" type="button" onClick={() => setZoom(.78)}>{Math.round(zoom * 100)}%</button><IconButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}><ZoomIn size={16} /></IconButton></div></div>
    <div className="canvas-scroll" ref={scrollRef} onClick={(event) => selectFromEvent(event.target)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectFromEvent(event.target); }}>
      <div className="page-zoom" style={{ width: `${zoom * 100}%` }}><div className="paper" data-template={chart.templateId} dangerouslySetInnerHTML={{ __html: svg }} />{selectedRoleId ? <span className="selection-hint">Position selected</span> : null}</div>
    </div>
  </main>;
}

const asNumber = (value: string, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const kinds: RoleKind[] = ['ceo', 'commissioner', 'executive', 'manager', 'staff'];

function PositionInspector({ role, chart, actions }: { role: Role; chart: Chart; actions: WorkspaceActions }) {
  const parentIds = chart.connections.filter((connection) => connection.targetId === role.id).map((connection) => connection.sourceId);
  const parentId = chart.connections.find((connection) => connection.targetId === role.id)?.sourceId ?? null;
  const siblings = chart.roles
    .filter((item) => (chart.connections.find((connection) => connection.targetId === item.id)?.sourceId ?? null) === parentId)
    .sort((a, b) => a.order - b.order || a.x - b.x);
  const siblingIndex = siblings.findIndex((item) => item.id === role.id);
  const isFirst = siblingIndex <= 0;
  const isLast = siblingIndex >= siblings.length - 1;

  return <>
    <section className="inspector-section"><div className="section-title"><span>Position</span><small>{role.kind}</small></div>
      <CommitInput label="Title and line breaks" value={(role.lines?.length ? role.lines : [role.title]).join('\n')} multiline onCommit={(value) => { const lines = value.split('\n').map((line) => line.trim()).filter(Boolean); if (lines.length) actions.updateRole(role.id, { title: lines.join(' '), lines }); }} />
      <label className="field"><span>Style</span><select value={role.kind} onChange={(event) => actions.updateRole(role.id, { kind: event.target.value as RoleKind })}>{kinds.map((kind) => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label>
    </section>
    <section className="inspector-section"><div className="section-title"><span>Reports to</span><small>{parentIds.length || 'None'}</small></div><div className="parent-list">{chart.roles.filter((item) => item.id !== role.id).map((item) => <label key={item.id}><input type="checkbox" checked={parentIds.includes(item.id)} onChange={(event) => actions.setParents(role.id, event.target.checked ? [...parentIds, item.id] : parentIds.filter((id) => id !== item.id))} /><span>{item.title}</span></label>)}</div></section>
    <section className="inspector-section">
      <div className="section-title"><span>Order</span><small>{siblings.length > 1 ? `#${siblingIndex + 1} of ${siblings.length}` : 'Single'}</small></div>
      <div className="order-control-bar">
        <button className="button secondary order-btn" type="button" disabled={isFirst} onClick={() => actions.reorderRole(role.id, -1)} title="Move position earlier">
          <ArrowLeft size={14} /> Earlier
        </button>
        <button className="button secondary order-btn" type="button" disabled={isLast} onClick={() => actions.reorderRole(role.id, 1)} title="Move position later">
          Later <ArrowRight size={14} />
        </button>
      </div>
    </section>
    <section className="inspector-actions">
      <button className="button secondary" type="button" onClick={() => actions.addRole(role.id)}><Plus size={15} /> Add report</button>
      <div>
        <IconButton label="Move earlier" disabled={isFirst} onClick={() => actions.reorderRole(role.id, -1)}><ArrowUp size={15} /></IconButton>
        <IconButton label="Move later" disabled={isLast} onClick={() => actions.reorderRole(role.id, 1)}><ArrowDown size={15} /></IconButton>
        <IconButton label="Delete position" onClick={() => actions.deleteRole(role.id)}><Trash2 size={15} /></IconButton>
      </div>
    </section>
  </>;
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = 'pt',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return <div className="gap-control">
    <div className="gap-control-header">
      <span>{label}</span>
      <span className="gap-value-badge">{Math.round(value)} {suffix}</span>
    </div>
    <div className="gap-slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="gap-slider"
        aria-label={label}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Math.round(value)}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (Number.isFinite(val)) onChange(val);
        }}
        className="gap-number-input"
        aria-label={`${label} numeric`}
      />
    </div>
  </div>;
}

function LayoutInspector({ chart, actions }: { chart: Chart; actions: WorkspaceActions }) {
  const layout = chart.layout ?? DEFAULT_LAYOUT_SETTINGS[chart.templateId];
  return <>
    <section className="inspector-section">
      <div className="section-title"><span>Typography</span><small>All positions</small></div>
      <RangeControl
        label="Title Font Size"
        value={layout.titleFontSize ?? 13.5}
        min={9}
        max={20}
        step={0.5}
        suffix="pt"
        onChange={(val) => actions.updateLayout({ titleFontSize: val })}
      />
    </section>
    <section className="inspector-section">
      <div className="section-title"><span>Position Spacing</span><small>{chart.templateId.toUpperCase()}</small></div>
      <RangeControl
        label="Horizontal Gap"
        value={layout.horizontalGap}
        min={8}
        max={60}
        step={1}
        suffix="pt"
        onChange={(val) => actions.updateLayout({ horizontalGap: val })}
      />
      <RangeControl
        label="Vertical Gap"
        value={layout.verticalGap}
        min={25}
        max={120}
        step={1}
        suffix="pt"
        onChange={(val) => actions.updateLayout({ verticalGap: val })}
      />
      <RangeControl
        label="Staff Gap"
        value={layout.staffGap}
        min={4}
        max={40}
        step={1}
        suffix="pt"
        onChange={(val) => actions.updateLayout({ staffGap: val })}
      />
    </section>
    <section className="inspector-section">
      <div className="section-title"><span>Layout Actions</span><Sliders size={15} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="button secondary" type="button" onClick={actions.autoLayout} style={{ width: '100%' }}>
          <AlignHorizontalSpaceAround size={15} /> Re-align chart
        </button>
        <button className="button secondary" type="button" onClick={actions.resetLayout} style={{ width: '100%' }}>
          <RotateCcw size={15} /> Reset gaps to default
        </button>
      </div>
    </section>
  </>;
}

function ImageUpload({ label, onRead }: { label: string; onRead: (dataUrl: string) => void }) {
  return <label className="upload-control"><ImagePlus size={16} /><span>{label}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => onRead(String(reader.result)); reader.readAsDataURL(file); event.currentTarget.value = ''; }} /></label>;
}

function BrandInspector({ company, actions }: { company: Company; actions: WorkspaceActions }) {
  const b = company.branding;
  const updateBox = (key: 'logoBox' | 'watermarkBox', patch: Partial<Branding['logoBox']>) => actions.updateBranding({ [key]: { ...b[key], ...patch } });
  const ptToMm = (value: number) => value * 25.4 / 72;
  const mmToPt = (value: string, fallback: number) => Number.isFinite(Number(value)) ? Number(value) * 72 / 25.4 : fallback;
  return <>
    <section className="inspector-section"><div className="section-title"><span>Company</span><Building2 size={15} /></div><CommitInput label="Company name" value={company.name} onCommit={(value) => value.trim() && actions.renameCompany(value.trim())} /></section>
    <section className="inspector-section"><div className="section-title"><span>Colors</span><small>Hex</small></div><div className="color-grid">{(['primary', 'accent', 'border', 'text', 'background'] as const).map((key) => <CommitInput key={key} label={key[0].toUpperCase() + key.slice(1)} value={b[key]} type="color" onCommit={(value) => actions.updateBranding({ [key]: value })} />)}</div></section>
    <section className="inspector-section"><div className="section-title"><span>Logo</span><small>Safe area</small></div><ImageUpload label="Replace logo" onRead={(logoDataUrl) => actions.updateBranding({ logoDataUrl })} /><div className="placement-grid"><CommitInput label="Width" value={ptToMm(b.logoBox.width).toFixed(1)} type="number" min={10} step={1} suffix="mm" onCommit={(value) => updateBox('logoBox', { width: mmToPt(value, b.logoBox.width) })} /><CommitInput label="Clear space" value={ptToMm(b.logoClearSpace).toFixed(1)} type="number" min={0} step={1} suffix="mm" onCommit={(value) => actions.updateBranding({ logoClearSpace: mmToPt(value, b.logoClearSpace) })} /><CommitInput label="X" value={ptToMm(b.logoBox.x).toFixed(1)} type="number" suffix="mm" onCommit={(value) => updateBox('logoBox', { x: mmToPt(value, b.logoBox.x) })} /><CommitInput label="Y" value={ptToMm(b.logoBox.y).toFixed(1)} type="number" suffix="mm" onCommit={(value) => updateBox('logoBox', { y: mmToPt(value, b.logoBox.y) })} /></div></section>
    <section className="inspector-section"><div className="section-title"><span>Watermark</span><small>{Math.round(b.watermarkOpacity * 100)}%</small></div><ImageUpload label="Replace watermark" onRead={(watermarkDataUrl) => actions.updateBranding({ watermarkDataUrl })} /><CommitInput label="Opacity" value={Math.round(b.watermarkOpacity * 100)} type="number" min={0} max={100} suffix="%" onCommit={(value) => actions.updateBranding({ watermarkOpacity: Math.max(0, Math.min(1, asNumber(value, b.watermarkOpacity * 100) / 100)) })} /><div className="placement-grid"><CommitInput label="X" value={Math.round(b.watermarkBox.x)} type="number" onCommit={(value) => updateBox('watermarkBox', { x: asNumber(value, b.watermarkBox.x) })} /><CommitInput label="Y" value={Math.round(b.watermarkBox.y)} type="number" onCommit={(value) => updateBox('watermarkBox', { y: asNumber(value, b.watermarkBox.y) })} /><CommitInput label="Width" value={Math.round(b.watermarkBox.width)} type="number" min={30} onCommit={(value) => updateBox('watermarkBox', { width: asNumber(value, b.watermarkBox.width) })} /><CommitInput label="Height" value={Math.round(b.watermarkBox.height)} type="number" min={30} onCommit={(value) => updateBox('watermarkBox', { height: asNumber(value, b.watermarkBox.height) })} /></div></section>
    <section className="inspector-section"><div className="section-title"><span>Footer</span><small>Lines</small></div><CommitInput label="Left" value={b.footerLeft.join('\n')} multiline onCommit={(value) => actions.updateBranding({ footerLeft: value.split('\n') })} /><CommitInput label="Right" value={b.footerRight.join('\n')} multiline onCommit={(value) => actions.updateBranding({ footerRight: value.split('\n') })} /></section>
  </>;
}

function Inspector({ chart, company, selectedRoleId, actions }: Pick<WorkspaceProps, 'chart' | 'company' | 'selectedRoleId' | 'actions'>) {
  const [tab, setTab] = useState<'position' | 'layout' | 'brand'>('position');
  const role = chart.roles.find((item) => item.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (selectedRoleId) setTab('position');
  }, [selectedRoleId]);

  return <aside className="inspector">
    <div className="inspector-tabs">
      <button type="button" className={tab === 'position' ? 'active' : ''} onClick={() => setTab('position')}><Users size={15} /> Position</button>
      <button type="button" className={tab === 'layout' ? 'active' : ''} onClick={() => setTab('layout')}><Sliders size={15} /> Layout</button>
      <button type="button" className={tab === 'brand' ? 'active' : ''} onClick={() => setTab('brand')}><Building2 size={15} /> Brand</button>
    </div>
    <div className="inspector-scroll">
      {tab === 'layout' ? (
        <LayoutInspector chart={chart} actions={actions} />
      ) : tab === 'brand' ? (
        <BrandInspector company={company} actions={actions} />
      ) : role ? (
        <PositionInspector role={role} chart={chart} actions={actions} />
      ) : (
        <div className="empty-inspector">
          <span><Users size={21} /></span>
          <h3>Select a position</h3>
          <p>Choose a position from the chart or hierarchy to edit its title and reporting line.</p>
          <button className="button secondary" type="button" onClick={() => actions.addRole()}><Plus size={15} /> Add position</button>
        </div>
      )}
    </div>
  </aside>;
}

export default function Workspace(props: WorkspaceProps) {
  const [newChart, setNewChart] = useState(false);
  useEffect(() => {
    const listener = () => setNewChart(true);
    document.addEventListener('open-new-chart', listener);
    return () => document.removeEventListener('open-new-chart', listener);
  }, []);
  return <div className="app-shell">
    <LibraryPanel {...props} />
    <section className="workspace"><TopBar {...props} /><div className="workbench"><Canvas {...props} /><Inspector {...props} /></div></section>
    {props.notice ? <div className={`notice ${props.notice.type}`} role="status"><span>{props.notice.type === 'success' ? <Check size={17} /> : <RotateCcw size={17} />}</span><p>{props.notice.message}</p><button type="button" onClick={props.actions.dismissNotice}><MoreHorizontal size={17} /></button></div> : null}
    {newChart ? <NewChartDialog onClose={() => setNewChart(false)} onCreate={(template, name) => { props.actions.createChart(template, name); setNewChart(false); }} /> : null}
  </div>;
}
