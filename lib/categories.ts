export type CategoryDef = {
  key: string;
  label: string;
  code: string;
  color: string;
  emoji: string;
};

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { key: "food",          label: "Food",          code: "FD", color: "#f97316", emoji: "🍔" },
  { key: "transport",     label: "Transport",     code: "TR", color: "#22d3a5", emoji: "🚗" },
  { key: "housing",       label: "Housing",       code: "HO", color: "#818cf8", emoji: "🏠" },
  { key: "utilities",     label: "Utilities",     code: "UT", color: "#38bdf8", emoji: "💡" },
  { key: "travel",        label: "Travel",        code: "TV", color: "#0ea5e9", emoji: "✈️" },
  { key: "subscriptions", label: "Subscriptions", code: "SB", color: "#a78bfa", emoji: "📱" },
  { key: "healthcare",    label: "Healthcare",    code: "HC", color: "#ef4444", emoji: "🏥" },
  { key: "entertainment", label: "Entertain",     code: "EN", color: "#fbbf24", emoji: "🎬" },
  { key: "shopping",      label: "Shopping",      code: "SH", color: "#ec4899", emoji: "🛍️" },
  { key: "work",          label: "Work",          code: "WK", color: "#6366f1", emoji: "💼" },
  { key: "other",         label: "Other",         code: "OT", color: "#6b7280", emoji: "📦" },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { key: "salary",       label: "Salary",     code: "SA", color: "#22d3a5", emoji: "💵" },
  { key: "freelance",    label: "Freelance",  code: "FR", color: "#34d399", emoji: "💻" },
  { key: "investment",   label: "Investment", code: "IV", color: "#818cf8", emoji: "📈" },
  { key: "gift",         label: "Gift",       code: "GF", color: "#a78bfa", emoji: "🎁" },
  { key: "other_income", label: "Other",      code: "OI", color: "#6b7280", emoji: "📦" },
];

export const ALL_CATEGORIES: CategoryDef[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const COLOR_PALETTE = [
  "#f43f5e", "#f97316", "#eab308", "#84cc16", "#14b8a6",
  "#0ea5e9", "#8b5cf6", "#ec4899", "#a855f7", "#6b7280",
];

export const EMOJI_PALETTE = [
  "🍔", "🚗", "🏠", "✈️", "📱", "🏥", "🎬", "🛍️", "💼", "📦",
  "💵", "💻", "📈", "🎁", "🎓", "🎮", "☕", "💪", "🎵", "🎨",
  "🐕", "🌴", "⚽", "🍕", "📚", "🎸", "🛒", "🏋️", "🧘", "💈",
];

// ─── Customization overlay ────────────────────────────────────────────────────
export type CatCustomization = { color?: string; emoji?: string };
export type CatCustomizations = Record<string, CatCustomization>;

export function loadCatCustomizations(): CatCustomizations {
  try { return JSON.parse(localStorage.getItem("uf_cat_customizations") || "{}"); } catch { return {}; }
}

export function saveCatCustomizations(c: CatCustomizations): void {
  localStorage.setItem("uf_cat_customizations", JSON.stringify(c));
}

export function resolveDisplay(
  base: { color: string; emoji: string },
  customs: CatCustomizations,
  key: string,
): { color: string; emoji: string } {
  const c = customs[key] ?? {};
  return { color: c.color ?? base.color, emoji: c.emoji ?? base.emoji };
}
