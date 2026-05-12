"use client";

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
      <div className="uf-nav-logo">Until<span>Fire</span></div>
      <div className="uf-nav-dots">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`uf-nav-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      {step > 0 ? (
        <button className="uf-nav-restart" onClick={onRestart}>Start over</button>
      ) : (
        <button className="uf-nav-signin" onClick={onSignIn}>Sign in</button>
      )}
    </nav>
  );
}
