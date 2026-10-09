"use client";

/**
 * Learn in the calm style (D-47): where you are first, one article to read
 * next, then each stage's reading as rows. What you have opened is kept in
 * this browser only; it is a convenience, not a record.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { PillTabs, MoneyHead, MoneyKey, MoneyList, MoneyRow, Fig } from "./MoneyCards";
import { learnStages, learnArticles, getStageArticles, type LearnStageId } from "@/lib/learn";

const READ_KEY = "uf_learn_read";

const CATEGORY: Record<string, { icon: string; color: string }> = {
  "FIRE Basics": { icon: "🌱", color: "#1baf7a" },
  Investing: { icon: "📈", color: "#6b5bd2" },
  Planning: { icon: "🧭", color: "#2a78d6" },
  "Risk & Strategy": { icon: "🛡️", color: "#eda100" },
  "Tax & Accounts": { icon: "🧾", color: "#e34948" },
};

type PlanTab = "fire-calculator" | "contributions" | "expat-fire";

/** Where each stage's numbers live in the app, instead of the public calculators. */
const STAGE_TOOLS: Record<LearnStageId, { tab: PlanTab; icon: string; name: string; meta: string }[]> = {
  "starting-out": [
    { tab: "fire-calculator", icon: "📅", name: "Your freedom date", meta: "See how your saving moves it" },
    { tab: "contributions", icon: "🪜", name: "Your contribution plan", meta: "Where each month's saving goes" },
  ],
  "building-momentum": [
    { tab: "contributions", icon: "🪜", name: "Your contribution plan", meta: "Where the next dollar goes" },
    { tab: "fire-calculator", icon: "📅", name: "What moves your date", meta: "Save more, spend less or earn more" },
  ],
  "approaching-fire": [
    { tab: "fire-calculator", icon: "📊", name: "Your assumptions", meta: "Growth, lifestyle and tax in retirement" },
    { tab: "expat-fire", icon: "🌍", name: "Explore", meta: "Where your money goes further" },
  ],
  "living-in-fire": [
    { tab: "fire-calculator", icon: "📊", name: "Your assumptions", meta: "Withdrawal and growth" },
    { tab: "expat-fire", icon: "🌍", name: "Explore", meta: "Where your money goes further" },
  ],
};

function StageSteps({ at }: { at: number }) {
  const next = learnStages[at + 1];
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div aria-hidden style={{ display: "grid", gridTemplateColumns: `repeat(${learnStages.length}, minmax(0, 1fr))`, gap: 6 }}>
        {learnStages.map((s, i) => <span key={s.id} style={{ height: 8, borderRadius: 99, background: i <= at ? "var(--uf-teal)" : "var(--uf-surface-2)" }} />)}
      </div>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
        Stage <Fig>{at + 1}</Fig> of <Fig>{learnStages.length}</Fig>{next ? <> · next: {next.shortLabel}</> : " · the last stage"}
      </span>
    </div>
  );
}

function Section({ t }: { t: string }) {
  return <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>{t}</div>;
}

export default function LearnTab({ recommendedStageId, progress, yearsToGo, onOpenTab }: {
  recommendedStageId: LearnStageId;
  /** Invested as a share of the FIRE number, 0–1, or null without a plan. */
  progress: number | null;
  yearsToGo: number | null;
  onOpenTab: (tab: PlanTab) => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<LearnStageId>(recommendedStageId);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { setRead(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"))); } catch { /* ignore */ }
  }, []);
  useEffect(() => { setStage(recommendedStageId); }, [recommendedStageId]);

  function open(slug: string) {
    const next = new Set(read).add(slug);
    setRead(next);
    try { localStorage.setItem(READ_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
    router.push(`/learn/${slug}`);
  }

  const at = Math.max(0, learnStages.findIndex(s => s.id === recommendedStageId));
  const mine = learnStages[at];
  const mineArticles = getStageArticles(mine.id);
  const opened = mineArticles.filter(a => read.has(a.slug)).length;
  const next = mineArticles.find(a => !read.has(a.slug));
  const cur = learnStages.find(s => s.id === stage) ?? mine;
  const articles = getStageArticles(cur.id);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <MoneyHead label="Where you are" value={<span style={{ fontFamily: "var(--uf-font-display)", fontSize: 34 }}>{mine.label}</span>}
        sub={progress === null
          ? "Add your income, spending and savings in Plan and this follows your progress."
          : <>Based on your plan: <Fig>{Math.round(progress * 100)}%</Fig> of your FIRE number{yearsToGo !== null && yearsToGo > 0 ? <>, about <Fig>{Math.round(yearsToGo)}</Fig> {Math.round(yearsToGo) === 1 ? "year" : "years"} to go</> : null}.</>}>
        <StageSteps at={at} />
        <MoneyKey items={[<><Fig>{opened}</Fig> of <Fig>{mineArticles.length}</Fig> opened for this stage</>, <>{mine.tagline}</>]} />
      </MoneyHead>

      {next && <>
        <Section t="Read next" />
        <MoneyList>
          <MoneyRow wrap dot={CATEGORY[next.category]?.color ?? "var(--uf-ink-3)"} icon={CATEGORY[next.category]?.icon} name={next.title}
            meta={`${next.readTime} · ${next.description}`} value="Read ›" strong onClick={() => open(next.slug)} />
        </MoneyList>
      </>}

      <Section t="Reading by stage" />
      <div style={{ minWidth: 0 }}>
        <PillTabs label="Stage" value={stage} onChange={setStage}
          options={learnStages.map(s => ({ key: s.id, label: s.id === mine.id ? `${s.shortLabel} · you` : s.shortLabel }))} />
      </div>
      <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{cur.whatMattersNow}</span>
      <MoneyList footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" onClick={() => router.push("/learn/articles")}>All {learnArticles.length} articles</Button>
          <Button variant="secondary" size="sm" onClick={() => router.push("/learn/topics")}>Topics</Button>
        </div>
      }>
        {articles.map(a => {
          const done = read.has(a.slug);
          return (
            <MoneyRow key={a.slug} wrap dot={CATEGORY[a.category]?.color ?? "var(--uf-ink-3)"} icon={CATEGORY[a.category]?.icon} name={a.title}
              meta={`${a.readTime.replace(" read", "")} · ${a.category}`}
              value={done ? "Opened ✓" : "›"} valueTone={done ? "var(--uf-pos-ink)" : "var(--uf-ink-3)"} onClick={() => open(a.slug)} />
          );
        })}
      </MoneyList>

      <Section t="Try it on your numbers" />
      <MoneyList>
        {STAGE_TOOLS[cur.id].map(t => (
          <MoneyRow key={t.name} dot="var(--uf-ink-3)" icon={t.icon} name={t.name} meta={t.meta} value="Open ›" onClick={() => onOpenTab(t.tab)} />
        ))}
      </MoneyList>
    </div>
  );
}
