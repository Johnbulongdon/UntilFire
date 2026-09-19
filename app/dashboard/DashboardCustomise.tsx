"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  CARDS, cardDef, moveCard, pinnedCount, setCard,
  type CardPref, type DashboardLayout,
} from "@/lib/dashboard-layout";

/**
 * Home, arranged by the person reading it.
 *
 * Direct manipulation: press Edit, drag the actual cards, press X to drop one.
 * An earlier version listed the cards in a side panel with up/down buttons,
 * which worked and read like a settings screen — you edited a description of
 * your home rather than your home.
 *
 * Dragging is pointer-based, not HTML5 drag-and-drop, because the HTML5 API
 * does not fire on touch at all and this product is used on phones. Pointer
 * events cover mouse, touch and pen through one path.
 *
 * Reordering still happens through CSS `order`, so a card's insides never move
 * in the DOM while it is being dragged — only the slot's order value changes.
 */

const GRIP = "≡";   // ≡
const CROSS = "×";  // ×

/** How close to the viewport edge before a drag starts scrolling the page. */
const EDGE = 90;
const EDGE_SPEED = 14;

/**
 * Animate cards between positions instead of teleporting them.
 *
 * FLIP: measure where each card was, let the reorder happen, transform it back
 * to where it started, then release so the browser animates it forward.
 *
 * Two details make the difference between this working and the card visibly
 * jumping, and the first version got both wrong.
 *
 * Positions are measured from `offsetTop`/`offsetLeft`, not
 * `getBoundingClientRect()`. A bounding rect includes any transform currently
 * being animated, so during a drag — where reorders arrive faster than the
 * 220ms animation finishes — each new animation measured a half-animated
 * position, computed a wrong delta, and produced a jump instead of a glide.
 * Offsets are layout positions and ignore transforms entirely. They are also
 * document-relative, so edge-scrolling mid-drag cannot skew them.
 *
 * And an interrupted card carries its in-flight offset into the next
 * animation. Where it *looks* right now is its old layout position plus
 * whatever transform is mid-flight, so the new animation starts from
 * (oldLayout - newLayout) + currentTransform. Without that term a card
 * re-targeted mid-glide snaps to its layout position first.
 */
function useFlip(
  slots: React.RefObject<Map<string, HTMLElement>>,
  key: string,
  skipId: React.RefObject<string | null>,
) {
  const previous = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const now = new Map<string, { left: number; top: number }>();
    for (const [id, el] of slots.current ?? []) {
      now.set(id, { left: el.offsetLeft, top: el.offsetTop });
    }

    if (!reduced) {
      for (const [id, el] of slots.current ?? []) {
        // The carried card is position:fixed and follows the pointer. A
        // transform on its slot would become the containing block for that
        // fixed element and tear it away from the finger.
        if (id === skipId.current) continue;

        const before = previous.current.get(id);
        const after = now.get(id);
        if (!before || !after) continue;

        const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const dx = before.left - after.left + matrix.m41;
        const dy = before.top - after.top + matrix.m42;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

        // Web Animations rather than a CSS transition: starting a new one
        // cleanly replaces the old, which a transition restarted through
        // inline styles does not do reliably when interrupted every frame.
        for (const running of el.getAnimations()) running.cancel();
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
          { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "none" },
        );
      }
    }

    previous.current = now;
  }, [key, slots]);
}

/**
 * How far past a card's midpoint the pointer must travel before the card
 * swaps, as a share of that card's own height.
 *
 * A fixed pixel band was the first attempt and it was still twitchy, because
 * 34px is a lot next to a 60px greeting and almost nothing next to a 420px
 * chart — the same number means "deliberate" in one place and "a tremor" in
 * another. Scaling to the card means you always have to drag a real part of
 * the way into something before it gives way, whatever its size.
 */
const BAND_RATIO = 0.22;
const BAND_MIN = 44;
const BAND_MAX = 110;

/** A drag has to mean it before anything reorders. */
const DRAG_THRESHOLD = 8;

