import { Button } from "@/components/ui";

export default function TransactionStartCard({ title, description, onOpenTransactions }: {
  title: string;
  description: string;
  onOpenTransactions: () => void;
}) {
  return (
    <section className="uf-card" style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      <h2 className="uf-t-body" style={{ fontWeight: 700, margin: 0 }}>{title}</h2>
      <p className="uf-t-small" style={{ color: "var(--uf-text-2)", margin: 0 }}>{description}</p>
      <Button size="sm" onClick={onOpenTransactions}>Add or import transactions</Button>
    </section>
  );
}
