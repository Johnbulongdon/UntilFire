import { expandForMonth, type ExpectedItem } from './cashflow-forecast.ts';
export type ScheduledCalendarItem = ExpectedItem & { completed?: boolean };
export type CalendarEntry = { iso:string; label:string; amount:number; income:boolean; category?:string|null; repeats:boolean; status:'Expected'|'Overdue'|'Paid'|'Scheduled' };
/** Display scheduled occurrences on their original dates. Never use the cash forecast's carry-forward dates or bank transactions here. */
export function markedCalendarEntries({start,end,today,items}:{start:string;end:string;today:string;items:ScheduledCalendarItem[]}):CalendarEntry[]{
 const out:CalendarEntry[]=[];
 const [year,month]=start.split('-').map(Number);
 for(let cursor=new Date(year,month-1,1);cursor.getFullYear()+'-'+String(cursor.getMonth()+1).padStart(2,'0')<=end.slice(0,7);cursor.setMonth(cursor.getMonth()+1)){
  for(const item of items)for(const line of expandForMonth([item],cursor.getFullYear(),cursor.getMonth())){
   if(line.iso<start||line.iso>end)continue;
   out.push({iso:line.iso,label:line.description,amount:Math.abs(line.amount),income:line.type==='income',category:item.category,repeats:line.recurring,
    status:line.paid?'Paid':line.iso<today?(line.iso===item.dueDate.slice(0,10)?'Overdue':'Scheduled'):'Expected'});
  }
 }
 return out.sort((a,b)=>a.iso.localeCompare(b.iso));
}
