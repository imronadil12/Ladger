import type { Chart, Role } from '../types';
import { MIN_ROLE_WIDTH, staffBoxHeight, staffBoxMetrics } from './role-layout';

const copy = (chart: Chart): Chart => structuredClone(chart);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const outgoing = (chart: Chart, roleId: string) => chart.connections.filter((connection) => connection.sourceId === roleId);
const incoming = (chart: Chart, roleId: string) => chart.connections.filter((connection) => connection.targetId === roleId);
const STAFF_TOP_GAP = 30;
const STAFF_GAP = 15;

const roleById = (chart: Chart, roleId: string) => chart.roles.find((role) => role.id === roleId);
const reportsFor = (chart: Chart, parentId: string) => outgoing(chart, parentId)
  .map((connection) => roleById(chart, connection.targetId))
  .filter((role): role is Role => Boolean(role));

function stackStaffReports(chart: Chart, parentId: string): void {
  const parent = roleById(chart, parentId);
  if (!parent) return;
  const reports = reportsFor(chart, parentId)
    .filter((role) => role.kind === 'staff' && incoming(chart, role.id).length === 1)
    .sort((a, b) => a.order - b.order || a.y - b.y);
  if (!reports.length) return;

  const staffTopGap = chart.layout?.staffTopGap ?? STAFF_TOP_GAP;
  const staffGap = chart.layout?.staffGap ?? STAFF_GAP;

  const footerTop = chart.page.height - 96;
  const totalHeight = reports.reduce((sum, role) => sum + role.height, 0);
  const spacingRoom = Math.max(0, footerTop - (parent.y + parent.height) - totalHeight);
  const topGap = Math.min(staffTopGap, Math.max(6, spacingRoom * 0.42));
  const gap = reports.length > 1
    ? Math.min(staffGap, Math.max(4, (spacingRoom - topGap) / (reports.length - 1)))
    : 0;
  let y = parent.y + parent.height + topGap;

  reports.forEach((role, index) => {
    const inset = (parent.width - role.width) / 2;
    role.x = Math.min(chart.page.width - role.width - 30, Math.max(30, parent.x + inset));
    role.y = y;
    role.order = index;
    y += role.height + gap;
  });
}

function normalizeStaffGeometry(chart: Chart): void {
  const metrics = staffBoxMetrics(chart.templateId);
  const baseFontSize = chart.layout?.titleFontSize ?? 13.5;
  for (const role of chart.roles) {
    if (role.kind !== 'staff') continue;
    const center = role.x + role.width / 2;
    role.width = Math.max(MIN_ROLE_WIDTH, metrics.width);
    role.x = center - role.width / 2;
    role.height = staffBoxHeight(role, chart.templateId, baseFontSize);
  }
}

export function normalizeStaffRoles(chart: Chart): Chart {
  const next = copy(chart);
  normalizeStaffGeometry(next);
  const parentIds = new Set(next.connections.map((connection) => connection.sourceId));
  for (const parentId of parentIds) stackStaffReports(next, parentId);
  validateChart(next);
  return next;
}

const reaches = (chart: Chart, start: string, target: string): boolean => {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const connection of outgoing(chart, current)) stack.push(connection.targetId);
  }
  return false;
};

export function validateChart(chart: Chart): void {
  if (!chart.id || !chart.name || !chart.companyId) throw new Error('This chart is missing required information.');
  if (!Number.isFinite(chart.page.width) || !Number.isFinite(chart.page.height) || chart.page.width < 300 || chart.page.height < 200) throw new Error('The chart page size is invalid.');
  const ids = new Set<string>();
  for (const role of chart.roles) {
    if (!role.id || ids.has(role.id)) throw new Error('Every position needs a unique ID.');
    ids.add(role.id);
    if (!role.title.trim()) throw new Error('Every position needs a title.');
    for (const value of [role.x, role.y, role.width, role.height, role.fontSize]) if (!Number.isFinite(value)) throw new Error(`Position “${role.title}” has invalid dimensions.`);
    if (role.width < 30 || role.height < 20 || role.width > chart.page.width || role.height > chart.page.height) throw new Error(`Position “${role.title}” has an invalid size.`);
  }
  const edgeIds = new Set<string>();
  for (const connection of chart.connections) {
    if (!ids.has(connection.sourceId) || !ids.has(connection.targetId) || connection.sourceId === connection.targetId) throw new Error('A reporting line refers to a missing or invalid position.');
    const key = `${connection.sourceId}:${connection.targetId}`;
    if (edgeIds.has(key)) throw new Error('A reporting line appears more than once.');
    edgeIds.add(key);
  }
  for (const role of chart.roles) if (reaches(chart, role.id, role.id) && outgoing(chart, role.id).length) {
    const withoutSelf: Chart = { ...chart, connections: chart.connections.filter((c) => c.sourceId !== role.id || c.targetId !== role.id) };
    for (const connection of outgoing(withoutSelf, role.id)) if (reaches(withoutSelf, connection.targetId, role.id)) throw new Error('Reporting lines cannot form a cycle.');
  }
}

