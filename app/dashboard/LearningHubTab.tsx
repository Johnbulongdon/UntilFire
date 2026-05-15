"use client";

import { useState } from "react";
import { learnArticles } from "@/lib/learn";
import { CITIES, STATE_TAX, isUS } from "@/lib/fire-data";

type SubTab = "articles" | "topics" | "calculators" | "cities";

const US_CITIES = CITIES.filter((c) => isUS(c.state));

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLORS: Record<string, string> = {
  "FIRE Basics":      "#059669",
  "Planning":         "#0ea5e9",
  "Tax & Accounts":   "#8b5cf6",
  "Risk & Strategy":  "#f97316",
};

const CALCULATORS = [
  { href: "/calculators/4-percent-rule",    label: "FIRE Number Calculator",      desc: "Estimate how much you need invested to retire using the 4% rule.", color: "#059669" },
  { href: "/calculators/coast-fire",        label: "Coast FIRE Calculator",        desc: "Find the amount you need invested today so compound growth carries you.", color: "#7C3AED" },
  { href: "/calculators/savings-rate",      label: "Savings Rate Calculator",      desc: "Calculate your savings rate and see how it changes your FIRE timeline.", color: "#0EA5E9" },
  { href: "/calculators/compound-interest", label: "Compound Interest Calculator", desc: "Project investment growth over time with monthly contributions.", color: "#047857" },
  { href: "/calculators/apy",              label: "APY Calculator",               desc: "Convert APR to APY and see how compounding frequency changes your yield.", color: "#20D4BF" },
];

const TOPICS = [
  {
    title: "FIRE Basics",
    desc: "Understand the core math behind financial independence, early retirement, and why savings rate matters.",
    slugs: [
      "what-is-fire-financial-independence-retire-early",
      "what-is-the-4-percent-rule",
      "why-savings-rate-matters-more-than-income",
      "compound-interest-and-fire",
    ],
    calcs: [
      { href: "/calculators/4-percent-rule", label: "FIRE Number Calculator" },
      { href: "/calculators/savings-rate",   label: "Savings Rate Calculator" },
    ],
  },
  {
    title: "Planning",
    desc: "Compare retirement styles, estimate your number, and test how assumptions change your timeline.",
    slugs: [
      "how-much-money-do-i-need-to-retire",
      "coast-fire-vs-full-fire",
      "lean-fire-vs-fat-fire",
      "barista-fire",
      "how-fire-assumptions-change-your-retirement-date",
    ],
    calcs: [
      { href: "/calculators/coast-fire",        label: "Coast FIRE Calculator" },
      { href: "/calculators/compound-interest", label: "Compound Interest Calculator" },
    ],
  },
  {
    title: "Tax, Accounts & Risk",
    desc: "Plan around account structure, withdrawal strategy, and the risks that can derail early retirement.",
    slugs: [
      "roth-ira-vs-401k-for-fire",
      "sequence-of-returns-risk",
    ],
    calcs: [
      { href: "/calculators/apy",          label: "APY Calculator" },
      { href: "/calculators/4-percent-rule", label: "Safe Withdrawal Calculator" },
    ],
  },
];

const STATE_NAMES: Record<string, string> = {
  ca: "California", ny: "New York", nyc: "New York", tx: "Texas", fl: "Florida",
  wa: "Washington", or: "Oregon", co: "Colorado", il: "Illinois", ma: "Massachusetts",
  ga: "Georgia", nc: "North Carolina", az: "Arizona", nv: "Nevada", tn: "Tennessee",
  mi: "Michigan", pa: "Pennsylvania", oh: "Ohio", mn: "Minnesota", ut: "Utah",
  in_us: "Indiana", mo: "Missouri", wi: "Wisconsin", ne: "Nebraska", dc: "Washington D.C.",
  md: "Maryland", ct: "Connecticut", ri: "Rhode Island", va: "Virginia", la: "Louisiana",
  id: "Idaho", nm: "New Mexico", sc: "South Carolina", al: "Alabama", ar_us: "Arkansas",
  ia: "Iowa", nd: "North Dakota", ok: "Oklahoma", ks: "Kansas", vt: "Vermont",
  me: "Maine", nj: "New Jersey", nh: "New Hampshire", sd: "South Dakota", ms: "Mississippi",
};

