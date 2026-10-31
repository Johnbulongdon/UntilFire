"use client";
import { useId, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Wallet } from "lucide-react";
import Card from "@/components/ui/Card";
import type { PaydayLine } from "@/lib/payday-line";
import {
  nearestPaydayPoint,
  paydayBillKey,
  paydayChart,
  paydayPointIso,
} from "@/lib/payday-chart";
import styles from "./UntilPaydayCard.module.css";
const dayLabel = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export function UntilPaydayCard({
  line,
  paydayIso,
  billCount,
  billTotal,
  icon,
  fmt,
  onOpen,
}: {
  line: PaydayLine;
  paydayIso: string;
  billCount: number;
  billTotal: number;
  icon: (category: string | null, description?: string) => string;
  fmt: (n: number) => string;
  onOpen: () => void;
}) {
  const [key, setKey] = useState<string | null>(null);
  const id = useId();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const chart = paydayChart(line);
  const index =
    key == null
      ? 0
      : Math.max(0, line.bills.findIndex((b) => paydayBillKey(b) === key) + 1);
  const bill = line.bills[index - 1],
    point = chart.points[index];
  const select = (n: number) =>
    setKey(
      n > 0 && line.bills[n - 1] ? paydayBillKey(line.bills[n - 1]) : null,
    );
  const signed = (n: number) => (n < 0 ? "−" : "") + fmt(Math.abs(n));
  const readout = bill
    ? `${bill.description}, ${dayLabel(paydayPointIso(line, bill.day))}, ${signed(-bill.usd)}, ${signed(point.balance)} after this bill`
    : `Today, ${signed(chart.current)} available`;
  const inspect = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    select(
      nearestPaydayPoint(
        line,
        ((e.clientX - r.left) / r.width) * 100,
        ((e.clientY - r.top) / r.height) * 100,
      ),
    );
  };
  return (
    <Card className={styles.card} style={{ containerType: "inline-size" }}>
      <header className={styles.header}>
        <h2>Until payday</h2>
        <button type="button" onClick={onOpen} aria-label="Open Money">
          Money <ArrowUpRight size={15} aria-hidden />
        </button>
      </header>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.summary}>
            <div>
              <strong className={line.end < 0 ? styles.negative : undefined}>
                {signed(line.end)}
              </strong>
              <span>
                {line.end < 0
                  ? "short before payday"
                  : billCount
                    ? `after ${billCount} upcoming ${billCount === 1 ? "bill" : "bills"}`
                    : "no bills before payday"}
              </span>
            </div>
            <span className={styles.payday}>
              <CalendarDays size={14} aria-hidden /> Payday ·{" "}
              {dayLabel(paydayIso)}
            </span>
          </div>
          <div className={styles.forecast}>
            <div
              className={styles.readout}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={styles.emoji} aria-hidden>
                {bill ? (
                  icon(bill.category, bill.description)
                ) : (
                  <Wallet size={18} />
                )}
              </span>
              <div>
                <b>{bill?.description || "Today"}</b>
                <small>
                  {bill
                    ? `${dayLabel(paydayPointIso(line, bill.day))} · ${signed(-bill.usd)}`
                    : dayLabel(paydayPointIso(line, line.today))}
                </small>
              </div>
              <div className={styles.after}>
                <b className={point.balance < 0 ? styles.negative : undefined}>
                  {signed(point.balance)}
                </b>
                <small>{bill ? "after this bill" : "available now"}</small>
              </div>
            </div>
            <p id={id} className={styles.hint}>
              Move along the line to see each bill
            </p>
            <div
              className={styles.chart}
              role="slider"
              tabIndex={0}
              aria-label="Browse upcoming bills"
              aria-describedby={id}
              aria-valuemin={0}
              aria-valuemax={line.bills.length}
              aria-valuenow={index}
              aria-valuetext={readout}
              onKeyDown={(e) => {
                let next = index;
                if (e.key === "ArrowRight" || e.key === "ArrowUp") next++;
                else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next--;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = line.bills.length;
                else return;
                e.preventDefault();
                select(Math.max(0, Math.min(line.bills.length, next)));
              }}
              onPointerDown={(e) => {
                touch.current = { x: e.clientX, y: e.clientY };
                if (e.pointerType === "mouse") {
                  e.currentTarget.focus();
                  inspect(e);
                } else e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") {
                  inspect(e);
                  return;
                }
                if (
                  touch.current &&
                  Math.abs(e.clientX - touch.current.x) >
                    Math.abs(e.clientY - touch.current.y) &&
                  Math.abs(e.clientX - touch.current.x) > 5
                )
                  inspect(e);
              }}
              onPointerUp={(e) => {
                if (
                  touch.current &&
                  Math.hypot(
                    e.clientX - touch.current.x,
                    e.clientY - touch.current.y,
                  ) < 6
                )
                  inspect(e);
                touch.current = null;
              }}
              onPointerCancel={() => {
                touch.current = null;
              }}
            >
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#BCE9DA" stopOpacity=".6" />
                    <stop offset="1" stopColor="#ABD1ED" stopOpacity=".1" />
                  </linearGradient>
                </defs>
                {chart.ticks.map((v, i) => (
                  <line
                    key={i}
                    x1={3}
                    x2={97}
                    y1={chart.y(v)}
                    y2={chart.y(v)}
                    stroke="currentColor"
                    opacity=".1"
                    strokeDasharray="2 2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <path d={`${chart.path} V94 H3 Z`} fill={`url(#${id}-fill)`} />
                {line.end < 0 && (
                  <>
                    <rect
                      x={3}
                      y={chart.zero}
                      width={94}
                      height={Math.max(0, 94 - chart.zero)}
                      fill="var(--uf-neg-bg)"
                    />
                    <line
                      x1={3}
                      x2={97}
                      y1={chart.zero}
                      y2={chart.zero}
                      stroke="var(--uf-neg-ink)"
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
                <path
                  d={chart.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={chart.x(point.day)}
                  x2={chart.x(point.day)}
                  y1={4}
                  y2={94}
                  stroke="currentColor"
                  opacity=".4"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {chart.ticks.map((v, i) => (
                <span
                  key={i}
                  className={styles.tick}
                  style={{ top: `${chart.y(v)}%` }}
                >
                  {signed(v)}
                </span>
              ))}
              {chart.points.map((p, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={i === index ? styles.selectedDot : styles.dot}
                  style={{
                    left: `${chart.x(p.day)}%`,
                    top: `${chart.y(p.balance)}%`,
                  }}
                />
              ))}
              <span
                className={styles.paydayDot}
                aria-hidden
                style={{ left: "97%", top: `${chart.y(line.end)}%` }}
              >
                $
              </span>
            </div>
            <div className={styles.axis}>
              <span>Today · {dayLabel(paydayPointIso(line, line.today))}</span>
              <span>Payday · {dayLabel(paydayIso)}</span>
            </div>
            <div className={styles.controls}>
              <button
                type="button"
                disabled={!index}
                onClick={() => select(index - 1)}
                aria-label="Previous bill"
              >
                ←
              </button>
              <span>
                {index ? `${index} of ${line.bills.length}` : "Today"}
              </span>
              <button
                type="button"
                disabled={index === line.bills.length}
                onClick={() => select(index + 1)}
                aria-label="Next bill"
              >
                →
              </button>
            </div>
          </div>
        </div>
        <section className={styles.bills} aria-label="Upcoming bills">
          <h3>
            Upcoming bills <span>{line.bills.length}</span>
          </h3>
          {line.bills.map((b, i) => (
            <button
              type="button"
              key={paydayBillKey(b)}
              aria-pressed={index === i + 1}
              className={index === i + 1 ? styles.chosen : undefined}
              onClick={() => select(i + 1)}
            >
              <span aria-hidden>{icon(b.category, b.description)}</span>
              <div>
                <b>{b.description}</b>
                <small>{dayLabel(paydayPointIso(line, b.day))}</small>
              </div>
              <strong>{signed(-b.usd)}</strong>
            </button>
          ))}
          {!line.bills.length && <p>No bills before payday</p>}
          <footer>
            {fmt(billTotal)} in {billCount} {billCount === 1 ? "bill" : "bills"}{" "}
            before payday
          </footer>
        </section>
      </div>
    </Card>
  );
}
