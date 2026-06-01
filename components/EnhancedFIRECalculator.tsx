"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";

// ─── Design tokens (matches UntilFire system) ────────────────────────────────
const C = {
  bg: "#08080e",
  card: "#13131e",
  border: "#1c1c2e",
  text: "#e8e8f2",
  muted: "#5e5e7a",
  accent: "#f97316",
  teal: "#22d3a5",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, compact = false) => {
  if (compact && Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtYr = (n) => (n === 1 ? "1 yr" : `${Math.round(n)} yrs`);

// ─── Core FIRE engine ────────────────────────────────────────────────────────
function calcFIREProjection({
  annualIncome,
  monthlyExpenses,
  k401,
  rothIRA,
  taxable,
  totalDebt,
  mortgageBalance,
  mortgageMonthlyPayment,
  growthRate = 0.07,
  inflationRate: _inflationRate = 0.03,
  withdrawalRate = 0.04,
  years = 50,
}) {
  const annualExpenses = monthlyExpenses * 12;
  const annualMortgagePayment = mortgageMonthlyPayment * 12;
  const annualSavings = annualIncome - annualExpenses - annualMortgagePayment;
  const fireTarget = annualExpenses * (1 / withdrawalRate);

  // Split savings roughly by account type (simplified allocation model)
  const k401Contrib = Math.min(annualSavings * 0.4, 23000); // IRS limit simplified
  const rothContrib = Math.min(annualSavings * 0.2, 7000);
  const taxableContrib = Math.max(annualSavings - k401Contrib - rothContrib, 0);

  const data = [];
  let cur401k = k401;
  let curRoth = rothIRA;
  let curTaxable = taxable;
  let curDebt = totalDebt;
  let curMortgage = mortgageBalance;
  let fireYear = null;

  for (let y = 0; y <= years; y++) {
    const investable = cur401k + curRoth + curTaxable;
    const netWorth = investable - curDebt - curMortgage;

    if (fireYear === null && investable >= fireTarget && y > 0) {
      fireYear = y;
    }

    data.push({
      year: y,
      "401(k)": Math.round(cur401k),
      "Roth IRA": Math.round(curRoth),
      Taxable: Math.round(curTaxable),
      Debt: Math.round(-(curDebt + curMortgage)),
      "Net Worth": Math.round(netWorth),
      "FIRE Target": Math.round(fireTarget),
      Investable: Math.round(investable),
    });

    // Grow each account
    cur401k = cur401k * (1 + growthRate) + k401Contrib;
    curRoth = curRoth * (1 + growthRate) + rothContrib;
    curTaxable = curTaxable * (1 + growthRate) + taxableContrib;

    // Pay down debt (simplified: 5% interest, rest goes to principal)
    if (curDebt > 0) {
      const interest = curDebt * 0.05;
      const payment = Math.min(curDebt + interest, annualSavings * 0.3);
      curDebt = Math.max(0, curDebt + interest - payment);
    }

    // Pay down mortgage
    if (curMortgage > 0) {
      const mInterest = curMortgage * 0.065;
      const principal = Math.max(
        0,
        annualMortgagePayment - mInterest
      );
      curMortgage = Math.max(0, curMortgage - principal);
    }
  }

  return { data, fireYear, fireTarget, annualSavings };
}

// ─── Input field ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, prefix = "$", hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.muted,
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
          }}
        >
          {prefix}
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: "100%",
            background: "#0d0d18",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px 10px 28px",
            color: C.text,
            fontFamily: "'DM Mono', monospace",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
      </div>
      {hint && (
        <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────────────────────
function SliderField({ label, value, onChange, min, max, step = 0.001, format }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label
          style={{
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          {label}
        </label>
        <span style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: C.accent, width: "100%", cursor: "pointer" }}
      />
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.text, accent = false }) {
  return (
    <div
      style={{
        background: accent ? `${C.accent}10` : C.card,
        border: `1px solid ${accent ? C.accent + "40" : C.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 22,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          color: color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1a1a2e",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontFamily: "'DM Mono', monospace",
        fontSize: 12,
      }}
    >
      <p style={{ color: C.muted, marginBottom: 6 }}>Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value, true)}
        </div>
      ))}
    </div>
  );
};

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.accent : "transparent",
        border: `1px solid ${active ? C.accent : C.border}`,
        borderRadius: 6,
        padding: "6px 14px",
        color: active ? "#fff" : C.muted,
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color = C.accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EnhancedFIRECalculator() {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  const [annualIncome, setAnnualIncome] = useState(120000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(3500);
  const [k401, setK401] = useState(45000);
  const [rothIRA, setRothIRA] = useState(18000);
  const [taxable, setTaxable] = useState(12000);
  const [totalDebt, setTotalDebt] = useState(15000);
  const [mortgageBalance, setMortgageBalance] = useState(280000);
  const [mortgageMonthly, setMortgageMonthly] = useState(1800);
  const [growthRate, setGrowthRate] = useState(0.07);
  const [withdrawalRate, setWithdrawalRate] = useState(0.04);
  const [chartTab, setChartTab] = useState("growth");

  // ── Calculation ──────────────────────────────────────────────────────────────
  const { data, fireYear, fireTarget, annualSavings } = useMemo(
    () =>
      calcFIREProjection({
        annualIncome,
        monthlyExpenses,
        k401,
        rothIRA,
        taxable,
        totalDebt,
        mortgageBalance,
        mortgageMonthlyPayment: mortgageMonthly,
        growthRate,
        withdrawalRate,
        years: 50,
      }),
    [
      annualIncome,
      monthlyExpenses,
      k401,
      rothIRA,
      taxable,
      totalDebt,
      mortgageBalance,
      mortgageMonthly,
      growthRate,
      withdrawalRate,
    ]
  );

  const currentNetWorth = k401 + rothIRA + taxable - totalDebt - mortgageBalance;
  const currentInvestable = k401 + rothIRA + taxable;
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;
  const fireProgress = Math.min(100, (currentInvestable / fireTarget) * 100);
  const fireYearDisplay = fireYear ? fmtYr(fireYear) : "50+ yrs";

  // ── Chart data – trim to fireYear + 5 or 30 years max for readability ────────
  const chartData = useMemo(() => {
    const end = Math.min(data.length - 1, fireYear ? fireYear + 6 : 35);
    return data.slice(0, end + 1);
  }, [data, fireYear]);

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'Manrope', sans-serif",
        minHeight: "100vh",
        padding: "0 0 60px 0",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "24px 32px",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: C.accent,
          }}
        >
          UntilFire
        </span>
        <span style={{ color: C.muted, fontSize: 13 }}>/ FIRE Calculator</span>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 24px",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ── Left panel: inputs ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Income & Spending */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SectionHeader icon="💰" title="Income & Spending" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                label="Annual Income (pre-tax)"
                value={annualIncome}
                onChange={setAnnualIncome}
                hint="Gross salary + side income"
              />
              <Field
                label="Monthly Expenses"
                value={monthlyExpenses}
                onChange={setMonthlyExpenses}
                hint="Excludes mortgage payment"
              />
            </div>
          </div>

          {/* Investment Accounts */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SectionHeader icon="📈" title="Investment Accounts" color={C.teal} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                label="401(k) Balance"
                value={k401}
                onChange={setK401}
                hint="Traditional + employer match"
              />
              <Field
                label="Roth IRA Balance"
                value={rothIRA}
                onChange={setRothIRA}
              />
              <Field
                label="Taxable Brokerage"
                value={taxable}
                onChange={setTaxable}
              />
            </div>
          </div>

          {/* Debt */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SectionHeader icon="🔻" title="Debt" color={C.red} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                label="Total Non-Mortgage Debt"
                value={totalDebt}
                onChange={setTotalDebt}
                hint="Credit cards, student loans, auto"
              />
              <Field
                label="Mortgage Remaining Balance"
                value={mortgageBalance}
                onChange={setMortgageBalance}
              />
              <Field
                label="Monthly Mortgage Payment"
                value={mortgageMonthly}
                onChange={setMortgageMonthly}
              />
            </div>
          </div>

          {/* Assumptions */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SectionHeader icon="⚙️" title="Assumptions" color={C.purple} />
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SliderField
                label="Annual Return Rate"
                value={growthRate}
                onChange={setGrowthRate}
                min={0.03}
                max={0.12}
                step={0.001}
                format={(v) => `${(v * 100).toFixed(1)}%`}
              />
              <SliderField
                label="Safe Withdrawal Rate"
                value={withdrawalRate}
                onChange={setWithdrawalRate}
                min={0.03}
                max={0.06}
                step={0.001}
                format={(v) => `${(v * 100).toFixed(1)}%`}
              />
            </div>
          </div>
        </div>

        {/* ── Right panel: results + charts ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* KPI grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <StatCard
              label="FIRE Date"
              value={fireYearDisplay}
              sub={fireYear ? `~${new Date().getFullYear() + fireYear}` : "Keep optimizing"}
              color={C.accent}
              accent
            />
            <StatCard
              label="FIRE Target"
              value={fmt(fireTarget, true)}
              sub={`${(withdrawalRate * 100).toFixed(0)}% rule`}
            />
            <StatCard
              label="Net Worth"
              value={fmt(currentNetWorth, true)}
              color={currentNetWorth >= 0 ? C.teal : C.red}
              sub="Assets minus all debt"
            />
            <StatCard
              label="Investable Assets"
              value={fmt(currentInvestable, true)}
              color={C.teal}
              sub="All investment accounts"
            />
            <StatCard
              label="Annual Savings"
              value={fmt(annualSavings, true)}
              color={annualSavings > 0 ? C.text : C.red}
              sub={`${savingsRate.toFixed(0)}% savings rate`}
            />
            <StatCard
              label="Progress to FIRE"
              value={`${fireProgress.toFixed(0)}%`}
              sub={fmt(currentInvestable, true) + " of " + fmt(fireTarget, true)}
              color={fireProgress >= 75 ? C.teal : fireProgress >= 40 ? C.accent : C.text}
            />
          </div>

          {/* Progress bar */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
                INVESTABLE ASSETS → FIRE TARGET
              </span>
              <span style={{ fontSize: 12, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
                {fireProgress.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: C.border,
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(fireProgress, 100)}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${C.teal}, ${C.accent})`,
                  borderRadius: 99,
                  transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          </div>

          {/* Charts */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                Wealth Projection
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <Tab
                  label="Growth"
                  active={chartTab === "growth"}
                  onClick={() => setChartTab("growth")}
                />
                <Tab
                  label="Accounts"
                  active={chartTab === "accounts"}
                  onClick={() => setChartTab("accounts")}
                />
                <Tab
                  label="Net Worth"
                  active={chartTab === "networth"}
                  onClick={() => setChartTab("networth")}
                />
              </div>
            </div>

            {/* Chart: Total investable vs FIRE target */}
            {chartTab === "growth" && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gInvestable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Yr ${v}`}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmt(v, true)}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {fireYear && (
                    <ReferenceLine
                      x={fireYear}
                      stroke={C.accent}
                      strokeDasharray="4 4"
                      label={{
                        value: "🔥 FIRE",
                        fill: C.accent,
                        fontSize: 11,
                        fontFamily: "DM Mono",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="FIRE Target"
                    stroke={C.accent}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    fill="url(#gTarget)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="Investable"
                    stroke={C.teal}
                    strokeWidth={2.5}
                    fill="url(#gInvestable)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Chart: Account breakdown */}
            {chartTab === "accounts" && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="g401" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.blue} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gRoth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gTaxable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.purple} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.purple} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Yr ${v}`}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmt(v, true)}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      fontFamily: "DM Mono",
                      color: C.muted,
                      paddingTop: 12,
                    }}
                  />
                  {fireYear && (
                    <ReferenceLine
                      x={fireYear}
                      stroke={C.accent}
                      strokeDasharray="4 4"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="401(k)"
                    stroke={C.blue}
                    strokeWidth={2}
                    fill="url(#g401)"
                    dot={false}
                    stackId="a"
                  />
                  <Area
                    type="monotone"
                    dataKey="Roth IRA"
                    stroke={C.teal}
                    strokeWidth={2}
                    fill="url(#gRoth)"
                    dot={false}
                    stackId="a"
                  />
                  <Area
                    type="monotone"
                    dataKey="Taxable"
                    stroke={C.purple}
                    strokeWidth={2}
                    fill="url(#gTaxable)"
                    dot={false}
                    stackId="a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Chart: Net worth (assets - all debt) */}
            {chartTab === "networth" && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gNW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Yr ${v}`}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmt(v, true)}
                    tick={{ fill: C.muted, fontSize: 11, fontFamily: "DM Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                  {fireYear && (
                    <ReferenceLine
                      x={fireYear}
                      stroke={C.accent}
                      strokeDasharray="4 4"
                      label={{
                        value: "🔥 FIRE",
                        fill: C.accent,
                        fontSize: 11,
                        fontFamily: "DM Mono",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="Net Worth"
                    stroke={C.accent}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Debt"
                    stroke={C.red}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Chart legend note */}
            <p style={{ margin: "12px 0 0", fontSize: 11, color: C.muted, textAlign: "center" }}>
              {chartTab === "growth" && "Teal = investable assets · Orange dashed = FIRE target"}
              {chartTab === "accounts" && "Stacked: 401(k) · Roth IRA · Taxable brokerage"}
              {chartTab === "networth" && "Net worth = all assets − all debt"}
            </p>
          </div>

          {/* Account breakdown table */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SectionHeader icon="📊" title="Current Snapshot" />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "401(k)", value: k401, color: C.blue },
                  { label: "Roth IRA", value: rothIRA, color: C.teal },
                  { label: "Taxable Brokerage", value: taxable, color: C.purple },
                  null,
                  { label: "Non-Mortgage Debt", value: -totalDebt, color: C.red },
                  { label: "Mortgage Balance", value: -mortgageBalance, color: C.red },
                  null,
                  { label: "Net Worth", value: currentNetWorth, color: currentNetWorth >= 0 ? C.teal : C.red, bold: true },
                ].map((row, i) => {
                  if (!row)
                    return (
                      <tr key={`div-${i}`}>
                        <td
                          colSpan={2}
                          style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, paddingBottom: 8 }}
                        />
                      </tr>
                    );
                  return (
                    <tr key={row.label}>
                      <td
                        style={{
                          padding: "7px 0",
                          color: C.muted,
                          fontSize: 13,
                          fontWeight: row.bold ? 600 : 400,
                          color: row.bold ? C.text : C.muted,
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: "7px 0",
                          textAlign: "right",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13,
                          color: row.color,
                          fontWeight: row.bold ? 700 : 400,
                        }}
                      >
                        {row.value >= 0 ? fmt(row.value) : `−${fmt(Math.abs(row.value))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
