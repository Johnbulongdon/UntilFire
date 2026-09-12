/* PENDING — not yet applied to the file (Starter MCP call cap).

   The chart vocabulary: the three-slot series palette and four specimens.

   Three slots is a ceiling, not a starting point. The palette was validated
   for colour-blind separation against both theme surfaces; no fourth hue
   cleared the floor against these three, so a fourth series folds into
   "Other" or becomes a second chart.

   Data lines are drawn as straight segments between real points. A monotone
   spline invents values between the points that the data never had — on a
   projection sampled every five years it bulges away from the true compound
   path in the gaps, and the reader cannot tell which parts to trust. The area
   fill may fade; the data line may not. */

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

const money = (n) => {
  const v = Math.abs(n);
  const trim = (x, d) => x.toFixed(d).replace(/\.0$/, "");
  const sign = n < 0 ? "−" : "";
  if (v >= 1e6) return sign + "$" + trim(v / 1e6, v >= 1e7 ? 0 : 1) + "M";
  if (v >= 1e4) return sign + "$" + Math.round(v / 1e3) + "k";
  if (v >= 1e3) return sign + "$" + trim(v / 1e3, 1) + "k";
  return sign + "$" + Math.round(v);
};

const board = figma.createAutoLayout("VERTICAL", { name: "Charts", itemSpacing: 30 });
board.x = 0; board.y = 900;
board.paddingLeft = 64; board.paddingRight = 64; board.paddingTop = 56; board.paddingBottom = 64;
board.fills = [paint("color/light/ground")];
page.appendChild(board);

const h = figma.createText();
h.fontName = { family: "Fraunces", style: "Bold" };
h.characters = "Charts"; h.fontSize = 34;
board.appendChild(h); h.fills = [paint("color/light/ink")];

const lede = figma.createText();
lede.fontName = { family: "Manrope", style: "Regular" };
lede.characters =
  "Three series colours, and three is the ceiling. Assign in fixed order and let colour follow the entity, " +
  "never its rank: when a filter changes how many series show, the survivors keep the colours they had.\n" +
  "Straight segments between real points, one y-axis, a legend whenever there are two or more series.";
lede.fontSize = 15; lede.lineHeight = { unit: "PERCENT", value: 160 };
lede.textAutoResize = "HEIGHT"; lede.resize(820, 40);
board.appendChild(lede); lede.fills = [paint("color/light/ink-2")];

// series palette
const pal = figma.createAutoLayout("HORIZONTAL", { name: "Series palette", itemSpacing: 12 });
pal.fills = []; board.appendChild(pal);
["chart-1", "chart-2", "chart-3"].forEach((tok, i) => {
  const card = figma.createAutoLayout("HORIZONTAL", { name: tok, itemSpacing: 10 });
  card.counterAxisAlignItems = "CENTER";
  card.paddingTop = 10; card.paddingBottom = 10; card.paddingLeft = 12; card.paddingRight = 16;
  card.cornerRadius = 12; card.strokeWeight = 1;
  card.strokes = [paint("color/light/border")];
  card.fills = [paint("color/light/card")];
  pal.appendChild(card);
  const chip = figma.createFrame();
  chip.resize(26, 26); chip.cornerRadius = 7;
  chip.fills = [paint("color/light/" + tok)];
  card.appendChild(chip);
  const col = figma.createAutoLayout("VERTICAL", { itemSpacing: 2 });
  col.fills = []; card.appendChild(col);
  const t1 = figma.createText();
  t1.fontName = { family: "DM Mono", style: "Medium" };
  t1.characters = "--uf-" + tok; t1.fontSize = 11;
  col.appendChild(t1); t1.fills = [paint("color/light/ink-2")];
  const t2 = figma.createText();
  t2.fontName = { family: "Manrope", style: "Regular" };
  t2.characters = "slot " + (i + 1); t2.fontSize = 11;
  col.appendChild(t2); t2.fills = [paint("color/light/ink-3")];
});

/* ---- specimen 1: projection, one series, straight segments ---- */
const W = 820, H = 240, L = 66, R = 16, T = 16, B = 30;
const R7 = 0.07, TARGET = 1500000, MAXY = 2400000;
const grow = (m, y) => { const K = m * 12 / R7; return Math.round((50000 + K) * Math.pow(1 + R7, y) - K); };
const YEARS = [0, 5, 10, 15, 20, 25, 30];
const sx = (i) => L + (W - L - R) * (i / (YEARS.length - 1));
const sy = (v) => (H - B) - ((H - B) - T) * (v / MAXY);

