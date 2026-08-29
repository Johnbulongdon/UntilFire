"use client";

import { useEffect, useMemo, useState } from "react";
import {
  US, GB, CA, AU, NZ, SG, AE, DE, FR, NL, JP, MX, CH, IE, ES, IT, PT, SE, NO, DK, BE, AT, PL, CZ, GR, FI,
  KR, TW, CN, IN, TH, MY, ID, PH, VN, HK, BR, AR, CL, CO, PE, CR, PA, IL, SA, QA, ZA, KE, NG, EG, TR,
} from "country-flag-icons/react/3x2";
import { Button, Card, Badge, Select } from "@/components/ui";
import {
  CITIZENSHIP_SCORES, CITIZENSHIP_TAX_RATE_LABEL, CITIZENSHIP_CGT_LABEL, CITIZENSHIP_ACCOUNT_LABEL,
  citizenshipScore, citizenshipBand,
  type CitizenshipScore, type CitizenshipBand,
} from "@/lib/citizenship-data";

// Real SVG flags, not emoji — flag emoji is two "regional indicator"
// characters that some fonts (older Windows, several Linux emoji font
// packages that ship without flag glyphs for licensing reasons) render as
// literal letter pairs instead of composing into a flag, which is exactly
// the "shows SG instead of the flag" bug this replaces. Keyed by this
// file's own citizenship codes, not ISO directly, since a few (uk, in_ind,
// il_isr, ar_lat, co_col, pa_pan, id_idn) don't match their ISO-3166 code.
const FLAG_COMPONENTS: Record<string, typeof US> = {
  us: US, uk: GB, ca: CA, au: AU, nz: NZ, sg: SG, ae: AE, de: DE, fr: FR, nl: NL, jp: JP, mx: MX,
  ch: CH, ie: IE, es: ES, it: IT, pt: PT, se: SE, no: NO, dk: DK, be: BE, at: AT, pl: PL, cz: CZ,
  gr: GR, fi: FI, kr: KR, tw: TW, cn: CN, in_ind: IN, th: TH, my: MY, id_idn: ID, ph: PH, vn: VN,
  hk: HK, br: BR, ar_lat: AR, cl: CL, co_col: CO, pe: PE, cr: CR, pa_pan: PA, il_isr: IL, sa: SA,
  qa: QA, za: ZA, ke: KE, ng: NG, eg: EG, tr: TR,
};

function Flag({ code, size = 28 }: { code: string; size?: number }) {
  const FlagSvg = FLAG_COMPONENTS[code];
  if (!FlagSvg) return null;
  // A thin border, since several flags (Japan, Poland, Monaco...) are mostly
  // or entirely white and otherwise disappear against the app's cream ground.
  return <FlagSvg style={{ width: size, height: size * (2 / 3), flexShrink: 0, borderRadius: 3, border: "1px solid var(--uf-border)" }} />;
}

const CITIZENSHIP_STORAGE_KEY = "uf_citizenship";

type SortKey = "score" | "tax" | "retirement" | "investment" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Highest score" },
  { key: "tax", label: "Tax burden" },
  { key: "retirement", label: "Retirement access" },
  { key: "investment", label: "Investment freedom" },
  { key: "az", label: "A–Z" },
];

const BAND_TONE: Record<CitizenshipBand["cls"], "positive" | "warning" | "negative"> = {
  strong: "positive",
  workable: "warning",
  friction: "negative",
};

const BAND_RING: Record<CitizenshipBand["cls"], string> = {
  strong: "var(--uf-pos)",
  workable: "var(--uf-warn)",
  friction: "var(--uf-neg)",
};

function ScoreRing({ score, band, size = 52 }: { score: number; band: CitizenshipBand; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--uf-surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={BAND_RING[band.cls]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: "var(--uf-ink)" }}>
        {score}
      </div>
    </div>
  );
}

function SubscoreRow({ label, hint, value, max }: { label: string; hint?: string; value: number; max: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, fontSize: 13, color: "var(--uf-ink-2)" }}>
      <span>
        {label}
        {hint && <span style={{ color: "var(--uf-ink-3)", fontSize: 12 }}> — {hint}</span>}
      </span>
      <span style={{ flexShrink: 0, fontWeight: 700, color: "var(--uf-ink)", fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" }}>{value}/{max}</span>
    </div>
  );
}

