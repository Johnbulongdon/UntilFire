"use client";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Wifi,
} from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import Logo from "@/app/components/Logo";
import DirectoryBadges from "./DirectoryBadges";
import LandingStories from "./LandingStories";
import { quickFreedom, freedomPath } from "@/lib/quick-freedom";
import {
  PRO_ANNUAL_LABEL,
  PRO_MONTHLY_LABEL,
  REFERRED_TRIAL_LABEL,
  TRIAL_LABEL,
} from "@/lib/pricing";
import "./next-horizon.css";
import s from "./ConnectedLanding.module.css";
const SAMPLE = { monthlyIncome: 4500, monthlySpending: 3000, invested: 135000 };
// A dated public example, independent of any visitor's account or local clock.
const EXAMPLE_DATE = new Date("2026-10-30T12:00:00Z");
const YEAR_MS = 365.25 * 864e5;
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const CATEGORIES = [
  { name: "Housing", amount: 1200, color: "#FFE58A" },
  { name: "Food", amount: 600, color: "#D9CEF3" },
  { name: "Transport", amount: 450, color: "#F4CEE3" },
  { name: "Lifestyle", amount: 450, color: "#B9D9F7" },
  { name: "Everything else", amount: 300, color: "#BCE9DA" },
];
const BILLS = [
  { name: "Rent", day: 1, amount: 1200, icon: House, tone: "lilac" },
  { name: "Internet", day: 5, amount: 70, icon: Wifi, tone: "blue" },
  { name: "Phone", day: 12, amount: 90, icon: Smartphone, tone: "pink" },
];
function StartButton({ onStart }: { onStart: () => void }) {
  return (
    <button type="button" className={s.primary} onClick={onStart}>
      Find my freedom date <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}
function Reassurance({ expanded = false }: { expanded?: boolean }) {
  if (expanded)
    return (
      <ul className={s.trustRow} aria-label="Before you start">
        <li>
          <ShieldCheck size={14} aria-hidden="true" />
          Free to try
        </li>
        <li>
          <LockKeyhole size={14} aria-hidden="true" />
          No account needed
        </li>
        <li>
          <Landmark size={14} aria-hidden="true" />
          Bank connection optional
        </li>
      </ul>
    );
  return (
    <p className={s.reassurance}>
      <ShieldCheck size={15} aria-hidden="true" /> Free estimate. No account
      needed.
    </p>
  );
}
function ProjectionChart({ extra = 0 }: { extra?: number }) {
  const input = useMemo(
    () => ({ ...SAMPLE, monthlyIncome: SAMPLE.monthlyIncome + extra }),
    [extra],
  );
  const data = useMemo(() => {
    const result = quickFreedom(input, EXAMPLE_DATE);
    const points = freedomPath(input);
    const rows = points.slice(0, -1).map((value, i) => ({
      date: EXAMPLE_DATE.getTime() + i * YEAR_MS,
      value,
    }));
    rows.push({
      date:
        EXAMPLE_DATE.getTime() + (result.years ?? points.length - 1) * YEAR_MS,
      value: result.target,
    });
    return rows;
  }, [input]);
  return (
    <div
      className={s.chart}
      role="img"
      aria-label={`Example savings projection from ${money(SAMPLE.invested)} to ${money(quickFreedom(input, EXAMPLE_DATE).target)}`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 400, height: 218 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 16, right: 9, left: 9, bottom: 0 }}
          accessibilityLayer
        >
          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(n) => String(new Date(n).getUTCFullYear())}
            tick={{ fill: "#565135", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            labelFormatter={(n) =>
              `Year ${new Date(Number(n)).getUTCFullYear()}`
            }
            formatter={(value) => [money(Number(value)), "Projected savings"]}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#151719",
              fontSize: 12,
            }}
          />
          <Area
            dataKey="value"
            type="monotone"
            stroke="#151719"
            strokeWidth={2.5}
            fill="#FFFFFF"
            fillOpacity={0.4}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function MonthlyPicture({
  income = SAMPLE.monthlyIncome,
}: {
  income?: number;
}) {
  return (
    <section
      className={`${s.monthly} ${s.lilac}`}
      aria-label="Example monthly picture"
    >
      <div className={s.cardHeading}>
        <h3>This month</h3>
        <span>Example</span>
      </div>
      <div className={s.moneyRows}>
        {[
          { label: "Income", value: income, Icon: ArrowUpRight, tone: "mint" },
          {
            label: "Expenses",
            value: SAMPLE.monthlySpending,
            Icon: ArrowDownRight,
            tone: "pink",
          },
          {
            label: "Saved",
            value: income - SAMPLE.monthlySpending,
            Icon: LockKeyhole,
            tone: "blue",
          },
        ].map(({ label, value, Icon, tone }) => (
          <div className={s.moneyRow} key={label}>
            <span className={`${s.icon} ${s[tone]}`}>
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <span>{label}</span>
              <strong>{money(value)}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function FreedomCard({ extra }: { extra: number }) {
  const result = quickFreedom(
    { ...SAMPLE, monthlyIncome: SAMPLE.monthlyIncome + extra },
    EXAMPLE_DATE,
  );
  return (
    <section
      className={`${s.freedom} ${s.yellow}`}
      aria-label="Example freedom projection"
    >
      <h3>Work becomes optional</h3>
      <strong className={s.freedomYear}>{result.year ?? "Not reached"}</strong>
      <p>{Math.round((SAMPLE.invested / result.target) * 100)}% of the way</p>
      <ProjectionChart extra={extra} />
      <div className={s.projectionTotals}>
        <div>
          <span>Current savings</span>
          <strong>{money(SAMPLE.invested)}</strong>
        </div>
        <div>
          <span>Target amount</span>
          <strong>{money(result.target)}</strong>
        </div>
      </div>
    </section>
  );
}
function BillsCalendar() {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const month = new Date(Date.UTC(2026, 10 + offset, 1));
  const count = new Date(Date.UTC(2026, 11 + offset, 0)).getUTCDate();
  const label = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const visibleBills =
    selected === null ? BILLS : BILLS.filter((b) => b.day === selected);
  return (
    <section
      className={`${s.payday} ${s.mint}`}
      aria-label="Example bills and payday"
    >
      <h3>{offset === 0 ? "Until payday" : "Example payday"}</h3>
      <strong className={s.paydayValue}>
        {offset === 0
          ? "10 days"
          : new Date(Date.UTC(2026, 10 + offset, 9)).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", timeZone: "UTC" },
            )}
      </strong>
      <p>
        {offset === 0
          ? "Example payday · Mon, Nov 9"
          : "Monthly example · on the 9th"}
      </p>
      <div className={s.calendar}>
        <div className={s.cardHeading}>
          <strong>{label}</strong>
          <div className={s.monthControls}>
            <button
              type="button"
              aria-label="Previous example month"
              onClick={() => {
                setOffset((o) => o - 1);
                setSelected(null);
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next example month"
              onClick={() => {
                setOffset((o) => o + 1);
                setSelected(null);
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className={s.weekdays} aria-hidden="true">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          className={s.days}
          role="group"
          aria-label={`${label} example schedule`}
        >
          {Array.from({ length: month.getUTCDay() }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const day = i + 1;
            const bill = BILLS.find((b) => b.day === day);
            const payday = day === 9;
            return (
              <button
                key={day}
                type="button"
                className={
                  payday ? s.paydayDate : bill ? s.billDate : undefined
                }
                aria-label={`${label} ${day}${payday ? ", example payday" : ""}${bill ? `, ${bill.name} ${money(bill.amount)}` : ""}`}
                aria-pressed={selected === day}
                onClick={() => setSelected((v) => (v === day ? null : day))}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      <div className={s.cardHeading}>
        <h4>
          {selected === null
            ? "Upcoming bills"
            : `Scheduled · ${month.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${selected}`}
        </h4>
        <button
          type="button"
          className={s.textButton}
          onClick={() => setSelected(null)}
        >
          See all
        </button>
      </div>
      <div className={s.bills} aria-live="polite">
        {visibleBills.map(({ name, day, amount, icon: Icon, tone }) => (
          <div key={name}>
            <span className={`${s.smallIcon} ${s[tone]}`}>
              <Icon size={15} aria-hidden="true" />
            </span>
            <span>{name}</span>
            <span className={s.billWhen}>
              {month.toLocaleDateString("en-US", {
                month: "short",
                timeZone: "UTC",
              })}{" "}
              {day}
            </span>
            <strong>{money(amount)}</strong>
          </div>
        ))}
        {selected === 9 && (
          <div>
            <span className={`${s.smallIcon} ${s.yellow}`}>
              <CalendarDays size={15} />
            </span>
            <span>Payday</span>
            <strong>+{money(SAMPLE.monthlyIncome)}</strong>
          </div>
        )}
        {selected !== null && !visibleBills.length && selected !== 9 && (
          <p className={s.emptyDay}>No scheduled payments.</p>
        )}
      </div>
    </section>
  );
}
function SpendingPicture() {
  const [selected, setSelected] = useState<string | null>(null);
  const row = Object.fromEntries(CATEGORIES.map((c) => [c.name, c.amount]));
  return (
    <section className={s.spending} aria-label="Example spending categories">
      <div className={s.cardHeading}>
        <h3>Where your money goes</h3>
        <strong>
          {money(SAMPLE.monthlySpending)}
          <small> / month</small>
        </strong>
      </div>
      <div className={s.categoryChart} aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 400, height: 25 }}
        >
          <BarChart
            layout="vertical"
            data={[row]}
            margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            barSize={24}
          >
            <XAxis type="number" hide />
            <YAxis type="category" hide />
            {CATEGORIES.map((c) => (
              <Bar
                key={c.name}
                dataKey={c.name}
                stackId="spending"
                fill={c.color}
                fillOpacity={selected && selected !== c.name ? 0.4 : 1}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={s.categories}>
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.name}
            aria-pressed={selected === c.name}
            onClick={() => setSelected((v) => (v === c.name ? null : c.name))}
          >
            <span className={s.categoryDot} style={{ background: c.color }} />
            <span>{c.name}</span>
            <strong>{money(c.amount)}</strong>
            <span>
              {Math.round((c.amount / SAMPLE.monthlySpending) * 100)}%
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <p className={s.categoryDetail} aria-live="polite">
          {selected} ·{" "}
          {money(CATEGORIES.find((c) => c.name === selected)!.amount)} of your
          example monthly expenses
        </p>
      )}
    </section>
  );
}
export default function NextHorizonLanding({
  onStart,
  signedIn,
  referred,
}: {
  onStart: () => void;
  signedIn?: boolean;
  referred?: boolean;
}) {
  const [extra, setExtra] = useState(250);
  const controlId = useId();
  const base = quickFreedom(SAMPLE, EXAMPLE_DATE);
  const changed = quickFreedom(
    { ...SAMPLE, monthlyIncome: SAMPLE.monthlyIncome + extra },
    EXAMPLE_DATE,
  );
  const monthsEarlier = Math.max(
    0,
    Math.round(((base.years ?? 0) - (changed.years ?? 0)) * 12),
  );
  return (
    <div className={`nh-landing ${s.root}`}>
      <a href="#uf-landing-main" className="uf-skip">
        Skip to content
      </a>
      <SiteHeader
        onStart={onStart}
        signedIn={signedIn}
        startLabel="Find my freedom date"
        showSignIn
      />
      <main id="uf-landing-main" tabIndex={-1} className={s.main}>
        <section className={s.hero} aria-labelledby="landing-title">
          <h1 id="landing-title">
            Your money,
            <br />
            with a way forward.
          </h1>
          <p className={s.tagline}>Open up your life.</p>
          <p className={s.intro}>
            See what today&apos;s money decisions mean for when work becomes
            optional.
          </p>
          <StartButton onStart={onStart} />
          <Reassurance expanded />
        </section>
        <section
          className={s.preview}
          aria-label="Interactive UntilFire example"
        >
          <div className={s.previewToolbar}>
            <span className={s.exampleLabel}>Example plan</span>
            <span className={s.exploreHint}>
              Explore the example{" "}
              <ArrowDownRight size={20} aria-hidden="true" />
            </span>
          </div>
          <div className={s.previewGrid}>
            <MonthlyPicture />
            <FreedomCard extra={0} />
            <BillsCalendar />
          </div>
          <p className={s.exampleFootnote}>
            Illustrative USD example · Estimates, not guarantees.
          </p>
        </section>
        <section id="how" className={s.story} aria-labelledby="story-title">
          <div className={s.storyCopy}>
            <span className={s.eyebrow}>From today to tomorrow</span>
            <h2 id="story-title">
              Less guesswork.
              <br />
              More possibilities.
            </h2>
            <p>
              See where you stand, explore what&apos;s possible, and find your
              next move.
            </p>
            <div className={s.steps}>
              {[
                {
                  Icon: ChartNoAxesColumnIncreasing,
                  title: "Understand today",
                  text: "Income, expenses and savings. One clear picture.",
                  tone: "lilac",
                },
                {
                  Icon: CalendarDays,
                  title: "Plan your path",
                  text: "See the year work could become optional.",
                  tone: "mint",
                },
                {
                  Icon: SlidersHorizontal,
                  title: "Try different scenarios",
                  text: "Small changes. See their impact.",
                  tone: "blue",
                },
              ].map(({ Icon, title, text, tone }) => (
                <div key={title}>
                  <span className={`${s.stepIcon} ${s[tone]}`}>
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <StartButton onStart={onStart} />
            <Reassurance />
          </div>
          <div className={`${s.scenario} ${s.blue}`}>
            <span className={s.exampleLabel}>Example plan</span>
            <SpendingPicture />
            <div className={s.improvement}>
              <label htmlFor={controlId}>
                Drag to try saving more <strong>+{money(extra)}/month</strong>
              </label>
              <input
                id={controlId}
                type="range"
                min={0}
                max={1000}
                step={50}
                value={extra}
                aria-label="Extra monthly income saved in the example"
                aria-describedby={`${controlId}-description`}
                aria-valuetext={`${money(extra)} extra saved per month, ${monthsEarlier} months earlier`}
                onChange={(e) => setExtra(Number(e.target.value))}
              />
              <div className={s.rangeLabels}>
                <span>$0</span>
                <button
                  type="button"
                  onClick={() => setExtra(0)}
                  disabled={extra === 0}
                >
                  Reset example
                </button>
                <span>$1,000</span>
              </div>
              <p id={`${controlId}-description`}>
                Extra income saved · Your plan is unchanged.
              </p>
              <div
                className={`${s.improvementResult} ${s.mint}`}
                role="status"
                aria-atomic="true"
              >
                <Sparkles size={21} aria-hidden="true" />
                <div key={`pace-${extra}`}>
                  <strong>
                    {extra > 0
                      ? `${monthsEarlier} months earlier`
                      : "Your starting pace"}
                  </strong>
                  <span>Estimated freedom date</span>
                </div>
                <strong key={`year-${extra}`}>{changed.year ?? "—"}</strong>
              </div>
            </div>
          </div>
        </section>
        <LandingStories />
        <section
          id="pricing"
          className={s.pricing}
          aria-labelledby="starting-plan-title"
        >
          <div className={s.startingCopy}>
            <span className={s.eyebrow}>Start here</span>
            <h2 id="starting-plan-title">
              Your starting plan
              <br />
              is free.
            </h2>
            <p className={s.startingIntro}>A clearer picture. A way forward.</p>
            <StartButton onStart={onStart} />
            <Reassurance />
          </div>
          <div
            className={s.startingPreview}
            aria-label="Your starting plan and bank connection options"
          >
            <div className={s.startingPreviewHeader}>
              <div>
                <Logo size={22} variant="light" />
                <span>Your starting plan</span>
              </div>
              <strong>
                $0<span>to start</span>
              </strong>
            </div>
            <ul className={s.includedList}>
              {[
                {
                  title: "Your freedom date",
                  detail: "See when work could become optional.",
                  Icon: CalendarDays,
                  tone: "yellow",
                },
                {
                  title: "Your saving pace",
                  detail: "Find the room in your monthly numbers.",
                  Icon: ChartNoAxesColumnIncreasing,
                  tone: "lilac",
                },
                {
                  title: "Your next move",
                  detail: "One clear step to get going.",
                  Icon: SlidersHorizontal,
                  tone: "blue",
                },
              ].map(({ title, detail, Icon, tone }) => (
                <li key={title}>
                  <span className={[s.icon, s[tone]].join(" ")}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{detail}</p>
                  </div>
                  <Check
                    className={s.includedCheck}
                    size={17}
                    aria-label="Included"
                    role="img"
                  />
                </li>
              ))}
            </ul>
            <div
              className={s.connectionPlans}
              aria-label="Bank connections by plan"
            >
              <div className={s.connectionPlan}>
                <span className={s.planName}>
                  Free <strong>$0</strong>
                </span>
                <span className={s.bankIcons} aria-hidden="true">
                  <Landmark size={22} />
                </span>
                <strong>1 bank connection</strong>
              </div>
              <div className={s.connectionPlan + " " + s.proPlan}>
                <span className={s.planName}>
                  Pro{" "}
                  <strong>
                    {PRO_MONTHLY_LABEL}
                    <small>/mo</small>
                  </strong>
                </span>
                <span className={s.bankIcons} aria-hidden="true">
                  {[0, 1, 2].map((bank) => (
                    <Landmark size={22} key={bank} />
                  ))}
                </span>
                <strong>Unlimited connections</strong>
              </div>
            </div>
            <div className={s.planTerms}>
              <span>
                Pro: {referred ? REFERRED_TRIAL_LABEL : TRIAL_LABEL} ·{" "}
                {PRO_MONTHLY_LABEL}/month or {PRO_ANNUAL_LABEL}/year
              </span>
              <Link href="/pricing" className={s.inlineLink}>
                Compare plans <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DirectoryBadges />
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div className={s.footerBrand}>
            <Link href="/" aria-label="UntilFire home">
              <Logo size={28} />
            </Link>
            <p>
              See beyond your balance.
              <br />
              Open up your life.
            </p>
          </div>
          <nav className={s.footerNav} aria-label="Footer">
            <div className={s.footerGroup}>
              <h2>UntilFire</h2>
              <button type="button" onClick={onStart}>
                Get started
              </button>
              <Link href="/pricing">Pricing</Link>
              <Link href="/learn">Learn</Link>
              <Link href="/learn/what-is-fire-financial-independence-retire-early">
                What is FIRE?
              </Link>
              <Link href={signedIn ? "/dashboard" : "/login"}>
                {signedIn ? "Dashboard" : "Sign in"}
              </Link>
            </div>
            <div className={s.footerGroup}>
              <h2>Calculators</h2>
              <Link href="/calculators/4-percent-rule">FIRE number</Link>
              <Link href="/calculators/coast-fire">Coast FIRE</Link>
              <Link href="/calculators/savings-rate">Savings rate</Link>
              <Link href="/calculators/net-worth-by-age">Net worth by age</Link>
              <Link href="/calculators/compound-interest">
                Compound interest
              </Link>
              <Link href="/calculators/apy">APY calculator</Link>
              <Link href="/calculators">All calculators</Link>
            </div>
            <div className={s.footerGroup}>
              <h2>City guides</h2>
              <Link href="/fire-number/austin-tx">Austin</Link>
              <Link href="/fire-number/london">London</Link>
              <Link href="/fire-number/singapore">Singapore</Link>
              <Link href="/fire-number/shanghai">Shanghai</Link>
              <Link href="/fire-number/dubai">Dubai</Link>
              <Link href="/fire-number">All city guides</Link>
            </div>
          </nav>
        </div>
        <div className={s.footerBottom}>
          <span>© UntilFire</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