export function setRoleParents(chart: Chart, roleId: string, parentIds: string[]): Chart {
  if (!chart.roles.some((role) => role.id === roleId)) throw new Error('The selected position no longer exists.');
  const unique = [...new Set(parentIds)].filter(Boolean);
  if (unique.includes(roleId) || unique.some((parentId) => !chart.roles.some((role) => role.id === parentId))) throw new Error('Choose valid reporting positions.');
  const next = copy(chart);
  next.connections = next.connections.filter((connection) => connection.targetId !== roleId);
  for (const parentId of unique) {
    if (reaches(next, roleId, parentId)) throw new Error('That reporting line would create a cycle.');
    next.connections.push({ id: id('connection'), sourceId: parentId, targetId: roleId });
  }
  next.updatedAt = new Date().toISOString();
  const arranged = autoLayout(next);
  validateChart(arranged);
  return arranged;
}

export function addRole(chart: Chart, parentId?: string): Chart {
  const next = copy(chart);
  const parent = parentId ? next.roles.find((role) => role.id === parentId) : undefined;
  const roleId = id('role');
  const staffMetrics = staffBoxMetrics(next.templateId);
  const newWidth = Math.max(MIN_ROLE_WIDTH, staffMetrics.width);
  const newRole: Role = {
    id: roleId, title: 'New Position', lines: ['New Position'], kind: 'staff', fontSize: next.layout?.titleFontSize ?? 13.5,
    x: Math.min(next.page.width - newWidth - 30, Math.max(30, (parent?.x ?? next.page.width / 2 - newWidth / 2) + 24)),
    y: Math.min(next.page.height - 100, (parent?.y ?? 90) + (parent?.height ?? 40) + 90),
    width: newWidth, height: staffMetrics.oneLineHeight, order: parentId ? outgoing(next, parentId).length : next.roles.length,
  };
  next.roles.push(newRole);
  if (parentId) next.connections.push({ id: id('connection'), sourceId: parentId, targetId: roleId });
  next.updatedAt = new Date().toISOString();
  const arranged = autoLayout(next);
  validateChart(arranged);
  return arranged;
}

export function removeRole(chart: Chart, roleId: string): Chart {
  const role = chart.roles.find((item) => item.id === roleId);
  if (!role) throw new Error('The selected position no longer exists.');
  if (chart.roles.length === 1) throw new Error('A chart needs at least one position.');
  const next = copy(chart);
  const parents = incoming(next, roleId).map((connection) => connection.sourceId);
  const children = outgoing(next, roleId).map((connection) => connection.targetId);
  next.roles = next.roles.filter((item) => item.id !== roleId);
  next.connections = next.connections.filter((connection) => connection.sourceId !== roleId && connection.targetId !== roleId);
  for (const parentId of parents) for (const childId of children) {
    if (parentId !== childId && !next.connections.some((connection) => connection.sourceId === parentId && connection.targetId === childId)) {
      next.connections.push({ id: id('connection'), sourceId: parentId, targetId: childId });
    }
  }
  next.updatedAt = new Date().toISOString();
  const arranged = autoLayout(next);
  validateChart(arranged);
  return arranged;
}

export function reorderRole(chart: Chart, roleId: string, direction: -1 | 1): Chart {
  const next = copy(chart);
  const role = next.roles.find((item) => item.id === roleId);
  if (!role) throw new Error('The selected position no longer exists.');
  const parentId = incoming(next, roleId)[0]?.sourceId ?? null;
  const siblings = next.roles.filter((item) => (incoming(next, item.id)[0]?.sourceId ?? null) === parentId).sort((a, b) => a.order - b.order || a.x - b.x);
  const index = siblings.findIndex((item) => item.id === roleId);
  const other = siblings[index + direction];
  if (!other) return chart;
  siblings.forEach((sibling, i) => { sibling.order = i; });
  const order = role.order;
  role.order = other.order;
  other.order = order;
  next.updatedAt = new Date().toISOString();
  return autoLayout(next);
}

