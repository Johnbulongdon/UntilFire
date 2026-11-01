"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui";
import Logo from "@/app/components/Logo";

export default function Nav({
  step,
  totalSteps,
  onRestart,
  onSignIn,
}: {
  step: number;
  totalSteps: number;
  onRestart: () => void;
  onSignIn: () => void;
}) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  return (
    <nav className="uf-nav">
      <Link href="/" className="uf-nav-logo" style={{ textDecoration: "none" }}>
        <Logo variant="auto" size={26} />
      </Link>
      <div className="uf-nav-dots">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`uf-nav-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      <div className="uf-nav-actions">
        <Link href="/calculators" className="uf-nav-restart" style={{ textDecoration: "none" }}>Calculators</Link>
        <Link href="/learn" className="uf-nav-restart" style={{ textDecoration: "none" }}>Learn</Link>
        <Link href="/pricing" className="uf-nav-restart" style={{ textDecoration: "none" }}>Pricing</Link>
        {step > 0 ? (
          <button
            className="uf-nav-restart"
            onClick={() => setConfirmRestart(true)}
          >
            Start over
          </button>
        ) : (
          <button className="uf-nav-signin" onClick={onSignIn}>Sign in</button>
        )}
      </div>
      <ConfirmDialog
        open={confirmRestart}
        title="Start over?"
        body="This clears your answers so far."
        confirmLabel="Start over"
        cancelLabel="Keep going"
        onConfirm={() => { setConfirmRestart(false); onRestart(); }}
        onCancel={() => setConfirmRestart(false)}
      />
    </nav>
  );
}
