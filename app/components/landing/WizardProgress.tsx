"use client";

export default function WizardProgress({ step }: { step: number }) {
  const steps = ["Goal", "City", "Income", "Savings", "Portfolio"];
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
