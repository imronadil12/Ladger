import { useCallback, useEffect, useMemo, useState } from 'react';
import Workspace from './components/Workspace';
import { DEFAULT_LAYOUT_SETTINGS, seedLibrary } from './data/seeds';
import { addRole, autoLayout, normalizeStaffRoles, removeRole, reorderRole, setRoleParents, validateChart } from './lib/chart';
import { exportChart as downloadChart } from './lib/export';
import { downloadProject, loadLibrary, readProject, saveLibrary } from './lib/storage';
import { renderChartSvg } from './lib/render';
import type { Branding, Chart, ChartLayoutSettings, Company, ExportFormat, Library, Role, WorkspaceActions } from './types';

type History = { past: Library[]; present: Library; future: Library[] };
type Notice = { type: 'error' | 'success'; message: string } | null;

const clone = <T,>(value: T): T => structuredClone(value);
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';
const normalizeLibrary = (library: Library): Library => ({
  ...library,
  charts: library.charts.map((chart) => {
    const layout = chart.layout ?? clone(DEFAULT_LAYOUT_SETTINGS[chart.templateId]);
    return autoLayout({ ...chart, layout });
  }),
});

function duplicateTemplate(library: Library, source: Chart, name: string): { company: Company; chart: Chart } {
  const sourceCompany = library.companies.find((company) => company.id === source.companyId)!;
  const company = clone(sourceCompany);
  company.id = uid('company');
  const chart = clone(source);
  chart.id = uid('chart');
  chart.companyId = company.id;
  chart.name = name;
  chart.updatedAt = new Date().toISOString();
  const roleIds = new Map<string, string>();
  chart.roles = chart.roles.map((role) => {
    const id = uid('role'); roleIds.set(role.id, id); return { ...role, id };
  });
  chart.connections = chart.connections.map((connection) => ({ id: uid('connection'), sourceId: roleIds.get(connection.sourceId)!, targetId: roleIds.get(connection.targetId)! }));
  return { company, chart };
}

