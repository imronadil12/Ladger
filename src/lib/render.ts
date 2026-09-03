import type { Chart, Company, Connection, Role } from '../types';
import { computeRoleTextFit } from './role-layout';

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]!));
const centerX = (role: Role) => role.x + role.width / 2;
const bottom = (role: Role) => role.y + role.height;
const roleMap = (chart: Chart) => new Map(chart.roles.map((role) => [role.id, role]));

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const number = (value: number) => String(Number(value.toFixed(3)));

function roundedOrthogonalPath(points: Point[], radius = 5.12): string {
  const compact = points.filter((point, index) => index === 0 || distance(points[index - 1], point) > 0.01);
  if (compact.length < 2) return '';

  let path = `M ${number(compact[0].x)} ${number(compact[0].y)}`;
  for (let index = 1; index < compact.length - 1; index += 1) {
    const previous = compact[index - 1];
    const current = compact[index];
    const next = compact[index + 1];
    const incomingLength = distance(previous, current);
    const outgoingLength = distance(current, next);
    const incoming = { x: (current.x - previous.x) / incomingLength, y: (current.y - previous.y) / incomingLength };
    const outgoing = { x: (next.x - current.x) / outgoingLength, y: (next.y - current.y) / outgoingLength };
    const turn = incoming.x * outgoing.y - incoming.y * outgoing.x;

    if (Math.abs(turn) < 0.001) {
      path += ` L ${number(current.x)} ${number(current.y)}`;
      continue;
    }

    const curve = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const before = { x: current.x - incoming.x * curve, y: current.y - incoming.y * curve };
    const after = { x: current.x + outgoing.x * curve, y: current.y + outgoing.y * curve };
    path += ` L ${number(before.x)} ${number(before.y)} Q ${number(current.x)} ${number(current.y)} ${number(after.x)} ${number(after.y)}`;
  }
  const last = compact.at(-1)!;
  return `${path} L ${number(last.x)} ${number(last.y)}`;
}

const connector = (points: Point[], marker?: string) => `<path d="${roundedOrthogonalPath(points)}"${marker ? ` marker-end="url(#${marker})"` : ''}/>`;

function pathForGroup(parents: Role[], targets: Role[], marker: string): string {
  const sortedParents = [...parents].sort((a, b) => centerX(a) - centerX(b));
  const sortedTargets = [...targets].sort((a, b) => a.x - b.x || a.y - b.y);
  const parentBottom = Math.max(...sortedParents.map(bottom));
  const targetTop = Math.min(...sortedTargets.map((role) => role.y));
  const parentCenters = sortedParents.map(centerX);
  const joinX = parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length;
  const targetYRange = Math.max(...sortedTargets.map((role) => role.y)) - targetTop;
  const paths: string[] = [];

  const isStaffReporting = sortedParents.length === 1 && sortedTargets.every((role) => role.kind === 'staff');
  if (isStaffReporting) {
    const source = sortedParents[0];
    const minTargetX = Math.min(...sortedTargets.map((role) => role.x));
    const trunkX = Math.min(source.x + 12, minTargetX - 20);
    for (const target of sortedTargets) {
      const y = target.y + target.height / 2;
      paths.push(connector([
        { x: trunkX, y: bottom(source) + 8 },
        { x: trunkX, y },
        { x: target.x - 6, y },
      ], marker));
    }
    return paths.join('');
  }

  if (sortedParents.length === 1 && sortedTargets.length === 1) {
    const source = sortedParents[0];
    const target = sortedTargets[0];
    const start = { x: centerX(source), y: bottom(source) + 8 };
    const end = { x: centerX(target), y: target.y - 10 };
    const points = Math.abs(start.x - end.x) < 0.01
      ? [start, end]
      : [start, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, end];
    paths.push(connector(points, marker));
    return paths.join('');
  }

  if (sortedParents.length === 1 && targetYRange > 30) {
    const source = sortedParents[0];
    const trunkX = Math.min(...sortedTargets.map((role) => role.x)) - 24;
    for (const target of sortedTargets) {
      const y = target.y + target.height / 2;
      paths.push(connector([
        { x: trunkX, y: bottom(source) + 8 },
        { x: trunkX, y },
        { x: target.x - 6, y },
      ], marker));
    }
    return paths.join('');
  }

  const joinY = parentBottom + Math.max(18, (targetTop - parentBottom) * 0.28);
  const busY = targetTop - Math.max(24, (targetTop - joinY) * 0.36);
  if (sortedParents.length > 1) {
    const hubY = (joinY + busY) / 2;
    for (const parent of sortedParents) {
      paths.push(connector([
        { x: centerX(parent), y: bottom(parent) + 8 },
        { x: centerX(parent), y: joinY },
        { x: joinX, y: joinY },
        { x: joinX, y: hubY },
      ]));
    }
    for (const target of sortedTargets) {
      paths.push(connector([
        { x: joinX, y: hubY },
        { x: joinX, y: busY },
        { x: centerX(target), y: busY },
        { x: centerX(target), y: target.y - 10 },
      ], marker));
    }
  } else {
    for (const target of sortedTargets) {
      paths.push(connector([
        { x: joinX, y: parentBottom + 8 },
        { x: joinX, y: busY },
        { x: centerX(target), y: busY },
        { x: centerX(target), y: target.y - 10 },
      ], marker));
    }
  }
  return paths.join('');
}

