/* PENDING — not yet applied to the file (Starter MCP call cap).

   Motion cannot play in a static Figma frame, so this documents it rather
   than performing it: the four durations as measured bars, and the three
   easing curves drawn as actual cubic beziers on a unit grid — which is the
   only representation that shows how they differ.

   Before these tokens existed the app carried six hand-typed cubic-beziers,
   durations from 120ms to 280ms, and about thirty keyframes across seven
   files, seven of which were the same fade-and-rise. */

const page = figma.root.children.find((p) => p.name === "Charts, Logo & Motion");
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: "Fraunces", style: "Bold" });
await figma.loadFontAsync({ family: "Manrope", style: "Regular" });
await figma.loadFontAsync({ family: "Manrope", style: "Bold" });
await figma.loadFontAsync({ family: "DM Mono", style: "Medium" });

const vars = await figma.variables.getLocalVariablesAsync();
const V = (n) => vars.find((v) => v.name === n);
const paint = (n) => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(n));

const board = figma.createAutoLayout("VERTICAL", { name: "Motion", itemSpacing: 30 });
board.x = 0; board.y = 1900;
board.paddingLeft = 64; board.paddingRight = 64; board.paddingTop = 56; board.paddingBottom = 64;
board.fills = [paint("color/light/ground")];
page.appendChild(board);

const h = figma.createText();
h.fontName = { family: "Fraunces", style: "Bold" };
h.characters = "Motion"; h.fontSize = 34;
board.appendChild(h); h.fills = [paint("color/light/ink")];

const lede = figma.createText();
lede.fontName = { family: "Manrope", style: "Regular" };
lede.characters =
  "Four durations, three curves. Motion does not play here — the bars are the durations to scale and the\n" +
  "curves are the real beziers, which is what actually distinguishes them. See /styleguide to watch them run.";
lede.fontSize = 15; lede.lineHeight = { unit: "PERCENT", value: 160 };
lede.textAutoResize = "HEIGHT"; lede.resize(820, 40);
board.appendChild(lede); lede.fills = [paint("color/light/ink-2")];

/* ---- durations, drawn to scale against the longest ---- */
const DUR = [["--uf-dur-1", 120, "colour and hover"], ["--uf-dur-2", 180, "controls"],
             ["--uf-dur-3", 240, "panels and drawers"], ["--uf-dur-4", 420, "entrances"]];
const durCard = figma.createAutoLayout("VERTICAL", { name: "Duration", itemSpacing: 14 });
durCard.paddingTop = 24; durCard.paddingBottom = 24; durCard.paddingLeft = 24; durCard.paddingRight = 24;
durCard.cornerRadius = 20; durCard.strokeWeight = 1;
durCard.strokes = [paint("color/light/border")];
durCard.fills = [paint("color/light/card")];
board.appendChild(durCard);
const dh = figma.createText();
dh.fontName = { family: "Manrope", style: "Bold" };
dh.characters = "DURATION"; dh.fontSize = 11;
dh.letterSpacing = { unit: "PERCENT", value: 9 };
durCard.appendChild(dh); dh.fills = [paint("color/light/ink-3")];

for (const [tok, ms, use] of DUR) {
  const row = figma.createAutoLayout("HORIZONTAL", { name: tok, itemSpacing: 18 });
  row.counterAxisAlignItems = "CENTER"; row.fills = [];
  durCard.appendChild(row);

  const label = figma.createText();
  label.fontName = { family: "DM Mono", style: "Medium" };
  label.characters = tok; label.fontSize = 11;
  row.appendChild(label); label.resize(120, 14);
  label.fills = [paint("color/light/ink-3")];

  const track = figma.createFrame();
  track.name = "track"; track.resize(420, 10);
  track.cornerRadius = 999; track.clipsContent = true;
  track.fills = [paint("color/light/surface-2")];
  row.appendChild(track);
  const fill = figma.createRectangle();
  fill.resize(420 * (ms / 420), 10);
  fill.cornerRadius = 999;
  fill.fills = [paint("color/light/teal")];
  track.appendChild(fill);

  const val = figma.createText();
  val.fontName = { family: "DM Mono", style: "Medium" };
  val.characters = ms + "ms"; val.fontSize = 12;
  row.appendChild(val); val.resize(54, 16);
  val.fills = [paint("color/light/ink-2")];

  const note = figma.createText();
  note.fontName = { family: "Manrope", style: "Regular" };
  note.characters = use; note.fontSize = 13;
  row.appendChild(note); note.fills = [paint("color/light/ink-3")];
}

