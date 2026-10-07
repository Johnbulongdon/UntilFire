export type CategoryDef = {
  key: string;
  label: string;
  code: string;
  color: string;
  emoji: string;
};

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { key: "food",          label: "Food",          code: "FD", color: "#eb6834", emoji: "🍔" },
  { key: "transport",     label: "Transport",     code: "TR", color: "#1baf7a", emoji: "🚗" },
  { key: "housing",       label: "Housing",       code: "HO", color: "#2a78d6", emoji: "🏠" },
  { key: "utilities",     label: "Utilities",     code: "UT", color: "#eda100", emoji: "💡" },
  { key: "healthcare",    label: "Healthcare",    code: "HC", color: "#e34948", emoji: "🏥" },
  { key: "shopping",      label: "Shopping",      code: "SH", color: "#e87ba4", emoji: "🛍️" },
  { key: "entertainment", label: "Entertain",     code: "EN", color: "#008300", emoji: "🎬" },
  { key: "travel",        label: "Travel",        code: "TV", color: "#6b5bd2", emoji: "✈️" },
  { key: "education",     label: "Education",     code: "ED", color: "#eda100", emoji: "🎓" },
  { key: "subscriptions", label: "Subscriptions", code: "SB", color: "#6b5bd2", emoji: "📱" },
  { key: "personal_care", label: "Personal Care", code: "PC", color: "#e87ba4", emoji: "💆" },
  { key: "pets",          label: "Pets",          code: "PT", color: "#eb6834", emoji: "🐾" },
  { key: "work",          label: "Work",          code: "WK", color: "#2a78d6", emoji: "💼" },
  { key: "other",         label: "Other",         code: "OT", color: "#8a7c68", emoji: "📦" },
];

/** Default sub-categories per expense category; transactions and Upcoming bills share them. */
export const SUB_CATEGORIES: Record<string, string[]> = {
  food:          ["Groceries", "Restaurants", "Takeout & Delivery", "Drinks & Bars", "Other"],
  transport:     ["Gas & Fuel", "Parking", "Public Transit", "Ride Share", "Insurance", "Maintenance", "Other"],
  housing:       ["Rent/Mortgage", "Insurance", "Maintenance", "Furnishing", "Property Tax", "HOA", "Other"],
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
  { key: "salary",       label: "Salary",     code: "SA", color: "#1baf7a", emoji: "💵" },
  { key: "freelance",    label: "Freelance",  code: "FR", color: "#008300", emoji: "💻" },
  { key: "investment",   label: "Investment", code: "IV", color: "#2a78d6", emoji: "📈" },
  { key: "gift",         label: "Gift",       code: "GF", color: "#e87ba4", emoji: "🎁" },
  { key: "other_income", label: "Other",      code: "OI", color: "#8a7c68", emoji: "📦" },
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
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6b5bd2", "#e34948", "#8a7c68",
];

/** The palette colour closest to any hex, so older custom colours land on the new set. */
/** Account types are categories on Net worth (D-40), so they take palette colours. */
export const ACCOUNT_TYPE_COLORS = {
  retirement: COLOR_PALETTE[5],
  brokerage: COLOR_PALETTE[0],
  cash: COLOR_PALETTE[3],
} as const;

export function nearestPaletteColor(hex: string): string {
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