function renderConnections(chart: Chart, company: Company): string {
  const roles = roleMap(chart);
  const parentsByTarget = new Map<string, string[]>();
  for (const connection of chart.connections) parentsByTarget.set(connection.targetId, [...(parentsByTarget.get(connection.targetId) ?? []), connection.sourceId]);
  const groups = new Map<string, { parents: Role[]; targets: Role[]; connections: Connection[] }>();
  for (const [targetId, parentIds] of parentsByTarget) {
    const key = [...parentIds].sort().join('|');
    const target = roles.get(targetId);
    const parents = parentIds.map((parentId) => roles.get(parentId)).filter((role): role is Role => Boolean(role));
    if (!target || !parents.length) continue;
    const group = groups.get(key) ?? { parents, targets: [], connections: [] };
    group.targets.push(target);
    group.connections.push(...chart.connections.filter((connection) => connection.targetId === targetId));
    groups.set(key, group);
  }
  return `<g class="chart-connectors" fill="none" stroke="${escape(company.branding.border)}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${[...groups.values()].map((group) => pathForGroup(group.parents, group.targets, 'chart-arrow')).join('')}</g>`;
}

function roleText(role: Role, text: string, baseFontSize = 13.5): string {
  const { lines, fontSize, lineHeight, firstBaseline } = computeRoleTextFit({ ...role, title: text }, baseFontSize);
  return `<text x="${centerX(role)}" y="${firstBaseline}" text-anchor="middle" dominant-baseline="alphabetic" font-family="Gotham, Arial, sans-serif" font-size="${fontSize}" font-weight="700">${lines.map((line, index) => `<tspan x="${centerX(role)}" dy="${index ? lineHeight : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}

function renderRole(role: Role, company: Company, baseFontSize = 13.5): string {
  const { primary, accent, border, text } = company.branding;
  const radius = role.kind === 'staff' ? 7 : role.kind === 'ceo' ? 6 : 10;
  const clipId = `clip-role-${escape(role.id)}`;
  let body = '';
  if (role.kind === 'ceo') {
    body = `<rect x="${role.x}" y="${role.y + 5}" width="${role.width}" height="${role.height}" rx="${radius}" fill="${escape(primary)}" opacity=".28"/><rect x="${role.x}" y="${role.y}" width="${role.width}" height="${role.height}" rx="${radius}" fill="${escape(accent)}"/>`;
  } else if (role.kind === 'executive' || role.kind === 'commissioner') {
    const band = role.kind === 'commissioner' ? accent : primary;
    body = `<rect x="${role.x}" y="${role.y}" width="${role.width}" height="${role.height}" rx="${radius}" fill="#fff" stroke="${escape(border)}" stroke-width="1.2"/><path d="M ${role.x} ${role.y + role.height - 9} H ${role.x + role.width} V ${role.y + role.height - radius} Q ${role.x + role.width} ${role.y + role.height} ${role.x + role.width - radius} ${role.y + role.height} H ${role.x + radius} Q ${role.x} ${role.y + role.height} ${role.x} ${role.y + role.height - radius} Z" fill="${escape(band)}"/>`;
  } else {
    body = `<rect x="${role.x}" y="${role.y}" width="${role.width}" height="${role.height}" rx="${radius}" fill="#fff" stroke="${escape(border)}" stroke-width="1.2"/>`;
  }
  return `<g class="chart-role role-${role.kind}" data-role-id="${escape(role.id)}" aria-label="${escape(role.title)}" role="button" tabindex="0" fill="${escape(text)}" style="cursor:pointer"><defs><clipPath id="${clipId}"><rect x="${role.x + 2}" y="${role.y + 2}" width="${Math.max(1, role.width - 4)}" height="${Math.max(1, role.height - 4)}" rx="${Math.max(0, radius - 2)}"/></clipPath></defs>${body}<g clip-path="url(#${clipId})">${roleText(role, role.title, baseFontSize)}</g><rect class="role-hitbox" x="${role.x}" y="${role.y}" width="${role.width}" height="${role.height}" rx="${radius}" fill="transparent"/></g>`;
}

function renderBbsLogo(company: Company): string {
  const branding = company.branding;
  const initial = branding.logoDataUrl === '/assets/bbs-logo.png';
  const logo = initial
    ? `<svg x="${branding.logoBox.x}" y="${branding.logoBox.y}" width="${branding.logoBox.width}" height="${branding.logoBox.height}" viewBox="70 225 1460 685" overflow="hidden"><image href="${escape(branding.logoDataUrl)}" x="0" y="0" width="1600" height="1131"/></svg>`
    : branding.logoDataUrl ? `<image href="${escape(branding.logoDataUrl)}" x="${branding.logoBox.x}" y="${branding.logoBox.y}" width="${branding.logoBox.width}" height="${branding.logoBox.height}" preserveAspectRatio="xMidYMid meet"/>` : '';
  const watermark = branding.watermarkDataUrl === '/assets/bbs-logo.png'
    ? `<svg x="${branding.watermarkBox.x}" y="${branding.watermarkBox.y}" width="${branding.watermarkBox.width}" height="${branding.watermarkBox.height}" viewBox="575 225 465 444" overflow="hidden" opacity="${branding.watermarkOpacity}"><image href="${escape(branding.watermarkDataUrl)}" x="0" y="0" width="1600" height="1131"/></svg>`
    : branding.watermarkDataUrl ? `<image href="${escape(branding.watermarkDataUrl)}" x="${branding.watermarkBox.x}" y="${branding.watermarkBox.y}" width="${branding.watermarkBox.width}" height="${branding.watermarkBox.height}" opacity="${branding.watermarkOpacity}" preserveAspectRatio="xMidYMid meet"/>` : '';
  const safe = branding.logoClearSpace;
  return `<g class="brand-art">${watermark}<rect data-safe-area x="${branding.logoBox.x - safe}" y="${branding.logoBox.y - safe}" width="${branding.logoBox.width + safe * 2}" height="${branding.logoBox.height + safe * 2}" fill="none"/>${logo}</g>`;
}

function renderFooter(chart: Chart, company: Company): string {
  const { footerLeft, footerRight, primary, accent } = company.branding;
  const y = chart.page.height - 56;
  const line = (text: string, x: number, baseline: number, anchor: 'start' | 'end') => `<text x="${x}" y="${baseline}" text-anchor="${anchor}" font-family="Poppins, Arial, sans-serif" font-size="10.8" font-weight="500" fill="${escape(primary)}">${escape(text)}</text>`;
  return `<g class="chart-footer">${footerLeft.map((text, index) => line(text, 62, y + index * 14, 'start')).join('')}${footerRight.map((text, index) => line(text, chart.page.width - 62, y + index * 14, 'end')).join('')}<rect x="0" y="${chart.page.height - 30}" width="${chart.page.width}" height="3" fill="${escape(accent)}"/><rect x="0" y="${chart.page.height - 27}" width="${chart.page.width}" height="27" fill="${escape(primary)}"/></g>`;
}

export function renderChartSvg(chart: Chart, company: Company): string {
  const { width, height } = chart.page;
  const titleX = width - 62;
  const baseFontSize = chart.layout?.titleFontSize ?? 13.5;
  const sfcArt = chart.templateId === 'sfc' ? `<image href="/assets/sfc-artwork.svg" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>` : renderBbsLogo(company);
  return `<svg id="chart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="chart-title chart-description">
    <title id="chart-title">${escape(chart.name)}</title><desc id="chart-description">Organizational chart for ${escape(company.name)}</desc>
    <defs><marker id="chart-arrow" viewBox="0 0 8 8" refX="7.95" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M7.58 3.525 1.824.2C1.458-.011.999.254.999.677v6.648c0 .424.459.688.825.476L7.582 4.476c.366-.211.366-.74-.002-.951Z" fill="${escape(company.branding.border)}"/></marker></defs>
    <rect width="${width}" height="${height}" fill="${escape(company.branding.background)}"/>
    ${sfcArt}
    <g class="chart-heading" fill="${escape(chart.templateId === 'sfc' ? '#151515' : company.branding.primary)}" font-family="Gotham, Arial, sans-serif" font-weight="700" font-size="22.2" text-anchor="end"><text x="${titleX}" y="75">Organizational</text><text x="${titleX}" y="102">Structure</text></g>
    ${renderConnections(chart, company)}
    <g class="chart-roles">${[...chart.roles].sort((a, b) => a.order - b.order).map((item) => renderRole(item, company, baseFontSize)).join('')}</g>
    ${renderFooter(chart, company)}
  </svg>`;
}
