"use client";

import { CARDS, cardDef, moveCard, setCard, type CardPref, type DashboardLayout } from "@/lib/dashboard-layout";
import { Badge, Button } from "@/components/ui";

/**
 * Home, arranged by the person reading it.
 *
 * A fixed stack means a Debts card takes space from someone with no debts
 * while the card they actually care about sits below the fold. Which cards
 * matter is not something the product can know for everyone, so it stops
 * guessing.
 *
 * Reordering is done with CSS `order`, not by moving JSX. Home's cards are
 * nine sections of a very large component; rebuilding them into a movable
 * array would be a rewrite, while `order` on a grid achieves the same result
 * and leaves every card's internals untouched.
 */

export function DashSlot({
  id,
  layout,
  children,
}: {
  id: string;
  layout: DashboardLayout;
  children: React.ReactNode;
}) {
  const index = layout.cards.findIndex((c) => c.id === id);
  const pref = index === -1 ? undefined : layout.cards[index];
  if (pref && !pref.visible) return null;

  return (
    <div
      className="uf-dash-slot"
      data-span={pref?.span ?? "full"}
      // order is 1-based so an un-customised card (index -1 -> 0) sorts first
      // rather than silently jumping to the top of someone's arrangement.
      style={{ order: index + 1 }}
    >
      {children}
    </div>
  );
}

function CustomiseRow({
  pref,
  index,
  total,
  layout,
  onChange,
}: {
  pref: CardPref;
  index: number;
  total: number;
  layout: DashboardLayout;
  onChange: (next: DashboardLayout) => void;
}) {
  const def = cardDef(pref.id);
  if (!def) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--uf-s3)",
        padding: "var(--uf-s3) 0",
        borderBottom: "1px solid var(--uf-border)",
        opacity: pref.visible ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        <button
          aria-label={`Move ${def.label} up`}
          disabled={index === 0}
          onClick={() => onChange(moveCard(layout, pref.id, -1))}
          className="uf-dash-nudge"
        >
          ↑
        </button>
        <button
          aria-label={`Move ${def.label} down`}
          disabled={index === total - 1}
          onClick={() => onChange(moveCard(layout, pref.id, 1))}
          className="uf-dash-nudge"
        >
          ↓
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--uf-s2)", flexWrap: "wrap" }}>
          <span className="uf-t-body" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>{def.label}</span>
          {def.required && <Badge tone="muted">Always on</Badge>}
        </div>
        <p className="uf-t-small" style={{ margin: "2px 0 0", color: "var(--uf-ink-3)" }}>{def.hint}</p>

        <div style={{ display: "flex", gap: "var(--uf-s2)", marginTop: "var(--uf-s2)", flexWrap: "wrap" }}>
          {!def.required && (
            <Button
              variant={pref.visible ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onChange(setCard(layout, pref.id, { visible: !pref.visible }))}
            >
              {pref.visible ? "Hide" : "Show"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(setCard(layout, pref.id, { span: pref.span === "full" ? "half" : "full" }))}
          >
            {pref.span === "full" ? "Make narrow" : "Make wide"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CustomisePanel({
  layout,
  onChange,
  onReset,
  onClose,
  saving,
}: {
  layout: DashboardLayout;
  onChange: (next: DashboardLayout) => void;
  onReset: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="uf-dash-customise">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--uf-s3)", marginBottom: "var(--uf-s2)" }}>
        <div>
          <h3 className="uf-t-h3" style={{ margin: 0 }}>Arrange your home</h3>
          <p className="uf-t-small" style={{ margin: "2px 0 0", color: "var(--uf-ink-3)" }}>
            Hide what you don&rsquo;t use. Put what matters first.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={onClose}>
          {saving ? "Saving…" : "Done"}
        </Button>
      </div>

      {layout.cards.map((pref, i) => (
        <CustomiseRow
          key={pref.id}
          pref={pref}
          index={i}
          total={layout.cards.length}
          layout={layout}
          onChange={onChange}
        />
      ))}

      <div style={{ marginTop: "var(--uf-s3)" }}>
        <Button variant="ghost" size="sm" onClick={onReset}>Reset to default</Button>
      </div>
    </div>
  );
}

export { CARDS };
