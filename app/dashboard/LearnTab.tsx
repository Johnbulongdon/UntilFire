"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { PillTabs, MoneyList, MoneyRow } from "./MoneyCards";
import { learnStages, learnArticles, getStageArticles, type LearnStageId } from "@/lib/learn";

const READ_KEY = "uf_learn_read";
const STAGE_COPY: Record<LearnStageId, { title: string; description: string }> = {
  "starting-out": { title: "Build a stable foundation", description: "Start with emergency savings, spending, and the basics of financial freedom." },
  "building-momentum": { title: "Turn saving into steady progress", description: "Protect your safety pot and understand where your investments go." },
  "approaching-fire": { title: "Check that your plan can support you", description: "Review your target, spending, and how you would handle a market drop." },
  "living-in-fire": { title: "Keep your freedom sustainable", description: "Understand withdrawals and keep your plan in step with your life." },
};
const ESSENTIALS: Record<LearnStageId, string[]> = {
  "starting-out": ["choose-emergency-fund-target", "where-to-keep-emergency-savings", "rebuild-emergency-fund"],
  "building-momentum": ["choose-emergency-fund-target", "index-funds-101-what-to-invest-in", "asset-allocation-stocks-vs-bonds"],
  "approaching-fire": ["how-much-money-do-i-need-to-retire", "sequence-of-returns-risk", "how-fire-assumptions-change-your-retirement-date"],
  "living-in-fire": ["what-is-the-4-percent-rule", "sequence-of-returns-risk", "rebalancing-your-portfolio-annually"],
};
type PlanTab = "fire-calculator" | "contributions" | "expat-fire";

export default function LearnTab({ recommendedStageId, progress, yearsToGo, onOpenTab }: {
  recommendedStageId: LearnStageId;
  progress: number | null;
  yearsToGo: number | null;
  onOpenTab: (tab: PlanTab) => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(recommendedStageId);
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
      if (Array.isArray(stored)) setRead(new Set(stored.filter((slug): slug is string => typeof slug === "string")));
    } catch { /* Reading still works when browser storage is unavailable. */ }
  }, []);
  useEffect(() => { setStage(recommendedStageId); }, [recommendedStageId]);

  const current = learnStages.find((item) => item.id === stage)!;
  const essentials = ESSENTIALS[stage].flatMap((slug) => {
    const article = learnArticles.find((item) => item.slug === slug);
    return article ? [article] : [];
  });
  const next = essentials.find((article) => !read.has(article.slug));
  const articles = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return search
      ? learnArticles.filter((article) => [article.title, article.description, article.category].join(" ").toLocaleLowerCase().includes(search))
      : getStageArticles(stage);
  }, [query, stage]);
  function open(slug: string) {
    const updated = new Set(read).add(slug);
    setRead(updated);
    try { localStorage.setItem(READ_KEY, JSON.stringify([...updated])); } catch { /* Opening a guide does not depend on storage. */ }
    router.push("/learn/" + slug);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }}>
      <header>
        <h1 className="uf-t-h1" style={{ margin: 0 }}>Learn</h1>
        <p className="uf-t-body" style={{ margin: "4px 0 0", color: "var(--uf-ink-2)" }}>From your first savings to financial freedom.</p>
      </header>
      <PillTabs label="FIRE stage" value={stage} onChange={(value) => { setStage(value); setQuery(""); }}
        options={learnStages.map((item) => ({ key: item.id, label: item.label + (item.id === recommendedStageId ? " · you" : "") }))} />
      <section className="uf-card" style={{ display: "grid", gap: 12, background: "var(--uf-mint)" }} aria-labelledby="learn-stage-title">
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{stage === recommendedStageId ? "Your suggested stage" : "Exploring"} · {current.label}</span>
        <h2 id="learn-stage-title" className="uf-t-h2" style={{ margin: 0 }}>{STAGE_COPY[stage].title}</h2>
        <p className="uf-t-body" style={{ margin: 0 }}>{STAGE_COPY[stage].description}</p>
        {stage === recommendedStageId && progress !== null && <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          Based on your plan · {Math.round(progress * 100)}% of your freedom number
          {yearsToGo !== null && yearsToGo > 0 ? ` · about ${Math.round(yearsToGo)} years to go` : ""}
        </p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <strong className="uf-t-body">{next?.title ?? "You’ve opened every essential for this stage"}</strong>
          {next && <Button variant="primary" onClick={() => open(next.slug)}>Start here →</Button>}
        </div>
      </section>
      <section aria-labelledby="learn-essentials-title" style={{ display: "grid", gap: 12 }}>
        <h2 id="learn-essentials-title" className="uf-t-h3" style={{ margin: 0 }}>Essentials for this stage</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
          {essentials.map((article, index) => (
            <button type="button" key={article.slug} className="uf-card" onClick={() => open(article.slug)}
              style={{ display: "grid", alignContent: "start", gap: 12, textAlign: "left", color: "var(--uf-ink)", font: "inherit", cursor: "pointer",
                background: ["var(--uf-lilac)", "var(--uf-blue)", "var(--uf-pink)"][index] }}>
              <span className="uf-t-small">Essential {index + 1} · {read.has(article.slug) ? "Opened" : article.readTime}</span>
              <strong className="uf-t-body">{article.title}</strong>
              <span className="uf-t-small" style={{ fontWeight: 700 }}>Read guide →</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="learn-library-title" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 id="learn-library-title" className="uf-t-h3" style={{ margin: 0 }}>Explore the library</h2>
          <Input type="search" aria-label="Search all Learn guides" placeholder="Search all guides" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: "min(100%, 280px)" }} />
        </div>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }} role="status">{articles.length} {articles.length === 1 ? "guide" : "guides"} · {query.trim() ? "all stages" : current.label}</span>
        <MoneyList footer={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" onClick={() => router.push("/learn/articles")}>All guides</Button>
          <Button size="sm" variant="secondary" onClick={() => router.push("/learn/topics")}>Topics</Button>
        </div>}>
          {articles.map((article) => <MoneyRow key={article.slug} wrap dot="var(--uf-ink-3)" name={article.title}
            meta={article.readTime + " · " + article.category} value={read.has(article.slug) ? "Opened ✓" : "Read ›"}
            onClick={() => open(article.slug)} />)}
          {!articles.length && <div className="uf-t-body" style={{ padding: 16 }}>No guides match this search. Try another word.</div>}
        </MoneyList>
      </section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={() => onOpenTab("contributions")}>Review my contribution plan</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenTab("fire-calculator")}>Review my freedom plan</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenTab("expat-fire")}>Explore cities</Button>
      </div>
    </div>
  );
}
