/* Shared helpers. Paste above any of the numbered scripts, or inline the two
   functions you need — use_figma has no module system, so there is no import. */

// Figma colours are 0–1, not 0–255. Getting this wrong is silent: the value is
// clamped and everything renders white.
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

// setBoundVariableForPaint returns a NEW paint — it does not mutate. Capture it.
const paintFor = (vars, name) => {
  const v = vars.find((x) => x.name === name);
  if (!v) throw new Error("no variable named " + name);
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
};

const bindRadius = (vars, node, varName) => {
  const v = vars.find((x) => x.name === varName);
  for (const c of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    node.setBoundVariable(c, v);
  }
};