export default function App() {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: clone(seedLibrary), future: [] }));
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Loading saved charts…');
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const library = history.present;
  const chart = library.charts.find((item) => item.id === library.activeChartId) ?? library.charts[0];
  const company = library.companies.find((item) => item.id === chart.companyId) ?? library.companies[0];

  useEffect(() => {
    let active = true;
    loadLibrary().then((saved) => {
      if (!active) return;
      const requested = new URLSearchParams(window.location.search).get('chart');
      const present = normalizeLibrary(saved ?? clone(seedLibrary));
      if (requested && present.charts.some((item) => item.id === requested)) present.activeChartId = requested;
      setHistory({ past: [], present, future: [] });
      setReady(true); setSaveStatus(saved ? 'Saved locally' : 'New local workspace');
    }).catch((error) => {
      if (!active) return;
      setReady(true); setSaveStatus('Local save unavailable'); setNotice({ type: 'error', message: `${message(error)} The built-in charts are still available.` });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveStatus('Saving…');
    const timer = window.setTimeout(() => saveLibrary(library).then(() => setSaveStatus('Saved locally')).catch((error) => { setSaveStatus('Save failed'); setNotice({ type: 'error', message: message(error) }); }), 450);
    return () => window.clearTimeout(timer);
  }, [library, ready]);

  useEffect(() => {
    if (!ready) return;
    if (selectedRoleId && !chart.roles.some((role) => role.id === selectedRoleId)) setSelectedRoleId(null);
    const url = new URL(window.location.href); url.pathname = '/'; url.searchParams.set('chart', chart.id); window.history.replaceState(null, '', url);
  }, [chart.id, chart.roles, ready, selectedRoleId]);

  const commit = useCallback((change: (library: Library) => Library) => {
    setHistory((current) => {
      try {
        const next = change(clone(current.present));
        return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
      } catch (error) {
        setNotice({ type: 'error', message: message(error) });
        return current;
      }
    });
  }, []);

  const updateActiveChart = useCallback((library: Library, update: (chart: Chart) => Chart): Library => {
    const index = library.charts.findIndex((item) => item.id === library.activeChartId);
    const next = normalizeStaffRoles(update(library.charts[index])); validateChart(next); library.charts[index] = next; return library;
  }, []);

  const actions = useMemo<WorkspaceActions>(() => ({
    selectChart: (chartId) => {
      if (!library.charts.some((item) => item.id === chartId)) return;
      setHistory((current) => ({ ...current, present: { ...current.present, activeChartId: chartId } })); setSelectedRoleId(null);
    },
    createChart: (templateId, name) => commit((draft) => {
      const source = draft.charts.find((item) => item.templateId === templateId) ?? draft.charts[0];
      const created = duplicateTemplate(draft, source, name);
      draft.companies.push(created.company); draft.charts.push(created.chart); draft.activeChartId = created.chart.id; setSelectedRoleId(null); return draft;
    }),
    duplicateChart: () => commit((draft) => {
      const source = draft.charts.find((item) => item.id === draft.activeChartId)!;
      const created = duplicateTemplate(draft, source, `${source.name} copy`);
      draft.companies.push(created.company); draft.charts.push(created.chart); draft.activeChartId = created.chart.id; setSelectedRoleId(null); return draft;
    }),
    renameChart: (name) => commit((draft) => updateActiveChart(draft, (item) => ({ ...item, name, updatedAt: new Date().toISOString() }))),
    updateRole: (roleId, patch) => commit((draft) => updateActiveChart(draft, (item) => {
      const next = clone(item); const index = next.roles.findIndex((role) => role.id === roleId);
      if (index < 0) throw new Error('The selected position no longer exists.');
      next.roles[index] = { ...next.roles[index], ...patch } as Role;
      if (!next.roles[index].title.trim()) throw new Error('A position title cannot be empty.');
      next.updatedAt = new Date().toISOString();
      return autoLayout(next);
    })),
    addRole: (parentId) => commit((draft) => updateActiveChart(draft, (item) => {
      const before = new Set(item.roles.map((role) => role.id)); const next = addRole(item, parentId);
      setSelectedRoleId(next.roles.find((role) => !before.has(role.id))?.id ?? null); return next;
    })),
    deleteRole: (roleId) => {
      const selected = chart.roles.find((role) => role.id === roleId);
      if (!selected || !window.confirm(`Delete “${selected.title}”? Its direct reports will move to its reporting position.`)) return;
      commit((draft) => updateActiveChart(draft, (item) => removeRole(item, roleId))); setSelectedRoleId(null);
    },
    setParents: (roleId, parentIds) => commit((draft) => updateActiveChart(draft, (item) => setRoleParents(item, roleId, parentIds))),
    reorderRole: (roleId, direction) => commit((draft) => updateActiveChart(draft, (item) => reorderRole(item, roleId, direction))),
    autoLayout: () => commit((draft) => updateActiveChart(draft, autoLayout)),
    updateLayout: (patch: Partial<ChartLayoutSettings>) => commit((draft) => updateActiveChart(draft, (item) => {
      const currentLayout = item.layout ?? clone(DEFAULT_LAYOUT_SETTINGS[item.templateId]);
      const nextLayout = { ...currentLayout, ...patch };
      return autoLayout({ ...item, layout: nextLayout, updatedAt: new Date().toISOString() });
    })),
    resetLayout: () => commit((draft) => updateActiveChart(draft, (item) => {
      return autoLayout({ ...item, layout: clone(DEFAULT_LAYOUT_SETTINGS[item.templateId]), updatedAt: new Date().toISOString() });
    })),
    updateBranding: (patch: Partial<Branding>) => commit((draft) => {
      const currentChart = draft.charts.find((item) => item.id === draft.activeChartId)!;
      const index = draft.companies.findIndex((item) => item.id === currentChart.companyId);
      draft.companies[index] = { ...draft.companies[index], branding: { ...draft.companies[index].branding, ...patch } }; return draft;
    }),
    renameCompany: (name) => commit((draft) => {
      const currentChart = draft.charts.find((item) => item.id === draft.activeChartId)!;
      const index = draft.companies.findIndex((item) => item.id === currentChart.companyId);
      draft.companies[index] = { ...draft.companies[index], name }; return draft;
    }),
    undo: () => setHistory((current) => current.past.length ? { past: current.past.slice(0, -1), present: current.past.at(-1)!, future: [current.present, ...current.future].slice(0, 50) } : current),
    redo: () => setHistory((current) => current.future.length ? { past: [...current.past, current.present].slice(-50), present: current.future[0], future: current.future.slice(1) } : current),
    exportChart: (format: ExportFormat) => {
      const svg = document.getElementById('chart-svg');
      if (!(svg instanceof SVGSVGElement)) { setNotice({ type: 'error', message: 'The chart preview is not ready to export.' }); return; }
      setExporting(true);
      downloadChart(svg, chart, format).then(() => setNotice({ type: 'success', message: `${format.toUpperCase()} export created from the current chart.` })).catch((error) => setNotice({ type: 'error', message: message(error) })).finally(() => setExporting(false));
    },
    exportProject: () => { try { downloadProject(library); setNotice({ type: 'success', message: 'Editable project backup downloaded.' }); } catch (error) { setNotice({ type: 'error', message: message(error) }); } },
    importProject: (file) => { readProject(file).then((imported) => { setHistory((current) => ({ past: [...current.past, current.present].slice(-50), present: normalizeLibrary(imported), future: [] })); setSelectedRoleId(null); setNotice({ type: 'success', message: 'Project imported and saved locally.' }); }).catch((error) => setNotice({ type: 'error', message: message(error) })); },
    dismissNotice: () => setNotice(null),
  }), [chart, commit, library, updateActiveChart]);

  const svg = useMemo(() => renderChartSvg(chart, company), [chart, company]);
  if (!ready) return <div className="loading-screen"><span>OC</span><p>Opening your charts…</p></div>;
  return <Workspace library={library} chart={chart} company={company} svg={svg} selectedRoleId={selectedRoleId} onSelectRole={setSelectedRoleId} actions={actions} canUndo={Boolean(history.past.length)} canRedo={Boolean(history.future.length)} saveStatus={saveStatus} exporting={exporting} notice={notice} />;
}
