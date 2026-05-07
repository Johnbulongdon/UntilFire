type NavProps = {
  step: number;
  totalSteps: number;
  onRestart: () => void;
  onSignIn: () => void;
};

export function fmtUSD(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

export function Nav({ step, totalSteps, onRestart, onSignIn }: NavProps) {
  return (
    <nav className="uf-nav">
      <div className="uf-nav-logo">Until<span>Fire</span></div>
      <div className="uf-nav-dots">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`uf-nav-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      {step > 0 && (
        <button className="uf-nav-restart" onClick={onRestart}>Start over</button>
      )}
      {step === 0 && (
        <button className="uf-nav-signin" onClick={onSignIn}>Sign in</button>
      )}
    </nav>
  );
}

export function WizardProgress({ step }: { step: number }) {
  const steps = ["Goals", "City", "Income", "Finances"];
  return (
    <div className="uf-wizard-progress">
      {steps.map((label, i) => (
        <div key={i} className="uf-wizard-row">
          <div className={`uf-wdot ${i < step ? "done" : i === step ? "active" : ""}`} title={label} />
          {i < steps.length - 1 && (
            <div className={`uf-wline ${i < step ? "done" : i === step ? "active" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}
