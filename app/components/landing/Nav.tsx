"use client";

import Link from "next/link";
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
  return (
    <nav className="uf-nav">
      <Link href="/" className="uf-nav-logo" style={{ textDecoration: "none" }}>
        <Logo variant="light" size={26} />
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
          <button className="uf-nav-restart" onClick={onRestart}>Start over</button>
        ) : (
          <button className="uf-nav-signin" onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </nav>
  );
}
