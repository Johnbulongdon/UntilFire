"use client";
import React, { useEffect, useRef, useState } from "react";
import { calcFIRE } from "@/lib/fire";
const EXAMPLE = { age: 30, balance: 0, annualSpend: 36000, monthlySave: 800 };
function project(save: number, spend = EXAMPLE.annualSpend, balance = EXAMPLE.balance) {
  return calcFIRE(Math.max(0, Math.round(save)), spend, EXAMPLE.age, Math.max(0, balance));
}
function balanceAt(year: number, save: number, balance = EXAMPLE.balance) {
  const growth = Math.pow(1.07, year);
  return balance * growth + save * 12 / .07 * (growth - 1);
}

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
        <div className="hero-copy"><span className="eyebrow">A LITTLE MONEY. A LOT MORE LIFE.</span><h1>Buy back<br/>your <em>time.</em></h1><p>Find out when work could become optional.<br className="desktop-break"/> Then see what brings that day closer.</p><button className="primary" onClick={onStart}>Find my freedom date <span aria-hidden="true">↗</span></button><div className="reassurance">Free <i/> No account needed <i/> About 60 seconds</div>{children}</div>
        <div className="motion-controls"><button type="button" onClick={()=>{setMotion(true);setReplay(v=>v+1);}}>Replay animation</button><button type="button" aria-pressed={!motion} onClick={()=>setMotion(v=>!v)}>{motion?"Reduce motion":"Enable motion"}</button></div><Curve savings={savings} balance={balance} replay={replay} motion={motion}/>
        <div className="balance-control"><label htmlFor="balance">Already invested <span>(USD)</span></label><input id="balance" type="number" min="0" max="5000000" step="1000" value={balance} onChange={e=>setBalance(Math.min(5000000,Math.max(0,Math.round(Number(e.target.value)||0))))}/><small>The example starts from $0. Add existing investments to see their effect.</small></div>
        <div className="saving-control"><div className="slider-heading"><label htmlFor="savings">What if you saved a little more?</label><output htmlFor="savings">${money(savings)} <small>/ month</small></output></div><input id="savings" type="range" min="0" max="3000" step="50" value={savings} onChange={e=>setSavings(Number(e.target.value))} aria-valuetext={`$${money(savings)} per month`} /><div className="slider-bottom"><span>$0</span><span>Drag to explore your example</span><span>$3,000</span></div><p className="difference" aria-live="polite">{difference===null?'No retirement date within this projection. Add savings or existing investments.':Math.abs(difference)<.05?'Small changes can move your freedom date.':`${Math.abs(difference).toFixed(1)} years ${difference>0?'earlier':'later'} than saving $800 a month.`}</p></div>
        <details className="assumptions"><summary>Example assumptions</summary><p>Age 30 · ${money(balance)} already invested · $36,000 annual retirement spending · 7% real annual growth · 25× spending target ($900,000). Contributions modeled annually. Everything is in today’s dollars. Estimates are illustrative, not guaranteed. Your own income and expenses are collected in the calculator.</p></details>
        <div className="hero-bottom"><span>YOUR MONEY HAS A FUTURE.</span><a href="#how">See how it unfolds ↓</a></div>
      </section>
