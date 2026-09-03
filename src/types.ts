export type RoleKind = 'ceo' | 'executive' | 'commissioner' | 'manager' | 'staff';
export interface Box { x: number; y: number; width: number; height: number }
export interface Role extends Box {
  id: string;
  title: string;
  lines?: string[];
  kind: RoleKind;
  fontSize: number;
  order: number;
}
export interface Connection { id: string; sourceId: string; targetId: string }
export interface Branding {
  primary: string;
  accent: string;
  border: string;
  text: string;
  background: string;
  logoDataUrl: string;
  logoBox: Box;
  logoClearSpace: number;
  watermarkDataUrl: string;
  watermarkBox: Box;
  watermarkOpacity: number;
  footerLeft: string[];
  footerRight: string[];
}
export interface Company { id: string; name: string; shortName: string; branding: Branding }
export interface ChartLayoutSettings {
  horizontalGap: number;
  verticalGap: number;
  staffGap: number;
  staffTopGap?: number;
  titleFontSize?: number;
}
export interface Chart {
  id: string;
  name: string;
  companyId: string;
  templateId: 'bbs' | 'sfc';
  page: { width: number; height: number };
  roles: Role[];
  connections: Connection[];
  updatedAt: string;
  layout?: ChartLayoutSettings;
}
export interface Library {
  version: 1;
  activeChartId: string;
  companies: Company[];
  charts: Chart[];
}
export type ExportFormat = 'pdf' | 'png';
export interface WorkspaceActions {
  selectChart: (id: string) => void;
  createChart: (templateId: 'bbs' | 'sfc', name: string) => void;
  duplicateChart: () => void;
  renameChart: (name: string) => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  addRole: (parentId?: string) => void;
  deleteRole: (id: string) => void;
  setParents: (id: string, parentIds: string[]) => void;
  reorderRole: (id: string, direction: -1 | 1) => void;
  autoLayout: () => void;
  updateLayout: (patch: Partial<ChartLayoutSettings>) => void;
  resetLayout: () => void;
  updateBranding: (patch: Partial<Branding>) => void;
  renameCompany: (name: string) => void;
  undo: () => void;
  redo: () => void;
  exportChart: (format: ExportFormat) => void;
  exportProject: () => void;
  importProject: (file: File) => void;
  dismissNotice: () => void;
}
