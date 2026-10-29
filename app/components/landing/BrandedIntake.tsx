"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  Wallet,
  Globe2,
  Home,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react";
import Logo from "@/app/components/Logo";
import { CITIES } from "@/lib/fire-data";
import {
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currency";
import type { CityState } from "./CityScreen";
import "./next-horizon.css";
export type IntakeAnswer = {
  city: CityState;
  currency: SupportedCurrency;
  income: number;
  expenses: number;
  invested: number;
  age?: number;
};
const STEPS = [
  "Goal",
  "City",
  "Pay frequency",
  "Income",
  "Expenses",
  "Saved",
  "Age",
  "Worry",
  "Your home",
  "Investing",
];
const TITLES = [
  "What does freedom mean to you?",
  "Where do you live?",
  "How often do you get paid?",
  "How much do you take home each month?",
  "How much do you spend each month?",
  "What have you saved and invested?",
  "How old are you?",
  "What gets in the way most?",
  "Your home",
  "How do you invest?",
];
export default function BrandedIntake({
  initialCity,
  initialCurrency = "USD",
  startAt = 0,
  onBack,
  onComplete,
  currencyForState,
  onStep,
}: {
  initialCity: CityState | null;
  initialCurrency?: SupportedCurrency;
  startAt?: number;
  onBack: () => void;
  onComplete: (v: IntakeAnswer) => void;
  currencyForState: (s: string) => SupportedCurrency;
  onStep?: (step: number) => void;
}) {
  const [step, setStep] = useState(startAt),
    [city, setCity] = useState(initialCity),
    [currency, setCurrency] = useState(initialCurrency),
    [query, setQuery] = useState(""),
    [income, setIncome] = useState(""),
    [expenses, setExpenses] = useState(""),
    [invested, setInvested] = useState(""),
    [age, setAge] = useState(""),
    [mode, setMode] = useState("Expenses"),
    [goal, setGoal] = useState(""),
    [pay, setPay] = useState("Monthly"),
    [worry, setWorry] = useState(""),
    [housing, setHousing] = useState(""),
    [investing, setInvesting] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null),
    rate = FALLBACK_RATES[currency] ?? 1,
    inc = Number(income),
    exp = Number(expenses),
    sav = inc - exp;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    onStep?.(step);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  const pick = (
    options: string[],
    value: string | string[],
    select: (v: string) => void,
  ) => (
    <div className="nh-choices">
      {options.map((v, i) => {
        const active = Array.isArray(value) ? value.includes(v) : value === v;
        const I = [CalendarDays, Wallet, ChartNoAxesCombined, ShieldCheck][
          i % 4
        ];
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => select(v)}
            className={active ? "selected" : ""}
          >
            <span className={"nh-choice-icon tone-" + (i % 4)}>
              <I size={22} />
            </span>
            <strong>{v}</strong>
            {active && <Check size={19} />}
          </button>
        );
      })}
    </div>
  );
  const numeric = (
    label: string,
    value: string,
    change: (v: string) => void,
    max: number,
    unit = " / month",
  ) => (
    <div className="nh-number-input">
      <label>
        {label}
        <span>
          <span aria-hidden>
            {
              new Intl.NumberFormat("en-US", { style: "currency", currency })
                .formatToParts(0)
                .find((p) => p.type === "currency")?.value
            }
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="999999999"
            step="any"
            aria-label={label}
            required
            value={value}
            placeholder="0"
            onChange={(e) => change(e.target.value)}
          />
        </span>
      </label>
      <small>{unit}</small>
      <input
        type="range"
        min="0"
        max={Math.max(max, Number(value) || 0)}
        step={Math.max(1, Math.round(rate * 10))}
        value={Number(value) || 0}
        aria-label={label + " slider"}
        onChange={(e) => change(e.target.value)}
        aria-valuetext={money(Number(value) || 0) + unit}
      />
      <div>
        <small>{money(0)}</small>
        <small>{money(Math.max(max, Number(value) || 0))}</small>
      </div>
    </div>
  );
  let body: React.ReactNode;
  if (step === 0)
    body = pick(
      ["Retire early", "Financial freedom", "Just exploring"],
      goal,
      setGoal,
    );
  if (step === 1) {
    const matches = CITIES.filter(
      (c) => !query || c.name.toLowerCase().includes(query.toLowerCase()),
    ).slice(0, 5);
    body = (
      <>
        <label className="nh-city-search">
          City
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities"
          />
        </label>
        <div className="nh-city-options">
          {matches.map((c) => (
            <button
              key={c.key}
              aria-pressed={city?.name === c.name}
              onClick={() => {
                setCity({
                  name: c.name,
                  col: c.col,
                  stateKey: c.state,
                  isCustom: false,
                });
                setCurrency(currencyForState(c.state));
              }}
            >
              <Globe2 size={18} />
              {c.name}
              {city?.name === c.name && <Check size={18} />}
            </button>
          ))}
          {query.trim() &&
            !matches.some(
              (c) => c.name.toLowerCase() === query.trim().toLowerCase(),
            ) && (
              <button
                onClick={() =>
                  setCity({
                    name: query.trim(),
                    col: 0,
                    stateKey: "custom",
                    isCustom: true,
                  })
                }
              >
                Use “{query.trim()}”
                {city?.name === query.trim() && <Check size={18} />}
              </button>
            )}
        </div>
      </>
    );
  }
  if (step === 2)
    body = pick(
      ["Monthly", "Twice a month", "Every two weeks", "Weekly"],
      pay,
      setPay,
    );
  if (step === 3)
    body = (
      <>
        {numeric("Monthly take-home income", income, setIncome, 15000 * rate)}
        <p className="nh-input-hint">
          After tax. Your plan uses monthly amounts.
        </p>
        <details className="nh-currency">
          <summary>Currency · {currency}</summary>
          <label>
            Currency
            <select
              value={currency}
              onChange={(e) => {
                const next = e.target.value as SupportedCurrency;
                const scale = (FALLBACK_RATES[next] ?? 1) / rate;
                setIncome((v) => (v ? String(Math.round(+v * scale)) : ""));
                setExpenses((v) => (v ? String(Math.round(+v * scale)) : ""));
                setInvested((v) => (v ? String(Math.round(+v * scale)) : ""));
                setCurrency(next);
              }}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {currency !== "USD" && (
            <p>
              Indicative exchange rates. Your entered currency is kept with your
              plan.
            </p>
          )}
        </details>
      </>
    );
  if (step === 4)
    body = (
      <>
        <div className="nh-segment">
          {["Expenses", "Saved"].map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={mode === v}
              className={mode === v ? "active" : ""}
              onClick={() => setMode(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {numeric(
          mode === "Expenses" ? "Monthly expenses" : "Monthly saved",
          mode === "Expenses"
            ? expenses
            : expenses === ""
              ? ""
              : String(Math.max(0, sav)),
          (v) =>
            setExpenses(
              mode === "Expenses" ? v : String(inc - Math.min(inc, +v)),
            ),
          Math.max(inc, exp, 1),
        )}
        {exp > inc && (
          <p role="status" className="nh-input-hint">
            Expenses exceed income. You can still see your starting point.
          </p>
        )}
      </>
    );
  if (step === 5)
    body = (
      <>
        {numeric(
          "Saved and invested",
          invested,
          setInvested,
          250000 * rate,
          " today",
        )}
        <p className="nh-input-hint">Include cash and retirement accounts.</p>
      </>
    );
  if (step === 6)
    body = (
      <label className="nh-age-input">
        Age
        <input
          aria-label="Age"
          type="number"
          inputMode="numeric"
          min="18"
          max="100"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="32"
        />
        <small>Optional. Your age at freedom.</small>
      </label>
    );
  if (step === 7)
    body = pick(
      [
        "Money before payday",
        "Debt I want gone",
        "Not sure where to invest",
        "Nothing, just my plan",
      ],
      worry,
      setWorry,
    );
  if (step === 8) body = pick(["Rent", "Own"], housing, setHousing);
  if (step === 9)
    body = (
      <>
        {pick(
          ["Not yet", "Index funds", "Dividends", "Property"],
          investing,
          (v) =>
            setInvesting((old) =>
              v === "Not yet"
                ? ["Not yet"]
                : old.includes(v)
                  ? old.filter((x) => x !== v)
                  : [...old.filter((x) => x !== "Not yet"), v],
            ),
        )}
        <p className="nh-input-hint">Pick all that fit.</p>
      </>
    );
  const valid =
    step === 3
      ? income !== "" && Number.isFinite(inc) && inc > 0
      : step === 4
        ? expenses !== "" && Number.isFinite(exp) && exp > 0
        : step === 5
          ? invested !== "" && Number.isFinite(+invested) && +invested >= 0
          : step === 6
            ? age === "" ||
              (Number.isInteger(+age) && +age >= 18 && +age <= 100)
            : true;
  const advance = () => {
    if (!valid) return;
    if (step < 9) {
      setStep(step + 1);
      return;
    }
    try {
      localStorage.setItem(
        "uf_onboarding_preferences",
        JSON.stringify({ goal, pay, worry, housing, investing }),
      );
    } catch {}
    onComplete({
      city: {
        ...(city ?? {
          name: "Your current lifestyle",
          stateKey: "custom",
          isCustom: true,
        }),
        col: (exp / rate) * 12,
      },
      currency,
      income: (inc / rate) * 12,
      expenses: exp / rate,
      invested: Number(invested) / rate,
      age: age ? +age : undefined,
    });
  };
  const summary = step >= 3 && step <= 5;
  return (
    <div className="nh-intake">
      <header>
        <Logo size={28} />
        <span>See beyond your balance.</span>
      </header>
      <main>
        <div className="nh-intake-progress">
          <button
            aria-label="Previous question"
            onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
          >
            <ArrowLeft size={19} />
          </button>
          <span>Your starting point</span>
          <progress
            max="10"
            value={step + 1}
            aria-label="Onboarding progress"
          />
          <b>{step + 1} / 10</b>
        </div>
        <section className={"nh-intake-panel tone-step-" + step} key={step}>
          <div>
            <span className="nh-eyebrow">{STEPS[step]}</span>
            <h1 ref={heading} tabIndex={-1}>
              {TITLES[step]}
            </h1>
            {body}
            <div className="nh-actions">
              <button
                className="nh-primary"
                disabled={!valid}
                onClick={advance}
              >
                {step === 9 ? "Show my freedom date" : "Continue"}
                <ArrowRight size={17} />
              </button>
              {![3, 4, 5].includes(step) && (
                <button
                  className="nh-skip"
                  onClick={() => {
                    if (step === 1) setCity(null);
                    if (step === 6) {
                      setAge("");
                      setStep(7);
                      return;
                    }
                    advance();
                  }}
                >
                  Skip
                </button>
              )}
            </div>
          </div>
          <aside>
            {summary ? (
              <div className="nh-intake-summary">
                <span>Your monthly picture</span>
                <div>
                  Income<strong>{income ? money(inc) : "—"}</strong>
                </div>
                <div>
                  Expenses<strong>{expenses ? money(exp) : "—"}</strong>
                </div>
                <div>
                  Saved<strong>{income && expenses ? money(sav) : "—"}</strong>
                </div>
                <div
                  className="nh-split-meter"
                  role="img"
                  aria-label="Expenses and saved share of income"
                >
                  <i
                    style={{
                      width:
                        Math.max(
                          0,
                          Math.min(100, inc ? (exp / inc) * 100 : 0),
                        ) + "%",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="nh-intake-message">
                {step === 1 ? (
                  <Globe2 size={66} />
                ) : step === 8 ? (
                  <Home size={66} />
                ) : (
                  <img
                    src="/brand/mark-black.svg"
                    alt=""
                    width="165"
                    height="88"
                  />
                )}
                <h2>
                  {step === 1
                    ? (city?.name ?? "Your place in the world.")
                    : step === 8
                      ? "Room for real life."
                      : "More life.\nOn your terms."}
                </h2>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
