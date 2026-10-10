import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MotionConfig, motion, useReducedMotion} from 'motion/react';
import './style.css';

function Review(){
 const systemReduce=useReducedMotion();
 const [reduce,setReduce]=useState(false),[enabled,setEnabled]=useState(true),[step,setStep]=useState(0),[open,setOpen]=useState(false),[income,setIncome]=useState('6000'),[saving,setSaving]=useState('1200');
 const heading=useRef(null),moved=useRef(false);
 const quiet=!enabled||reduce||systemReduce;
 const transition={duration:quiet?0:.24,ease:[.22,1,.36,1]};
 useEffect(()=>{if(moved.current)heading.current?.focus();},[step]);
 function navigate(next){moved.current=true;setStep(next)}
 const Button=motion.button;
 return <MotionConfig reducedMotion={quiet?'always':'never'} transition={transition}><main>
 <header><div className="brand"><img src="/logo.svg" alt=""/>UntilFire</div><span>Interaction study · not the live product</span></header>
 <h1>Small movements.<br/><em>A clearer next step.</em></h1><p className="intro">Try three proposed improvements. Turn motion off to compare the same interactions.</p>
 <div className="toolbar"><button aria-pressed={enabled} onClick={()=>setEnabled(!enabled)}>{enabled?'Motion on':'Motion off'}</button><label><input type="checkbox" checked={reduce} onChange={e=>setReduce(e.target.checked)}/> Reduce motion</label>{systemReduce&&<span>System reduced motion is active.</span>}</div>
 <div className="grid"><section className="panel"><p className="eyebrow">01 · Button feedback</p><h2>Feel the tap.</h2><p>A small press confirms your action. The button stays in place.</p><Button className="primary" whileHover={quiet?{}:{backgroundColor:'#183B28'}} whileTap={quiet?{}:{scale:.98}} transition={{duration:quiet?0:.18}} onClick={()=>{navigate(0);document.getElementById('journey').scrollIntoView({behavior:'instant',block:'start'});heading.current?.focus()}}>Find my freedom date <span aria-hidden="true">↗</span></Button><p className="hint">Opens the sample journey below. No account or plan is created.</p></section>
 <section className="panel"><p className="eyebrow">02 · Assumptions disclosure</p><h2>Details when you need them.</h2><p>Keep the main answer clear, with the reasoning one tap away.</p><Button className="disclosure" aria-expanded={open} aria-controls="assumptions" onClick={()=>setOpen(!open)}>Example assumptions <motion.span aria-hidden="true" animate={{rotate:open?180:0}}>⌄</motion.span></Button><motion.div id="assumptions" aria-hidden={!open} inert={!open} initial={false} animate={{height:open?'auto':0,opacity:open?1:0}} style={{overflow:'hidden'}}><div className="details">In the live example: age 30, $36,000 annual retirement spending, a 25× spending target, and 6.9% real annual growth. These are illustrative assumptions, not a guarantee. This study does not calculate a result.</div></motion.div></section></div>
 <section id="journey" className="panel journey"><p className="eyebrow">03 · Onboarding continuity</p><div className="steps" aria-label={`Step ${step+1} of 2`}><span className={step===0?'current':''}>1 · Income</span><span className={step===1?'current':''}>2 · Savings</span></div>
 <h2 ref={heading} tabIndex="-1">{step===0?'What comes in each month?':'What can you set aside?'}</h2>
 <p>Your inputs stay with you when you go back. This is a two-step study, not the full onboarding.</p>
 <div className="stepstage"><motion.div className="stepcontent" key={step} initial={{opacity:quiet?1:0,y:quiet?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:quiet?0:-8}} transition={transition}><label htmlFor={step===0?'income':'saving'}>{step===0?'Monthly take-home income (USD)':'Monthly savings (USD)'}</label><input id={step===0?'income':'saving'} type="number" min="0" inputMode="decimal" value={step===0?income:saving} onChange={e=>step===0?setIncome(e.target.value):setSaving(e.target.value)}/><p className="hint">Example only. Nothing is sent or saved.</p></motion.div></div>
 <nav className="actions" aria-label="Sample step navigation"><button disabled={step===0} onClick={()=>navigate(0)}>Back</button><Button className="primary" whileTap={quiet?{}:{scale:.98}} disabled={step===1} onClick={()=>navigate(1)}>Continue <span aria-hidden="true">→</span></Button></nav><p role="status" className="hint">{step===1?'Sample complete. Go back to compare the transition.':'Step 1 of 2'}</p></section>
 <footer>Motion follows the action. It never changes financial calculations or blocks navigation. Mint styling is a preview direction; production remains unchanged.</footer>
 </main></MotionConfig>
}
createRoot(document.getElementById('root')).render(<Review/>);
