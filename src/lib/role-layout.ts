import type { Role } from '../types';

export type ChartTemplate = 'bbs' | 'sfc';

export const MIN_ROLE_WIDTH = 240;
export const STAFF_LINE_SPACE = 26;

type StaffBoxMetrics = {
  width: number;
  oneLineHeight: number;
  twoLineHeight: number;
};

const STAFF_BOX_METRICS: Record<ChartTemplate, StaffBoxMetrics> = {
  bbs: { width: MIN_ROLE_WIDTH - STAFF_LINE_SPACE, oneLineHeight: 42, twoLineHeight: 52 },
  sfc: { width: MIN_ROLE_WIDTH - STAFF_LINE_SPACE, oneLineHeight: 29.933, twoLineHeight: 59.865 },
};

const cleanLines = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean);

export function estimatedTextWidth(text: string, fontSize: number): number {
  return [...text].reduce((width, character) => {
    if (character === ' ') return width + fontSize * 0.28;
    if ('MW@%&'.includes(character)) return width + fontSize * 0.82;
    if ('Iil1.,:;!|'.includes(character)) return width + fontSize * 0.3;
    if (/[A-Z0-9]/.test(character)) return width + fontSize * 0.61;
    return width + fontSize * 0.54;
  }, 0);
}

export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (words.length === 1) return words;
  if (estimatedTextWidth(words.join(' '), fontSize) <= maxWidth) return [words.join(' ')];

  const lines: string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const testLine = `${currentLine} ${words[i]}`;
    if (estimatedTextWidth(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

export function getRoleLines(role: Role, maxWidth: number, fontSize: number): string[] {
  const explicit = (role.lines && role.lines.length > 0)
    ? cleanLines(role.lines)
    : cleanLines(role.title.split('\n'));

  if (!explicit.length) return [role.title];

  if (explicit.length > 1) {
    const res: string[] = [];
    for (const line of explicit) {
      if (estimatedTextWidth(line, fontSize) <= maxWidth) {
        res.push(line);
      } else {
        res.push(...wrapText(line, maxWidth, fontSize));
      }
    }
    return res;
  }

  return wrapText(explicit[0], maxWidth, fontSize);
}

export interface RoleTextFit {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  firstBaseline: number;
}

export function computeRoleTextFit(
  role: Role,
  baseFontSize = 13.5,
  hPadding = 14,
  vPadding = 8,
): RoleTextFit {
  const maxW = Math.max(20, role.width - hPadding * 2);
  const maxH = Math.max(16, role.height - vPadding * 2);

  let fontSize = baseFontSize;
  let lines = getRoleLines(role, maxW, fontSize);

  for (let iter = 0; iter < 5; iter += 1) {
    const maxLineWidth = Math.max(...lines.map((l) => estimatedTextWidth(l, fontSize)));
    const lineHeight = fontSize * 1.18;
    const capHeight = fontSize * 0.7;
    const totalH = capHeight + (lines.length - 1) * lineHeight;

    const scaleW = maxLineWidth > maxW ? maxW / maxLineWidth : 1;
    const scaleH = totalH > maxH ? maxH / totalH : 1;
    const scale = Math.min(scaleW, scaleH);

    if (scale >= 0.99) break;
    fontSize = Math.max(5.5, Math.floor(fontSize * scale * 10) / 10);
    lines = getRoleLines(role, maxW, fontSize);
  }

  const lineHeight = fontSize * 1.18;
  const capHeight = fontSize * 0.7;
  const totalH = capHeight + (lines.length - 1) * lineHeight;
  const roleH = role.height - (role.kind === 'executive' || role.kind === 'commissioner' ? 8 : 0);
  const center = role.y + roleH / 2;
  const firstBaseline = center - totalH / 2 + capHeight;

  return { lines, fontSize, lineHeight, firstBaseline };
}

export function staffBoxMetrics(templateId: ChartTemplate): StaffBoxMetrics {
  return STAFF_BOX_METRICS[templateId];
}

export function roleTextLines(role: Role, baseFontSize = 13.5): string[] {
  return computeRoleTextFit(role, baseFontSize).lines;
}

export function staffBoxHeight(role: Role, templateId: ChartTemplate, baseFontSize = 13.5): number {
  const metrics = staffBoxMetrics(templateId);
  const maxW = Math.max(20, metrics.width - 24);
  const lines = getRoleLines(role, maxW, baseFontSize);
  if (lines.length <= 1) return metrics.oneLineHeight;
  if (lines.length === 2) return metrics.twoLineHeight;
  return Math.max(metrics.twoLineHeight, metrics.oneLineHeight + (lines.length - 1) * (baseFontSize * 1.25) + 10);
}
