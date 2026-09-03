import type { Chart, Company, Connection, Library, Role, RoleKind } from '../types';

const W = 1190.55;
const H = 841.89;
const now = '2026-09-03T00:00:00.000Z';

const role = (
  id: string,
  title: string,
  kind: RoleKind,
  x: number,
  y: number,
  width: number,
  height: number,
  lines?: string[],
  fontSize = 14.25,
  order = 0,
): Role => ({ id, title, kind, x, y, width, height, lines, fontSize, order });

const edge = (sourceId: string, targetId: string): Connection => ({
  id: `${sourceId}--${targetId}`,
  sourceId,
  targetId,
});

const bbsRoles: Role[] = [
  role('bbs-ceo', 'CEO', 'ceo', 552, 70, 88, 44, ['CEO'], 21.38),
  role('bbs-commissioner', 'Commissioner', 'commissioner', 481, 143, 230, 44),
  role('bbs-chief-executive', 'Chief Executive Officer', 'executive', 469, 216, 254, 48),
  role('bbs-marketing-chief', 'Chief Marketing Officer', 'executive', 50, 318, 220, 58, ['Chief Marketing', 'Officer'], 14.25, 0),
  role('bbs-operation-chief', 'Chief Operation Officer', 'executive', 486, 318, 220, 58, ['Chief Operation', 'Officer'], 14.25, 1),
  role('bbs-finance-chief', 'Chief Finance Officer', 'executive', 922, 318, 220, 58, ['Chief Finance', 'Officer'], 14.25, 2),
  role('bbs-marketing-manager', 'Marketing International Manager', 'manager', 68, 448, 184, 66, ['Marketing', 'International Manager'], 11.5),
  role('bbs-marketing-1', 'Marketing Executive 1', 'staff', 95, 550, 166, 42, undefined, 13.2, 0),
  role('bbs-marketing-2', 'Marketing Executive 2', 'staff', 95, 609, 166, 42, undefined, 13.2, 1),
  role('bbs-marketing-3', 'Marketing Executive 3', 'staff', 95, 668, 166, 42, undefined, 13.2, 2),
  role('bbs-international', 'International', 'manager', 286, 448, 184, 66, ['International'], 13.2, 0),
  role('bbs-export-import', 'Export Import Staff', 'staff', 313, 550, 166, 52, ['Export Import', 'Staff'], 13.2, 0),
  role('bbs-logistics', 'Logistic & Supply Chain Staff', 'staff', 313, 619, 166, 52, ['Logistic &', 'Supply Chain Staff'], 13.2, 1),
  role('bbs-trade', 'Trade Manager', 'manager', 510, 448, 172, 66, ['Trade', 'Manager'], 13.2, 1),
  role('bbs-operational-manager', 'Operational Manager', 'manager', 722, 448, 184, 66, ['Operational', 'Manager'], 13.2, 2),
  role('bbs-legal', 'Legal Staff', 'staff', 749, 550, 166, 42, undefined, 13.2, 0),
  role('bbs-operational', 'Operational Staff', 'staff', 749, 609, 166, 42, undefined, 13.2, 1),
  role('bbs-supporting', 'Supporting Staff', 'staff', 749, 668, 166, 42, undefined, 13.2, 2),
  role('bbs-finance', 'Finance Staff', 'staff', 967, 448, 166, 42, undefined, 13.2, 0),
  role('bbs-tax', 'Tax Staff', 'staff', 967, 507, 166, 42, undefined, 13.2, 1),
];

