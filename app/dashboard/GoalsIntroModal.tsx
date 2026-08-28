"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Input, Badge } from "@/components/ui";

/**
 * One-time, post-registration goal-setting flow. Uses the PERMA model
 * (Positive emotion, Engagement, Relationships, Meaning, Accomplishment) as
 * five short prompts, each translating into one real, editable row in the
 * same `goals` table Plan -> Goals already reads and renders — so picking a
 * prompt here is picking a measurable target, not just a mood.
 */

type PermaCategory = "emotion" | "engagement" | "relationships" | "meaning" | "accomplishment";

type PermaPrompt = {
  id: PermaCategory;
  eyebrow: string;
  question: string;
  emoji: string;
  name: string;
  hint: string;
  monthsOut: number | null;
};

const PERMA_PROMPTS: PermaPrompt[] = [
  { id: "emotion", eyebrow: "Positive emotion", question: "What would finally feel like relief?", emoji: "🛟", name: "Emergency Cushion", hint: "A buffer so a bad month never becomes a bad year.", monthsOut: null },
  { id: "engagement", eyebrow: "Engagement", question: "What would you spend more time on, if money weren’t the constraint?", emoji: "🎨", name: "Passion Project Fund", hint: "Room to build or explore something for its own sake.", monthsOut: 18 },
  { id: "relationships", eyebrow: "Relationships", question: "Who do you want more time and freedom for?", emoji: "✈️", name: "Family Time Fund", hint: "Trips and time together, not squeezed into two weeks a year.", monthsOut: 12 },
  { id: "meaning", eyebrow: "Meaning", question: "What’s the bigger reason behind all this?", emoji: "🎓", name: "Education & Giving Fund", hint: "The reason freedom matters beyond you.", monthsOut: null },
  { id: "accomplishment", eyebrow: "Accomplishment", question: "What’s the milestone that would make this feel real?", emoji: "🔥", name: "Financial Independence", hint: "Usually your full FIRE number — check Freedom Date if you’re not sure.", monthsOut: null },
];

type Draft = { name: string; emoji: string; target_amount: string; target_date: string };

function defaultTargetDate(monthsOut: number | null): string {
  if (!monthsOut) return "";
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOut);
  return d.toISOString().slice(0, 10);
}

