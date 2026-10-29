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
  KeyRound,
} from "lucide-react";
import Logo from "@/app/components/Logo";
import Flag from "@/app/components/Flag";
import { citySearch, convertIntakeAmount } from "@/lib/intake-inputs";
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
const TITLES = [
  "What does freedom mean to you?",
  "Where do you live?",
  "How often do you get paid?",
  "How much do you take home each month?",
  "How much do you spend each month?",
  "What have you saved and invested?",
  "How old are you?",
  "What gets in the way most?",
  "Do you rent or own?",
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
    [query, setQuery] = useState(initialCity?.name ?? ""),
    [income, setIncome] = useState(""),
    [expenses, setExpenses] = useState(""),
    [invested, setInvested] = useState(""),
    [age, setAge] = useState(""),
    [mode, setMode] = useState("Expenses"),
    [savedInput, setSavedInput] = useState(""),
    [goal, setGoal] = useState(""),
    [pay, setPay] = useState("Monthly"),
    [worry, setWorry] = useState(""),
    [housing, setHousing] = useState(""),
    [investing, setInvesting] = useState<string[]>([]);
  const [direction,setDirection]=useState("forward");
  const goToStep=(next:number)=>{setDirection(next<step?"back":"forward");setStep(next)};
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
  const changeCurrency=(next:SupportedCurrency)=>{
    if(next===currency)return;
    const nextRate=FALLBACK_RATES[next]??1;
    setIncome(v=>convertIntakeAmount(v,rate,nextRate));
    setExpenses(v=>convertIntakeAmount(v,rate,nextRate));
    setInvested(v=>convertIntakeAmount(v,rate,nextRate));
    setSavedInput(v=>convertIntakeAmount(v,rate,nextRate));
    setCurrency(next);
  };
  // Amounts are typed as plain digits but shown grouped (4,500), matching the
  // monthly picture beside them.
  const grouped = (v: string) => {
    if (v === "") return "";
    const [whole, frac] = v.split(".");
    return (whole === "" ? "0" : Number(whole).toLocaleString("en-US")) + (frac !== undefined ? "." + frac : "");
  };
  const ungroup = (v: string) => {
    const clean = v.replace(/[^0-9.]/g, "");
    const dot = clean.indexOf(".");
    return dot < 0 ? clean : clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  };
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
    icons?: (typeof Home)[],
  ) => (
    <div className="nh-choices">
      {options.map((v, i) => {
        const active = Array.isArray(value) ? value.includes(v) : value === v;
        const I = icons?.[i] ?? [CalendarDays, Wallet, ChartNoAxesCombined, ShieldCheck][
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
            className="nh-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={label}
            required
            value={grouped(value)}
            placeholder="0"
            onChange={(e) => change(ungroup(e.target.value))}
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
  const matches = CITIES.filter(
    (c) => !citySearch(query) || c.name.toLowerCase().includes(citySearch(query)),
  ).slice(0, 5);
  const chooseCity = (c: (typeof CITIES)[number]) => {
    setCity({ name: c.name, col: c.col, stateKey: c.state, isCustom: false });
    setQuery(c.name);
    changeCurrency(currencyForState(c.state));
  };
  if (step === 1) {
    body = (
      <>
        <label className="nh-city-search">
          City
          <input
            value={query}
            onChange={(e) => {setQuery(e.target.value);setCity(null)}}
            placeholder="Search cities"
          />
        </label>
        <div className="nh-city-options">
          {matches.map((c) => (
            <button
              type="button"
              key={c.key}
              aria-pressed={city?.name === c.name}
              onClick={() => chooseCity(c)}
            >
              <Flag emoji={c.flag} size={18} />
              <span>{c.name}</span>
              {city?.name === c.name && <Check size={18} />}
            </button>
          ))}
          {query.trim() &&
            matches.length === 0 && (
              <button
                type="button"
                aria-pressed={city?.isCustom && city.name===query.trim()}
                onClick={() =>
                  setCity({
                    name: query.trim(),
                    col: 0,
                    stateKey: "custom",
                    isCustom: true,
                  })
                }
              >
                Use “{query.trim()}” as my city
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
                changeCurrency(next);
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
              onClick={() => {if(v==="Saved")setSavedInput(expenses===""?"":String(Math.round(Math.max(0,sav)*100)/100));setMode(v)}}
            >
              {v}
            </button>
          ))}
        </div>
        {numeric(
          mode === "Expenses" ? "Monthly expenses" : "Monthly saved",
          mode === "Expenses" ? expenses : savedInput,
          (v) => {
            if(mode === "Expenses")setExpenses(v);
            else {setSavedInput(v);setExpenses(v === "" ? "" : String(Math.round((inc - Math.min(inc,+v))*100)/100));}
          },
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
  if (step === 8) body = pick(["Rent", "Own"], housing, setHousing, [KeyRound, Home]);
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
    step === 1 ? !query.trim() || (city !== null && citySearch(city.name) === citySearch(query)) :
    step === 3
      ? income !== "" && Number.isFinite(inc) && inc > 0 && inc <= 999999999
      : step === 4
        ? expenses !== "" && Number.isFinite(exp) && exp > 0 && exp <= 999999999
        : step === 5
          ? invested !== "" && Number.isFinite(+invested) && +invested >= 0 && +invested <= 999999999
          : step === 6
            ? age === "" ||
              (Number.isInteger(+age) && +age >= 18 && +age <= 100)
            : true;
  const advance = () => {
    if (step === 1 && !valid && matches.length === 1) {
      chooseCity(matches[0]);
      goToStep(2);
      return;
    }
    if (!valid) return;
    if (step < 9) {
      goToStep(step + 1);
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
  const skip = step === 1 && !query.trim();
  // Say why Continue is unavailable instead of leaving a silent grey button.
  const hint = valid || (step === 1 && matches.length === 1) ? null
    : step === 1 ? (matches.length ? "Pick your city from the list, or clear the box to skip." : "Pick the option below, or clear the box to skip.")
    : step === 6 ? "Enter an age from 18 to 100, or leave it blank."
    : "Enter an amount to continue.";
  return (
    <div className="nh-intake" data-direction={direction}>
      <header>
        <Logo size={28} />
        <span>See beyond your balance.</span>
      </header>
      <main>
        <div className="nh-intake-progress">
          <button
            type="button"
            aria-label="Previous question"
            onClick={() => (step === 0 ? onBack() : goToStep(step - 1))}
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
        <section className={"nh-intake-panel tone-step-" + step} key={step} data-summary={summary}>
          <form noValidate onSubmit={(e) => { e.preventDefault(); advance(); }}
            onKeyDown={(e) => {
              // Fields submit natively; from the heading or empty space Enter still moves on.
              const t = e.target as HTMLElement;
              if (e.key === "Enter" && !e.repeat && !e.nativeEvent.isComposing && !t.closest("input, button, select, textarea, a, summary")) { e.preventDefault(); advance(); }
            }}>
            <h1 ref={heading} tabIndex={-1}>
              {step===4&&mode==="Saved"?"How much do you save each month?":TITLES[step]}
            </h1>
            {body}
            <div className="nh-actions">
              <button
                type="submit"
                className="nh-primary"
                disabled={!valid && !(step === 1 && matches.length === 1)}
                aria-describedby={hint ? "nh-step-hint" : undefined}
              >
                {step === 9 ? "Show my freedom date" : skip ? "Skip" : "Continue"}
                <ArrowRight size={17} />
              </button>
              {hint && <p id="nh-step-hint" className="nh-input-hint">{hint}</p>}
            </div>
          </form>
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
