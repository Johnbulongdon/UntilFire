"use client";
import { Button } from "@/components/ui";

export function SavedPlanLoading() {
  return <div role="status" aria-live="polite" className="uf-card" style={{ padding: 24 }}>Loading your saved plan…</div>;
}

export default function DashboardRecovery({ onAdd, onRestore }: { onAdd: () => void; onRestore: () => void }) {
  return (
    <div className="uf-card" style={{ padding: 20, marginBottom: 16 }}>
      <strong>Make Home useful to you</strong>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <Button variant="primary" onClick={onAdd}>Add cards</Button>
        <Button onClick={onRestore}>Restore default dashboard</Button>
      </div>
    </div>
  );
}
