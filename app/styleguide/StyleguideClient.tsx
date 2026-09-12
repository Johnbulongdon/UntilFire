"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Field, Input, Select, Badge, Stat } from "@/components/ui";
import type { ButtonVariant, ButtonSize } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import type { CardElevation } from "@/components/ui";
import type { StatTone, StatSize } from "@/components/ui";

/* ── token inventory, mirroring app/globals.css ─────────────────────── */

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: "Ground and surfaces", tokens: ["--uf-ground", "--uf-card", "--uf-surface", "--uf-surface-2", "--uf-border", "--uf-border-2"] },
  { title: "Ink", tokens: ["--uf-ink", "--uf-ink-2", "--uf-ink-3"] },
  { title: "Green — acts", tokens: ["--uf-green", "--uf-green-700", "--uf-green-900", "--uf-green-100", "--uf-green-50"] },
  { title: "Teal — means freedom", tokens: ["--uf-teal", "--uf-teal-deep", "--uf-teal-soft", "--uf-teal-line"] },
  { title: "Status", tokens: ["--uf-pos", "--uf-neg", "--uf-neg-bg", "--uf-warn", "--uf-warn-bg"] },
  { title: "Status ink — for 11px badge text", tokens: ["--uf-pos-ink", "--uf-neg-ink", "--uf-warn-ink"] },
];

const TYPE_STEPS: { cls: string; note: string }[] = [
  { cls: "uf-t-display", note: "56 · Fraunces · the freedom date" },
  { cls: "uf-t-h1", note: "34 · Fraunces · page titles" },
  { cls: "uf-t-h2", note: "24 · Fraunces · section titles" },
  { cls: "uf-t-h3", note: "18 · Manrope 700" },
  { cls: "uf-t-lead", note: "16 · Manrope 400" },
  { cls: "uf-t-body", note: "14 · Manrope 400 · default" },
  { cls: "uf-t-small", note: "13 · Manrope 400" },
  { cls: "uf-t-label", note: "11 · Manrope 700 · uppercase" },
];

const RADII = [
  { token: "--uf-r-control", label: "control", px: 12 },
  { token: "--uf-r-card", label: "card", px: 20 },
  { token: "--uf-r-modal", label: "modal", px: 28 },
  { token: "--uf-r-pill", label: "pill — every button", px: 999 },
];

const SPACE = [
  ["--uf-s1", 4], ["--uf-s2", 8], ["--uf-s3", 12], ["--uf-s4", 16],
  ["--uf-s5", 24], ["--uf-s6", 32], ["--uf-s7", 48],
] as const;

const BUTTON_VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];
const BUTTON_SIZES: ButtonSize[] = ["sm", "md", "lg"];
const BADGE_TONES: BadgeTone[] = ["positive", "negative", "warning", "freedom", "muted"];
const CARD_ELEVATIONS: CardElevation[] = ["flat", "raised", "float"];
const STAT_TONES: StatTone[] = ["default", "positive", "negative", "freedom"];
const STAT_SIZES: StatSize[] = ["md", "lg", "display"];

/* ── layout helpers, local to this page ─────────────────────────────── */