function chartCard(title, note, build) {
  const card = figma.createAutoLayout("VERTICAL", { name: title, itemSpacing: 4 });
  card.paddingTop = 24; card.paddingBottom = 24; card.paddingLeft = 24; card.paddingRight = 24;
  card.cornerRadius = 20; card.strokeWeight = 1;
  card.strokes = [paint("color/light/border")];
  card.fills = [paint("color/light/card")];
  board.appendChild(card);
  const t = figma.createText();
  t.fontName = { family: "Manrope", style: "Bold" };
  t.characters = title.toUpperCase(); t.fontSize = 11;
  t.letterSpacing = { unit: "PERCENT", value: 9 };
  card.appendChild(t); t.fills = [paint("color/light/ink-3")];
  const n = figma.createText();
  n.fontName = { family: "Manrope", style: "Regular" };
  n.characters = note; n.fontSize = 13;
  card.appendChild(n); n.fills = [paint("color/light/ink-3")];
  const plot = figma.createFrame();
  plot.name = "plot"; plot.resize(W, H); plot.fills = [];
  card.appendChild(plot);
  build(plot);
  return card;
}

const gridline = (plot, y) => {
  const ln = figma.createLine();
  ln.resize(W - L - R, 0); ln.x = L; ln.y = y;
  ln.strokes = [paint("color/light/border")];
  ln.dashPattern = [3, 3];
  plot.appendChild(ln);
};
const axisText = (plot, s, x, y, align) => {
  const t = figma.createText();
  t.fontName = { family: "DM Mono", style: "Medium" };
  t.characters = s; t.fontSize = 11;
  t.textAlignHorizontal = align || "RIGHT";
  t.x = x; t.y = y;
  plot.appendChild(t); t.fills = [paint("color/light/ink-3")];
  return t;
};

chartCard("One series — no legend, the title names it",
  "Portfolio against the FIRE target · $1,500/mo from $50k at 7% real", (plot) => {
    for (const v of [0, 600000, 1200000, 1800000, 2400000]) {
      gridline(plot, sy(v));
      axisText(plot, money(v), 4, sy(v) - 7).resize(54, 14);
    }
    const pts = YEARS.map((y, i) => ({ x: sx(i), y: sy(grow(1500, y)) }));
    const line = figma.createVector();
    line.vectorPaths = [{ windingRule: "NONE", data: "M " + pts.map((p) => p.x + " " + p.y).join(" L ") }];
    line.strokes = [paint("color/light/chart-1")];
    line.strokeWeight = 2; line.strokeJoin = "ROUND"; line.fills = [];
    plot.appendChild(line);
    const tl = figma.createLine();
    tl.resize(W - L - R, 0); tl.x = L; tl.y = sy(TARGET);
    tl.strokes = [paint("color/light/ink-3")];
    tl.dashPattern = [4, 5];
    plot.appendChild(tl);
    axisText(plot, "FIRE target  $1.5M", L + 8, sy(TARGET) - 22, "LEFT").resize(150, 14);
    YEARS.forEach((y, i) => axisText(plot, "+" + y + "y", sx(i) - 22, H - 20, "CENTER").resize(44, 14));
  });

/* ---- specimen 2: money in and money out, one axis, one zero line ---- */
chartCard("Money in and money out — one axis, one zero line",
  "Income and expenses are one quantity with a direction. August nets negative and you can see it without reading a number.",
  (plot) => {
    const CF = [["Apr",8000,-5200],["May",8000,-4900],["Jun",8000,-6400],["Jul",9600,-5100],["Aug",8000,-8700],["Sep",8000,-5000]];
    const MAX = 10000;
    const zy = (v) => (H - B) - ((H - B) - T) * ((v + MAX) / (2 * MAX));
    for (const v of [-10000, -5000, 0, 5000, 10000]) {
      gridline(plot, zy(v));
      axisText(plot, money(v), 0, zy(v) - 7).resize(58, 14);
    }
    const zero = figma.createLine();
    zero.resize(W - L - R, 0); zero.x = L; zero.y = zy(0);
    zero.strokes = [paint("color/light/ink-3")];
    plot.appendChild(zero);
    const step = (W - L - R) / CF.length, bw = Math.min(30, step * 0.4);
    CF.forEach((row, i) => {
      const cx = L + step * (i + 0.5);
      [[row[1], "chart-1"], [row[2], "chart-3"]].forEach((s, j) => {
        const v = s[0], top = v >= 0 ? zy(v) : zy(0), hgt = Math.abs(zy(v) - zy(0));
        const r = figma.createRectangle();
        r.resize(bw, Math.max(hgt, 1));
        r.x = cx - bw - 2 + j * (bw + 4); r.y = top;
        r.cornerRadius = 4;
        r.fills = [paint("color/light/" + s[1])];
        plot.appendChild(r);
      });
      axisText(plot, row[0], cx - 22, H - 20, "CENTER").resize(44, 14);
    });
  });

return { boardId: board.id, createdNodeIds: [board.id] };