const bbsConnections = [
  edge('bbs-ceo', 'bbs-commissioner'),
  edge('bbs-commissioner', 'bbs-chief-executive'),
  edge('bbs-chief-executive', 'bbs-marketing-chief'),
  edge('bbs-chief-executive', 'bbs-operation-chief'),
  edge('bbs-chief-executive', 'bbs-finance-chief'),
  edge('bbs-marketing-chief', 'bbs-marketing-manager'),
  edge('bbs-marketing-manager', 'bbs-marketing-1'),
  edge('bbs-marketing-manager', 'bbs-marketing-2'),
  edge('bbs-marketing-manager', 'bbs-marketing-3'),
  edge('bbs-operation-chief', 'bbs-international'),
  edge('bbs-operation-chief', 'bbs-trade'),
  edge('bbs-operation-chief', 'bbs-operational-manager'),
  edge('bbs-international', 'bbs-export-import'),
  edge('bbs-international', 'bbs-logistics'),
  edge('bbs-operational-manager', 'bbs-legal'),
  edge('bbs-operational-manager', 'bbs-operational'),
  edge('bbs-operational-manager', 'bbs-supporting'),
  edge('bbs-finance-chief', 'bbs-finance'),
  edge('bbs-finance-chief', 'bbs-tax'),
];

const sfcRoles: Role[] = [
  role('sfc-ceo', 'CEO', 'ceo', 552.659, 81.4815, 85.522, 42.761, ['CEO'], 21.38),
  role('sfc-president', 'President Director', 'commissioner', 488.5171, 176.4881, 213.805, 42.761),
  role('sfc-finance-director', 'Finance & Accounting Director', 'executive', 352.2388, 266.017, 213.805, 57.015, ['Finance & Accounting', 'Director'], 14.25, 0),
  role('sfc-tax-director', 'Tax Director', 'executive', 623.0561, 266.017, 213.804, 57.015, undefined, 14.25, 1),
  role('sfc-finance-manager', 'Finance & Accounting Internal Manager', 'manager', 88.5444, 385.6929, 199.551, 57.015, ['Finance & Accounting', 'Internal Manager'], 13.5, 0),
  role('sfc-finance-advisor', 'Finance & Accounting Advisor', 'staff', 124.4982, 472.2042, 142.537, 59.865, ['Finance &', 'Accounting Advisor'], 12.8, 0),
  role('sfc-finance-staff', 'Finance Staff', 'staff', 124.4982, 531.633, 142.536, 29.933, undefined, 14.25, 1),
  role('sfc-accounting-staff', 'Accounting Staff', 'staff', 124.4982, 576.096, 142.536, 29.933, undefined, 14.25, 2),
  role('sfc-admin-finance', 'Admin Finance', 'staff', 124.4982, 620.559, 142.536, 29.933, undefined, 14.25, 3),
  role('sfc-tax-manager', 'Tax Internal Manager', 'manager', 359.3633, 385.6929, 199.551, 57.015, ['Tax Internal', 'Manager'], 14.25, 1),
  role('sfc-tax-advisory', 'Tax Advisory', 'staff', 398.085, 472.2042, 142.537, 29.933, undefined, 14.25, 0),
  role('sfc-corporate', 'Corporate Staff', 'staff', 398.085, 516.6671, 142.537, 29.933, undefined, 14.25, 1),
  role('sfc-tax-personal', 'Tax Personal Staff', 'staff', 398.085, 561.13, 142.537, 59.865, ['Tax Personal', 'Staff'], 14.25, 2),
  role('sfc-hr-manager', 'Human Resource and Legal Manager', 'manager', 630.1817, 385.6929, 199.551, 57.015, ['Human Resource', 'And Legal Manager'], 14.25, 2),
  role('sfc-hrd', 'HRD Staff', 'staff', 668.352, 472.2042, 142.537, 29.933, undefined, 14.25, 0),
  role('sfc-legal', 'Legal Staff', 'staff', 668.352, 516.6669, 142.537, 29.933, undefined, 14.25, 1),
  role('sfc-maintenance', 'Maintenance & Support Staff', 'staff', 668.3523, 561.1304, 142.537, 59.865, ['Maintenance &', 'Support Staff'], 14.25, 2),
  role('sfc-marketing-manager', 'Marketing Manager', 'manager', 902.4559, 385.6929, 199.551, 57.015, ['Marketing', 'Manager'], 14.25, 3),
  role('sfc-business-development', 'Business Development Staff', 'staff', 940.124, 472.205, 142.537, 59.865, ['Business', 'Development Staff'], 13.2, 0),
  role('sfc-marketing-staff', 'Marketing Staff', 'staff', 940.124, 546.6, 142.537, 59.865, ['Marketing', 'Staff'], 14.25, 1),
  role('sfc-freelance', 'Marketing Freelance', 'staff', 940.124, 620.996, 142.537, 59.865, ['Marketing', 'Freelance'], 14.25, 2),
];