export function autoLayout(chart: Chart): Chart {
  const next = copy(chart);
  for (const role of next.roles) {
    if (role.width < MIN_ROLE_WIDTH) role.width = MIN_ROLE_WIDTH;
  }
  normalizeStaffGeometry(next);
  const depth = new Map<string, number>();
  const visit = (roleId: string, trail = new Set<string>()): number => {
    if (depth.has(roleId)) return depth.get(roleId)!;
    if (trail.has(roleId)) throw new Error('Fix circular reporting lines before arranging the chart.');
    const parents = incoming(next, roleId).map((connection) => connection.sourceId);
    const value = parents.length ? Math.max(...parents.map((parentId) => visit(parentId, new Set([...trail, roleId])))) + 1 : 0;
    depth.set(roleId, value); return value;
  };
  for (const role of next.roles) visit(role.id);
  const stackedStaffIds = new Set(next.roles.filter((role) => {
    if (role.kind !== 'staff') return false;
    const parents = incoming(next, role.id);
    return parents.length === 1 && roleById(next, parents[0].sourceId)?.kind !== 'staff';
  }).map((role) => role.id));
  const levels = new Map<number, Role[]>();
  for (const role of next.roles) {
    if (stackedStaffIds.has(role.id)) continue;
    const level = depth.get(role.id)!;
    levels.set(level, [...(levels.get(level) ?? []), role]);
  }
  const maximum = Math.max(0, ...levels.keys());
  const pageMargin = 32;
  const roleGap = chart.layout?.horizontalGap ?? 18;
  const groupGap = Math.max(roleGap + 8, Math.round(roleGap * 1.6));
  const staffGap = chart.layout?.staffGap ?? STAFF_GAP;
  const staffTopGap = chart.layout?.staffTopGap ?? STAFF_TOP_GAP;
  const configuredVerticalGap = chart.layout?.verticalGap ?? 55;

  const footprintCache = new Map<string, number>();
  const footprintFor = (roleId: string): number => {
    const cached = footprintCache.get(roleId);
    if (cached !== undefined) return cached;
    const role = roleById(next, roleId);
    if (!role) return 0;
    const children = reportsFor(next, roleId).filter((child) => child.kind !== 'staff' && incoming(next, child.id).length === 1);
    const childrenWidth = children.length
      ? children.reduce((sum, child) => sum + footprintFor(child.id), 0) + roleGap * (children.length - 1)
      : 0;
    const width = Math.max(role.width, childrenWidth);
    footprintCache.set(roleId, width);
    return width;
  };
  for (const role of next.roles) footprintFor(role.id);
  const deepestRoles = levels.get(maximum) ?? [];
  const deepestHeight = Math.max(42, ...deepestRoles.map((role) => role.height));
  const maximumStaffStack = Math.max(0, ...next.roles.map((parent) => {
    const reports = reportsFor(next, parent.id).filter((role) => stackedStaffIds.has(role.id));
    return reports.length
      ? staffTopGap + reports.reduce((sum, role) => sum + role.height, 0) + staffGap * (reports.length - 1)
      : 0;
  }));
  const firstY = 66;

  let totalLevelHeights = 0;
  for (let lvl = 0; lvl < maximum; lvl += 1) {
    const rolesOnLvl = levels.get(lvl) ?? [];
    totalLevelHeights += Math.max(36, ...rolesOnLvl.map((r) => r.height));
  }
  const maxAvailableForGaps = Math.max(0, next.page.height - 96 - firstY - deepestHeight - maximumStaffStack - totalLevelHeights);
  const maxPossibleVerticalGap = maximum > 0 ? maxAvailableForGaps / maximum : configuredVerticalGap;
  const effectiveVerticalGap = Math.min(configuredVerticalGap, Math.max(20, maxPossibleVerticalGap));

  const levelYMap = new Map<number, number>();
  let currentLevelY = firstY;
  for (let lvl = 0; lvl <= maximum; lvl += 1) {
    levelYMap.set(lvl, currentLevelY);
    const rolesOnLvl = levels.get(lvl) ?? [];
    const maxH = Math.max(36, ...rolesOnLvl.map((r) => r.height));
    currentLevelY += maxH + effectiveVerticalGap;
  }

  for (const [level, roles] of [...levels.entries()].sort(([a], [b]) => a - b)) {
    const clusterMap = new Map<string, { parentIds: string[]; roles: Role[] }>();
    for (const role of roles) {
      const parentIds = incoming(next, role.id).map((connection) => connection.sourceId).sort();
      const key = parentIds.join('|') || '__root__';
      const cluster = clusterMap.get(key) ?? { parentIds, roles: [] };
      cluster.roles.push(role);
      clusterMap.set(key, cluster);
    }
    const clusters = [...clusterMap.values()].map((cluster) => ({
      ...cluster,
      roles: cluster.roles.sort((a, b) => a.order - b.order || a.x - b.x),
      desiredCenter: cluster.parentIds.length
        ? cluster.parentIds.map((parentId) => roleById(next, parentId)).filter((role): role is Role => Boolean(role)).reduce((sum, parent) => sum + parent.x + parent.width / 2, 0) / cluster.parentIds.length
        : next.page.width / 2,
      width: 0,
      left: 0,
    })).sort((a, b) => a.desiredCenter - b.desiredCenter);
    const baseRolesWidth = clusters.reduce((sum, cluster) => sum + cluster.roles.reduce((rSum, role) => rSum + role.width, 0), 0);
    const totalRoleGaps = clusters.reduce((sum, cluster) => sum + Math.max(0, cluster.roles.length - 1), 0);
    const totalGroupGaps = Math.max(0, clusters.length - 1);
    const uncompressedGaps = totalRoleGaps * roleGap + totalGroupGaps * groupGap;
    const availableWidth = next.page.width - pageMargin * 2;

    const gapScale = baseRolesWidth + uncompressedGaps > availableWidth
      ? Math.max(0.3, (availableWidth - baseRolesWidth) / Math.max(1, uncompressedGaps))
      : 1;
    const scaledRoleGap = Math.max(6, roleGap * gapScale);
    const scaledGroupGap = Math.max(8, groupGap * gapScale);

    const baseClusterWidth = baseRolesWidth + totalRoleGaps * scaledRoleGap + totalGroupGaps * scaledGroupGap;
    const availableForExpansion = Math.max(0, availableWidth - baseClusterWidth);
    const totalExtraExpansion = clusters.reduce((sum, cluster) =>
      sum + cluster.roles.reduce((rSum, role) => rSum + Math.max(0, footprintFor(role.id) - role.width), 0),
    0);
    const expansionScale = totalExtraExpansion > availableForExpansion && totalExtraExpansion > 0
      ? availableForExpansion / totalExtraExpansion
      : 1;

    for (const cluster of clusters) {
      for (const role of cluster.roles) {
        role.width = Math.max(MIN_ROLE_WIDTH, role.width);
      }
      cluster.width = cluster.roles.reduce((sum, role) => {
        const extra = Math.max(0, footprintFor(role.id) - role.width) * expansionScale;
        return sum + role.width + extra;
      }, 0) + scaledRoleGap * Math.max(0, cluster.roles.length - 1);
      cluster.left = Math.min(next.page.width - pageMargin - cluster.width, Math.max(pageMargin, cluster.desiredCenter - cluster.width / 2));
    }
    for (let index = 1; index < clusters.length; index += 1) {
      clusters[index].left = Math.max(clusters[index].left, clusters[index - 1].left + clusters[index - 1].width + scaledGroupGap);
    }
    if (clusters.length && clusters.at(-1)!.left + clusters.at(-1)!.width > next.page.width - pageMargin) {
      clusters.at(-1)!.left = next.page.width - pageMargin - clusters.at(-1)!.width;
      for (let index = clusters.length - 2; index >= 0; index -= 1) {
        clusters[index].left = Math.min(clusters[index].left, clusters[index + 1].left - scaledGroupGap - clusters[index].width);
      }
      const correction = Math.max(0, pageMargin - clusters[0].left);
      for (const cluster of clusters) cluster.left += correction;
    }
    for (const cluster of clusters) {
      let x = cluster.left;
      cluster.roles.forEach((role, index) => {
        const extra = Math.max(0, footprintFor(role.id) - role.width) * expansionScale;
        const cellWidth = role.width + extra;
        role.x = Math.max(pageMargin, Math.min(next.page.width - pageMargin - role.width, x + (cellWidth - role.width) / 2));
        role.y = levelYMap.get(level) ?? (firstY + level * effectiveVerticalGap);
        role.order = index;
        x += cellWidth + scaledRoleGap;
      });
    }
  }
  [...levels.values()].flat().sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0)).forEach((parent) => stackStaffReports(next, parent.id));
  for (const role of next.roles) {
    if (role.width < MIN_ROLE_WIDTH) role.width = MIN_ROLE_WIDTH;
  }
  next.updatedAt = new Date().toISOString();
  return next;
}
