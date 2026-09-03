import { validateChart } from './chart';
import type { Branding, Company, Library } from '../types';

const DATABASE = 'org-chart-studio';
const STORE = 'workspace';
const KEY = 'library-v1';
const MAX_PROJECT_BYTES = 25 * 1024 * 1024;

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const safeAsset = (value: unknown) => typeof value === 'string' && (
  value === '' || /^\/assets\/[\w.-]+\.(?:png|jpe?g|webp|svg)$/i.test(value) || /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)
);

function validateBranding(value: unknown): asserts value is Branding {
  if (!isObject(value)) throw new Error('A company is missing its brand settings.');
  for (const key of ['primary', 'accent', 'border', 'text', 'background']) if (typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key] as string)) throw new Error('A brand color is invalid.');
  if (!safeAsset(value.logoDataUrl) || !safeAsset(value.watermarkDataUrl)) throw new Error('Project images must be embedded or use built-in app assets.');
  for (const boxKey of ['logoBox', 'watermarkBox']) {
    const box = value[boxKey];
    if (!isObject(box) || !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(box[key]))) throw new Error('A brand image has invalid dimensions.');
  }
  if (!Number.isFinite(value.logoClearSpace) || !Number.isFinite(value.watermarkOpacity)) throw new Error('Brand image settings are invalid.');
  if (!Array.isArray(value.footerLeft) || !Array.isArray(value.footerRight) || ![...value.footerLeft, ...value.footerRight].every((line) => typeof line === 'string')) throw new Error('Footer content is invalid.');
}

export function validateLibrary(value: unknown): asserts value is Library {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.companies) || !Array.isArray(value.charts)) throw new Error('This is not a supported Org Chart Studio project.');
  if (value.companies.length < 1 || value.companies.length > 100 || value.charts.length < 1 || value.charts.length > 250) throw new Error('The project contains an unsupported number of charts.');
  const companyIds = new Set<string>();
  for (const company of value.companies as Company[]) {
    if (!company?.id || typeof company.name !== 'string' || typeof company.shortName !== 'string' || companyIds.has(company.id)) throw new Error('Company information is incomplete or duplicated.');
    companyIds.add(company.id);
    validateBranding(company.branding);
  }
  const chartIds = new Set<string>();
  for (const chart of value.charts as Library['charts']) {
    if (chartIds.has(chart.id) || !companyIds.has(chart.companyId) || (chart.templateId !== 'bbs' && chart.templateId !== 'sfc')) throw new Error('A chart has invalid company or template information.');
    chartIds.add(chart.id);
    if (chart.roles.length > 500 || chart.connections.length > 2000) throw new Error('A chart is too large to import.');
    validateChart(chart);
  }
  if (typeof value.activeChartId !== 'string' || !chartIds.has(value.activeChartId)) throw new Error('The active chart is missing.');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage could not be opened.'));
  });
}

export async function loadLibrary(): Promise<Library | null> {
  const database = await openDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Saved charts could not be read.'));
    });
    if (value == null) return null;
    validateLibrary(value);
    return structuredClone(value);
  } finally {
    database.close();
  }
}

export async function saveLibrary(library: Library): Promise<void> {
  validateLibrary(library);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(structuredClone(library), KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Your changes could not be saved locally.'));
      transaction.onabort = () => reject(new Error('Your changes could not be saved locally.'));
    });
  } finally {
    database.close();
  }
}

const download = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function downloadProject(library: Library): void {
  validateLibrary(library);
  const date = new Date().toISOString().slice(0, 10);
  download(new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' }), `org-chart-project-${date}.orgchart.json`);
}

export async function readProject(file: File): Promise<Library> {
  if (file.size > MAX_PROJECT_BYTES) throw new Error('The project file is larger than 25 MB.');
  let value: unknown;
  try { value = JSON.parse(await file.text()); } catch { throw new Error('The selected file is not valid JSON.'); }
  validateLibrary(value);
  return structuredClone(value);
}
