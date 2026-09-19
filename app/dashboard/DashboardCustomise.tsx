"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  CARDS, cardDef, moveCard, setCard,
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
 * Reordering changes a CSS `order` value, which the browser applies in one
 * frame — correct, and unreadable. A card vanishes from one place and appears
 * in another with no sense that it travelled.
 *
 * FLIP fixes that without animating layout: measure where every card was
 * (First), let the reorder happen (Last), transform each card back to where it
 * started (Invert), then release on the next frame so the browser animates it
 * forwards (Play). Only transform moves, so no layout pass happens mid-drag.
 *
 * Skips straight to the end under prefers-reduced-motion.
 */
function useFlip(
  slots: React.RefObject<Map<string, HTMLElement>>,
  key: string,
  skipId: React.RefObject<string | null>,
) {
  const previous = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const now = new Map<string, DOMRect>();
    for (const [id, el] of slots.current ?? []) now.set(id, el.getBoundingClientRect());

    if (!reduced) {
      for (const [id, el] of slots.current ?? []) {
        // Never transform the slot of the card being carried. A transformed
        // ancestor becomes the containing block for position:fixed, so the
        // lifted card would start positioning against its own slot instead of
        // the viewport and leap away from the finger mid-drag.
        if (id === skipId.current) continue;
        const before = previous.current.get(id);
        const after = now.get(id);
        if (!before || !after) continue;
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = "transform 220ms cubic-bezier(0.2, 0, 0, 1)";
            el.style.transform = "";
          });
        });
      }
    }

    previous.current = now;
  }, [key, slots]);
}

export function useCardSort(layout: DashboardLayout, onChange: (next: DashboardLayout) => void) {
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
      .filter((c) => c.visible && c.id !== id)
      .map((c) => {
        const el = slots.current.get(c.id);
        const r = el?.getBoundingClientRect();
        return r ? { id: c.id, mid: r.top + r.height / 2 + window.scrollY } : null;
      })
      .filter((v): v is { id: string; mid: number } => v !== null)
      .sort((a, b) => a.mid - b.mid);

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

    const settleIndex = () => {
      const pointerDoc = y + window.scrollY;
      const above = reference.filter((r) => r.mid < pointerDoc).length;

      const cards = [...layoutRef.current.cards];
      const from = cards.findIndex((c) => c.id === id);
      if (from === -1) return;

      // Translate "after N of the other cards" into an index in the full list.
      const others = cards.filter((c) => c.id !== id);
      const target = others[above - 1];
      const to = target ? cards.findIndex((c) => c.id === target.id) : 0;
      const dest = to > from ? to : Math.max(0, to);
      if (dest === from) return;

      const [moved] = cards.splice(from, 1);
      cards.splice(dest, 0, moved);
      const next = { cards };
      layoutRef.current = next;
      onChange(next);
    };

    const move = (ev: PointerEvent) => {
      x = ev.clientX; y = ev.clientY;
      settleIndex();
    };

    const end = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);

      // Drop: FLIP the card from where the finger left it back into its slot,
      // so it glides home rather than snapping.
      const liftedRect = lifted.getBoundingClientRect();
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
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }, [onChange]);

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
      style={{ order: index + 1 }}
    >
      {editing && (
        <div className="uf-dash-tools">
          <button
            className="uf-dash-tool uf-dash-grip"
            aria-label={`Drag ${def?.label ?? id}`}
            onPointerDown={(e) => onDragStart?.(id, e)}
          >
            {GRIP}
          </button>
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
