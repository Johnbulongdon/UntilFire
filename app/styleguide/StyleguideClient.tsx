"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Field, Input, Select, Badge, Stat } from "@/components/ui";
import Logo from "@/app/components/Logo";
import { ProjectionSpecimen, CompareSpecimen, SpendSpecimen } from "./ChartSpecimens";
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

const LOGO_FILES = [
  { file: "horizon-color.svg", use: "The mark. App icon, favicon, anywhere the wordmark will not fit." },
  { file: "horizon-wordmark-horizontal.svg", use: "Mark plus wordmark, locked up. Headers and email." },
  { file: "horizon-mark-only.svg", use: "Mark with no background plate." },
  { file: "horizon-mono-light.svg", use: "Single colour, for dark or photographic backdrops." },
];

const DURATIONS = [
  { token: "--uf-dur-1", ms: 120, use: "colour and hover" },
  { token: "--uf-dur-2", ms: 180, use: "controls" },
  { token: "--uf-dur-3", ms: 240, use: "panels and drawers" },
  { token: "--uf-dur-4", ms: 420, use: "entrances" },
];

const EASINGS = [
  { token: "--uf-ease", curve: "cubic-bezier(0.22, 1, 0.36, 1)", use: "the house curve — 22 uses already" },
  { token: "--uf-ease-standard", curve: "cubic-bezier(0.4, 0, 0.2, 1)", use: "symmetrical moves, toggles" },
  { token: "--uf-ease-spring", curve: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "overshoot — confirmations only" },
];

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
  const [replay, setReplay] = useState(0);

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
      <style>{`
        @keyframes uf-sg-sweep { from { width: 0%; } to { width: 100%; } }
        @keyframes uf-sg-slide { from { transform: translateX(0); } to { transform: translateX(244px); } }
      `}</style>
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

        {/* Logo */}
        <Section
          id="logo" title="Logo" source="app/components/Logo.tsx · public/logo/"
          subtitle="Four SVG assets and one component. Use variant=auto anywhere the surface can be either theme — dark and light are fixed colours and will disappear on the wrong ground."
        >
          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 16 }}>Component variants</div>
            {[
              { v: "auto" as const, note: "follows --uf-ink · use this by default" },
              { v: "light" as const, note: "fixed #064E3B · only on a light surface" },
            ].map(({ v, note }) => (
              <Row key={v} label={`variant="${v}"`}>
                <Logo variant={v} size={22} />
                <Logo variant={v} size={28} />
                <Logo variant={v} size={38} />
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{note}</span>
              </Row>
            ))}
            <Row label={'variant="dark"'}>
              <span style={{ background: "var(--uf-green-900)", borderRadius: "var(--uf-r-control)", padding: "12px 16px", display: "inline-flex" }}>
                <Logo variant="dark" size={28} />
              </span>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>fixed #ffffff · needs a dark plate, shown here on --uf-green-900</span>
            </Row>
          </Card>

          <Card>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 16 }}>Assets</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "var(--uf-s4)" }}>
              {LOGO_FILES.map(l => (
                <div key={l.file} style={{ border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-control)", overflow: "hidden" }}>
                  <div style={{ height: 84, display: "grid", placeItems: "center", background: "var(--uf-surface)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/logo/${l.file}`} alt={l.file} style={{ maxWidth: 132, maxHeight: 46 }} />
                  </div>
                  <div style={{ padding: "10px 12px", background: "var(--uf-card)", borderTop: "1px solid var(--uf-border)" }}>
                    <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 10.5, color: "var(--uf-ink-2)" }}>{l.file}</div>
                    <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", marginTop: 4 }}>{l.use}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Charts */}
        <Section
          id="charts" title="Charts" source="app/styleguide/ChartSpecimens.tsx · Recharts"
          subtitle="Three series colours, and three is the ceiling rather than a starting point — a fourth hue could not clear the colour-blind separation floor against these three, so a fourth series folds into Other or becomes a second chart."
        >
          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 12 }}>Series palette</div>
            <div style={{ display: "flex", gap: "var(--uf-s3)", flexWrap: "wrap", marginBottom: 14 }}>
              {["--uf-chart-1", "--uf-chart-2", "--uf-chart-3"].map((t, i) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-control)", padding: "8px 12px" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: `var(${t})` }} />
                  <span>
                    <span style={{ fontFamily: "var(--uf-font-mono)", fontSize: 11, color: "var(--uf-ink-2)", display: "block" }}>{t}</span>
                    <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>slot {i + 1}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0, maxWidth: 640 }}>
              Assign in fixed order and let colour follow the entity, never its rank: if a filter changes how many
              series are showing, the survivors keep the colours they had. The dark steps are chosen against the dark
              surface rather than lightened from these, and they sit inside the tritan floor band — which is why a
              legend is mandatory here rather than optional.
            </p>
          </Card>

          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 4 }}>One series — no legend, the title names it</div>
            <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Portfolio against the FIRE target</div>
            <ProjectionSpecimen />
          </Card>

          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 4 }}>Two series — legend required</div>
            <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>One y-axis. Never a second scale on the right.</div>
            <CompareSpecimen />
          </Card>

          <Card>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 4 }}>Magnitude — one hue, sorted, Other in muted</div>
            <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Categories are magnitudes, not identities, so they do not need separate hues</div>
            <SpendSpecimen />
          </Card>
        </Section>

        {/* Motion */}
        <Section
          id="motion" title="Motion" source="app/globals.css — --uf-dur-* / --uf-ease-*"
          subtitle="Four durations and three curves. Before these existed the app carried six hand-typed cubic-beziers and about thirty keyframes across seven files, seven of which were the same fade-and-rise."
        >
          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Duration</div>
              <div style={{ flex: 1 }} />
              <Button size="sm" variant="secondary" onClick={() => setReplay(n => n + 1)}>Replay</Button>
            </div>
            {DURATIONS.map(d => (
              <Row key={d.token} label={d.token}>
                <div style={{ width: 260, height: 10, background: "var(--uf-surface-2)", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    key={`${d.token}-${replay}`}
                    style={{
                      height: "100%", background: "var(--uf-teal)", borderRadius: 999,
                      animation: `uf-sg-sweep ${d.ms}ms var(--uf-ease) both`,
                    }}
                  />
                </div>
                <span style={{ fontFamily: "var(--uf-font-mono)", fontSize: 12, color: "var(--uf-ink-2)", width: 54 }}>{d.ms}ms</span>
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{d.use}</span>
              </Row>
            ))}
          </Card>

          <Card style={{ marginBottom: "var(--uf-s4)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>Easing</div>
            {EASINGS.map(e => (
              <Row key={e.token} label={e.token}>
                <div style={{ width: 260, height: 26, position: "relative" }}>
                  <div
                    key={`${e.token}-${replay}`}
                    style={{
                      position: "absolute", top: 5, left: 0, width: 16, height: 16, borderRadius: 5,
                      background: "var(--uf-green)",
                      animation: `uf-sg-slide 620ms var(${e.token}) both`,
                    }}
                  />
                </div>
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", maxWidth: 300 }}>{e.use}</span>
              </Row>
            ))}
            <Row label="curve">
              <code style={{ fontFamily: "var(--uf-font-mono)", fontSize: 11, color: "var(--uf-ink-2)" }}>
                {EASINGS.map(e => e.curve).join("   ·   ")}
              </code>
            </Row>
          </Card>

          <Card>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: 14 }}>The entrance</div>
            <div style={{ display: "flex", gap: "var(--uf-s3)", flexWrap: "wrap" }}>
              {[0, 1, 2].map(i => (
                <div
                  key={`rise-${i}-${replay}`}
                  style={{
                    flex: "1 1 0", minWidth: 150, background: "var(--uf-surface)", border: "1px solid var(--uf-border)",
                    borderRadius: "var(--uf-r-control)", padding: "16px 18px",
                    animation: `uf-rise var(--uf-dur-4) var(--uf-ease) ${i * 70}ms both`,
                  }}
                >
                  <div className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>Card {i + 1}</div>
                  <div style={{ fontFamily: "var(--uf-font-mono)", fontSize: 18, marginTop: 6 }}>{i * 70}ms</div>
                </div>
              ))}
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "14px 0 0", maxWidth: 640 }}>
              One shared <code style={{ fontFamily: "var(--uf-font-mono)" }}>uf-rise</code> keyframe, staggered 70ms.
              Reach for this before declaring another fade-and-rise. Anything decorative also needs
              a <code style={{ fontFamily: "var(--uf-font-mono)" }}>prefers-reduced-motion</code> escape — add
              the <code style={{ fontFamily: "var(--uf-font-mono)" }}>uf-anim</code> class and globals.css handles it.
            </p>
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