const sfcManagers = ['sfc-finance-manager', 'sfc-tax-manager', 'sfc-hr-manager', 'sfc-marketing-manager'];
const sfcConnections = [
  edge('sfc-ceo', 'sfc-president'),
  edge('sfc-president', 'sfc-finance-director'),
  edge('sfc-president', 'sfc-tax-director'),
  ...sfcManagers.flatMap((managerId) => [edge('sfc-finance-director', managerId), edge('sfc-tax-director', managerId)]),
  edge('sfc-finance-manager', 'sfc-finance-advisor'),
  edge('sfc-finance-manager', 'sfc-finance-staff'),
  edge('sfc-finance-manager', 'sfc-accounting-staff'),
  edge('sfc-finance-manager', 'sfc-admin-finance'),
  edge('sfc-tax-manager', 'sfc-tax-advisory'),
  edge('sfc-tax-manager', 'sfc-corporate'),
  edge('sfc-tax-manager', 'sfc-tax-personal'),
  edge('sfc-hr-manager', 'sfc-hrd'),
  edge('sfc-hr-manager', 'sfc-legal'),
  edge('sfc-hr-manager', 'sfc-maintenance'),
  edge('sfc-marketing-manager', 'sfc-business-development'),
  edge('sfc-marketing-manager', 'sfc-marketing-staff'),
  edge('sfc-marketing-manager', 'sfc-freelance'),
];

export const companies: Company[] = [
  {
    id: 'company-bbs',
    name: 'PT. Berkah Berjaya Satu',
    shortName: 'BBS',
    branding: {
      primary: '#014917', accent: '#e2ad39', border: '#b5a16e', text: '#193b29', background: '#f7f7f7',
      logoDataUrl: '/assets/bbs-logo.png', logoBox: { x: 62, y: 42, width: 170.08, height: 79.84 }, logoClearSpace: 28.35,
      watermarkDataUrl: '/assets/bbs-logo.png', watermarkBox: { x: 323, y: 160.75, width: 545, height: 520.39 }, watermarkOpacity: 0.04,
      footerLeft: ['PT. BERKAH BERJAYA SATU'], footerRight: ['Excellence in Global Trade'],
    },
  },
  {
    id: 'company-sfc',
    name: 'Sridana Finance Consulting',
    shortName: 'SFC',
    branding: {
      primary: '#5a2028', accent: '#f2d978', border: '#b59074', text: '#1a1b1e', background: '#fcfcfa',
      logoDataUrl: '', logoBox: { x: 45, y: 20, width: 130, height: 125 }, logoClearSpace: 18,
      watermarkDataUrl: '/assets/sfc-artwork.svg', watermarkBox: { x: 0, y: 0, width: W, height: H }, watermarkOpacity: 1,
      footerLeft: ['Jl. Ratna 2A No.12, RT.006/RW.001, Ngagel,', 'Kec. Wonokromo, Surabaya, Jawa Timur 60246'],
      footerRight: ['(+62) 81234567890', 'info@sridana.com'],
    },
  },
];

export const charts: Chart[] = [
  { id: 'chart-bbs', name: 'BBS Organizational Structure', companyId: 'company-bbs', templateId: 'bbs', page: { width: W, height: H }, roles: bbsRoles, connections: bbsConnections, updatedAt: now },
  { id: 'chart-sfc', name: 'SFC Organizational Structure', companyId: 'company-sfc', templateId: 'sfc', page: { width: W, height: H }, roles: sfcRoles, connections: sfcConnections, updatedAt: now },
];

export const seedLibrary: Library = { version: 1, activeChartId: 'chart-sfc', companies, charts };