function CitizenshipCard({ c, rank, mine, open, onToggle }: { c: CitizenshipScore; rank: number; mine: boolean; open: boolean; onToggle: () => void }) {
  const score = citizenshipScore(c);
  const band = citizenshipBand(score);
  return (
    <Card
      elevation="raised"
      padded={false}
      style={{ borderColor: mine ? "var(--uf-green)" : "var(--uf-border)", borderWidth: mine ? "1.5px" : "1px", overflow: "hidden" }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "var(--uf-s4)",
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left", font: "inherit",
        }}
      >
        <span
          style={{
            fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12, fontWeight: 700,
            color: "var(--uf-ink-3)", width: 22, flexShrink: 0, textAlign: "right",
          }}
        >
          #{rank}
        </span>
        <Flag code={c.code} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--uf-font-display)", fontWeight: 800, fontSize: 15, color: "var(--uf-ink)" }}>{c.name}</span>
            {mine && <Badge tone="freedom">Yours</Badge>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <Badge tone={BAND_TONE[band.cls]}>{band.label}</Badge>
          </div>
          <div style={{ fontSize: 12, color: "var(--uf-ink-3)", fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
            {CITIZENSHIP_TAX_RATE_LABEL[c.code] ?? "Rate unavailable"}
          </div>
        </div>
        <ScoreRing score={score} band={band} />
      </button>
      {open && (
        <div style={{ padding: "0 var(--uf-s4) var(--uf-s4)", borderTop: "1px solid var(--uf-border)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "var(--uf-s3)", marginBottom: "var(--uf-s4)" }}>
            <SubscoreRow label="Tax burden" hint={CITIZENSHIP_TAX_RATE_LABEL[c.code]} value={c.tax} max={40} />
            <SubscoreRow label="Retirement access" value={c.retirement} max={30} />
            <SubscoreRow label="Investment freedom" value={c.investment} max={30} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--uf-s3)", marginBottom: "var(--uf-s4)" }}>
            <div style={{ background: "var(--uf-surface)", borderRadius: "var(--uf-r-control)", padding: "var(--uf-s3)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--uf-ink-3)", marginBottom: 4 }}>Capital gains</div>
              <div style={{ fontSize: 13, color: "var(--uf-ink)", lineHeight: 1.4 }}>{CITIZENSHIP_CGT_LABEL[c.code] ?? "Varies — verify current rules"}</div>
            </div>
            <div style={{ background: "var(--uf-surface)", borderRadius: "var(--uf-r-control)", padding: "var(--uf-s3)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--uf-ink-3)", marginBottom: 4 }}>Retirement account</div>
              <div style={{ fontSize: 13, color: "var(--uf-ink)", lineHeight: 1.4 }}>{CITIZENSHIP_ACCOUNT_LABEL[c.code] ?? "Varies — verify current rules"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--uf-s4)" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--uf-pos-ink)", marginBottom: 8 }}>Strengths</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                {c.strengths.map((s) => (
                  <li key={s} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--uf-ink-2)", paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--uf-ink-3)" }}>–</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--uf-neg-ink)", marginBottom: 8 }}>Weaknesses</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                {c.weaknesses.map((s) => (
                  <li key={s} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--uf-ink-2)", paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--uf-ink-3)" }}>–</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CitizenshipTab() {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [mineCode, setMineCode] = useState<string>("");

  useEffect(() => {
    try {
      setMineCode(localStorage.getItem(CITIZENSHIP_STORAGE_KEY) ?? "");
    } catch { /* ignore */ }
  }, []);

  function pickMine(code: string) {
    setMineCode(code);
    try { localStorage.setItem(CITIZENSHIP_STORAGE_KEY, code); } catch { /* ignore */ }
  }

  const sorted = useMemo(() => {
    const items = [...CITIZENSHIP_SCORES];
    if (sortKey === "az") items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === "tax") items.sort((a, b) => b.tax - a.tax);
    else if (sortKey === "retirement") items.sort((a, b) => b.retirement - a.retirement);
    else if (sortKey === "investment") items.sort((a, b) => b.investment - a.investment);
    else items.sort((a, b) => citizenshipScore(b) - citizenshipScore(a));
    return items;
  }, [sortKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s5)" }}>
      <div>
        <div style={{ fontFamily: "var(--uf-font-display)", fontWeight: 800, fontSize: 22, color: "var(--uf-ink)", letterSpacing: "-0.02em" }}>
          Citizenship
        </div>
        <div style={{ fontSize: 13, color: "var(--uf-ink-2)", marginTop: 2 }}>
          How citizenship — not just where you live — shapes the path to FIRE
        </div>
      </div>

      <Card elevation="flat" style={{ background: "var(--uf-surface)", fontSize: 13, color: "var(--uf-ink-2)", lineHeight: 1.6 }}>
        Scored out of 100 across tax burden (40), retirement account access (30), and investment
        freedom (30) — plus the real numbers behind them: income tax rate, capital gains tax, and
        the actual retirement account each citizenship gives you. Cost of living is not part of
        this score — it varies far more by city than by citizenship, so that lives in Expat FIRE
        with real per-city numbers instead. This is general, simplified content, not personalized
        tax or legal advice — rules change and vary by individual circumstance, so verify anything
        that matters for your actual decisions. This is separate from your tax/residence settings
        in Profile, which are about where you currently live rather than which passport you hold.
      </Card>

      <div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-ink-3)", marginBottom: 8 }}>
          Which citizenship is yours?
        </div>
        <Select value={mineCode} onChange={(e) => pickMine(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">Not set</option>
          {[...CITIZENSHIP_SCORES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SORTS.map((s) => (
          <Button key={s.key} size="sm" variant={sortKey === s.key ? "primary" : "secondary"} onClick={() => setSortKey(s.key)}>
            {s.label}
          </Button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {sorted.map((c, i) => (
          <CitizenshipCard
            key={c.code}
            c={c}
            rank={i + 1}
            mine={c.code === mineCode}
            open={openCode === c.code}
            onToggle={() => setOpenCode((prev) => (prev === c.code ? null : c.code))}
          />
        ))}
      </div>
    </div>
  );
}