/* ---- easing, drawn as real cubic beziers on a unit square ---- */
const EASE = [
  ["--uf-ease", [0.22, 1, 0.36, 1], "the house curve — already 22 uses"],
  ["--uf-ease-standard", [0.4, 0, 0.2, 1], "symmetrical moves, toggles"],
  ["--uf-ease-spring", [0.34, 1.56, 0.64, 1], "overshoot — confirmations only"],
];
const easeCard = figma.createAutoLayout("HORIZONTAL", { name: "Easing", itemSpacing: 40 });
easeCard.paddingTop = 28; easeCard.paddingBottom = 28; easeCard.paddingLeft = 28; easeCard.paddingRight = 28;
easeCard.cornerRadius = 20; easeCard.strokeWeight = 1;
easeCard.strokes = [paint("color/light/border")];
easeCard.fills = [paint("color/light/card")];
board.appendChild(easeCard);

const S = 150; // unit square side
for (const [tok, [x1, y1, x2, y2], use] of EASE) {
  const col = figma.createAutoLayout("VERTICAL", { name: tok, itemSpacing: 10 });
  col.fills = []; easeCard.appendChild(col);

  const plot = figma.createFrame();
  plot.name = "curve"; plot.resize(S, S);
  plot.cornerRadius = 8; plot.strokeWeight = 1;
  plot.strokes = [paint("color/light/border")];
  plot.fills = [paint("color/light/surface")];
  col.appendChild(plot);

  // y is inverted: progress 0 at the bottom. Spring overshoots past 1, so the
  // curve is drawn into a padded box rather than clipped at the top edge.
  const pad = 26, span = S - pad * 2;
  const px = (t) => pad + t * span;
  const py = (p) => S - pad - p * span;

  const diag = figma.createLine();
  diag.resize(Math.sqrt(span * span + span * span), 0);
  diag.x = px(0); diag.y = py(0);
  diag.rotation = 45;
  diag.strokes = [paint("color/light/border-2")];
  diag.dashPattern = [3, 4];
  plot.appendChild(diag);

  const curve = figma.createVector();
  curve.vectorPaths = [{
    windingRule: "NONE",
    data: "M " + px(0) + " " + py(0) +
          " C " + px(x1) + " " + py(y1) +
          " " + px(x2) + " " + py(y2) +
          " " + px(1) + " " + py(1),
  }];
  curve.strokes = [paint("color/light/green")];
  curve.strokeWeight = 2; curve.strokeCap = "ROUND"; curve.fills = [];
  plot.appendChild(curve);

  const t1 = figma.createText();
  t1.fontName = { family: "DM Mono", style: "Medium" };
  t1.characters = tok; t1.fontSize = 11;
  col.appendChild(t1); t1.fills = [paint("color/light/ink-2")];

  const t2 = figma.createText();
  t2.fontName = { family: "DM Mono", style: "Medium" };
  t2.characters = "cubic-bezier(" + [x1, y1, x2, y2].join(", ") + ")";
  t2.fontSize = 9;
  col.appendChild(t2); t2.fills = [paint("color/light/ink-3")];

  const t3 = figma.createText();
  t3.fontName = { family: "Manrope", style: "Regular" };
  t3.characters = use; t3.fontSize = 12;
  t3.textAutoResize = "HEIGHT";
  col.appendChild(t3); t3.resize(S, 16);
  t3.fills = [paint("color/light/ink-3")];
}

return { boardId: board.id, createdNodeIds: [board.id] };
