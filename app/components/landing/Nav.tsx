"use client";

import Link from "next/link";
import Logo from "@/app/components/Logo";

export default function Nav({
  step,
  totalSteps,
  onRestart,
  onSignIn,
  isDark = false,
}: {
  step: number;
  totalSteps: number;
  onRestart: () => void;
  onSignIn: () => void;
  isDark?: boolean;
}) {
  const mutedColor = isDark ? "rgba(255,255,255,0.6)" : undefined;
  return (
    <nav
      className="uf-nav"
      style={isDark ? {
        background: "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "none",
      } : undefined}
    >
      <Link href="/" className="uf-nav-logo" style={{ textDecoration: "none", color: isDark ? "#fff" : undefined }}>
        <Logo variant="light" size={26} />
      </Link>
      <div className="uf-nav-dots">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`uf-nav-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/calculators" className="uf-nav-restart" style={{ textDecoration: "none", color: mutedColor }}>Calculators</Link>
        <Link href="/learn" className="uf-nav-restart" style={{ textDecoration: "none", color: mutedColor }}>Learn</Link>
        <Link href="/pricing" className="uf-nav-restart" style={{ textDecoration: "none", color: mutedColor }}>Pricing</Link>
        {step > 0 ? (
          <button className="uf-nav-restart" onClick={onRestart} style={{ color: mutedColor }}>Start over</button>
        ) : (
          <button
            className="uf-nav-signin"
            onClick={onSignIn}
            style={isDark ? { color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "transparent" } : undefined}
          >Sign in</button>
        )}
      </div>
    </nav>
  );
}
