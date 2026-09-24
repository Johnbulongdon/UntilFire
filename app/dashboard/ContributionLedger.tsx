"use client";

/**
 * Every line behind the contribution figure.
 *
 * A bare "$34" cannot be checked, so it cannot be trusted — and a number that
 * says where money should go has to be trusted before anyone moves money on
 * its say-so. This renders the forecast from lib/cashflow-forecast.ts as a
 * ledger: the opening balance and the accounts it came from, each expected
 * payment in and out on its date, the running balance, and the low point the
 * figure is taken from.
 *
 * Two things are said out loud rather than left to be noticed. Payments shown
 * but not counted — income that was due and never marked received — are
 * listed with the reason. And spending the budget knows about but that isn't
 * on the Expected list is compared, because anything missing from that list
 * is missing from this forecast, and the figure reads high as a result.
 */

import type { AvailableToContribute } from "@/lib/contribution-ladder";

export interface ContributionLedgerProps {
  available: AvailableToContribute;
  /** The budget's monthly spending, for the comparison line. */
  budgetMonthlySpending?: number;
  /** The same, from the Expected list: repeating bills as a monthly figure. */
  expectedMonthlyBills: number;
}

// A true minus sign, not a hyphen, so a negative balance and a negative
// payment read the same way on one ledger.
const fmt = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function ContributionLedger({
  available, budgetMonthlySpending = 0, expectedMonthlyBills,
}: ContributionLedgerProps) {
  const f = available.forecast;
  const todayIso = f.days[0]?.iso;
  const unlisted = Math.max(0, budgetMonthlySpending - expectedMonthlyBills);

  return (
    <div className="uf-ledger" data-testid="uf-ledger">
      <div className="uf-ledger-head">
        <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>How this is worked out</span>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
          From today to {day(f.nextCycleIso)}, your next contribution after this one
        </span>
      </div>

      <div className="uf-ledger-row uf-ledger-opening">
        <span className="uf-ledger-date">Today</span>
        <span className="uf-ledger-what">
          Cash outside your emergency fund
          {available.cashAccounts.length > 0 && (
            <span className="uf-ledger-sub">
              {available.cashAccounts
                .filter((a) => a.balance !== 0)
                .map((a) => `${a.label} ${fmt(a.balance)}`)
                .join(" · ") || "Every account is at zero"}
            </span>
          )}
        </span>
        <span className="uf-ledger-amt" />
        <span className="uf-ledger-bal" style={mono}>{fmt(f.opening)}</span>
      </div>

      {f.days.map((d) => {
        const isContribution = d.iso === f.contributionIso;
        const isLowest = d.iso === f.lowest.iso && d.iso >= f.contributionIso;
        const counted = d.events.filter((e) => e.counted);
        if (d.iso === todayIso && counted.length === 0 && !isContribution) return null;
        return (
          <div key={d.iso}>
            {counted.map((e, i) => (
              <div key={`${d.iso}-${i}`} className="uf-ledger-row">
                <span className="uf-ledger-date">{i === 0 ? (d.iso === todayIso ? "Today" : day(d.iso)) : ""}</span>
                <span className="uf-ledger-what">
                  {e.description}
                  {e.estimate ? (
                    <span className="uf-ledger-tag">
                      estimate · {e.estimate.days} {e.estimate.days === 1 ? "day" : "days"} × {fmt(e.estimate.perDay)}
                    </span>
                  ) : (e.recurring || e.overdue) && (
                    <span className="uf-ledger-tag">
                      {e.overdue ? "overdue — not marked paid" : "repeats"}
                    </span>
                  )}
                </span>
                <span className="uf-ledger-amt" style={{ ...mono, color: e.amount > 0 ? "var(--uf-pos-ink)" : "var(--uf-ink)" }}>
                  {signed(e.amount)}
                </span>
                <span className="uf-ledger-bal" style={{ ...mono, color: d.balance < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink-2)" }}>
                  {i === counted.length - 1 ? fmt(d.balance) : ""}
                </span>
              </div>
            ))}
            {(isContribution || isLowest) && (
              <div className={`uf-ledger-row uf-ledger-mark${isLowest ? " is-lowest" : ""}`}>
                <span className="uf-ledger-date">{counted.length === 0 ? day(d.iso) : ""}</span>
                <span className="uf-ledger-what">
                  {isContribution && isLowest ? "Contribution day — and the lowest point"
                    : isContribution ? "Contribution day"
                    : "Lowest point before your next contribution"}
                </span>
                <span className="uf-ledger-amt" />
                <span className="uf-ledger-bal" style={{ ...mono, fontWeight: 700 }}>{fmt(d.balance)}</span>
              </div>
            )}
          </div>
        );
      })}

      <p className="uf-t-small uf-ledger-result">
        {f.lowest.balance <= 0 ? (
          <>Nothing is safe to contribute: your balance reaches <span style={mono}>{fmt(f.lowest.balance)}</span> on {day(f.lowest.iso)}.</>
        ) : (
          <><strong style={mono}>{fmt(f.safeToContribute)}</strong> is safe to contribute on {day(f.contributionIso)} —
            the lowest your balance gets before {day(f.nextCycleIso)}, so nothing later in the month bounces.</>
        )}
      </p>

      {f.shortBefore && (
        <p className="uf-t-small uf-ledger-warn">
          You&apos;re projected to run short before contribution day: <span style={mono}>{fmt(f.shortBefore.balance)}</span> on {day(f.shortBefore.iso)}.
        </p>
      )}

      {f.uncounted.length > 0 && (
        <div className="uf-ledger-note">
          <span className="uf-t-small" style={{ fontWeight: 700 }}>Not counted</span>
          {f.uncounted.map((e, i) => (
            <p key={i} className="uf-t-small" style={{ margin: "var(--uf-s1) 0 0", color: "var(--uf-ink-2)" }}>
              <strong>{e.description} <span style={mono}>{signed(e.amount)}</span></strong> was due and hasn&apos;t
              been marked received. If it arrived it&apos;s already in your balance — or already spent — so it
              isn&apos;t added again. {e.recurring ? "" : "It's a one-off, so it won't appear next month either; if it repeats, set it to repeat in Money → Expected."}
            </p>
          ))}
        </div>
      )}

      {!available.hasExpectedData ? (
        <p className="uf-t-small uf-ledger-warn">
          No expected payments are recorded, so nothing is subtracted and this is only today&apos;s balance.
          Add your bills and income in <strong>Money → Expected</strong> to make it real.
        </p>
      ) : f.dailyAllowance > 0 ? (
        <p className="uf-t-small uf-ledger-note">
          <strong>Day-to-day spending</strong> is an estimate, not a dated payment: your budget&apos;s{" "}
          <span style={mono}>{fmt(budgetMonthlySpending)}</span> a month less the{" "}
          <span style={mono}>{fmt(expectedMonthlyBills)}</span> of repeating bills already listed leaves{" "}
          <span style={mono}>{fmt(unlisted)}</span>, about <span style={mono}>{fmt(f.dailyAllowance)}</span> a day.
          Add a regular payment to Money → Expected and it moves out of the estimate and onto its date.
        </p>
      ) : budgetMonthlySpending === 0 ? (
        <p className="uf-t-small uf-ledger-note">
          No budget is set, so day-to-day spending isn&apos;t estimated here. Groceries and the like come out of
          this balance too — set a budget and the forecast will allow for them.
        </p>
      ) : null}

      <style>{`
        .uf-ledger { margin-top: var(--uf-s4); border-top: 1px solid var(--uf-border); padding-top: var(--uf-s3); }
        .uf-ledger-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--uf-s3); flex-wrap: wrap; margin-bottom: var(--uf-s2); }
        .uf-ledger-row {
          display: grid; grid-template-columns: 96px minmax(0, 1fr) 104px 104px;
          gap: var(--uf-s3); align-items: baseline;
          padding: var(--uf-s2) 0; border-bottom: 1px solid var(--uf-border);
          font-size: 14px;
        }
        .uf-ledger-date { color: var(--uf-ink-2); font-size: 13px; white-space: nowrap; }
        .uf-ledger-what { min-width: 0; color: var(--uf-ink); }
        .uf-ledger-sub { display: block; font-size: 13px; color: var(--uf-ink-2); margin-top: 2px; }
        .uf-ledger-tag { margin-left: var(--uf-s2); font-size: 11px; color: var(--uf-ink-2); }
        .uf-ledger-amt, .uf-ledger-bal { text-align: right; white-space: nowrap; }
        .uf-ledger-mark { background: var(--uf-surface); }
        .uf-ledger-mark.is-lowest { box-shadow: inset 3px 0 0 var(--uf-green); }
        .uf-ledger-result { margin: var(--uf-s3) 0 0; color: var(--uf-ink); }
        .uf-ledger-warn { margin: var(--uf-s2) 0 0; padding: var(--uf-s2) var(--uf-s3); background: var(--uf-warn-bg); color: var(--uf-warn-ink); border-radius: var(--uf-r-control); }
        .uf-ledger-note { margin: var(--uf-s3) 0 0; padding: var(--uf-s2) var(--uf-s3); background: var(--uf-surface); border-radius: var(--uf-r-control); color: var(--uf-ink-2); }
        /* Below 560px four columns cannot hold a date, a description and two
           figures, so the date sits above and the figures share one line. */
        @media (max-width: 560px) {
          .uf-ledger-row { grid-template-columns: minmax(0, 1fr) auto auto; row-gap: 2px; }
          .uf-ledger-date { grid-column: 1 / -1; }
          .uf-ledger-date:empty { display: none; }
          /* With the date column gone, the low point's marker bar would sit
             on the first letter of the row. */
          .uf-ledger-mark { padding-left: var(--uf-s3); padding-right: var(--uf-s2); }
        }
      `}</style>
    </div>
  );
}