function Section({ id, title, subtitle, source, children }: {
  id: string; title: string; subtitle: string; source: string; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 64, scrollMarginTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 className="uf-t-h2" style={{ margin: 0, color: "var(--uf-ink)" }}>{title}</h2>
        <p className="uf-t-small" style={{ margin: "6px 0 0", color: "var(--uf-ink-2)", maxWidth: 620 }}>{subtitle}</p>
        <code style={{
          display: "inline-block", marginTop: 8, fontFamily: "var(--uf-font-mono)", fontSize: 11,
          color: "var(--uf-ink-3)", background: "var(--uf-surface)", border: "1px solid var(--uf-border)",
          borderRadius: 6, padding: "2px 7px",
        }}>{source}</code>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--uf-s4)", padding: "12px 0", borderTop: "1px solid var(--uf-border)" }}>
      <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 11, color: "var(--uf-ink-3)", width: 128, flexShrink: 0 }}>{label}</code>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--uf-s3)", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export default function StyleguideClient() {
  const [dark, setDark] = useState(false);
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Read what each token actually computes to in the theme on screen, so the
  // swatch labels are the real values rather than a copy that can go stale.
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const g of COLOR_GROUPS) for (const t of g.tokens) next[t] = cs.getPropertyValue(t).trim();
    setResolved(next);
  }, [dark]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("uf-theme", next ? "dark" : "light"); } catch { /* private mode */ }
  }

  const tokenCount = COLOR_GROUPS.reduce((n, g) => n + g.tokens.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--uf-ground)", color: "var(--uf-ink)", fontFamily: "var(--uf-font)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 96px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "flex-start", gap: "var(--uf-s4)", marginBottom: 48 }}>
          <div style={{ flex: 1 }}>
            <div className="uf-t-label" style={{ color: "var(--uf-teal)" }}>Design system</div>
            <h1 className="uf-t-h1" style={{ margin: "10px 0 0" }}>The UI kit</h1>
            <p className="uf-t-lead" style={{ margin: "12px 0 0", color: "var(--uf-ink-2)", maxWidth: 620 }}>
              Every primitive in <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 14 }}>components/ui</code> and
              every colour token in <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 14 }}>globals.css</code>,
              rendered by the real components. Flip the theme to check both.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            {dark ? "Cream" : "Dark"}
          </Button>
        </header>

        {/* Contents */}
        <Card elevation="flat" style={{ background: "var(--uf-surface)", marginBottom: 56 }}>
          <div style={{ display: "flex", gap: "var(--uf-s5)", flexWrap: "wrap" }}>
            {[
              ["5", "primitives"],
              [String(tokenCount), "colour tokens"],
              ["8", "type steps"],
              ["4", "radii"],
              ["3", "elevations"],
              ["7", "space steps"],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{n}</div>
                <div className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Button */}
        <Section
          id="button" title="Button" source="components/ui/Button.tsx"
          subtitle="Four variants, three sizes. Primary is the only green-filled button on a screen — if two things are both primary, one of them is not. Teal is never a button."
        >
          <Card>
            {BUTTON_VARIANTS.map(v => (
              <Row key={v} label={`variant="${v}"`}>
                {BUTTON_SIZES.map(s => (
                  <Button key={s} variant={v} size={s}>{s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}</Button>
                ))}
              </Row>
            ))}
            <Row label="disabled">
              {BUTTON_VARIANTS.map(v => <Button key={v} variant={v} disabled>Disabled</Button>)}
            </Row>
            <Row label="fullWidth">
              <div style={{ width: 420 }}><Button variant="primary" fullWidth>Find my freedom date</Button></div>
            </Row>
          </Card>
        </Section>

        {/* Badge */}
        <Section
          id="badge" title="Badge" source="components/ui/Badge.tsx"
          subtitle="The status pill. Five tones. freedom is the teal one and belongs to progress toward the freedom date — generic good news is positive."
        >
          <Card>
            {BADGE_TONES.map(t => (
              <Row key={t} label={`tone="${t}"`}>
                <Badge tone={t}>{t === "freedom" ? "2.4 years earlier" : t === "positive" ? "On track" : t === "negative" ? "Over budget" : t === "warning" ? "Needs input" : "Draft"}</Badge>
              </Row>
            ))}
          </Card>
        </Section>

        {/* Card */}
        <Section
          id="card" title="Card" source="components/ui/Card.tsx"
          subtitle="The surface. Flat for anything already inside a card, raised for the default card, float for popovers and modals."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--uf-s4)" }}>
            {CARD_ELEVATIONS.map(e => (
              <Card key={e} elevation={e}>
                <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>elevation</div>
                <div className="uf-t-h3" style={{ marginTop: 6 }}>{e}</div>
                <div className="uf-t-small" style={{ color: "var(--uf-ink-2)", marginTop: 8 }}>
                  {e === "flat" ? "No shadow" : e === "raised" ? "--uf-e1" : "--uf-e2"}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Field */}
        <Section
          id="field" title="Field, Input, Select" source="components/ui/Field.tsx"
          subtitle="A labelled control with an optional hint or error. Set numeric on anything holding a figure — it switches to DM Mono with tabular numerals so decimals line up in a column."
        >
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--uf-s5)" }}>
              <Field label="Monthly savings" hint="Whatever you put aside each month">
                <Input defaultValue="1,500" numeric />
              </Field>
              <Field label="Target city">
                <Select defaultValue="lisbon">
                  <option value="lisbon">Lisbon, Portugal</option>
                  <option value="nyc">New York City, NY</option>
                </Select>
              </Field>
              <Field label="Net worth" error="Enter a number">
                <Input defaultValue="abc" />
              </Field>
              <Field label="Plain text" hint="numeric is off, so this uses Manrope">
                <Input defaultValue="Not a figure" />
              </Field>
            </div>
          </Card>
        </Section>

        {/* Stat */}
        <Section
          id="stat" title="Stat" source="components/ui/Stat.tsx"
          subtitle="Label, figure, delta. The figure is always DM Mono with tabular numerals. tone=freedom is the teal treatment and belongs only to the freedom date and time saved."
        >
          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--uf-s5)" }}>
              {STAT_TONES.map(t => (
                <Stat
                  key={t}
                  label={`tone ${t}`}
                  value={t === "freedom" ? "2044" : "$1,500,000"}
                  delta={t === "freedom" ? "2.4 years earlier" : t === "negative" ? "−$210 vs plan" : "+$210 vs plan"}
                  tone={t}
                />
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--uf-s7)", flexWrap: "wrap" }}>
              {STAT_SIZES.map(s => (
                <Stat key={s} label={`size ${s}`} value={s === "display" ? "2044" : "$1,500,000"} size={s} tone={s === "display" ? "freedom" : "default"} />
              ))}
            </div>
          </Card>
        </Section>

        {/* Colour */}
        <Section
          id="colour" title="Colour tokens" source="app/globals.css"
          subtitle="Values below are read off the page you are looking at, so they are whatever the current theme resolves to. Never write a hex in a component — a colour with no token needs a token."
        >
          {COLOR_GROUPS.map(g => (
            <div key={g.title} style={{ marginBottom: "var(--uf-s5)" }}>
              <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 10 }}>{g.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: "var(--uf-s3)" }}>
                {g.tokens.map(t => (
                  <div key={t} style={{ border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-control)", overflow: "hidden" }}>
                    <div style={{ height: 52, background: `var(${t})`, borderBottom: "1px solid var(--uf-border)" }} />
                    <div style={{ padding: "8px 10px", background: "var(--uf-card)" }}>
                      <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-2)" }}>{t}</div>
                      <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-3)", marginTop: 2 }}>{resolved[t] || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* Type */}
        <Section
          id="type" title="Type scale" source="app/globals.css — .uf-t-*"
          subtitle="Eight steps and nothing between them. Fraunces is display only; Manrope is body; DM Mono with tabular numerals is every figure."
        >
          <Card>
            {TYPE_STEPS.map(s => (
              <div key={s.cls} style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s4)", padding: "14px 0", borderTop: "1px solid var(--uf-border)" }}>
                <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 11, color: "var(--uf-ink-3)", width: 128, flexShrink: 0 }}>.{s.cls}</code>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.cls} style={{ color: "var(--uf-ink)" }}>Make work optional</div>
                  <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", marginTop: 4 }}>{s.note}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s4)", padding: "14px 0", borderTop: "1px solid var(--uf-border)" }}>
              <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 11, color: "var(--uf-ink-3)", width: 128, flexShrink: 0 }}>.uf-t-data</code>
              <div className="uf-t-data" style={{ fontSize: 20 }}>1,234,567.89</div>
            </div>
          </Card>
        </Section>

        {/* Radius + elevation + space */}
        <Section
          id="shape" title="Radius, elevation, space" source="app/globals.css"
          subtitle="Pick the nearest step; never invent one in between. Buttons are always full pills."
        >
          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Radius</div>
            <div style={{ display: "flex", gap: "var(--uf-s4)", flexWrap: "wrap" }}>
              {RADII.map(r => (
                <div key={r.token} style={{ textAlign: "center" }}>
                  <div style={{ width: 92, height: 62, background: "var(--uf-surface-2)", border: "1px solid var(--uf-border-2)", borderRadius: `var(${r.token})` }} />
                  <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-3)", marginTop: 7 }}>{r.px === 999 ? "999" : r.px}px</div>
                  <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{r.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Elevation</div>
            <div style={{ display: "flex", gap: "var(--uf-s6)", flexWrap: "wrap" }}>
              {["--uf-e1", "--uf-e2", "--uf-e3"].map(e => (
                <div key={e} style={{ textAlign: "center" }}>
                  <div style={{ width: 112, height: 62, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-card)", boxShadow: `var(${e})` }} />
                  <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-3)", marginTop: 9 }}>{e}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Space</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--uf-s4)" }}>
              {SPACE.map(([t, px]) => (
                <div key={t} style={{ textAlign: "center" }}>
                  <div style={{ width: px, height: px, background: "var(--uf-teal-line)", borderRadius: 3 }} />
                  <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-3)", marginTop: 8 }}>{px}</div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", borderTop: "1px solid var(--uf-border)", paddingTop: 20 }}>
          Rules and rationale live in <code style={{ fontFamily: "var(--uf-font-mono)" }}>docs/design/design-system.md</code>.
          When you add a variant to a primitive, add it here too.
        </p>
      </div>
    </div>
  );
}
