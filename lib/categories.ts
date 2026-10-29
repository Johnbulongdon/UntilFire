export type CategoryDef = {
  key: string;
  label: string;
  code: string;
  color: string;
  emoji: string;
};

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { key: "food",          label: "Food",          code: "FD", color: "#ffd4b8", emoji: "🍔" },
  { key: "transport",     label: "Transport",     code: "TR", color: "#bce9da", emoji: "🚗" },
  { key: "housing",       label: "Housing",       code: "HO", color: "#b9d9f7", emoji: "🏠" },
  { key: "utilities",     label: "Utilities",     code: "UT", color: "#ffe58a", emoji: "💡" },
  { key: "healthcare",    label: "Healthcare",    code: "HC", color: "#f7c6cb", emoji: "🏥" },
  { key: "shopping",      label: "Shopping",      code: "SH", color: "#f4cee3", emoji: "🛍️" },
  { key: "entertainment", label: "Entertain",     code: "EN", color: "#cde6ae", emoji: "🎬" },
  { key: "travel",        label: "Travel",        code: "TV", color: "#d9cef3", emoji: "✈️" },
  { key: "education",     label: "Education",     code: "ED", color: "#ffe58a", emoji: "🎓" },
  { key: "subscriptions", label: "Subscriptions", code: "SB", color: "#d9cef3", emoji: "📱" },
  { key: "personal_care", label: "Personal Care", code: "PC", color: "#f4cee3", emoji: "💆" },
  { key: "pets",          label: "Pets",          code: "PT", color: "#ffd4b8", emoji: "🐾" },
  { key: "work",          label: "Work",          code: "WK", color: "#b9d9f7", emoji: "💼" },
  { key: "other",         label: "Other",         code: "OT", color: "#ded8cd", emoji: "📦" },
];

/** Default sub-categories per expense category; transactions and Upcoming bills share them. */
export const SUB_CATEGORIES: Record<string, string[]> = {
  food:          ["Groceries", "Restaurants", "Takeout & Delivery", "Drinks & Bars", "Other"],
  transport:     ["Gas & Fuel", "Parking", "Public Transit", "Ride Share", "Insurance", "Maintenance", "Other"],
  housing:       ["Rent", "Mortgage", "Insurance", "Maintenance", "Furnishing", "Property Tax", "HOA", "Other"],
  utilities:     ["Phone", "Internet", "Electricity", "Water & Gas", "TV/Cable", "Other"],
  healthcare:    ["Doctor/GP", "Pharmacy", "Dental", "Vision", "Mental Health", "Insurance", "Other"],
  shopping:      ["Clothing", "Electronics", "Home Goods", "Sports & Outdoors", "Gifts", "Other"],
  entertainment: ["Movies & Shows", "Events & Concerts", "Sports", "Games", "Hobbies", "Other"],
  travel:        ["Flights", "Hotels", "Activities", "Transport", "Food & Drink", "Other"],
  education:     ["Tuition", "Books & Materials", "Courses", "Other"],
  subscriptions: ["Streaming", "Software & Apps", "Memberships", "News & Media", "Other"],
  personal_care: ["Haircut & Salon", "Skincare & Beauty", "Wellness", "Other"],
  pets:          ["Food & Supplies", "Vet", "Grooming", "Other"],
  work:          ["Equipment", "Software", "Travel", "Training", "Meals", "Other"],
};

export const INCOME_CATEGORIES: CategoryDef[] = [
  { key: "salary",       label: "Salary",     code: "SA", color: "#bce9da", emoji: "💵" },
  { key: "freelance",    label: "Freelance",  code: "FR", color: "#cde6ae", emoji: "💻" },
  { key: "investment",   label: "Investment", code: "IV", color: "#b9d9f7", emoji: "📈" },
  { key: "gift",         label: "Gift",       code: "GF", color: "#f4cee3", emoji: "🎁" },
  { key: "other_income", label: "Other",      code: "OI", color: "#ded8cd", emoji: "📦" },
];

