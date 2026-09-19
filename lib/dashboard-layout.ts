/**
 * Which cards Home shows, in what order, at what width.
 *
 * Home is a fixed stack for everyone today, which means a Debts card sits
 * there taking space for someone with no debts, and the card that matters
 * most to them sits below the fold. So the arrangement becomes theirs.
 *
 * Two rules keep this from rotting:
 *
 * 1. CARDS below is the only list. A card added here appears for everyone,
 *    including people who customised before it existed, because a stored
 *    layout is *merged* with this list rather than replacing it. A card
 *    removed from here vanishes from stored layouts for the same reason.
 * 2. Nothing here decides what a card contains — only whether it is shown,
 *    where, and how wide. Home stays read-only and owns no inputs of its own.
 */

export type CardSpan = "full" | "half";

export interface CardDef {
  id: string;
  /** What the customise panel calls it. */
  label: string;
  /** One line explaining what it shows, for people deciding whether to keep it. */
  hint: string;
  /** Hidden by default for nobody today; here so a future card can ship opt-in. */
  defaultVisible: boolean;
  defaultSpan: CardSpan;
  /**
   * A card that cannot be turned off.
   *
   * Nothing uses this today, deliberately. The greeting was marked required on
   * the first pass and it was the wrong call: Edit and the card inventory both
   * live outside the grid, so an empty Home is always one tap from being
   * repopulated and there is nothing to protect anyone from. Kept so a future
   * card that genuinely cannot be absent has somewhere to say so.
   */
  required?: boolean;
}

/** The order here is the default order. */
export const CARDS: CardDef[] = [
  { id: "greeting",  label: "Greeting",          hint: "Your name and today's date.",                      defaultVisible: true, defaultSpan: "full" },
  { id: "setup",     label: "Setup checklist",   hint: "The remaining steps to a complete plan. Disappears once you finish them.", defaultVisible: true, defaultSpan: "full" },
  { id: "hero",      label: "Progress chart",    hint: "Your portfolio against your FIRE target over time.", defaultVisible: true, defaultSpan: "full" },
  { id: "ontrack",   label: "On-track score",    hint: "Whether your recent months keep your freedom date where it is.", defaultVisible: true, defaultSpan: "full" },
  { id: "yourmonth", label: "Your month",        hint: "Last month's result and this month's next move.",  defaultVisible: true, defaultSpan: "full" },
  { id: "freedom",   label: "Freedom date",      hint: "When work becomes optional, and the one move that brings it closer.", defaultVisible: true, defaultSpan: "full" },
  { id: "goals",     label: "Your goals",        hint: "The targets you set, and progress toward each.",   defaultVisible: true, defaultSpan: "full" },
  { id: "operating", label: "Monthly operating", hint: "What came in, what went out, what you kept.",      defaultVisible: true, defaultSpan: "full" },
  { id: "support",   label: "Where your money is", hint: "How your balance is split across accounts and types.", defaultVisible: true, defaultSpan: "full" },
];

export interface CardPref {
  id: string;
  visible: boolean;
  span: CardSpan;
}

export interface DashboardLayout {
  cards: CardPref[];
}

export function defaultLayout(): DashboardLayout {
  return { cards: CARDS.map((c) => ({ id: c.id, visible: c.defaultVisible, span: c.defaultSpan })) };
}

export function cardDef(id: string): CardDef | undefined {
  return CARDS.find((c) => c.id === id);
}

/**
 * Turn whatever is stored into a layout that covers exactly today's cards.
 *
 * Stored order wins for cards the user has arranged; anything new is appended
 * in its CARDS position rather than silently missing. Unknown ids — a card
 * that has since been removed — are dropped. A required card is forced visible
 * however it was stored, so a layout written by an older build cannot hide
 * something that must be there.
 *
 * Never throws: a corrupt value falls back to the defaults, because a broken
 * preference must not be able to break Home.
 */
export function normaliseLayout(stored: unknown): DashboardLayout {
  if (stored == null) return defaultLayout();

  let raw: unknown = stored;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return defaultLayout(); }
  }

  const list = (raw as DashboardLayout | null)?.cards;
  if (!Array.isArray(list)) return defaultLayout();

  const seen = new Set<string>();
  const out: CardPref[] = [];

  for (const entry of list) {
    const id = (entry as CardPref)?.id;
    if (typeof id !== "string") continue;
    const def = cardDef(id);
    if (!def || seen.has(id)) continue;
    seen.add(id);
    const span = (entry as CardPref)?.span;
    out.push({
      id,
      visible: def.required ? true : (entry as CardPref)?.visible !== false,
      span: span === "half" || span === "full" ? span : def.defaultSpan,
    });
  }

  // Cards the stored layout predates, inserted where CARDS puts them so a new
  // card does not always land at the bottom.
  for (let i = 0; i < CARDS.length; i++) {
    const def = CARDS[i];
    if (seen.has(def.id)) continue;
    const pref: CardPref = { id: def.id, visible: def.defaultVisible, span: def.defaultSpan };
    const before = CARDS.slice(0, i).map((c) => c.id);
    const at = out.findIndex((c) => !before.includes(c.id));
    if (at === -1) out.push(pref); else out.splice(at, 0, pref);
  }

  return { cards: out };
}

export function moveCard(layout: DashboardLayout, id: string, dir: -1 | 1): DashboardLayout {
  const cards = [...layout.cards];
  const i = cards.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= cards.length) return layout;
  [cards[i], cards[j]] = [cards[j], cards[i]];
  return { cards };
}

export function setCard(layout: DashboardLayout, id: string, patch: Partial<CardPref>): DashboardLayout {
  return {
    cards: layout.cards.map((c) => {
      if (c.id !== id) return c;
      const def = cardDef(id);
      return { ...c, ...patch, visible: def?.required ? true : (patch.visible ?? c.visible) };
    }),
  };
}
