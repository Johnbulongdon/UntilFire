/* Cover and foundations boards: the colour swatch grids for both themes, the
   type ramp, and the radius / elevation / space scales.

   Every swatch binds to its variable rather than carrying a copied hex — that
   is what makes the board a view of the tokens instead of a picture of them.
   Change a token in 01-variables.js, re-run, and these update.

   Note: figma.createFrame() gives a white fill by default. Any frame used as a
   transparent wrapper needs fills = [] explicitly or it paints a white strip. */

const page = figma.root.children.find((p) => p.name === "Cover & Foundations");
await figma.setCurrentPageAsync(page);
for (const f of ["Fraunces|Bold", "Manrope|Bold", "Manrope|Regular", "DM Mono|Medium"]) {
  const [family, style] = f.split("|");
  await figma.loadFontAsync({ family, style });
}
const vars = await figma.variables.getLocalVariablesAsync();
const V = (n) => vars.find((v) => v.name === n);
const paint = (n) => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(n));

const GROUPS = [
  ["Ground and surfaces", ["ground","card","surface","surface-2","border","border-2"]],
  ["Ink", ["ink","ink-2","ink-3"]],
  ["Green — acts", ["green","green-700","green-900","green-100","green-50"]],
  ["Teal — means freedom", ["teal","teal-deep","teal-soft","teal-line"]],
  ["Status", ["pos","neg","neg-bg","warn","warn-bg"]],
  ["Status ink — 11px badge text", ["pos-ink","neg-ink","warn-ink"]],
  ["Chart series", ["chart-1","chart-2","chart-3"]],
];

function swatch(theme, token) {
  const card = figma.createAutoLayout("VERTICAL", { name: token, itemSpacing: 0 });
  card.resize(180, 108);
  card.layoutSizingHorizontal = "FIXED"; card.layoutSizingVertical = "FIXED";
  card.cornerRadius = 12; card.clipsContent = true; card.strokeWeight = 1;
  card.strokes = [paint("color/" + theme + "/border")];
  card.fills = [paint("color/" + theme + "/card")];

  const chip = figma.createFrame();
  chip.name = "chip"; chip.resize(180, 56);
  card.appendChild(chip);
  chip.layoutSizingHorizontal = "FILL";
  chip.fills = [paint("color/" + theme + "/" + token)];

  const meta = figma.createAutoLayout("VERTICAL", { name: "meta", itemSpacing: 3 });
  meta.paddingLeft = 10; meta.paddingRight = 10; meta.paddingTop = 9; meta.paddingBottom = 9;
  meta.fills = [];
  card.appendChild(meta);
  meta.layoutSizingHorizontal = "FILL";

  for (const [txt, size, tok] of [[token, 11, "ink-2"], ["--uf-" + token, 10, "ink-3"]]) {
    const t = figma.createText();
    t.fontName = { family: "DM Mono", style: "Medium" };
    t.characters = txt; t.fontSize = size;
    meta.appendChild(t);
    t.fills = [paint("color/" + theme + "/" + tok)];
  }
  return card;
}

const ids = [];
let x = 0;
for (const theme of ["light", "dark"]) {
  const board = figma.createAutoLayout("VERTICAL", { name: "Colour — " + theme, itemSpacing: 34 });
  board.x = x; board.y = 1050;
  board.paddingLeft = 64; board.paddingRight = 64; board.paddingTop = 56; board.paddingBottom = 64;
  board.fills = [paint("color/" + theme + "/ground")];
  page.appendChild(board);

  const h = figma.createText();
  h.fontName = { family: "Fraunces", style: "Bold" };
  h.characters = theme === "light" ? "Colour — cream" : "Colour — dark";
  h.fontSize = 34;
  board.appendChild(h);
  h.fills = [paint("color/" + theme + "/ink")];

  for (const [label, tokens] of GROUPS) {
    const sec = figma.createAutoLayout("VERTICAL", { name: label, itemSpacing: 12 });
    sec.fills = [];
    board.appendChild(sec);
    const lt = figma.createText();
    lt.fontName = { family: "Manrope", style: "Bold" };
    lt.characters = label.toUpperCase(); lt.fontSize = 11;
    lt.letterSpacing = { unit: "PERCENT", value: 9 };
    sec.appendChild(lt);
    lt.fills = [paint("color/" + theme + "/ink-3")];
    const row = figma.createAutoLayout("HORIZONTAL", { name: "row", itemSpacing: 12 });
    row.fills = [];
    sec.appendChild(row);
    for (const tk of tokens) row.appendChild(swatch(theme, tk));
  }
  ids.push(board.id);
  x += 1500;
}

return { createdNodeIds: ids, boards: ids.length };
