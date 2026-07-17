"use client";

import { useState } from "react";

const FIRE_GOALS = [
  { id: "early", emoji: "🚀", title: "Early Retirement", desc: "Exit the workforce fully - the classic FIRE path." },
  { id: "coast", emoji: "🌊", title: "Coast FIRE", desc: "Work part-time or passion projects while investments compound." },
  { id: "gen", emoji: "🌳", title: "Generational Wealth", desc: "Build a lasting financial legacy for your family." },
  { id: "nomad", emoji: "🌍", title: "Nomadic Lifestyle", desc: "Travel freely with a portfolio that funds the journey." },
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
        {FIRE_GOALS.map((g) => (
          <button key={g.id} className={`uf-goal-card ${selected.includes(g.id) ? "active" : ""}`} onClick={() => toggle(g.id)}>
            <div className="uf-goal-top">
              <span className="uf-goal-emoji">{g.emoji}</span>
              <div className={`uf-goal-radio ${selected.includes(g.id) ? "checked" : ""}`} />
            </div>
            <div className="uf-goal-title">{g.title}</div>
            <div className="uf-goal-desc">{g.desc}</div>
          </button>
        ))}
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