export function useCardSort(
  layout: DashboardLayout,
  /** Live, local, called freely while dragging. */
  onPreview: (next: DashboardLayout) => void,
  /** Called once when the card is dropped — this is the one that saves. */
  onCommit?: (next: DashboardLayout) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const slots = useRef(new Map<string, HTMLElement>());
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // A ref, not the state, because useFlip reads it during the layout effect
  // that the same reorder triggers — state would still be a frame behind.
  const draggingRef = useRef<string | null>(null);
  useFlip(slots, layout.cards.map((c) => `${c.id}:${c.visible ? 1 : 0}:${c.span}`).join("|"), draggingRef);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) slots.current.set(id, el);
    else slots.current.delete(id);
  }, []);

  const begin = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    const slot = slots.current.get(id);
    const lifted = slot?.querySelector<HTMLElement>(".uf-dash-inert");
    if (!slot || !lifted) return;

    const startRect = lifted.getBoundingClientRect();
    const grabX = e.clientX - startRect.left;
    const grabY = e.clientY - startRect.top;

    /**
     * The order the pointer is measured against, frozen at drag start.
     *
     * The previous version measured live and reordered off the *nearest* card
     * including the one being dragged. Every reorder moved that card, which
     * changed what was nearest, which triggered another reorder — the card
     * oscillated hundreds of pixels a frame. A static reference frame cannot
     * feed back into itself.
     */
    const reference = layoutRef.current.cards
      .filter((c) => c.visible && c.id !== id && !cardDef(c.id)?.pinned)
      .map((c) => {
        const el = slots.current.get(c.id);
        const r = el?.getBoundingClientRect();
        if (!r) return null;
        return {
          id: c.id,
          mid: r.top + r.height / 2 + window.scrollY,
          band: Math.min(BAND_MAX, Math.max(BAND_MIN, r.height * BAND_RATIO)),
        };
      })
      .filter((v): v is { id: string; mid: number; band: number } => v !== null)
      .sort((a, b) => a.mid - b.mid);

    // Hold the slot open at the height the card had. Lifting the card to
    // position:fixed takes it out of flow *inside its own slot*, so without
    // this the slot collapses to nothing the instant the drag starts and
    // every card below snaps up by the card's height. That collapse was the
    // jump that read as "no animation" — the reordering was gliding fine
    // underneath it.
    const slotRect = slot.getBoundingClientRect();
    slot.style.height = `${slotRect.height}px`;

    // Lift the card out of flow so it can follow the finger while its slot
    // keeps the space and goes on taking part in the reordering underneath.
    lifted.style.position = "fixed";
    lifted.style.left = "0";
    lifted.style.top = "0";
    lifted.style.width = `${startRect.width}px`;
    lifted.style.zIndex = "60";
    lifted.style.pointerEvents = "none";
    lifted.style.transition = "none";
    lifted.style.willChange = "transform";

    let x = e.clientX, y = e.clientY;
    const place = () => { lifted.style.transform = `translate(${x - grabX}px, ${y - grabY}px)`; };
    place();
    draggingRef.current = id;
    setDraggingId(id);

    let raf = 0;
    const frame = () => {
      // Edge scrolling, so a card can be carried past the fold on a phone.
      const top = y - EDGE;
      const bottom = window.innerHeight - y - EDGE;
      if (top < 0) window.scrollBy(0, -EDGE_SPEED);
      else if (bottom < 0) window.scrollBy(0, EDGE_SPEED);
      place();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // How many of the other cards the pointer currently sits below. Kept
    // between moves so the dead band has a previous decision to hold onto.
    let settledAbove = reference.filter((r) => r.mid < e.clientY + window.scrollY).length;

    const settleIndex = () => {
      const pointerDoc = y + window.scrollY;

      // Hysteresis: a boundary already crossed stays crossed until the pointer
      // comes back a clear distance, and one not yet crossed needs a clear
      // distance to cross. A pointer sitting inside the band changes nothing.
      let above = 0;
      for (let i = 0; i < reference.length; i++) {
        const wasPast = i < settledAbove;
        const mid = reference[i].mid;
        const band = reference[i].band;
        const isPast = wasPast
          ? pointerDoc > mid - band
          : pointerDoc > mid + band;
        if (!isPast) break;         // reference is sorted; nothing after can be past
        above++;
      }
      settledAbove = above;

      const cards = [...layoutRef.current.cards];
      const from = cards.findIndex((c) => c.id === id);
      if (from === -1) return;

      // `above` counts cards in `reference`, which excludes the pinned ones
      // and the card in hand. Indexing the full list with it put the card
      // after whatever happened to sit at that position — usually the pinned
      // header — so the destination came out as where it already was and
      // nothing ever moved. Resolve through the reference list's own ids.
      const rest = cards.filter((c) => c.id !== id);
      let insertAt: number;
      if (above === 0) {
        const firstFree = rest.findIndex((c) => !cardDef(c.id)?.pinned);
        insertAt = firstFree === -1 ? rest.length : firstFree;
      } else {
        insertAt = rest.findIndex((c) => c.id === reference[above - 1].id) + 1;
      }

      const reordered = [...rest];
      reordered.splice(insertAt, 0, cards[from]);
      if (reordered.every((c, i) => c.id === cards[i].id)) return;

      const next = { cards: reordered };
      layoutRef.current = next;
      onPreview(next);
    };

    let travelled = 0;
    const move = (ev: PointerEvent) => {
      travelled = Math.max(travelled, Math.abs(ev.clientY - e.clientY) + Math.abs(ev.clientX - e.clientX));
      x = ev.clientX; y = ev.clientY;
      // A press with a tremor in it is not a drag.
      if (travelled >= DRAG_THRESHOLD) settleIndex();
    };

    const end = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);

      // Drop: FLIP the card from where the finger left it back into its slot,
      // so it glides home rather than snapping. The slot's held height is
      // released in the same frame the card rejoins flow, so the two cancel
      // out and nothing below moves.
      const liftedRect = lifted.getBoundingClientRect();
      slot.style.height = "";
      lifted.style.position = "";
      lifted.style.left = "";
      lifted.style.top = "";
      lifted.style.width = "";
      lifted.style.zIndex = "";
      lifted.style.pointerEvents = "";
      lifted.style.transform = "";
      const homeRect = lifted.getBoundingClientRect();

      const dx = liftedRect.left - homeRect.left;
      const dy = liftedRect.top - homeRect.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        lifted.style.transition = "none";
        lifted.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          lifted.style.transition = "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
          lifted.style.transform = "";
        }));
      } else {
        lifted.style.transition = "";
      }
      window.setTimeout(() => {
        lifted.style.transition = "";
        lifted.style.willChange = "";
      }, 240);

      draggingRef.current = null;
      setDraggingId(null);
      // One save, at the end. Persisting on every reorder meant a network
      // write per frame of a drag.
      onCommit?.(layoutRef.current);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }, [onPreview, onCommit]);

  return { draggingId, register, begin };
}

