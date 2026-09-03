import type { Role } from '../types';

export type ChartTemplate = 'bbs' | 'sfc';

type StaffBoxMetrics = {
  width: number;
  oneLineHeight: number;
  twoLineHeight: number;
};

const STAFF_BOX_METRICS: Record<ChartTemplate, StaffBoxMetrics> = {
  bbs: { width: 166, oneLineHeight: 42, twoLineHeight: 52 },
  sfc: { width: 142.537, oneLineHeight: 29.933, twoLineHeight: 59.865 },
};

const cleanLines = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean);

function estimatedTextWidth(text: string, fontSize: number): number {
  return [...text].reduce((width, character) => {
    if (character === ' ') return width + fontSize * 0.28;
    if ('MW@%&'.includes(character)) return width + fontSize * 0.82;
    if ('Iil1.,:;!|'.includes(character)) return width + fontSize * 0.3;
    if (/[A-Z0-9]/.test(character)) return width + fontSize * 0.61;
    return width + fontSize * 0.54;
  }, 0);
}

function wrapInTwoLines(text: string, availableWidth: number, fontSize: number): string[] {
  if (estimatedTextWidth(text, fontSize) <= availableWidth) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];

  let best: { lines: [string, string]; score: number } | null = null;
  for (let index = 1; index < words.length; index += 1) {
    const lines: [string, string] = [words.slice(0, index).join(' '), words.slice(index).join(' ')];
    const widths = lines.map((line) => estimatedTextWidth(line, fontSize));
    const overflow = widths.reduce((sum, width) => sum + Math.max(0, width - availableWidth) ** 2, 0);
    const score = overflow * 100 + Math.abs(widths[0] - widths[1]);
    if (!best || score < best.score) best = { lines, score };
  }
  return best?.lines ?? [text];
}

export function staffBoxMetrics(templateId: ChartTemplate): StaffBoxMetrics {
  return STAFF_BOX_METRICS[templateId];
}

export function roleTextLines(role: Role): string[] {
  const explicit = cleanLines(role.lines ?? []);
  if (role.kind !== 'staff') return explicit.length ? explicit : cleanLines(role.title.split('\n'));
  if (explicit.length > 1) return [explicit[0], explicit.slice(1).join(' ')];

  const text = role.title.trim().replace(/\s+/g, ' ');
  const availableWidth = Math.max(20, role.width - 18);
  return wrapInTwoLines(text, availableWidth, role.fontSize);
}

export function staffBoxHeight(role: Role, templateId: ChartTemplate): number {
  const metrics = staffBoxMetrics(templateId);
  return roleTextLines(role).length > 1 ? metrics.twoLineHeight : metrics.oneLineHeight;
}
