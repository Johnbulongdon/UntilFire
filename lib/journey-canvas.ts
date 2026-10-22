import type { Journey, JourneyStep, Platform } from './journeys.ts';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 260;
export interface JourneyNode { id: string; step: JourneyStep; platform: Platform; x: number; y: number; journeys: string[]; chainStart?: boolean }
export interface JourneyEdge { id: string; from: string; to: string; label: string; journeys: string[]; navigation?: boolean }
export interface JourneyGraph { nodes: JourneyNode[]; edges: JourneyEdge[]; width: number; height: number; headings: { text: string; x: number; y: number }[] }

/** Screenshot identity, not route alone: overlays and Pro states are distinct.
 * A shared screen belongs to several paths; its action belongs to the edge. */
export const screenKey = (platform: Platform, step: JourneyStep) => JSON.stringify([platform, step.shot ?? step.route, step.shot ? null : step.label, step.click ?? []]);

export function journeyGraph(journeys: Journey[]): JourneyGraph {
  const nodes = new Map<string, JourneyNode>();
  const edges = new Map<string, JourneyEdge>();
  for (const journey of journeys) journey.steps.forEach((step, index) => {
    const id = screenKey(journey.platform, step);
    let node = nodes.get(id);
    if (!node) { node = { id, step, platform: journey.platform, x: 0, y: 0, journeys: [] }; nodes.set(id, node); }
    if (!node.journeys.includes(journey.id)) node.journeys.push(journey.id);
    if (!index) return;
    const from = screenKey(journey.platform, journey.steps[index - 1]);
    const edgeId = JSON.stringify([from, id]);
    let edge = edges.get(edgeId);
    if (!edge) { edge = { id: edgeId, from, to: id, label: journey.steps[index - 1].action ?? 'Continue', journeys: [] }; edges.set(edgeId, edge); }
    if (!edge.journeys.includes(journey.id)) edge.journeys.push(journey.id);
  });
  const headings: JourneyGraph['headings'] = [];
  let offset = 0;
  for (const platform of ['web', 'phone'] as const) {
    const paths = journeys.filter(j => j.platform === platform);
    if (!paths.length) continue;
    const placed = new Set<string>();
    const place = (step: JourneyStep, x: number, y: number) => {
      const key = screenKey(platform, step), node = nodes.get(key)!;
      if (!placed.has(key)) { node.x = x; node.y = y + offset; placed.add(key); }
    };
    const primary = paths.find(j => j.id === (platform === 'web' ? 'web-landing' : 'phone-new')) ?? paths[0];
    headings.push({ text: platform === 'web' ? 'WEBSITE' : 'PHONE APP', x: 80, y: offset + 35 });
    headings.push({ text: 'Entry points', x: 80, y: offset + 75 });
    headings.push({ text: 'Set up → see your result → save your plan', x: 420, y: offset + 75 });
    place(primary.steps[0], 80, 120);
    primary.steps.slice(1).forEach((step, index) => {
      const row = Math.floor(index / 5), col = row % 2 ? 4 - index % 5 : index % 5;
      place(step, 420 + col * 270, 120 + row * 360);
    });
    let entry = 1, row = Math.ceil((primary.steps.length - 1) / 5), right = false;
    for (const path of paths.filter(j => j !== primary)) {
      const fresh = path.steps.filter(s => !placed.has(screenKey(platform, s)));
      if (path.visitor === 'new' && fresh.length === 1) { place(fresh[0], 80, 120 + entry++ * 310); continue; }
      if (!fresh.length) continue;
      // Branches stay on the same board, tied to their shared Home / Profile.
      if (fresh.length <= 3) {
        fresh.forEach((step, i) => place(step, 420 + ((right ? 3 : 0) + i) * 270, 120 + row * 360));
        if (right) row++;
        right = !right;
        continue;
      }
      // A longer branch gets rows of its own, snaking like the main path.
      if (right) { row++; right = false; }
      fresh.forEach((step, i) => {
        const r = Math.floor(i / 5), col = r % 2 ? 4 - i % 5 : i % 5;
        place(step, 420 + col * 270, 120 + (row + r) * 360);
      });
      nodes.get(screenKey(platform, fresh[0]))!.chainStart = true;
      row += Math.ceil(fresh.length / 5);
    }
    const find = (shot: string) => [...nodes.values()].find(n => n.platform === platform && n.step.shot === shot && !n.step.click?.length);
    // These are existing app navigation, joining the journeys' separate starts.
    const joins = platform === 'web'
      ? [['user:/dashboard', 'user:/dashboard?tab=profile'], ['pro:/dashboard', 'pro:/dashboard?tab=profile']]
      : [['app-user:/', 'app-user:/profile']];
    for (const [fromShot, toShot] of joins) {
      const from = find(fromShot), to = find(toShot);
      if (!from || !to) continue;
      const id = JSON.stringify([from.id, to.id]);
      if (!edges.has(id)) edges.set(id, { id, from: from.id, to: to.id, label: 'Open Profile', journeys: [...to.journeys], navigation: true });
    }
    offset = Math.max(...[...nodes.values()].filter(n => n.platform === platform).map(n => n.y + NODE_HEIGHT)) + 180;
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()], headings,
    width: Math.max(600, ...[...nodes.values()].map(n => n.x + NODE_WIDTH)) + 140, height: offset + 80 };
}

/** Orthogonal branches keep arrows outside screenshot cards. Back edges use a
 * dedicated outer return lane, making loops visible rather than duplicating a screen. */
export function edgePath(from: JourneyNode, to: JourneyNode, lane: number, boardHeight: number): string {
  const cx = (n: JourneyNode) => n.x + NODE_WIDTH / 2;
  const cy = (n: JourneyNode) => n.y + NODE_HEIGHT / 2;
  if (from.y === to.y) {
    const right = to.x > from.x;
    return `M ${from.x + (right ? NODE_WIDTH : 0)} ${cy(from)} H ${to.x + (right ? 0 : NODE_WIDTH)}`;
  }
  // Into a longer branch: along the row gap, then down the free lane left of the board.
  if (to.chainStart && to.y > from.y) {
    const gap = from.y + NODE_HEIGHT + 60 + lane % 3 * 8, left = 385 - lane % 3 * 8;
    return `M ${cx(from)} ${from.y + NODE_HEIGHT} V ${gap} H ${left} V ${cy(to)} H ${to.x}`;
  }
  if (from.x === to.x && to.y > from.y) return `M ${cx(from)} ${from.y + NODE_HEIGHT} V ${to.y}`;
  if (from.x < 300 && to.x >= 420) {
    const top = to.y - 12 - lane % 3 * 5;
    return `M ${from.x + NODE_WIDTH} ${cy(from)} H 350 V ${top} H ${cx(to)} V ${to.y}`;
  }
  if (to.y < from.y) {
    const bottom = boardHeight - 50 - lane % 4 * 12;
    return `M ${from.x + NODE_WIDTH} ${cy(from)} H ${from.x + NODE_WIDTH + 35} V ${bottom} H ${to.x - 35} V ${cy(to)} H ${to.x}`;
  }
  const middle = from.y + NODE_HEIGHT + 45 + lane % 3 * 10;
  return `M ${cx(from)} ${from.y + NODE_HEIGHT} V ${middle} H ${cx(to)} V ${to.y}`;
}
