"use client";
import { AlertCircle, Coins, CreditCard, ShieldCheck, Sprout, Target } from 'lucide-react';
import { Button, Money } from '@/components/ui';
import type { LadderView } from '@/lib/contribution-ladder';
import { contributionDestinations, contributionWarnings } from '@/lib/contribution-presentation';
import s from './Contributions.module.css';

export default function ContributionSummary({ view, today, onEdit, onReviewCashflow, onChooseAccounts }: {
  view: LadderView; today?: Date; onEdit: () => void;
  onReviewCashflow?: () => void; onChooseAccounts?: () => void;
}) {
  const warnings = contributionWarnings(view, today);
  const rows = contributionDestinations(view.waterfall.fills);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const primary = warnings[0];
  const setupGoal = view.next?.kind === 'emergency-floor' || view.next?.kind === 'emergency-target' ? 'save'
    : view.next?.kind === 'taxable' || view.next?.kind === 'tax-advantaged' ? 'invest' : null;
  const date = view.available.nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <section aria-label="Next contribution" className={s.root}>
    {primary && <div className={s.warning} role="status">
      <AlertCircle size={22} aria-hidden="true" />
      <div><strong>{primary.action === 'accounts' ? 'Update your balances first' : 'Review your cash flow first'}</strong>
        <p>{warnings.map((w) => w.text).join(' ')}</p></div>
      <Button variant="primary" onClick={primary.action === 'accounts' ? onChooseAccounts : onReviewCashflow}>
        {primary.action === 'accounts' ? 'Review balances' : 'Review cash flow'}
      </Button>
    </div>}
    <div className={s.overview}>
      <div className={s.amount}>
        <span className={s.muted}>{view.available.done ? 'Made this cycle' : 'Planned amount'}</span>
        <div className={s.value}><Money className="ph-mask" style={{ fontWeight: 800, letterSpacing: "inherit" }} amount={view.available.done?.amount ?? view.budget} /></div>
        <p className={s.muted}>{warnings.length ? 'Estimate · review needed' : view.budgetIsCustom ? 'Your amount' : 'Estimate after bills and everyday spending'}</p>
        <div className={s.date}>Next contribution · {date}</div>
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit amount</Button>
      </div>
      <div className={s.destinations}>
        <h2 className="uf-t-h3">Where it goes</h2>
        {rows.length === 0 && <p className={s.muted}>{view.available.done ? 'This cycle is already marked as made.' : 'Nothing allocated this cycle. Review your cash flow or contribution amount.'}</p>}
        {rows.map((r) => {
          const Icon = r.kind === 'emergency' ? ShieldCheck : r.kind === 'taxable' ? Sprout : r.kind.includes('debt') ? CreditCard : r.kind === 'goals' ? Target : Coins;
          return <div className={s.destination} key={r.kind}>
            <span className={s.icon} data-kind={r.kind}><Icon size={23} aria-hidden="true" /></span>
            <span>{r.label}</span><strong><Money className="ph-mask" style={{ fontWeight: 700 }} amount={r.amount} /></strong>
          </div>;
        })}
        {view.investable <= 0 && rows.length > 0 && <p className={s.muted}>Investments · $0 this cycle</p>}
        {total > 0 && <div className={s.split} role="img" aria-label={rows.map((r) => `${r.label}: ${Math.round(r.amount / total * 100)}%`).join(', ')}>
          {rows.map((r) => <span key={r.kind} data-kind={r.kind} style={{ flexGrow: r.amount }} />)}
        </div>}
        {!primary && view.budget > 0 && setupGoal && <a className={s.accountAction} href={'/dashboard?tab=account-setup&goal=' + setupGoal}>Choose a destination account →</a>}
        {!primary && view.budget > 0 && !setupGoal && <Button variant="primary" onClick={onEdit}>Review contribution settings</Button>}
      </div>
    </div>
  </section>;
}