export default function LearningHubTab() {
  const [subTab, setSubTab] = useState<SubTab>("articles");
  const [citySearch, setCitySearch] = useState("");

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: "articles",    label: "Articles" },
    { key: "topics",      label: "Topics" },
    { key: "calculators", label: "Calculators" },
    { key: "cities",      label: "FIRE by City" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const filteredCities = citySearch.length >= 2
    ? US_CITIES.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase()))
    : US_CITIES;

  const byState = filteredCities.reduce<Record<string, typeof US_CITIES>>((acc, city) => {
    const stateName = STATE_NAMES[city.state] ?? city.state.toUpperCase();
    if (!acc[stateName]) acc[stateName] = [];
    acc[stateName].push(city);
    return acc;
  }, {});
  const sortedStates = Object.keys(byState).sort();

  return (
    <div style={{ maxWidth: 960 }}>
      <style>{`
        .lhub-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .lhub-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .lhub-city-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .lhub-card-link { text-decoration: none; color: inherit; }
        .lhub-card-link:hover > div { border-color: #059669 !important; background: #F0FDF4 !important; }
        @media(max-width: 900px) { .lhub-grid-3 { grid-template-columns: repeat(2, 1fr) !important; } }
        @media(max-width: 640px) {
          .lhub-grid-3, .lhub-grid-2, .lhub-city-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: "#059669", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Learning Hub</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Build your knowledge</h2>
        <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>Articles, topics, calculators, and city guides — all without leaving the dashboard.</p>
      </div>

      {/* Sub-tab pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: subTab === t.key ? "#064E3B" : "#F1F5F9",
              color: subTab === t.key ? "#fff" : "#64748B",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Articles ── */}
      {subTab === "articles" && (
        <div className="lhub-grid-3">
          {learnArticles.map((article) => {
            const color = CATEGORY_COLORS[article.category] ?? "#64748B";
            return (
              <a
                key={article.slug}
                href={`/learn/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lhub-card-link"
              >
                <div style={{ ...cardStyle, transition: "border-color 0.15s, background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{article.category}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{article.readTime}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", lineHeight: 1.35 }}>{article.title}</div>
                  <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, flex: 1 }}>{article.description}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginTop: 4 }}>Read article →</div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* ── Topics ── */}
      {subTab === "topics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {TOPICS.map((topic) => {
            const articles = topic.slugs
              .map((slug) => learnArticles.find((a) => a.slug === slug))
              .filter(Boolean);
            return (
              <div key={topic.title} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px 26px" }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#064E3B", margin: "0 0 6px" }}>{topic.title}</h3>
                <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 18px", lineHeight: 1.6 }}>{topic.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                  {articles.map((a) => a && (
                    <a
                      key={a.slug}
                      href={`/learn/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "9px 12px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #F1F5F9" }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#064E3B", flex: 1 }}>{a.title}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>{a.readTime}</span>
                      <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>→</span>
                    </a>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", alignSelf: "center" }}>Calculators:</span>
                  {topic.calcs.map((c) => (
                    <a
                      key={c.href}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#D1FAE5", borderRadius: 999, padding: "4px 12px", textDecoration: "none" }}
                    >
                      {c.label}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Calculators ── */}
      {subTab === "calculators" && (
        <div className="lhub-grid-2">
          {CALCULATORS.map((calc) => (
            <a
              key={calc.href}
              href={calc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="lhub-card-link"
            >
              <div style={{ ...cardStyle, transition: "border-color 0.15s, background 0.15s", borderTop: `3px solid ${calc.color}`, gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#064E3B" }}>{calc.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, flex: 1 }}>{calc.desc}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: calc.color }}>Open calculator →</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ── FIRE by City ── */}
      {subTab === "cities" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Filter cities…"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 320,
                padding: "9px 14px",
                border: "1.5px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 14,
                color: "#064E3B",
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
              }}
            />
          </div>

          {sortedStates.length === 0 && (
            <div style={{ color: "#94A3B8", fontSize: 14, padding: "24px 0" }}>No cities match &ldquo;{citySearch}&rdquo;</div>
          )}

          {sortedStates.map((stateName) => (
            <div key={stateName} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#064E3B", margin: 0 }}>{stateName}</h3>
                {byState[stateName][0] && STATE_TAX[byState[stateName][0].state]?.rate === 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#D1FAE5", color: "#065F46", borderRadius: 4, padding: "2px 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    No income tax
                  </span>
                )}
              </div>
              <div className="lhub-city-grid">
                {byState[stateName].map((city) => (
                  <a
                    key={city.key}
                    href={`/fire-number/${city.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lhub-card-link"
                  >
                    <div style={{
                      ...cardStyle,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      transition: "border-color 0.15s, background 0.15s",
                    }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{city.flag}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#064E3B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{city.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{fmt(city.col * 25)} target</div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
