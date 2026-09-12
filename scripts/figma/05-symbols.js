/* PENDING — not yet applied to the file (Starter MCP call cap).

   The eight glyphs, as a component set so icons are swapped by INSTANCE_SWAP
   rather than by making a variant of every parent component per icon.

   Path data is copied verbatim from ICON_PATHS in components/ui/Icon.tsx. If
   you change a glyph, change it there and re-run this — not the other way. */

const page = figma.root.children.find((p) => p.name === "Charts, Logo & Motion");
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: "Fraunces", style: "Bold" });
await figma.loadFontAsync({ family: "Manrope", style: "Regular" });

const vars = await figma.variables.getLocalVariablesAsync();
const paint = (n) => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", vars.find((v) => v.name === n));

// Keep in sync with ICON_PATHS in components/ui/Icon.tsx.
const ICON_PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  money: '<path d="M4 20h16"/><path d="M6 16l4-4 3 3 5-7"/><path d="M14 8h4v4"/>',
  plan: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  critical: '<path d="M12 3.1l8.9 15.8H3.1z"/><path d="M12 9.6v4.1M12 16.8v.1"/>',
  warning: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5.5M12 16.3v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10.8v5.4M12 7.7v.1"/>',
  positive: '<path d="M4.2 12.6l4.8 4.8L19.8 6.6"/>',
};
const USE = {
  home: "dashboard nav", money: "dashboard nav", plan: "dashboard nav", profile: "user menu",
  critical: "Alert", warning: "Alert", info: "Alert", positive: "Alert",
};

const made = [];
for (const [name, body] of Object.entries(ICON_PATHS)) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'stroke="#221B12" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>";
  const node = figma.createNodeFromSvg(svg);
  node.name = "glyph";

  const c = figma.createComponent();
  c.name = "Symbol=" + name;
  c.resize(24, 24);
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED";
  c.primaryAxisAlignItems = "CENTER"; c.counterAxisAlignItems = "CENTER";
  c.fills = [];
  c.appendChild(node);
  c.description = USE[name];
  page.appendChild(c);
  made.push(c);
}

const set = figma.combineAsVariants(made, page);
set.name = "Symbol";
set.description =
  "components/ui/Icon.tsx — four nav glyphs, four alert severity glyphs.\n\n" +
  "Stroke-based on a 24px grid, one consistent style, drawn in currentColor in code so a glyph takes the " +
  "colour of the text beside it. Never emoji: emoji render differently on every platform and cannot be " +
  "recoloured.\n\n" +
  "Swap by instance rather than adding an icon variant to a parent component — a variant per icon is how a " +
  "variant matrix explodes.\n\n" +
  "The severity glyphs are not decoration. They are what carries severity to a reader who cannot separate " +
  "the alert tones by colour.";
set.x = 0; set.y = 520;
set.layoutMode = "HORIZONTAL";
set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
set.itemSpacing = 28;
set.paddingTop = 28; set.paddingBottom = 28; set.paddingLeft = 28; set.paddingRight = 28;

const cap = figma.createAutoLayout("VERTICAL", { name: "Symbols — heading", itemSpacing: 8 });
cap.x = 0; cap.y = 400; cap.fills = [];
page.appendChild(cap);
const h = figma.createText();
h.fontName = { family: "Fraunces", style: "Bold" };
h.characters = "Symbols"; h.fontSize = 34;
cap.appendChild(h); h.fills = [paint("color/light/ink")];
const sub = figma.createText();
sub.fontName = { family: "Manrope", style: "Regular" };
sub.characters = "Four nav glyphs, four severity glyphs. Stroke-based, 24px grid, one style. Never emoji.";
sub.fontSize = 15;
cap.appendChild(sub); sub.fills = [paint("color/light/ink-2")];

return { symbolSetId: set.id, symbols: set.children.length, createdNodeIds: [set.id, cap.id] };
