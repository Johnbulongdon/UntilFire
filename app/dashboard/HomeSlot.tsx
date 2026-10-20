import { cardDef } from "@/lib/dashboard-layout";

/** Home has one fixed arrangement. Saved custom layouts are intentionally ignored. */
export default function HomeSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const def = cardDef(id);
  if (!def?.defaultVisible) return null;
  return <div className="uf-dash-slot" data-span={def.defaultSpan}><div>{children}</div></div>;
}