export default function GoalsIntroModal({ userId, monthlyExpenses, onDone }: {
  userId: string;
  monthlyExpenses?: number;
  onDone: () => void;
}) {
  const [stepView, setStepView] = useState<"pick" | "edit">("pick");
  const [picked, setPicked] = useState<PermaCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<PermaCategory, Draft>>({} as Record<PermaCategory, Draft>);
  const [saving, setSaving] = useState(false);

  function togglePick(id: PermaCategory) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function goToEdit() {
    const seeded: Record<PermaCategory, Draft> = { ...drafts };
    for (const id of picked) {
      if (seeded[id]) continue;
      const p = PERMA_PROMPTS.find((x) => x.id === id)!;
      const defaultAmount = p.id === "emotion"
        ? Math.round((monthlyExpenses && monthlyExpenses > 0 ? monthlyExpenses * 6 : 10000))
        : p.id === "engagement" ? 15000
        : p.id === "relationships" ? 8000
        : p.id === "meaning" ? 20000
        : 0; // accomplishment: no confident default, user fills it in
      seeded[id] = { name: p.name, emoji: p.emoji, target_amount: defaultAmount > 0 ? String(defaultAmount) : "", target_date: defaultTargetDate(p.monthsOut) };
    }
    setDrafts(seeded);
    setStepView("edit");
  }

  function updateDraft(id: PermaCategory, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave() {
    const rows = picked
      .map((id) => ({ id, draft: drafts[id] }))
      .filter(({ draft }) => draft && draft.name.trim() && parseFloat(draft.target_amount) > 0)
      .map(({ id, draft }, index) => ({
        user_id: userId,
        name: draft.name.trim(),
        emoji: draft.emoji,
        target_amount: parseFloat(draft.target_amount) || 0,
        current_saved: 0,
        target_date: draft.target_date || null,
        sort_order: 1000 + index,
        perma_category: id,
      }));
    if (rows.length === 0) { onDone(); return; }
    setSaving(true);
    await supabase.from("goals").insert(rows);
    setSaving(false);
    onDone();
  }

  const canContinue = picked.length > 0;
  const canSave = picked.every((id) => drafts[id] && drafts[id].name.trim() && parseFloat(drafts[id].target_amount) > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <Card elevation="float" style={{ maxWidth: 520, width: "100%", margin: "auto", display: "flex", flexDirection: "column", gap: "var(--uf-s5)" }}>
        {stepView === "pick" ? (
          <>
            <div>
              <Badge tone="freedom" style={{ marginBottom: "var(--uf-s3)" }}>Your why</Badge>
              <div className="uf-t-24" style={{ fontFamily: "var(--uf-font-display)", fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-0.02em" }}>
                What is freedom actually for?
              </div>
              <div style={{ fontSize: 14, color: "var(--uf-ink-2)", marginTop: "var(--uf-s2)", lineHeight: 1.5 }}>
                Pick whatever resonates. Each one becomes a real, trackable goal — you can edit the numbers on the next step, or any time in Plan → Goals.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s3)" }}>
              {PERMA_PROMPTS.map((p) => {
                const active = picked.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePick(p.id)}
                    aria-pressed={active}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "var(--uf-s3)", width: "100%",
                      padding: "var(--uf-s4)", borderRadius: "var(--uf-r-control)", cursor: "pointer",
                      textAlign: "left", font: "inherit",
                      background: active ? "var(--uf-green-50)" : "var(--uf-surface)",
                      border: active ? "1.5px solid var(--uf-green)" : "1.5px solid var(--uf-border)",
                      transition: "all 120ms ease",
                    }}
                  >
                    <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-ink-3)", marginBottom: 4 }}>
                        {p.eyebrow}
                      </span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--uf-ink)", lineHeight: 1.4 }}>
                        {p.question}
                      </span>
                    </span>
                    <span style={{
                      width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 2,
                      background: active ? "var(--uf-green)" : "transparent",
                      border: active ? "none" : "1.5px solid var(--uf-border-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)" }}>
              <Button variant="ghost" onClick={onDone}>Skip for now</Button>
              <Button variant="primary" disabled={!canContinue} onClick={goToEdit}>Continue →</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="uf-t-24" style={{ fontFamily: "var(--uf-font-display)", fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-0.02em" }}>
                Make it measurable
              </div>
              <div style={{ fontSize: 14, color: "var(--uf-ink-2)", marginTop: "var(--uf-s2)", lineHeight: 1.5 }}>
                Rough numbers are fine — you can adjust these any time.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s4)" }}>
              {picked.map((id) => {
                const p = PERMA_PROMPTS.find((x) => x.id === id)!;
                const draft = drafts[id];
                if (!draft) return null;
                return (
                  <div key={id} style={{ display: "flex", gap: "var(--uf-s3)", alignItems: "flex-start", padding: "var(--uf-s3)", background: "var(--uf-surface)", borderRadius: "var(--uf-r-control)", border: "1px solid var(--uf-border)" }}>
                    <span style={{ fontSize: 24, lineHeight: 1, marginTop: 6 }}>{draft.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--uf-s3)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-ink-3)" }}>{p.eyebrow}</div>
                      <Input value={draft.name} onChange={(e) => updateDraft(id, { name: e.target.value })} placeholder="Goal name" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--uf-s3)" }}>
                        <Field label="Target amount">
                          <Input numeric inputMode="numeric" value={draft.target_amount} onChange={(e) => updateDraft(id, { target_amount: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="10000" />
                        </Field>
                        <Field label="By (optional)">
                          <Input type="date" value={draft.target_date} onChange={(e) => updateDraft(id, { target_date: e.target.value })} />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)" }}>
              <Button variant="ghost" onClick={() => setStepView("pick")}>Back</Button>
              <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save my goals"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