<style>{HERO_CSS}</style></div></div>;
}
const HERO_CSS = ".uf-motion{container-type:inline-size;padding:120px 24px 36px;background:var(--uf-ground);color:var(--uf-ink);--green:#087d69;--teal:#0e9c86;--muted:#7b7062;--line:#e3d9cb}.uf-motion .hero{max-width:1200px;margin:auto}.uf-motion button{font:inherit;cursor:pointer}.uf-motion .primary{border:0;font-size:14px}.uf-motion .hero-copy p{max-width:480px}.uf-motion .motion-controls{grid-column:1/-1;grid-row:2;display:flex;gap:18px;justify-content:flex-end;padding-top:20px}.uf-motion .motion-controls button{font-size:11px;background:none;border:0;color:var(--muted);text-decoration:underline;text-underline-offset:4px}.uf-motion .balance-control{grid-row:3}.uf-motion .saving-control{grid-row:4}.uf-motion .assumptions{grid-row:5}.uf-motion .hero-bottom{grid-row:6}@container(max-width:700px){.uf-motion .motion-controls{order:2}.uf-motion .hero{display:flex;flex-direction:column;align-items:stretch}.uf-motion .curve-scene{order:1}.uf-motion .balance-control{order:3}.uf-motion .saving-control{order:4}.uf-motion .assumptions{order:5}.uf-motion .hero-bottom{order:6}.uf-motion .desktop-break{display:none}}\n.uf-motion *{box-sizing:border-box}.uf-motion button,.uf-motion a,.uf-motion input,.uf-motion summary{-webkit-tap-highlight-color:transparent}.uf-motion a{color:inherit;text-decoration:none}.uf-motion button,.uf-motion input{font:inherit}.uf-motion button,.uf-motion a,.uf-motion summary,.uf-motion input{outline-offset:5px}.uf-motion button:focus-visible,.uf-motion a:focus-visible,.uf-motion summary:focus-visible,.uf-motion input:focus-visible{outline:2px solid var(--green)}.uf-motion button,.uf-motion summary{cursor:pointer}.uf-motion .hero{position:relative;padding-top:48px}.uf-motion .hero-copy{position:relative;z-index:1;pointer-events:none;width:64%}.uf-motion .hero-copy a{pointer-events:auto}.uf-motion .eyebrow{font-size:10px;letter-spacing:1.8px;line-height:1.5;font-weight:600;color:var(--green)}.uf-motion h1,.uf-motion h2,.uf-motion .age-number,.uf-motion output{font-family:'Instrument Serif',Georgia,serif;font-weight:400}.uf-motion h1{font-size:clamp(70px,8.4vw,126px);letter-spacing:-4px;line-height:.97;margin:24px 0 25px}.uf-motion em{font-weight:400;color:var(--green)}.uf-motion .hero-copy p{font-size:17px;line-height:1.6;color:#625a50;margin:0 0 30px}.uf-motion .primary{display:inline-flex;gap:36px;align-items:center;justify-content:space-between;padding:19px 24px;min-height:58px;border-radius:4px;background:var(--green);color:#fff;font-size:14px;font-weight:500;transition:background .2s,transform .2s}.uf-motion .primary:hover{background:#045e50;transform:translateY(-2px)}.uf-motion .primary span{font-size:21px;font-weight:400}.uf-motion .reassurance{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:10px;margin-top:18px}.uf-motion .reassurance i{width:2px;height:2px;border-radius:50%;background:#a89b8b}.uf-motion .curve-scene{position:relative;margin-top:-220px;height:355px;pointer-events:none}.uf-motion .curve{display:block;width:100%;height:100%}.uf-motion .age-result{position:absolute;right:4%;top:-125px;text-align:left}.uf-motion .age-result .eyebrow{font-size:9px}.uf-motion .age-number{font-size:100px;line-height:1;margin-top:8px;letter-spacing:-3px;font-variant-numeric:lining-nums tabular-nums}.uf-motion .age-number span{font-family:Inter,Arial;font-size:11px;letter-spacing:0;display:block;margin-top:5px;color:var(--muted)}.uf-motion .age-result p{font-size:12px;margin-top:10px;color:var(--green)}.uf-motion .saving-control{max-width:500px;margin:30px auto 0}.uf-motion .slider-heading{display:flex;align-items:end;justify-content:space-between;gap:20px}.uf-motion .slider-heading label{font-size:12px;color:#625a50;max-width:180px;line-height:1.6}.uf-motion output{font-size:36px;white-space:nowrap;letter-spacing:-1px}.uf-motion output small{font-family:Inter,Arial;font-size:11px;letter-spacing:0;color:var(--muted)}.uf-motion input[type=range]{width:100%;height:32px;accent-color:var(--green);cursor:ew-resize;margin:12px 0 0}.uf-motion input[type=range]::-webkit-slider-thumb{min-width:20px;min-height:20px}.uf-motion .slider-bottom{display:flex;justify-content:space-between;font-size:9px;color:var(--muted)}.uf-motion .difference{text-align:center;font-size:11px;color:var(--green);min-height:16px;margin-top:18px}.uf-motion .assumptions{font-size:10px;color:var(--muted);max-width:600px;margin:20px auto 32px;text-align:center;line-height:1.8}.uf-motion .assumptions summary{text-decoration:underline;text-underline-offset:4px}.uf-motion .assumptions p{text-align:left}.uf-motion .hero-bottom{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:22px 0;font-size:9px;letter-spacing:1.5px;color:var(--muted)}.uf-motion .hero-bottom a{letter-spacing:0;font-size:11px}.uf-motion h2{font-size:clamp(40px,4.3vw,66px);line-height:1.04;letter-spacing:-1.8px;margin:22px 0}.uf-motion .motion-on .hero-copy{animation:enter .8s both}.uf-motion .motion-off *{animation:none!important;transition:none!important}@keyframes enter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}\n@container(max-width:700px){.uf-motion .hero{padding-top:30px}.uf-motion .hero-copy{width:100%}.uf-motion .eyebrow{font-size:9px;letter-spacing:1.1px}.uf-motion h1{font-size:72px;letter-spacing:-2.8px;margin:20px 0 22px}.uf-motion .hero-copy p{font-size:14px;line-height:1.7;margin-bottom:24px}.uf-motion .primary{width:100%;font-size:13px;min-height:54px;padding:15px 19px}.uf-motion .reassurance{justify-content:center;gap:8px;font-size:9px;margin-top:16px}.uf-motion .curve-scene{margin-top:125px;height:220px}.uf-motion .age-result{left:0;right:auto;top:-98px}.uf-motion .age-result .eyebrow{display:none}.uf-motion .age-number{font-size:59px;margin:0;letter-spacing:-2px}.uf-motion .age-number span{display:inline;margin-left:10px;font-size:10px;letter-spacing:0}.uf-motion .age-result p{font-size:11px;margin:5px 0}.uf-motion .saving-control{margin-top:20px}.uf-motion .slider-heading label{font-size:11px;max-width:145px}.uf-motion output{font-size:31px}.uf-motion output small{font-size:10px}.uf-motion .assumptions{margin-bottom:26px}.uf-motion .hero-bottom{font-size:8px;letter-spacing:.8px}.uf-motion .hero-bottom a{font-size:9px}.uf-motion h2{font-size:43px;letter-spacing:-1.3px}}\n@container(min-width:701px){.uf-motion .hero{padding-top:24px}}\n.uf-motion .hero-copy{width:100%;pointer-events:auto}.uf-motion .curve-scene{margin-top:36px;height:auto;display:flex;flex-direction:column;gap:20px}.uf-motion .age-result{position:static;align-self:flex-end;text-align:right;max-width:100%}.uf-motion .age-number{font-size:76px}.uf-motion .age-number.no-date{font-size:36px;letter-spacing:-1px}.uf-motion .age-result p{max-width:420px;line-height:1.6}.uf-motion .curve{height:290px;flex:none}.uf-motion .balance-control{max-width:500px;margin:28px auto 0;display:grid;grid-template-columns:1fr 160px;gap:10px;align-items:center;font-size:12px}.uf-motion .balance-control label span{color:var(--muted)}.uf-motion .balance-control input{width:100%;min-width:0;border:1px solid var(--line);border-radius:4px;padding:12px;background:transparent;color:inherit}.uf-motion .balance-control small{grid-column:1/-1;font-size:11px;line-height:1.6;color:var(--muted)}\n@container(max-width:700px){.uf-motion .curve-scene{margin-top:30px;gap:14px}.uf-motion .age-result{align-self:flex-start;text-align:left}.uf-motion .age-number{font-size:58px}.uf-motion .age-number.no-date{font-size:32px}.uf-motion .curve{height:210px}.uf-motion .balance-control{grid-template-columns:1fr 130px}.uf-motion .age-result p{font-size:12px}}\n@container(min-width:701px){.uf-motion .hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);column-gap:36px;align-items:center}.uf-motion .hero-copy{grid-column:1;grid-row:1}.uf-motion .curve-scene{grid-column:2;grid-row:1;margin-top:0;align-self:end}.uf-motion .age-result{align-self:flex-start;text-align:left}.uf-motion .curve{height:260px}.uf-motion .balance-control,.uf-motion .saving-control,.uf-motion .assumptions,.uf-motion .hero-bottom{grid-column:1/-1;width:100%}.uf-motion .reassurance{line-height:1.8}}\n\n.uf-motion input[type=range]{appearance:auto}.uf-motion input[type=number]{font-family:inherit}.uf-motion .primary:hover{color:#fff}.uf-motion .hero-copy{animation:none}@media(prefers-reduced-motion:reduce){.uf-motion .primary{transition:none}}";
