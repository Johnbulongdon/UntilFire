"use client";
import React, { useEffect, useRef, useState } from "react";
import { calcFIRE } from "@/lib/fire";
import Link from "next/link";
import { Button } from "@/components/ui";
const EXAMPLE = { age: 30, balance: 0, annualSpend: 36000, monthlySave: 800 };
function project(save: number, spend = EXAMPLE.annualSpend, balance = EXAMPLE.balance) {
  return calcFIRE(Math.max(0, Math.round(save)), spend, EXAMPLE.age, Math.max(0, balance));
}
function balanceAt(year: number, save: number, balance = EXAMPLE.balance) {
  const growth = Math.pow(1.07, year);
  return balance * growth + save * 12 / .07 * (growth - 1);
}

/* The sun, rebuilt from public/logo/horizon-color.svg rather than eyeballed.
   There the sun is circle(cx 512, cy 620, r 260) with the ground starting at
   y=620, so the visible shape is an exact semicircle. Five rays sit at 0 and
   +/-20 and +/-40 degrees from vertical, starting 30px clear of the rim
   (0.115r), running 60px out (0.231r), stroke 16 (0.0615r), round caps.
   Those ratios, re-solved for r=210, are what is drawn below — so this is the
   logo scaled up, not something that merely resembles it. */
