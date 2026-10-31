"use client";
import { useId, useState } from 'react';
import { ArrowUpRight, CalendarDays, ChevronDown, Pencil, PlusCircle, ShoppingCart, Wallet, Receipt } from 'lucide-react';
import Card from '@/components/ui/Card';
import type { PaydayLine } from '@/lib/payday-line';
import { paydayPointIso } from '@/lib/payday-chart';
import { paydayRemainder } from '@/lib/payday-spending';
import styles from './UntilPaydayCard.module.css';
const date = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export function UntilPaydayCard({ line, paydayIso, icon, fmt, onOpen, everyday = null, estimateSource = 'budget', displayRate = 1, onAdjustmentChange }: {
  line: PaydayLine; paydayIso: string; billCount: number; billTotal: number;
  icon: (category: string | null, description?: string) => string;
  fmt: (n: number) => string; onOpen: () => void;
  onAdjustmentChange?: (n: {everyday: number | null; cushion: number}) => void; everyday?: number | null; estimateSource?: 'history' | 'budget'; displayRate?: number;
}) {
  const [override, setOverride] = useState<number | null>(null);
  const [cushion, setCushion] = useState(0);
  const [everydayDraft, setEverydayDraft] = useState<string | null>(null);
  const [cushionDraft, setCushionDraft] = useState<string | null>(null);
  const id = useId();
  const rate = Number.isFinite(displayRate) && displayRate > 0 ? displayRate : 1;
  const estimated = override ?? everyday;
  const remaining = paydayRemainder(line.end, estimated, cushion);
  const cash = line.past[line.today] ?? line.end;
  const bills = cash - line.end;
  const signed = (n: number) => (n < 0 ? '−' : '') + fmt(Math.abs(n));
  const input = (value: string, set: (n: number) => void) => {
    const n = Number(value);
    if (value.trim() && Number.isFinite(n) && n >= 0) { const usd = n / rate; set(usd); onAdjustmentChange?.({everyday: set === setOverride ? usd : override, cushion: set === setCushion ? usd : cushion}); }
  };
  return <Card className={styles.card} style={{ containerType: 'inline-size' }}>
    <div className={styles.hero}>
      <header className={styles.header}><h2>Until payday</h2><span className={styles.payday}><CalendarDays size={16} aria-hidden />{date(paydayIso)}</span></header>
      <div className={styles.summary}>
        <div className={styles.answer} aria-live="polite" aria-atomic="true">
          <strong className={remaining !== null && remaining < 0 ? styles.negative : undefined}>{remaining === null ? '—' : signed(remaining)}</strong>
          <span>{remaining === null ? 'Add an everyday estimate' : remaining < 0 ? 'Estimated short before payday' : 'Estimated left to spend'}</span>
          <small>After bills and everyday costs</small>
        </div>
        <div className={styles.breakdown}>
          <div className={styles.row}><span className={styles.badge}><Wallet size={20} aria-hidden /></span><span>Available cash</span><b>{signed(cash)}</b></div>
          <div className={styles.row}><span className={`${styles.badge} ${styles.lilac}`}><Receipt size={20} aria-hidden /></span><span>Bills &amp; card payments</span><b>{signed(-bills)}</b></div>
          <div className={styles.row}><span className={`${styles.badge} ${styles.yellow}`}><ShoppingCart size={20} aria-hidden /></span><span>Everyday spending<small>{override !== null ? 'Your estimate' : estimateSource === 'history' ? 'Estimated from past spending' : 'Estimated from your budget'}</small></span><b>{estimated === null ? 'Not set' : signed(-estimated)}</b></div>
          <details className={styles.adjust}><summary><Pencil size={14} aria-hidden />{estimated === null ? 'Set everyday spending' : 'Adjust estimate'}<ChevronDown size={14} aria-hidden /></summary><label htmlFor={`${id}-everyday`}>Expected spending through {date(paydayIso)}</label><input id={`${id}-everyday`} type="number" min="0" step="1" inputMode="decimal" value={everydayDraft ?? (estimated === null ? '' : Math.round(estimated * rate))} onChange={e => { setEverydayDraft(e.target.value); input(e.target.value, setOverride); }} /><button type="button" onClick={() => { setOverride(null); setEverydayDraft(null); onAdjustmentChange?.({everyday: null, cushion}); }}>Use automatic estimate</button></details>
          <details className={styles.adjust}><summary><PlusCircle size={16} aria-hidden />{cushion > 0 ? `Cushion · ${fmt(cushion)}` : 'Add a cushion'}<ChevronDown size={14} aria-hidden /></summary><label htmlFor={`${id}-cushion`}>Extra cash to leave untouched</label><input id={`${id}-cushion`} type="number" min="0" step="1" inputMode="decimal" value={cushionDraft ?? Math.round(cushion * rate)} onChange={e => { setCushionDraft(e.target.value); input(e.target.value, setCushion); }} /><small>Optional · applies to this visit</small></details>
        </div>
      </div>
    </div>
    <section className={styles.ledger} aria-label="Upcoming bills">
      <div className={styles.ledgerHeader}><h3>Upcoming bills <small>{line.bills.length} {line.bills.length === 1 ? 'payment' : 'payments'}</small></h3><button type="button" onClick={onOpen}>Money<ArrowUpRight size={16} aria-hidden /></button></div>
      {line.bills.length ? <table><thead><tr><th scope="col">Date</th><th scope="col">Bill</th><th scope="col">Amount</th></tr></thead><tbody>{line.bills.slice(0, 3).map((b, i) => <tr key={`${b.day}-${i}`}><td>{date(paydayPointIso(line, b.day))}</td><td><span className={styles.billIcon} aria-hidden>{icon(b.category, b.description)}</span><span>{b.description}</span></td><td>{fmt(b.usd)}</td></tr>)}</tbody></table> : <p className={styles.note}>No bills before payday</p>}
      {line.bills.length > 3 && <button className={styles.all} type="button" onClick={onOpen}>View all {line.bills.length} payments<ArrowUpRight size={14} aria-hidden /></button>}
      <p className={styles.note}>Everyday costs are estimates. No savings target is deducted.{override !== null ? ' Your adjustment applies to this visit.' : ''}</p>
    </section>
  </Card>;
}
