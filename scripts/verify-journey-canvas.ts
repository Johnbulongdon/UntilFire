import assert from 'node:assert/strict';
import { JOURNEYS } from '../lib/journeys.ts';
import { journeyGraph, screenKey, edgePath, NODE_HEIGHT, NODE_WIDTH } from '../lib/journey-canvas.ts';

for (const platform of ['web','phone'] as const) {
  const journeys = JOURNEYS.filter(j => j.platform === platform);
  const graph = journeyGraph(journeys);
  const ids = new Set(graph.nodes.map(n => n.id));
  assert.equal(ids.size, graph.nodes.length, 'each screen appears once');
  for (const j of journeys) for (let i = 0; i < j.steps.length; i++) {
    const id = screenKey(platform, j.steps[i]);
    assert.ok(ids.has(id), `${j.id}: no screen lost`);
    if (i) assert.ok(graph.edges.some(e => e.from === screenKey(platform,j.steps[i-1]) && e.to === id && e.journeys.includes(j.id)), `${j.id}: every original transition survives`);
  }
  for (let a = 0; a < graph.nodes.length; a++) for (let b = a + 1; b < graph.nodes.length; b++) {
    const x = graph.nodes[a], y = graph.nodes[b];
    assert.ok(x.x + NODE_WIDTH <= y.x || y.x + NODE_WIDTH <= x.x || x.y + NODE_HEIGHT <= y.y || y.y + NODE_HEIGHT <= x.y, `${x.step.label} overlaps ${y.step.label}`);
  }
  const visited = new Set([graph.nodes[0].id]);
  for (let n = 0; n < graph.nodes.length; n++) for (const edge of graph.edges) {
    assert.ok(ids.has(edge.from) && ids.has(edge.to), 'no dangling arrow');
    if (visited.has(edge.from) || visited.has(edge.to)) { visited.add(edge.from); visited.add(edge.to); }
  }
  assert.equal(visited.size, graph.nodes.length, 'no disconnected path islands');
  const homes=graph.nodes.filter(n => n.step.shot === (platform === 'web' ? 'user:/dashboard' : 'app-user:/'));
  assert.equal(homes.length,1,'all standard Home paths converge on one hub');
}
const web=journeyGraph(JOURNEYS.filter(j => j.platform==='web'));
assert.ok(web.nodes.length < JOURNEYS.filter(j=>j.platform==='web').reduce((n,j)=>n+j.steps.length,0)/2,'shared onboarding is consolidated');
const profiles=web.nodes.filter(n=>n.step.label==='Profile');
assert.equal(profiles.length,2,'free and Pro Profile screenshots remain distinct');
assert.ok(web.nodes.some(n=>n.step.label==='Upgrade') && web.nodes.some(n=>n.step.label==='Data and account'),'overlays are not merged into the Profile screenshot');
const all=journeyGraph(JOURNEYS);
assert.equal(all.nodes.length, journeyGraph(JOURNEYS.filter(j=>j.platform==='web')).nodes.length + journeyGraph(JOURNEYS.filter(j=>j.platform==='phone')).nodes.length,'website and phone screens stay distinct');
assert.ok(all.edges.every(e=>all.nodes.find(n=>n.id===e.from)!.platform===all.nodes.find(n=>n.id===e.to)!.platform),'no invented cross-platform transitions');
// Independently intersect every orthogonal connector segment with every other
// screenshot card; a connected graph still fails if its arrows run through screens.
for (const [lane, edge] of all.edges.entries()) {
  const from=all.nodes.find(n=>n.id===edge.from)!, to=all.nodes.find(n=>n.id===edge.to)!;
  const bottom=Math.max(...all.nodes.filter(n=>n.platform===from.platform).map(n=>n.y+NODE_HEIGHT))+140;
  const tokens=edgePath(from,to,lane,bottom).match(/[MHV]|-?\d+(?:\.\d+)?/g)!;
  let x=0,y=0,index=0;
  while (index<tokens.length) {
    const command=tokens[index++];let nx=x,ny=y;
    if(command==='M'){x=Number(tokens[index++]);y=Number(tokens[index++]);continue;}
    if(command==='H')nx=Number(tokens[index++]);
    if(command==='V')ny=Number(tokens[index++]);
    for(const n of all.nodes)if(n.id!==from.id&&n.id!==to.id)assert.ok(
      !(Math.min(x,nx)<n.x+NODE_WIDTH-1&&Math.max(x,nx)>n.x+1&&Math.min(y,ny)<n.y+NODE_HEIGHT-1&&Math.max(y,ny)>n.y+1),
      `${from.step.label} → ${to.step.label} crosses ${n.step.label}`);
    x=nx;y=ny;
  }
}
console.log('Journey canvas: all paths preserved, shared nodes, distinct states, connected hubs, no overlaps or dangling arrows.');