const SUN_R = 210, SUN_CX = 400, SUN_CY = 420;
const RAYS = [-40, -20, 0, 20, 40].map((deg) => {
  const t = (deg * Math.PI) / 180;
  const at = (r: number) => [SUN_CX + r * Math.sin(t), SUN_CY - r * Math.cos(t)] as const;
  const [x1, y1] = at(SUN_R * 1.115), [x2, y2] = at(SUN_R * 1.346);
  return { x1, y1, x2, y2 };
});
function HeroSun() {
  return <svg className="uf-sun" viewBox={`0 0 800 ${SUN_CY}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs><linearGradient id="uf-sun-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--uf-aqua)"/><stop offset="100%" stopColor="var(--uf-teal)"/>
    </linearGradient></defs>
    <g stroke="var(--uf-teal)" strokeWidth={SUN_R * 0.0615} strokeLinecap="round" opacity=".7">
      {RAYS.map((r, i) => <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}/>)}
    </g>
    <path d={`M${SUN_CX - SUN_R} ${SUN_CY} A ${SUN_R} ${SUN_R} 0 0 1 ${SUN_CX + SUN_R} ${SUN_CY} Z`} fill="url(#uf-sun-fill)"/>
  </svg>;
}

/* The headline rotates its second line every three seconds. "A plan for" is
   fixed because it is the differentiator; the slot underneath reaches a
   different reader on each beat. Freedom leads deliberately: it is what a
   cold visitor meets, and what anyone with reduced motion sees permanently. */
const HERO_WORDS = ["freedom.", "FIRE.", "your time back."];
const HERO_CANON = "A plan for freedom, for FIRE, for your time back.";

const money = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
function useTween(value: number, duration = 650) {
  const [shown, setShown] = useState(value); const current = useRef(value);
  useEffect(() => {
    let frame: number; const from = current.current; const start = performance.now();
    function tick(now: number) { const t = Math.min(1, (now - start) / duration); current.current = from + (value - from) * ease(t); setShown(current.current); if (t < 1) frame = requestAnimationFrame(tick); }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [value, duration]); return shown;
}
function Curve({ savings, balance, replay, motion }: { savings: number; balance: number; replay: number; motion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null); const [intro, setIntro] = useState(0);
  const animatedSavings = useTween(savings, motion ? 650 : 1);
  const animatedBalance = useTween(balance, motion ? 650 : 1);
  const result = project(animatedSavings, undefined, animatedBalance);
  const reached = project(savings, undefined, balance).years !== null;
  const empty = savings === 0 && balance === 0;
  const years = result.years ?? 65; const age = EXAMPLE.age + years;
  useEffect(() => {
    let raf: number; const start = performance.now();
    function tick(now: number) { const p = motion ? Math.min(1, (now - start) / 2200) : 1; setIntro(p); if (p < 1) raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [replay, motion]);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const draw = () => {
      const w = el.clientWidth, h = el.clientHeight, ratio = window.devicePixelRatio || 1;
      if (el.width !== Math.round(w * ratio)) el.width = Math.round(w * ratio);
      if (el.height !== Math.round(h * ratio)) el.height = Math.round(h * ratio);
      const c = el.getContext('2d'); if (!c) return; c.setTransform(ratio,0,0,ratio,0,0); c.clearRect(0,0,w,h); c.globalAlpha=1;
      const small = w < 650, left = 12, right = small ? 22 : 40, top = 22, bottom = h - 32;
      const horizon = Math.max(30, Math.ceil((years + 3) / 10) * 10);
      const xx = (y: number) => left + y / horizon * (w - left - right);
      const yy = (b: number) => bottom - Math.min(b / result.fireTarget, 1.15) * (bottom - top) * .82;
      const valueAt = (year: number) => empty ? 0 : balanceAt(year, animatedSavings, animatedBalance);
      const pointYear = years * ease(intro), endX = xx(pointYear), endY = yy(valueAt(pointYear));
      c.font = '12px Inter, Arial'; c.strokeStyle = '#dcd1c1'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(left,bottom); c.lineTo(w-right,bottom); c.stroke(); c.fillStyle = '#7b7062'; c.textAlign='center';
      for(let y=0;y<=horizon;y+=10) c.fillText(String(EXAMPLE.age+y),xx(y),h-8);
      c.beginPath(); c.moveTo(left,bottom);
      for(let i=0;i<=160;i++) {const y=pointYear*i/160;c.lineTo(xx(y),yy(valueAt(y)));}
      c.lineTo(endX,bottom);c.closePath();c.fillStyle='#0e9c8609';c.fill();
      c.beginPath();for(let i=0;i<=160;i++){const y=pointYear*i/160;const x=xx(y),v=yy(valueAt(y));i===0?c.moveTo(x,v):c.lineTo(x,v);}c.strokeStyle='#0e9c86';c.lineWidth=small?2.5:3;c.lineCap='round';c.stroke();
      c.save();c.setLineDash([3,5]);c.strokeStyle='#a99b86';c.lineWidth=1;c.beginPath();c.moveTo(endX,endY+10);c.lineTo(endX,bottom);c.stroke();c.restore();
      c.beginPath();c.arc(endX,endY,12,0,Math.PI*2);c.fillStyle='#0e9c861b';c.fill();
      c.beginPath();c.arc(endX,endY,5,0,Math.PI*2);c.fillStyle='#087d69';c.fill();
      if(intro>.85 && reached){c.globalAlpha=(intro-.85)/.15;c.font='12px Inter, Arial';c.textAlign=endX>w-120?'right':'left';c.fillStyle='#087d69';c.fillText('Freedom point',endX+(endX>w-120?-15:15),endY-10);}
    };
    const observer = new ResizeObserver(draw); observer.observe(el); draw(); return () => observer.disconnect();
  }, [animatedSavings, animatedBalance, empty, intro, years, result.fireTarget, reached]);
  return <div className="curve-scene" data-animation-progress={intro.toFixed(2)}>
    <div className="age-result"><span className="eyebrow">YOUR EXAMPLE FUTURE</span><div className={`age-number ${!reached?'no-date':''}`}>{reached ? Math.round(30+(age-30)*ease(intro)) : empty ? 'No retirement date' : 'Not reached'}<span>{reached?'years old':''}</span></div><p>{reached?'Work could become optional.':empty?'With $0 invested and $0 saved, there is nothing to grow.':'Target not reached within the 65-year projection.'}</p></div>
    <canvas ref={canvas} className="curve" role="img" aria-label={`Example investment projection: ${reached ? `freedom at approximately age ${Math.round(age)}` : 'target not reached'}, starting at age 30 with $${balance}. Annual spending $36,000. Monthly saving $${savings}.`} />
  </div>;
}

export default function AnimatedHero({onStart, children}: {onStart:()=>void; children?: React.ReactNode}) {
  const [savings,setSavings]=useState(800), [replay,setReplay]=useState(0), [motion,setMotion]=useState(true);
  const [balance,setBalance]=useState(EXAMPLE.balance);
  const result=project(savings,undefined,balance), baseline=project(800,undefined,balance);
  const difference=result.years===null||baseline.years===null?null:baseline.years-result.years;

return <div className="uf-motion"><div className={motion?"motion-on":"motion-off"}>
      <section className="hero">
        <div className="hero-fold">
          <div className="uf-glow" aria-hidden="true"/><HeroSun/>
          <div className="hero-copy">
            <h1>
              <span className="sr-only">{HERO_CANON}</span>
              <span aria-hidden="true"><span className="fix">A plan for</span><br/>
                <span className="rot">{HERO_WORDS.map(w=><em key={w}>{w}</em>)}</span></span>
            </h1>
            <p>UntilFire turns your income, spending and savings into the year work becomes optional — and the moves that bring it closer.</p>
            <div className="hero-cta"><Button variant="primary" size="lg" onClick={onStart} style={{padding:"17px 30px",minHeight:56}}>Find my freedom date <span aria-hidden="true">↗</span></Button>
              {/* Secondary, and a link rather than a Button: it leaves for another
                  page and should be crawlable. Styled as Button's secondary
                  variant. The quiz does not feed the product yet, so it sits
                  here rather than in onboarding (D-13). */}
              <Link href="/fire-type?source=homepage-secondary" className="hero-cta-secondary">Take the FIRE Type quiz</Link></div>
            {children}
          </div>
        </div>
        <Curve savings={savings} balance={balance} replay={replay} motion={motion}/>
        <div className="motion-controls"><button type="button" onClick={()=>{setMotion(true);setReplay(v=>v+1);}}>Replay animation</button><button type="button" aria-pressed={!motion} onClick={()=>setMotion(v=>!v)}>{motion?"Reduce motion":"Enable motion"}</button></div>
        <div className="balance-control"><label htmlFor="balance">Already invested <span>(USD)</span></label><input id="balance" type="number" min="0" max="5000000" step="1000" value={balance} onChange={e=>setBalance(Math.min(5000000,Math.max(0,Math.round(Number(e.target.value)||0))))}/><small>The example starts from $0. Add existing investments to see their effect.</small></div>
        <div className="saving-control"><div className="slider-heading"><label htmlFor="savings">What if you saved a little more?</label><output htmlFor="savings">${money(savings)} <small>/ month</small></output></div><input id="savings" type="range" min="0" max="3000" step="50" value={savings} onChange={e=>setSavings(Number(e.target.value))} aria-valuetext={`$${money(savings)} per month`} /><div className="slider-bottom"><span>$0</span><span>Drag to explore your example</span><span>$3,000</span></div><p className="difference" aria-live="polite">{difference===null?'No retirement date within this projection. Add savings or existing investments.':Math.abs(difference)<.05?'Small changes can move your freedom date.':`${Math.abs(difference).toFixed(1)} years ${difference>0?'earlier':'later'} than saving $800 a month.`}</p></div>
        <details className="assumptions"><summary>Example assumptions</summary><p>Age 30 · ${money(balance)} already invested · $36,000 annual retirement spending · 7% real annual growth · 25× spending target ($900,000). Contributions modeled annually. Everything is in today’s dollars. Estimates are illustrative, not guaranteed. Your own income and expenses are collected in the calculator.</p></details>
        <div className="hero-bottom"><span>YOUR MONEY HAS A FUTURE.</span><a href="#how">See how it unfolds ↓</a></div>
      </section>
<style>{HERO_CSS}</style></div></div>;
}
const HERO_CSS = ".uf-motion{container-type:inline-size;padding:120px 24px 36px;background:var(--uf-ground);color:var(--uf-ink);--green:#087d69;--teal:#0e9c86;--muted:#7b7062;--line:#e3d9cb}.uf-motion .hero{max-width:1200px;margin:auto}.uf-motion button{font:inherit;cursor:pointer}.uf-motion .primary{border:0;font-size:16px}.uf-motion .hero-copy p{max-width:480px}.uf-motion .motion-controls{grid-column:1/-1;grid-row:2;display:flex;gap:18px;justify-content:flex-end;padding-top:20px}.uf-motion .motion-controls button{font-size:13px;background:none;border:0;color:var(--muted);text-decoration:underline;text-underline-offset:4px}.uf-motion .balance-control{grid-row:3}.uf-motion .saving-control{grid-row:4}.uf-motion .assumptions{grid-row:5}.uf-motion .hero-bottom{grid-row:6}@container(max-width:700px){.uf-motion .motion-controls{order:2}.uf-motion .hero{display:flex;flex-direction:column;align-items:stretch}.uf-motion .curve-scene{order:1}.uf-motion .balance-control{order:3}.uf-motion .saving-control{order:4}.uf-motion .assumptions{order:5}.uf-motion .hero-bottom{order:6}.uf-motion .desktop-break{display:none}}\n.uf-motion *{box-sizing:border-box}.uf-motion button,.uf-motion a,.uf-motion input,.uf-motion summary{-webkit-tap-highlight-color:transparent}.uf-motion a{color:inherit;text-decoration:none}.uf-motion button,.uf-motion input{font:inherit}.uf-motion button,.uf-motion a,.uf-motion summary,.uf-motion input{outline-offset:5px}.uf-motion button:focus-visible,.uf-motion a:focus-visible,.uf-motion summary:focus-visible,.uf-motion input:focus-visible{outline:2px solid var(--green)}.uf-motion button,.uf-motion summary{cursor:pointer}.uf-motion .hero{position:relative;padding-top:48px}.uf-motion .hero-copy{position:relative;z-index:1;pointer-events:none;width:64%}.uf-motion .hero-copy a{pointer-events:auto}.uf-motion .eyebrow{font-size:13px;letter-spacing:1.8px;line-height:1.5;font-weight:600;color:var(--green)}.uf-motion h1,.uf-motion h2,.uf-motion .age-number,.uf-motion output{font-family:'Instrument Serif',Georgia,serif;font-weight:400}.uf-motion h1{font-size:clamp(70px,8.4vw,126px);letter-spacing:-4px;line-height:.97;margin:24px 0 25px}.uf-motion em{font-weight:400;color:var(--green)}.uf-motion .hero-copy p{font-size:18px;line-height:1.6;color:#625a50;margin:0 0 30px}.uf-motion .primary{display:inline-flex;gap:36px;align-items:center;justify-content:space-between;padding:19px 24px;min-height:58px;border-radius:4px;background:var(--green);color:#fff;font-size:16px;font-weight:500;transition:background .2s,transform .2s}.uf-motion .primary:hover{background:#045e50;transform:translateY(-2px)}.uf-motion .primary span{font-size:21px;font-weight:400}.uf-motion .curve-scene{position:relative;margin-top:-220px;height:355px;pointer-events:none}.uf-motion .curve{display:block;width:100%;height:100%}.uf-motion .age-result{position:absolute;right:4%;top:-125px;text-align:left}.uf-motion .age-result .eyebrow{font-size:13px}.uf-motion .age-number{font-size:100px;line-height:1;margin-top:8px;letter-spacing:-3px;font-variant-numeric:lining-nums tabular-nums}.uf-motion .age-number span{font-family:Inter,Arial;font-size:13px;letter-spacing:0;display:block;margin-top:5px;color:var(--muted)}.uf-motion .age-result p{font-size:14px;margin-top:10px;color:var(--green)}.uf-motion .saving-control{max-width:500px;margin:30px auto 0}.uf-motion .slider-heading{display:flex;align-items:end;justify-content:space-between;gap:20px}.uf-motion .slider-heading label{font-size:14px;color:#625a50;max-width:180px;line-height:1.6}.uf-motion output{font-size:36px;white-space:nowrap;letter-spacing:-1px}.uf-motion output small{font-family:Inter,Arial;font-size:13px;letter-spacing:0;color:var(--muted)}.uf-motion input[type=range]{width:100%;height:32px;accent-color:var(--green);cursor:ew-resize;margin:12px 0 0}.uf-motion input[type=range]::-webkit-slider-thumb{min-width:20px;min-height:20px}.uf-motion .slider-bottom{display:flex;justify-content:space-between;font-size:13px;color:var(--muted)}.uf-motion .difference{text-align:center;font-size:13px;color:var(--green);min-height:16px;margin-top:18px}.uf-motion .assumptions{font-size:13px;color:var(--muted);max-width:600px;margin:20px auto 32px;text-align:center;line-height:1.8}.uf-motion .assumptions summary{text-decoration:underline;text-underline-offset:4px}.uf-motion .assumptions p{text-align:left}.uf-motion .hero-bottom{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:22px 0;font-size:13px;letter-spacing:1.5px;color:var(--muted)}.uf-motion .hero-bottom a{letter-spacing:0;font-size:13px}.uf-motion h2{font-size:clamp(40px,4.3vw,66px);line-height:1.04;letter-spacing:-1.8px;margin:22px 0}.uf-motion .motion-on .hero-copy{animation:enter .8s both}.uf-motion .motion-off *{animation:none!important;transition:none!important}@keyframes enter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}\n@container(max-width:700px){.uf-motion .hero{padding-top:30px}.uf-motion .hero-copy{width:100%}.uf-motion .eyebrow{font-size:13px;letter-spacing:1.1px}.uf-motion h1{font-size:72px;letter-spacing:-2.8px;margin:20px 0 22px}.uf-motion .hero-copy p{font-size:16px;line-height:1.7;margin-bottom:24px}.uf-motion .primary{width:100%;font-size:14px;min-height:54px;padding:15px 19px}.uf-motion .curve-scene{margin-top:125px;height:220px}.uf-motion .age-result{left:0;right:auto;top:-98px}.uf-motion .age-result .eyebrow{display:none}.uf-motion .age-number{font-size:59px;margin:0;letter-spacing:-2px}.uf-motion .age-number span{display:inline;margin-left:10px;font-size:13px;letter-spacing:0}.uf-motion .age-result p{font-size:13px;margin:5px 0}.uf-motion .saving-control{margin-top:20px}.uf-motion .slider-heading label{font-size:13px;max-width:145px}.uf-motion output{font-size:31px}.uf-motion output small{font-size:13px}.uf-motion .assumptions{margin-bottom:26px}.uf-motion .hero-bottom{font-size:8px;letter-spacing:.8px}.uf-motion .hero-bottom a{font-size:13px}.uf-motion h2{font-size:43px;letter-spacing:-1.3px}}\n@container(min-width:701px){.uf-motion .hero{padding-top:24px}}\n.uf-motion .hero-copy{width:100%;pointer-events:auto}.uf-motion .curve-scene{margin-top:36px;height:auto;display:flex;flex-direction:column;gap:20px}.uf-motion .age-result{position:static;align-self:flex-end;text-align:right;max-width:100%}.uf-motion .age-number{font-size:76px}.uf-motion .age-number.no-date{font-size:36px;letter-spacing:-1px}.uf-motion .age-result p{max-width:420px;line-height:1.6}.uf-motion .curve{height:290px;flex:none}.uf-motion .balance-control{max-width:500px;margin:28px auto 0;display:grid;grid-template-columns:1fr 160px;gap:10px;align-items:center;font-size:14px}.uf-motion .balance-control label span{color:var(--muted)}.uf-motion .balance-control input{width:100%;min-width:0;border:1px solid var(--line);border-radius:4px;padding:12px;background:transparent;color:inherit}.uf-motion .balance-control small{grid-column:1/-1;font-size:13px;line-height:1.6;color:var(--muted)}\n@container(max-width:700px){.uf-motion .curve-scene{margin-top:30px;gap:14px}.uf-motion .age-result{align-self:flex-start;text-align:left}.uf-motion .age-number{font-size:58px}.uf-motion .age-number.no-date{font-size:32px}.uf-motion .curve{height:210px}.uf-motion .balance-control{grid-template-columns:1fr 130px}.uf-motion .age-result p{font-size:14px}}\n@container(min-width:701px){.uf-motion .hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);column-gap:36px;align-items:center}.uf-motion .hero-copy{grid-column:1;grid-row:1}.uf-motion .curve-scene{grid-column:2;grid-row:1;margin-top:0;align-self:end}.uf-motion .age-result{align-self:flex-start;text-align:left}.uf-motion .curve{height:260px}.uf-motion .balance-control,.uf-motion .saving-control,.uf-motion .assumptions,.uf-motion .hero-bottom{grid-column:1/-1;width:100%}}\n\n.uf-motion input[type=range]{appearance:auto}.uf-motion input[type=number]{font-family:inherit}.uf-motion .primary:hover{color:#fff}.uf-motion .hero-copy{animation:none}@media(prefers-reduced-motion:reduce){.uf-motion .primary{transition:none}}\n\n/* ── The fold: centred, one rotating line, the logo's sun ───────────── */\n/* .hero was a two-column grid on wide screens with the chart beside the\n   copy. The fold is centred now, so the chart moves below it; Curve was\n   moved above .motion-controls in the markup so plain block flow gives the\n   order the mobile flex layout used to hand-build with `order`. */\n/* The fold is exactly one screen tall, so the sun always rests on the\n   bottom edge of the display and the next section never half-shows. The\n   sun's height is 0.525 of its width (viewBox 800x420), so reserving that\n   much padding keeps the copy clear of the rays at every size. --uf-fold-top\n   ties the min-height to the wrapper's own top padding so the two cannot\n   drift apart. min-height, not height: short windows grow rather than clip. */\n.uf-motion{--uf-fold-top:120px;padding-top:var(--uf-fold-top)}\n.uf-motion .hero{display:block;padding-top:0}\n.uf-motion .hero-fold{--uf-sun-w:min(660px,86vw,60vh);position:relative;overflow:hidden;text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:calc(100vh - var(--uf-fold-top));min-height:calc(100svh - var(--uf-fold-top));padding-bottom:calc(var(--uf-sun-w)*.525);border-bottom:1px solid var(--uf-border)}\n.uf-motion .hero-copy{position:relative;z-index:2;width:100%;max-width:940px;margin:0 auto;padding:0 var(--uf-s5);text-align:center;pointer-events:auto}\n/* A sunrise is mostly the light it throws. Solid-to-transparent at low\n   opacity, so one token does it and nothing is a literal. */\n.uf-motion .uf-glow{position:absolute;inset:auto 0 0 0;height:72%;z-index:0;opacity:.3;background:radial-gradient(70% 100% at 50% 100%,var(--uf-aqua) 0%,transparent 60%)}\n.uf-motion .uf-sun{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:var(--uf-sun-w);height:auto;z-index:1;opacity:.8;display:block}\n.uf-motion .hero-copy h1{font-size:clamp(50px,min(9vw,12vh),126px);letter-spacing:-2.6px;line-height:.98;margin:0}\n.uf-motion .hero-copy .fix{font-size:clamp(25px,min(3.4vw,4.6vh),46px);letter-spacing:-1px;color:var(--uf-ink)}\n.uf-motion .hero-copy p{font-size:18px;line-height:1.6;color:var(--uf-ink-2);max-width:560px;margin:var(--uf-s5) auto var(--uf-s6)}\n.uf-motion .hero-cta{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:var(--uf-s3)}\n.uf-motion .hero-cta-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:17px 30px;border-radius:var(--uf-r-pill);border:1px solid var(--uf-border-2);background:var(--uf-card);color:var(--uf-ink);font-family:var(--uf-font);font-size:15px;font-weight:700;white-space:nowrap;transition:filter 120ms ease}.uf-motion .hero-cta-secondary:hover{filter:brightness(.97)}\n.uf-motion .sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}\n/* inline-grid: all three words share one cell, so the cell is as wide and\n   as tall as the longest and NOTHING below the headline ever moves. */\n.uf-motion .rot{display:inline-grid;justify-items:center}\n.uf-motion .rot>em{grid-area:1/1;font-style:italic;color:var(--uf-green);opacity:0;transform:translateY(10px);white-space:nowrap;animation:uf-rot 9s cubic-bezier(.4,0,.2,1) infinite}\n.uf-motion .rot>em:nth-child(2){animation-delay:3s}\n.uf-motion .rot>em:nth-child(3){animation-delay:6s}\n@keyframes uf-rot{0%{opacity:0;transform:translateY(10px)}4%,30%{opacity:1;transform:translateY(0)}35%,100%{opacity:0;transform:translateY(-10px)}}\n/* Reduced motion drops the 10px slide but keeps the cross-fade, so someone\n   with Reduce Motion on still sees all three framings — freezing the\n   headline made the page look broken to them. The explicit \"Reduce\n   motion\" button below still stops it dead, which is the real pause\n   control. Both paths must leave a word on screen: the base state is\n   opacity:0, so `.motion-off *{animation:none!important}` would otherwise\n   blank the headline outright. */\n@keyframes uf-rot-fade{0%{opacity:0}4%,30%{opacity:1}35%,100%{opacity:0}}@media(prefers-reduced-motion:reduce){.uf-motion .rot>em{transform:none;animation-name:uf-rot-fade}}\n.uf-motion .motion-off .rot>em{transform:none}.uf-motion .motion-off .rot>em:first-child{opacity:1}\n@container(max-width:700px){\n    .uf-motion .hero-copy{padding:0 var(--uf-s4)}\n  .uf-motion .hero-copy h1{letter-spacing:-1.8px}\n  .uf-motion .hero-copy p{font-size:16px;margin-bottom:var(--uf-s5)}\n  .uf-motion{--uf-fold-top:92px}\n  .uf-motion .hero-cta>button{flex:1;max-width:420px}\n  .uf-motion .hero-cta{flex-direction:column;align-items:center}\n  .uf-motion .hero-cta>button,.uf-motion .hero-cta>a{width:100%;max-width:420px}\n}\n@media(max-height:780px){.uf-motion{--uf-fold-top:92px}}";
