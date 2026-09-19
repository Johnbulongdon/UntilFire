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
function useFlip(slots: React.RefObject<Map<string, HTMLElement>>, key: string) {
  const previous = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const now = new Map<string, DOMRect>();
    for (const [id, el] of slots.current ?? []) now.set(id, el.getBoundingClientRect());

    if (!reduced) {
      for (const [id, el] of slots.current ?? []) {
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
  // The drag reads the freshest layout without re-binding its listeners, so a
  // reorder mid-drag does not leave the pointer working against a stale copy.
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Re-runs on any order, visibility or width change — exactly when a card
  // needs to be seen moving rather than jumping.
  useFlip(slots, layout.cards.map((c) => `${c.id}:${c.visible ? 1 : 0}:${c.span}`).join("|"));
  const scrollTimer = useRef<number | null>(null);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) slots.current.set(id, el);
    else slots.current.delete(id);
  }, []);

  const stopScrolling = () => {
    if (scrollTimer.current !== null) {
      cancelAnimationFrame(scrollTimer.current);
      scrollTimer.current = null;
    }
  };

  const begin = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingId(id);

    let clientY = e.clientY;
    let clientX = e.clientX;

    const reorderTo = () => {
      // Which card is the pointer over? Nearest centre wins, so a gap between
      // cards still resolves rather than doing nothing.
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const [otherId, el] of slots.current) {
        const r = el.getBoundingClientRect();
        if (r.height === 0) continue;
        const dy = clientY - (r.top + r.height / 2);
        const dx = clientX - (r.left + r.width / 2);
        const d = dy * dy + dx * dx;
        if (d < bestDist) { bestDist = d; bestId = otherId; }
      }
      if (!bestId || bestId === id) return;

      const from = layoutRef.current.cards.findIndex((c) => c.id === id);
      const to = layoutRef.current.cards.findIndex((c) => c.id === bestId);
      if (from === -1 || to === -1 || from === to) return;

      const cards = [...layoutRef.current.cards];
      const [moved] = cards.splice(from, 1);
      cards.splice(to, 0, moved);
      const next = { cards };
      layoutRef.current = next;
      onChange(next);
    };

    const edgeScroll = () => {
      const top = clientY - EDGE;
      const bottom = window.innerHeight - clientY - EDGE;
      if (top < 0) window.scrollBy(0, -EDGE_SPEED);
      else if (bottom < 0) window.scrollBy(0, EDGE_SPEED);
      scrollTimer.current = requestAnimationFrame(edgeScroll);
    };
    scrollTimer.current = requestAnimationFrame(edgeScroll);

    const move = (ev: PointerEvent) => {
      clientY = ev.clientY;
      clientX = ev.clientX;
      reorderTo();
    };
    const end = () => {
      stopScrolling();
      setDraggingId(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
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
