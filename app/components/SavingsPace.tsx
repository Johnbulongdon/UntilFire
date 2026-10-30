"use client";

import { useId, useState } from 'react';
import {FALLBACK_RATES} from '@/lib/currency';
import Logo from '@/app/components/Logo';
import MotionScene from '@/app/components/motion/MotionScene';
import { savingsSliderAmount, savingsDisplayUSD } from '@/lib/savings-slider';
import { savingsPace, paceDate } from '@/lib/savings-pace';
import type { CalculatorPrefill } from '@/lib/journey';

export default function SavingsPace({ prefill, value, onUse, onBack }: {
  prefill: CalculatorPrefill; value: number; onUse: (plan: CalculatorPrefill) => void; onBack: () => void;
}) {
  const id = useId();
  const displayRate=FALLBACK_RATES[prefill.defaultCurrency ?? "USD"] ?? 1;
  const [amount, setAmount] = useState(String(Math.round(value * displayRate)));
  const [now] = useState(() => Date.now());
  const income = Math.max(0, prefill.monthlyIncome ?? 0);
  const original = prefill.monthlySavings ?? 0;
  const valid = amount.trim() !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0 && Number(amount) <= Math.round(income * displayRate) && Number.isInteger(Number(amount));
  const pace = savingsPace(prefill, valid ? savingsDisplayUSD(Number(amount), original, displayRate) : original);
  const baseline = savingsPace(prefill, original);
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: prefill.defaultCurrency ?? 'USD', maximumFractionDigits: 0 }).format(n * displayRate);
  const months = baseline.result.years !== null && pace.result.years !== null ? Math.round((baseline.result.years - pace.result.years) * 12) : null;
  const difference = !pace.changed ? 'Your current plan' : months === null
    ? pace.result.years === null ? 'Not reached within 65 years' : 'A reachable projection'
    : months === 0 ? 'Less than a month apart' : `${Math.abs(months)} ${Math.abs(months) === 1 ? 'month' : 'months'} ${months > 0 ? 'earlier' : 'later'}`;
  return <section className="pace-page">
    <style>{`
      .pace-page{min-height:100svh;background:var(--uf-ground);color:var(--uf-ink);padding:24px clamp(16px,4vw,40px);font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;box-sizing:border-box}
      .pace-header{display:flex;align-items:center;gap:16px;width:100%;max-width:1120px;margin:0 auto}
      .pace-back{width:44px;height:44px;background:none;border:0;color:var(--uf-green);font:24px inherit;cursor:pointer}
      .pace-progress{display:flex;gap:8px;flex:1;max-width:400px;margin-left:auto}
      .pace-progress span{height:4px;flex:1;border-radius:4px;background:var(--uf-teal)}
      .pace-progress span:last-child{background:var(--uf-border)}
      .pace-main{background:var(--uf-lilac);border-radius:28px;padding:42px!important;width:100%;max-width:1080px;margin:auto;display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,7vw,100px);align-items:center;padding:64px 0 40px}
      .pace-input label{display:block;font-size:22px;font-weight:800;margin-bottom:20px}
      .pace-amount{display:flex;align-items:center;border:1px solid var(--uf-border-2);background:var(--uf-card);border-radius:12px;padding:12px 16px;gap:8px}
      .pace-amount input{width:100%;min-width:0;background:none;border:0;color:var(--uf-ink);font-family:var(--uf-font-mono),monospace;font-size:clamp(32px,5vw,48px);font-weight:700}
      .pace-amount span{color:var(--uf-ink-2);font-size:16px}
      .pace-range{margin-top:20px;position:relative}
      .pace-range input{width:100%;height:44px;accent-color:var(--uf-green);cursor:ew-resize;margin:0;touch-action:pan-y}
      .pace-tick{position:absolute;top:34px;height:10px;width:2px;background:var(--uf-ink-2);pointer-events:none}
      .pace-labels{display:flex;justify-content:space-between;color:var(--uf-ink-2);font-size:12px;gap:8px}
      .pace-live-split{height:16px;overflow:hidden;border-radius:999px;background:var(--uf-card);margin-top:24px;cursor:pointer;touch-action:pan-y}.pace-live-split span{display:block;height:100%;background:var(--uf-ink);pointer-events:none;border-radius:999px;transition:width 180ms ease}@media(prefers-reduced-motion:reduce){.pace-live-split span{transition:none}}
      .pace-summary{font-size:16px;color:var(--uf-ink-2);margin:28px 0 0;line-height:1.6}
      .pace-summary strong{color:var(--uf-teal);font-weight:700}
      .pace-result{border-left:1px solid var(--uf-border);padding-left:40px}
      .pace-original{color:var(--uf-ink-2);font-size:24px;margin:0 0 24px}
      .pace-date{font-family:var(--uf-font-display);font-weight:800;font-size:clamp(40px,5vw,72px);line-height:1.15;letter-spacing:-.03em;margin:0;text-wrap:balance}
      .pace-difference{font-family:var(--uf-font-display);font-weight:700;font-size:clamp(24px,3.5vw,40px);line-height:1.2;margin:20px 0 0;color:var(--uf-teal)}
      .pace-submit{display:block;min-height:52px;width:min(100%,520px);margin:0 auto 40px;border:0;border-radius:999px;background:var(--uf-green);color:var(--uf-on-green,#fff);padding:16px;font:800 17px Inter,sans-serif;cursor:pointer}
      .pace-submit:disabled{opacity:.5;cursor:not-allowed}
      .pace-page :is(button,input):focus-visible{outline:3px solid var(--uf-green);outline-offset:4px}
      @media(max-width:640px){.pace-page{padding-top:16px}.pace-progress{max-width:140px;gap:4px}.pace-main{grid-template-columns:1fr;gap:32px;padding:44px 0 32px}.pace-input label{font-size:20px}.pace-result{border-left:0;border-top:1px solid var(--uf-border);padding:28px 0 0}.pace-original{font-size:20px;margin-bottom:16px}.pace-date{font-size:44px}.pace-difference{font-size:28px}.pace-submit{margin-bottom:16px}.pace-summary{font-size:14px;margin-top:20px}}
    `}</style>
    <header className="pace-header">
      <button type="button" className="pace-back" aria-label="Back to reveal" onClick={onBack}>←</button>
      <Logo variant="auto" size={26} />
      <div className="pace-progress" role="img" aria-label="Last step before saving">{Array.from({ length: 7 }, (_, i) => <span key={i} />)}</div>
    </header>
    <main className="pace-main">
      <div className="pace-input">
        <label htmlFor={id}>Try one improvement.</label>
        <div className="pace-amount"><span aria-hidden="true">{new Intl.NumberFormat("en-US", { style: "currency", currency: prefill.defaultCurrency ?? "USD" }).formatToParts(0).find(p => p.type === "currency")?.value}</span><input id={id} type="number" inputMode="numeric" min={0} max={Math.round(income * displayRate)} step="1" value={amount} aria-describedby={`${id}-summary${valid ? '' : ` ${id}-error`}`} aria-invalid={!valid} onChange={e => setAmount(e.target.value)} onBlur={()=>{if(amount.trim()!==''&&Number.isFinite(Number(amount)))setAmount(String(savingsSliderAmount(Number(amount),original*displayRate,income*displayRate)))}} /><span>/month</span></div>
        {!valid && <p id={`${id}-error`} role="alert">Enter a whole amount from {money(0)} to {money(income)}.</p>}
        <div className="pace-range">
          <input className="uf-slider" type="range" min={0} max={Math.round(income * displayRate)} step="1" value={Math.round(pace.amount * displayRate)} disabled={income <= 0} aria-label="Monthly savings" aria-valuetext={`${money(pace.amount)} a month`} onChange={e => setAmount(String(savingsSliderAmount(Number(e.target.value),original*displayRate,income*displayRate)))} />
          <span className="pace-tick" style={{ left: `${income > 0 ? Math.min(100, Math.max(0, original / income * 100)) : 0}%` }} />
        </div>
        <div className="pace-labels"><span>{money(0)}</span><span>Original: {money(original)}</span><span>{money(income)}</span></div>
        {/* People tap this bar expecting it to move. A tap sets the amount there; the slider stays the keyboard control. */}
        <div className="pace-live-split" role="img" aria-label={money(pace.spending)+' to spend, '+money(pace.amount)+' saved each month'} onPointerDown={e=>{if(income<=0)return;const r=e.currentTarget.getBoundingClientRect();const f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));setAmount(String(savingsSliderAmount(Math.round(f*income*displayRate),original*displayRate,income*displayRate)))}}><span style={{width:Math.min(100,Math.max(0,pace.rate))+'%'}}/></div>
        <p className="pace-summary" id={`${id}-summary`}><strong>{Math.round(pace.rate)}% of income</strong> · {money(pace.spending)} to spend</p>
      </div>
      <MotionScene className="pace-result" scene={paceDate(pace.result.years, now)} role="status" aria-live="polite" aria-atomic="true">
        {pace.changed && <p className="pace-original">{paceDate(baseline.result.years, now)} <span aria-hidden="true">↘</span></p>}
        <h1 className="pace-date">{paceDate(pace.result.years, now)}</h1>
        <p className="pace-difference">{difference}</p>
      </MotionScene>
    </main>
    <button type="button" className="pace-submit" disabled={!valid} onClick={() => onUse(pace.plan)}>{pace.changed ? 'Use updated plan' : 'Use original plan'}</button>
  </section>;
}
