"use client";
import { EXPENSE_CATEGORIES } from '@/lib/categories';
import type { DayLine } from './CalendarDayPanel';
import styles from './MarkedMonth.module.css';
export type MarkedEvent = DayLine & { status?: 'Expected' | 'Overdue' | 'Paid' | 'Scheduled' };
export const markedSigned = (event: MarkedEvent, fmt: (n:number)=>string) => {
 const value = event.income ? event.amount : -event.amount;
 return (value < 0 ? '−' : value > 0 ? '+' : '') + fmt(Math.abs(value));
};
export default function MarkedMonth({ month, today, events, selected, onSelect, fmt, compact = fmt, colorFor, marker, showDetails = true }: {
 month: string; today: string; events: ReadonlyMap<string, MarkedEvent[]>; selected: string | null;
 onSelect: (iso:string)=>void; fmt:(n:number)=>string; compact?:(n:number)=>string; colorFor?:(category:string|null|undefined)=>string|undefined;
 marker?: {iso:string;label:string}; showDetails?:boolean;
}) {
 const [year,number]=month.split('-').map(Number);
 const days=new Date(year,number,0).getDate(), lead=new Date(year,number-1,1).getDay();
 const title=new Date(year,number-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const active=selected?.startsWith(month+'-') ? selected : null;
 const dateLabel=(iso:string)=>new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
 const eventColor=(e:MarkedEvent)=>e.income?'#FFE58A':colorFor?.(e.category)??EXPENSE_CATEGORIES.find(c=>c.key===e.category)?.color??'#EEE9FA';
 return <section className={styles.month} aria-label={title}>
  <div className={styles.week} aria-hidden>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div>
  <div className={styles.grid}>
   {Array.from({length:lead},(_,i)=><span aria-hidden className={styles.blank} key={'blank'+i}/>)}
   {Array.from({length:days},(_,i)=>{
    const iso=month+'-'+String(i+1).padStart(2,'0'), lines=events.get(iso)??[], isToday=iso===today, isSelected=iso===active;
    const markerLabel=marker?.iso===iso?marker.label:null;
    const label=[dateLabel(iso),isToday?'Today':null,...lines.map(e=>[e.label,markedSigned(e,fmt),e.status].filter(Boolean).join(' · ')),markerLabel].filter(Boolean).join(', ');
    return <button type="button" key={iso} className={styles.day} aria-label={label} aria-pressed={isSelected} aria-current={isToday?'date':undefined} onClick={()=>onSelect(iso)}>
     <span className={styles.date}>{i+1}{isToday&&<span className={styles.today}>Today</span>}</span>
     {lines.map((e,j)=><span aria-hidden className={styles.event} key={j} style={{background:eventColor(e)}}>
      <span className={styles.eventName}>{e.label}</span><strong className={styles.fullAmount}>{markedSigned(e,fmt)}</strong><strong className={styles.shortAmount}>{e.income?'+':''}{compact(Math.abs(e.amount))}</strong>
     </span>)}
     {markerLabel&&<span className={styles.marker}>{markerLabel}</span>}
    </button>;
   })}
   {Array.from({length:(7-(lead+days)%7)%7},(_,i)=><span aria-hidden className={styles.blank} key={"tail"+i}/>)}
  </div>
  {showDetails&&<div className={styles.details} aria-live="polite" aria-atomic="true">
   {active?<><strong>{dateLabel(active)}</strong>{(events.get(active)??[]).map((e,i)=><div className={styles.detailRow} key={i}><span>{e.label}<small>{e.status}</small></span><strong>{markedSigned(e,fmt)}</strong></div>)}{!(events.get(active)?.length)&&<span className={styles.empty}>No bills or payday scheduled.</span>}</>:<span className={styles.empty}>Select a day to see its scheduled payments.</span>}
  </div>}
 </section>;
}
