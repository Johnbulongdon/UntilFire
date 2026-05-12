"use client";

export interface RevealAction {
  id: string;
  title: string;
  rationale: string;
}

export default function NextActions({
  actions,
  heading,
  subheading,
  onAction,
}: {
  actions: RevealAction[];
  variant?: "light" | "dark";
  heading?: string;
  subheading?: string;
  layout?: "stack" | "grid";
  onAction: (action: RevealAction) => void;
}) {
  if (!actions.length) return null;
  return (
    <div>
      {heading ? <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{heading}</div> : null}
      {subheading ? <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>{subheading}</div> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action)}
            style={{ textAlign: "left", border: "1px solid #D1FAE5", background: "#F0FDF4", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46", marginBottom: 4 }}>{action.title}</div>
            <div style={{ fontSize: 12, color: "#166534" }}>{action.rationale}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