export function DashSlot({
  id,
  layout,
  editing = false,
  dragging = false,
  onRegister,
  onDragStart,
  onRemove,
  onToggleWidth,
  children,
}: {
  id: string;
  layout: DashboardLayout;
  editing?: boolean;
  dragging?: boolean;
  onRegister?: (id: string, el: HTMLElement | null) => void;
  onDragStart?: (id: string, e: React.PointerEvent) => void;
  onRemove?: (id: string) => void;
  onToggleWidth?: (id: string) => void;
  children: React.ReactNode;
}) {
  const index = layout.cards.findIndex((c) => c.id === id);
  const pref = index === -1 ? undefined : layout.cards[index];
  if (pref && !pref.visible) return null;

  const def = cardDef(id);

  return (
    <div
      ref={(el) => onRegister?.(id, el)}
      className={`uf-dash-slot${editing ? " is-editing" : ""}${dragging ? " is-dragging" : ""}`}
      data-span={pref?.span ?? "full"}
      style={{ order: cardDef(id)?.pinned ? -1 : index + 1 }}
    >
      {editing && (
        <div className="uf-dash-tools">
          {def?.pinned ? (
            <span className="uf-dash-pin" title={`${def.label} stays at the top`}>Pinned</span>
          ) : (
            <button
              className="uf-dash-tool uf-dash-grip"
              aria-label={`Drag ${def?.label ?? id}`}
              onPointerDown={(e) => onDragStart?.(id, e)}
            >
              {GRIP}
            </button>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {/* One icon doing two opposite jobs reads as neither. The label
                says what pressing it will do, not what the card currently is. */}
            <button
              className="uf-dash-tool uf-dash-width"
              aria-label={pref?.span === "full" ? `Make ${def?.label ?? id} narrow` : `Make ${def?.label ?? id} wide`}
              onClick={() => onToggleWidth?.(id)}
            >
              {pref?.span === "full" ? "Narrow" : "Wide"}
            </button>
            {!def?.required && (
              <button
                className="uf-dash-tool uf-dash-remove"
                aria-label={`Remove ${def?.label ?? id}`}
                onClick={() => onRemove?.(id)}
              >
                {CROSS}
              </button>
            )}
          </div>
        </div>
      )}
      <div className={editing ? "uf-dash-inert" : undefined}>{children}</div>
    </div>
  );
}

/**
 * Everything Home can show, and whether it is showing.
 *
 * The first version listed only what you had removed, which answered "what
 * did I delete" and not "what have I got" — and if you had deleted nothing it
 * showed nothing, so there was no way to discover that removing was even
 * reversible. This lists every card either way. Filled means on, outlined
 * means off, and tapping toggles.
 */
export function CardInventory({
  layout,
  onToggle,
}: {
  layout: DashboardLayout;
  onToggle: (id: string, visible: boolean) => void;
}) {
  const on = layout.cards.filter((c) => c.visible).length;

  return (
    <div className="uf-dash-tray">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--uf-s2)", flexWrap: "wrap", marginBottom: "var(--uf-s3)" }}>
        <span className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>YOUR CARDS</span>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
          {on} of {layout.cards.length} showing
        </span>
      </div>

      <div style={{ display: "flex", gap: "var(--uf-s2)", flexWrap: "wrap" }}>
        {layout.cards.map((c) => {
          const def = cardDef(c.id);
          if (!def) return null;
          return (
            <button
              key={c.id}
              className={`uf-dash-chip${c.visible ? " is-on" : ""}`}
              aria-pressed={c.visible}
              disabled={def.required}
              title={def.required ? `${def.label} is always shown` : def.hint}
              onClick={() => onToggle(c.id, !c.visible)}
            >
              <span aria-hidden>{c.visible ? "\u2713" : "+"}</span> {def.label}
            </button>
          );
        })}
      </div>

      <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: "var(--uf-s3) 0 0" }}>
        Drag a card by its {GRIP} handle to move it. Nothing is deleted &mdash; anything
        you turn off comes back from here.
      </p>
    </div>
  );
}

export { CARDS, moveCard, setCard };
export type { CardPref };