export const ALL_CATEGORIES: CategoryDef[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/**
 * Category colours (D-31). Eight hues checked for colour-blind separation
 * and contrast on both the cream and the warm-dark card, plus a neutral for
 * "Other". There are more categories than colours that can be told apart,
 * so the most common ones get their own hue, rarer ones share, and charts
 * show the top six with the rest folded into Other. Labels and emoji carry
 * identity too, so colour is never the only cue.
 */
export const COLOR_PALETTE = [
  "#b9d9f7", "#ffd4b8", "#bce9da", "#ffe58a", "#f4cee3", "#cde6ae", "#d9cef3", "#f7c6cb", "#ded8cd",
];

/** The palette colour closest to any hex, so older custom colours land on the new set. */
/** Account types are categories on Net worth (D-40), so they take palette colours. */
export const ACCOUNT_TYPE_COLORS = {
  retirement: COLOR_PALETTE[5],
  brokerage: COLOR_PALETTE[0],
  cash: COLOR_PALETTE[3],
  home: COLOR_PALETTE[8],
} as const;

/** Keep saved legacy category hues in the same family without rewriting user data. */
const LEGACY_CATEGORY_COLORS: Record<string, string> = {
  "#2a78d6": "#b9d9f7",
  "#eb6834": "#ffd4b8",
  "#1baf7a": "#bce9da",
  "#eda100": "#ffe58a",
  "#e87ba4": "#f4cee3",
  "#008300": "#cde6ae",
  "#6b5bd2": "#d9cef3",
  "#e34948": "#f7c6cb",
  "#8a7c68": "#ded8cd"
};

export function nearestPaletteColor(hex: string): string {
  const legacy = LEGACY_CATEGORY_COLORS[hex.toLowerCase()];
  if (legacy) return legacy;
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(hex) || COLOR_PALETTE.includes(hex.toLowerCase())) return hex.toLowerCase();
  const [r, g, b] = rgb(hex);
  let best = COLOR_PALETTE[0], d = Infinity;
  for (const c of COLOR_PALETTE) {
    const [r2, g2, b2] = rgb(c);
    const dist = (r - r2) ** 2 * 0.3 + (g - g2) ** 2 * 0.59 + (b - b2) ** 2 * 0.11;
    if (dist < d) { d = dist; best = c; }
  }
  return best;
}

export const EMOJI_PALETTE = [
  // Food & Drink
  "🍔", "🍕", "🍜", "🌮", "🍣", "🥗", "🥐", "🍱", "🍰", "🧆",
  "🍺", "🍷", "☕", "🧋", "🧃",
  // Transport
  "🚗", "🚕", "🚌", "🚲", "🛵", "✈️", "🚁", "⛽", "🚂", "🛞",
  // Housing & Utilities
  "🏠", "🏢", "🏡", "🛋️", "🔑", "🛏️", "💡", "🔌", "💧", "📺",
  "🌐", "📡",
  // Healthcare & Wellness
  "🏥", "💊", "🩺", "🦷", "👁️", "🧠", "❤️", "🩹", "💆", "🧘",
  // Shopping & Personal Care
  "🛍️", "👕", "👟", "👜", "💍", "🕶️", "💅", "💈", "🧴", "🪥",
  // Entertainment & Hobbies
  "🎬", "🎮", "🎵", "🎸", "🎨", "🎭", "🎲", "🎯", "🎧", "🎤",
  "⚽", "🏋️", "🎾", "🏊", "🧩",
  // Travel & Nature
  "🌴", "🏖️", "⛰️", "🗺️", "🧳", "🌏", "🏕️", "🌅",
  // Education & Work
  "🎓", "📚", "✏️", "🔬", "📊", "💼", "💻", "🖥️", "📝", "🤝",
  // Finance & Income
  "💵", "💰", "📈", "💳", "🏦", "🪙",
  // Pets & Misc
  "🐕", "🐈", "🐾", "🐠", "🎁", "📦", "⭐", "🌟",
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
  return { color: nearestPaletteColor(c.color ?? base.color), emoji: c.emoji ?? base.emoji };
}
