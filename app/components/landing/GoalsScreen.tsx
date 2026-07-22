"use client";

import { useState, type ReactNode, type CSSProperties } from "react";

interface FireGoal {
  id: string;
  title: string;
  desc: string;
  color: string;
  tint: string;
  icon: ReactNode;
}

const FIRE_GOALS: FireGoal[] = [
  {
    id: "early",
    title: "Early Retirement",
    desc: "Exit the workforce fully — the classic FIRE path.",
    color: "#22d3a5",
    tint: "rgba(34,211,165,0.14)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 18a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 3v3M5 8.5 6.7 10M19 8.5 17.3 10M2.5 18h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "coast",
    title: "Coast FIRE",
    desc: "Work part-time or passion projects while investments compound.",
    color: "#38bdf8",
    tint: "rgba(56,189,248,0.14)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 15c2 0 2.5-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 19c2 0 2.5-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: "gen",
    title: "Generational Wealth",
    desc: "Build a lasting financial legacy for your family.",
    color: "#a78bfa",
    tint: "rgba(167,139,250,0.15)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 14c-3.3 0-5-2-5-4.6C7 6 9.2 3.5 12 3.5s5 2.5 5 5.9C17 12 15.3 14 12 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 17.5 9.4 15M12 16l2.4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "nomad",
    title: "Nomadic Lifestyle",
    desc: "Travel freely with a portfolio that funds the journey.",
    color: "#f9a03c",
    tint: "rgba(249,160,60,0.15)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function GoalsScreen({ onNext, onBack }: { onNext: (goals: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  return (
    <div className="uf-screen">
      <p className="uf-step-label">Step 1 of 5</p>
      <div className="uf-eyebrow">Your path</div>
      <h2 className="uf-h2">What&apos;s your <span className="uf-accent">FIRE goal?</span></h2>
      <p className="uf-body" style={{ marginBottom: 28 }}>
        Choose the lifestyle you&apos;re working toward — pick as many as apply. This shapes your projections.
      </p>

      <div className="uf-goals-grid">
        {FIRE_GOALS.map((g) => {
          const active = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              className={`uf-goal-card ${active ? "active" : ""}`}
              style={{ "--gc": g.color, "--gct": g.tint } as CSSProperties}
              onClick={() => toggle(g.id)}
              aria-pressed={active}
            >
              <span className="uf-goal-ic">{g.icon}</span>
              <span className="uf-goal-tx">
                <span className="uf-goal-title-row">
                  <span className="uf-goal-title">{g.title}</span>
                  <span className={`uf-goal-tick ${active ? "checked" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
                <span className="uf-goal-desc">{g.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>Back</button>
        <button className="uf-btn uf-btn-primary" style={{ flex: 1 }} disabled={selected.length === 0} onClick={() => onNext(selected)}>
          Continue {"->"}
        </button>
      </div>
    </div>
  );
}
