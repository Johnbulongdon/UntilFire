/* Nine text styles matching the .uf-t-* classes, and the three warm elevation
   shadows. Fonts must be loaded before any text write or the style assignment
   throws — verify style strings with listAvailableFontsAsync if a load fails
   ("SemiBold" vs "Semi Bold" is the usual footgun). */

// name, family, style, size, letterSpacing(em), lineHeight(multiplier), case, cssClass
const RAMP = [
  ["Display","Fraunces","Bold",56,-0.030,1.00,"ORIGINAL",".uf-t-display"],
  ["H1","Fraunces","Bold",34,-0.022,1.14,"ORIGINAL",".uf-t-h1"],
  ["H2","Fraunces","Bold",24,-0.018,1.22,"ORIGINAL",".uf-t-h2"],
  ["H3","Manrope","Bold",18,-0.010,1.35,"ORIGINAL",".uf-t-h3"],
  ["Lead","Manrope","Regular",16,0.000,1.65,"ORIGINAL",".uf-t-lead"],
  ["Body","Manrope","Regular",14,0.000,1.60,"ORIGINAL",".uf-t-body"],
  ["Small","Manrope","Regular",13,0.000,1.50,"ORIGINAL",".uf-t-small"],
  ["Label","Manrope","Bold",11,0.090,1.40,"UPPER",".uf-t-label"],
  ["Data","DM Mono","Medium",16,0.000,1.40,"ORIGINAL",".uf-t-data"],
];

for (const f of [...new Set(RAMP.map((r) => r[1] + "|" + r[2]))]) {
  const [family, style] = f.split("|");
  await figma.loadFontAsync({ family, style });
}

const existingText = await figma.getLocalTextStylesAsync();
const ids = [];
for (const [name, family, style, size, ls, lh, tcase, cls] of RAMP) {
  let st = existingText.find((s) => s.name === "Type/" + name);
  if (!st) { st = figma.createTextStyle(); st.name = "Type/" + name; }
  st.fontName = { family, style };
  st.fontSize = size;
  st.letterSpacing = { unit: "PERCENT", value: ls * 100 };
  st.lineHeight = { unit: "PERCENT", value: lh * 100 };
  st.textCase = tcase;
  st.description = cls + " · " + family + " " + style + " " + size + "px · source: app/globals.css";
  ids.push(st.id);
}

// Warm shadows, never black — money apps are cold, this one is not.
const warm = (a) => ({ r: 120 / 255, g: 80 / 255, b: 30 / 255, a });
const SHADOWS = [
  ["Elevation/e1", warm(0.06), { x: 0, y: 1 }, 2],
  ["Elevation/e2", warm(0.08), { x: 0, y: 6 }, 20],
  ["Elevation/e3", warm(0.13), { x: 0, y: 16 }, 40],
];
const existingFx = await figma.getLocalEffectStylesAsync();
for (const [name, color, offset, radius] of SHADOWS) {
  let st = existingFx.find((s) => s.name === name);
  if (!st) { st = figma.createEffectStyle(); st.name = name; }
  st.effects = [{ type: "DROP_SHADOW", color, offset, radius, spread: 0, visible: true, blendMode: "NORMAL" }];
  st.description = "--uf-" + name.split("/")[1] + " · light theme";
  ids.push(st.id);
}

return { textStyles: RAMP.length, effectStyles: SHADOWS.length, createdNodeIds: ids };
