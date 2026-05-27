"use client";

import { useState, useMemo } from "react";
import { calcFIRE } from "@/lib/fire";
import { calcTakeHome } from "@/lib/fire";
import type { City } from "@/lib/fire-data";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function CityCalcWidget({ city }: { city: City }) {
  const [income, setIncome] = useState(100000);
  const [savingsRate, setSavingsRate] = useState(20);
  const [age, setAge] = useState(30);
  const [currentSavings, setCurrentSavings] = useState(0);

  const result = useMemo(() => {
    const tax = calcTakeHome(income, city.state);
    const takeHome = tax.takeHome;
    const monthlySavings = (takeHome * savingsRate) / 100 / 12;
    if (monthlySavings <= 0) return null;
    return calcFIRE(monthlySavings, city.col, age, currentSavings);
  }, [income, savingsRate, age, currentSavings, city]);

  const fireTarget = city.col * 25;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    color: "#064E3B",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748B",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px 32px", marginTop: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", margin: "0 0 24px" }}>
        Calculate your FIRE number in {city.name}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 28 }}>
        <div>
          <label style={labelStyle}>Annual gross income</label>
          <input
            style={inputStyle}
            type="number"
            value={income}
            min={20000}
            max={1000000}
            step={5000}
            onChange={(e) => setIncome(Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Current savings</label>
          <input
            style={inputStyle}
            type="number"
            value={currentSavings}
            min={0}
            max={10000000}
            step={1000}
            onChange={(e) => setCurrentSavings(Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Current age</label>
          <input
            style={inputStyle}
            type="number"
            value={age}
            min={18}
            max={70}
            onChange={(e) => setAge(Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Savings rate — {savingsRate}%</label>
          <input
            type="range"
            min={1}
            max={70}
            value={savingsRate}
            onChange={(e) => setSavingsRate(Number(e.target.value))}
            style={{ width: "100%", marginTop: 10, accentColor: "#059669" }}
          />
        </div>
      </div>

      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, borderTop: "1px solid #E2E8F0", paddingTop: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>FIRE Target</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.5px" }}>{fmt(fireTarget)}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>25× annual expenses</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Years to FIRE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.5px" }}>{Math.round(result.years)}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>at {savingsRate}% savings rate</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Retire at Age</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#22d3a5", letterSpacing: "-0.5px" }}>{result.age ?? age + Math.round(result.years)}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>in {result.retireYear}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            background: "#059669",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "-0.2px",
          }}
        >
          Build your full FIRE plan — free →
        </a>
      </div>
    </div>
  );
}
