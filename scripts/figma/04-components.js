/* Button, Badge, Card, Alert as component sets. Every fill, stroke and radius
   binds to a variable — a hardcoded value here is a value that cannot follow a
   token change.

   combineAsVariants stacks all variants at (0,0); the auto-layout on the set
   afterwards is what lays them out. Without it they overlap. */

const page = figma.root.children.find((p) => p.name === "Components");
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: "Manrope", style: "Bold" });
await figma.loadFontAsync({ family: "Manrope", style: "Regular" });
await figma.loadFontAsync({ family: "DM Mono", style: "Medium" });

const vars = await figma.variables.getLocalVariablesAsync();
const V = (n) => vars.find((v) => v.name === n);
const paint = (n) => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(n));
const radius = (node, v) => {
  for (const c of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) node.setBoundVariable(c, V(v));
};
const shelf = (set, x, y, dir, gap) => {
  set.x = x; set.y = y;
  set.layoutMode = dir;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  set.itemSpacing = gap;
  set.paddingTop = 32; set.paddingBottom = 32; set.paddingLeft = 32; set.paddingRight = 32;
};

/* ---- Button: 4 styles x 3 sizes ---- */
const SIZES = { Small: [8,16,13], Medium: [11,22,14], Large: [14,28,15] };
const STYLES = {
  Primary:   { bg: "color/light/green", fg: null,                stroke: null },
  Secondary: { bg: "color/light/card",  fg: "color/light/ink",   stroke: "color/light/border-2" },
  Ghost:     { bg: null,                fg: "color/light/ink-2", stroke: null },
  Danger:    { bg: null,                fg: "color/light/neg",   stroke: "color/light/neg" },
};
const btns = [];
for (const [sty, spec] of Object.entries(STYLES)) {
  for (const [sz, [py, px, fs]] of Object.entries(SIZES)) {
    const c = figma.createComponent();
    c.name = "Style=" + sty + ", Size=" + sz;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO";
    c.counterAxisAlignItems = "CENTER"; c.primaryAxisAlignItems = "CENTER";
    c.paddingTop = py; c.paddingBottom = py; c.paddingLeft = px; c.paddingRight = px;
    c.itemSpacing = 8; c.cornerRadius = 999; c.strokeWeight = 1;
    radius(c, "radius/pill");
    c.fills = spec.bg ? [paint(spec.bg)] : [];
    c.strokes = spec.stroke ? [paint(spec.stroke)] : [];
    const t = figma.createText();
    t.fontName = { family: "Manrope", style: "Bold" };
    t.characters = sz; t.fontSize = fs;
    c.appendChild(t);
    // Primary text is literal white: Button.tsx sets color "#fff" and there is
    // no --uf-* token for pure white on green. If one is added, bind it here.
    t.fills = spec.fg ? [paint(spec.fg)] : [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    page.appendChild(c); btns.push(c);
  }
}
const btnSet = figma.combineAsVariants(btns, page);
btnSet.name = "Button";
btnSet.description = "components/ui/Button.tsx — four variants, three sizes.\n\n" +
  "Primary is the only green-filled button on a screen: if two things are both primary, one of them is not. " +
  "Teal is never a button — it means progress toward the freedom date.";
shelf(btnSet, 200, 200, "VERTICAL", 20);

/* ---- Badge: 5 tones ---- */
const TONES = [
  ["Positive","color/light/green-50","color/light/pos-ink","On track"],
  ["Negative","color/light/neg-bg","color/light/neg-ink","Over budget"],
  ["Warning","color/light/warn-bg","color/light/warn-ink","Needs input"],
  ["Freedom","color/light/teal-soft","color/light/teal-deep","2.4 years earlier"],
  ["Muted","color/light/surface-2","color/light/ink-3","Draft"],
];
const badges = [];
for (const [tone, bg, fg, label] of TONES) {
  const c = figma.createComponent();
  c.name = "Tone=" + tone;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO";
  c.counterAxisAlignItems = "CENTER";
  c.paddingTop = 4; c.paddingBottom = 4; c.paddingLeft = 11; c.paddingRight = 11;
  c.itemSpacing = 5; c.cornerRadius = 999;
  radius(c, "radius/pill");
  c.fills = [paint(bg)];
  const t = figma.createText();
  t.fontName = { family: "Manrope", style: "Bold" };
  t.characters = label; t.fontSize = 11;
  c.appendChild(t); t.fills = [paint(fg)];
  page.appendChild(c); badges.push(c);
}
const badgeSet = figma.combineAsVariants(badges, page);
badgeSet.name = "Badge";
badgeSet.description = "components/ui/Badge.tsx — the status pill, five tones.\n\n" +
  "freedom is the teal tone and is reserved for progress toward the freedom date; generic good news is " +
  "positive. Badge text is 11px, so it uses the *-ink token variants — the base colours fail AA at that size.";
shelf(badgeSet, 700, 200, "VERTICAL", 16);

/* ---- Card: 3 elevations ---- */
const fx = await figma.getLocalEffectStylesAsync();
const cards = [];
for (const [name, styleName] of [["Flat",null],["Raised","Elevation/e1"],["Float","Elevation/e2"]]) {
  const c = figma.createComponent();
  c.name = "Elevation=" + name;
  c.layoutMode = "VERTICAL";
  c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
  c.resize(240, 100); c.itemSpacing = 6;
  c.paddingTop = 24; c.paddingBottom = 24; c.paddingLeft = 24; c.paddingRight = 24;
  c.cornerRadius = 20; radius(c, "radius/card");
  c.fills = [paint("color/light/card")];
  c.strokeWeight = 1; c.strokes = [paint("color/light/border")];
  if (styleName) { const st = fx.find((s) => s.name === styleName); if (st) await c.setEffectStyleIdAsync(st.id); }
  for (const [txt, size, style, tok] of [
    ["ELEVATION", 11, "Bold", "color/light/ink-3"],
    [name.toLowerCase(), 18, "Bold", "color/light/ink"],
    [styleName ? "--uf-" + styleName.split("/")[1] : "No shadow", 13, "Regular", "color/light/ink-2"],
  ]) {
    const t = figma.createText();
    t.fontName = { family: "Manrope", style };
    t.characters = txt; t.fontSize = size;
    if (size === 11) t.letterSpacing = { unit: "PERCENT", value: 9 };
    c.appendChild(t); t.fills = [paint(tok)];
  }
  page.appendChild(c); cards.push(c);
}
const cardSet = figma.combineAsVariants(cards, page);
cardSet.name = "Card";
cardSet.description = "components/ui/Card.tsx — the surface, three elevations.\n\n" +
  "flat for anything already inside a card, raised for the default card, float for popovers and modals.";
shelf(cardSet, 1200, 200, "VERTICAL", 28);

return {
  createdNodeIds: [btnSet.id, badgeSet.id, cardSet.id],
  variants: { Button: btnSet.children.length, Badge: badgeSet.children.length, Card: cardSet.children.length },
};
