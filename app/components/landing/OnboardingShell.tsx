"use client";

/**
 * The frame around each onboarding question (D-50): back as an icon, the
 * progress bar and Skip in one header row, then the scene. The step's own
 * screen renders below with only its primary button in the footer.
 */

import OnboardingScene, { type SceneIcon } from "./OnboardingScene";

const ease = "cubic-bezier(.22,.8,.24,1)";

export const ONBOARDING_CSS = `
  .uf-ob { width: 100%; max-width: 540px; margin: 0 auto; padding: 16px 24px 0; position: relative; z-index: 1; display: grid; gap: 16px; }
  .uf-ob-head { display: grid; grid-template-columns: 36px minmax(0, 1fr) 44px; align-items: center; gap: 10px; min-height: 36px; }
  .uf-ob-bar { display: grid; gap: 5px; }
  .uf-ob-bar span { height: 4px; border-radius: 9px; background: var(--uf-surface-2); transition: background 400ms ${ease}; }
  .uf-ob-bar span.on { background: var(--uf-teal); }
  .uf-iconbtn { width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center; border: 1px solid var(--uf-border); background: var(--uf-card); color: var(--uf-ink-2); cursor: pointer; padding: 0; }
  .uf-iconbtn:hover { color: var(--uf-ink); background: var(--uf-surface); }
  .uf-skip { justify-self: end; border: 0; background: none; font: 600 14px var(--uf-font); color: var(--uf-ink-2); cursor: pointer; padding: 8px 4px; }
  .uf-skip:hover { color: var(--uf-ink); }
  .uf-iconbtn:focus-visible, .uf-skip:focus-visible { outline: 2px solid var(--uf-green); outline-offset: 2px; }
  .uf-scene { position: relative; border-radius: 22px; overflow: hidden; aspect-ratio: 350 / 210; background: var(--uf-bg); }
  .uf-scene-tag { position: absolute; left: 14px; top: 14px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px 7px 10px; border-radius: 999px;
    background: var(--uf-card); box-shadow: var(--uf-e1); font: 600 13px var(--uf-font); color: var(--uf-ink); max-width: calc(100% - 28px);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: ufPop 420ms ${ease} both; transform-origin: left center; }
  .uf-cloud { animation: ufDrift 9s ease-in-out infinite alternate; }
  .uf-cloud-2 { animation-duration: 13s; animation-direction: alternate-reverse; }
  @keyframes ufDrift { from { transform: translateX(-12px); } to { transform: translateX(14px); } }
  @keyframes ufPop { 0% { transform: scale(.85); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); } }
  .uf-ob-q { margin: 0 0 4px; font-family: var(--uf-font-display); font-weight: 500; font-size: 26px; line-height: 1.15; color: var(--uf-ink); }
  .uf-ob-q:focus { outline: none; } /* focused on arrival for screen readers, not interactive */
  .uf-ob-hint { margin: 0 0 16px; color: var(--uf-ink-2); font-size: 15px; line-height: 1.5; }
  .uf-ob-small { font-size: 12.5px; color: var(--uf-ink-3); }
  .uf-ob-section { font-size: 12px; font-weight: 700; color: var(--uf-ink-3); margin-top: 4px; }
  .uf-tiles { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
  .uf-tile { position: relative; text-align: left; padding: 12px 14px; border-radius: 14px; cursor: pointer; color: var(--uf-ink); font: inherit; min-width: 0;
    border: 1px solid var(--uf-border-2); background: var(--uf-card); transition: border-color 200ms ${ease}, background 200ms ${ease}; }
  .uf-tile[aria-pressed="true"], .uf-tile.on { border: 1.5px solid var(--uf-green); background: color-mix(in srgb, var(--uf-green) 8%, var(--uf-card)); }
  .uf-tile:focus-visible, .uf-tile:focus-within { outline: 2px solid var(--uf-green); outline-offset: 1px; }
  .uf-tile-v { display: block; font-family: var(--uf-font-mono); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 16px; overflow-wrap: anywhere; }
  .uf-tile-sub { display: block; font-size: 12.5px; color: var(--uf-ink-3); margin-top: 2px; }
  .uf-tile-tag { position: absolute; top: 8px; right: 10px; font-size: 10.5px; font-weight: 700; color: var(--uf-teal); }
  .uf-tile-other { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; cursor: text; }
  .uf-tile-other input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--uf-ink); padding: 0;
    font-family: var(--uf-font-mono); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 16px; -moz-appearance: textfield; }
  .uf-tile-other input::-webkit-outer-spin-button, .uf-tile-other input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .uf-tile-other input::placeholder { font-family: var(--uf-font); font-weight: 500; color: var(--uf-ink-3); }
  .uf-wheel::-webkit-scrollbar { display: none; }
  .uf-wheel:focus-visible { box-shadow: inset 0 0 0 2px var(--uf-green); border-radius: 18px; }
  .uf-ob-foot { margin-top: 20px; }
  .uf-ob-foot .uf-btn { width: 100%; }
  @media (max-width: 480px) { .uf-ob { padding: 8px 16px 0; gap: 12px; } .uf-ob-q { font-size: 24px; } }
  @media (prefers-reduced-motion: reduce) { .uf-cloud, .uf-scene-tag { animation: none; } .uf-scene * { transition: none !important; } }
`;

export default function OnboardingShell({ step, steps, answer, icon, onBack, onSkip, skipLabel }: {
  step: number;
  steps: number;
  answer: string;
  icon: SceneIcon;
  onBack: () => void;
  /** Shown only on steps that can be skipped. */
  onSkip?: () => void;
  skipLabel?: string;
}) {
  return (
    <div className="uf-ob">
      <div className="uf-ob-head">
        <button type="button" aria-label="Back" onClick={onBack} className="uf-iconbtn">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="uf-ob-bar" role="progressbar" aria-label="Questions answered" aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step + 1} aria-valuetext={`Question ${step + 1} of ${steps}`}
          style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}>
          {Array.from({ length: steps }, (_, k) => <span key={k} className={k <= step ? "on" : undefined} />)}
        </div>
        {onSkip ? <button type="button" className="uf-skip" aria-label={skipLabel} onClick={onSkip}>Skip</button> : <span />}
      </div>
      <OnboardingScene step={step} steps={steps} answer={answer} icon={icon} />
    </div>
  );
}
