/* Colour + Scale collections, mirroring app/globals.css one for one.
   Every variable carries its CSS custom property as WEB code syntax, so a
   token here and a token in the stylesheet are the same thing in Dev Mode.

   Starter plan allows one mode per collection, so light and dark are two
   groups rather than modes. On Professional, replace the theme loop with
   coll.addMode("Dark") and setValueForMode per mode, and drop the theme
   segment from the variable name. */

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};
const FILL = ["FRAME_FILL", "SHAPE_FILL"];
const TEXT = ["TEXT_FILL"];
const STROKE = ["STROKE_COLOR"];
const ANY = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];

// name, cssVar, light, dark, scopes
const TOKENS = [
  ["ground","--uf-ground","#FDF8F1","#16120D",FILL],
  ["card","--uf-card","#FFFDFA","#1F1A13",FILL],
  ["surface","--uf-surface","#F7EFE3","#191410",FILL],
  ["surface-2","--uf-surface-2","#F0E5D5","#2A2318",FILL],
  ["border","--uf-border","#EFE2D0","#332B21",STROKE],
  ["border-2","--uf-border-2","#DFCDB4","#463C2D",STROKE],
  ["ink","--uf-ink","#221B12","#F5EDE1",TEXT],
  ["ink-2","--uf-ink-2","#6B5C48","#BAAB95",TEXT],
  ["ink-3","--uf-ink-3","#9A8B76","#8A7C68",TEXT],
  ["green","--uf-green","#12856A","#2FA383",ANY],
  ["green-700","--uf-green-700","#0C6B55","#3CBA97",ANY],
  ["green-900","--uf-green-900","#06412F","#BFE9DA",ANY],
  ["green-100","--uf-green-100","#CDEBE1","#123A2E",FILL],
  ["green-50","--uf-green-50","#E6F5EF","#0E2C23",FILL],
  ["teal","--uf-teal","#0E9C86","#35C9AE",ANY],
  ["teal-deep","--uf-teal-deep","#0A7665","#5FDCC4",ANY],
  ["teal-soft","--uf-teal-soft","#D3F1EA","#0F3A33",FILL],
  ["teal-line","--uf-teal-line","#7FD9C6","#1E6B5D",ANY],
  ["pos","--uf-pos","#12856A","#2FA383",ANY],
  ["neg","--uf-neg","#C0483C","#E07A6C",ANY],
  ["neg-bg","--uf-neg-bg","#FAE6E2","#3A201C",FILL],
  ["warn","--uf-warn","#C4831A","#E0A84E",ANY],
  ["warn-bg","--uf-warn-bg","#FCEFD8","#3A2C13",FILL],
  ["pos-ink","--uf-pos-ink","#107B62","#5FCFAC",TEXT],
  ["neg-ink","--uf-neg-ink","#B24237","#EE9B90",TEXT],
  ["warn-ink","--uf-warn-ink","#936213","#EDBC72",TEXT],
  ["chart-1","--uf-chart-1","#0E9C86","#26A68E",ANY],
  ["chart-2","--uf-chart-2","#5B5BD6","#8189E6",ANY],
  ["chart-3","--uf-chart-3","#B07A12","#B78A26",ANY],
];

const NUMS = [
  ["radius/control","--uf-r-control",12,["CORNER_RADIUS"]],
  ["radius/card","--uf-r-card",20,["CORNER_RADIUS"]],
  ["radius/modal","--uf-r-modal",28,["CORNER_RADIUS"]],
  ["radius/pill","--uf-r-pill",999,["CORNER_RADIUS"]],
  ["space/1","--uf-s1",4,["GAP","WIDTH_HEIGHT"]],
  ["space/2","--uf-s2",8,["GAP","WIDTH_HEIGHT"]],
  ["space/3","--uf-s3",12,["GAP","WIDTH_HEIGHT"]],
  ["space/4","--uf-s4",16,["GAP","WIDTH_HEIGHT"]],
  ["space/5","--uf-s5",24,["GAP","WIDTH_HEIGHT"]],
  ["space/6","--uf-s6",32,["GAP","WIDTH_HEIGHT"]],
  ["space/7","--uf-s7",48,["GAP","WIDTH_HEIGHT"]],
];

const colls = await figma.variables.getLocalVariableCollectionsAsync();
const ids = [];

let colour = colls.find((c) => c.name === "Color");
if (!colour) colour = figma.variables.createVariableCollection("Color");
colour.renameMode(colour.modes[0].modeId, "Value");
const cMode = colour.modes[0].modeId;

let scale = colls.find((c) => c.name === "Scale");
if (!scale) scale = figma.variables.createVariableCollection("Scale");
scale.renameMode(scale.modes[0].modeId, "Value");
const sMode = scale.modes[0].modeId;

const all = await figma.variables.getLocalVariablesAsync();
const find = (path, coll) => all.find((x) => x.name === path && x.variableCollectionId === coll.id);

for (const [name, css, l, d, scopes] of TOKENS) {
  for (const theme of ["light", "dark"]) {
    const path = "color/" + theme + "/" + name;
    let v = find(path, colour) || figma.variables.createVariable(path, colour, "COLOR");
    v.setValueForMode(cMode, hex(theme === "light" ? l : d));
    v.scopes = scopes;
    v.setVariableCodeSyntax("WEB", "var(" + css + ")");
    v.description = css + " · " + theme + " theme · source: app/globals.css";
    ids.push(v.id);
  }
}

for (const [path, css, val, scopes] of NUMS) {
  let v = find(path, scale) || figma.variables.createVariable(path, scale, "FLOAT");
  v.setValueForMode(sMode, val);
  v.scopes = scopes;
  v.setVariableCodeSyntax("WEB", "var(" + css + ")");
  v.description = css + " · source: app/globals.css";
  ids.push(v.id);
}

return { colourCollectionId: colour.id, scaleCollectionId: scale.id, variableCount: ids.length, createdNodeIds: ids };
