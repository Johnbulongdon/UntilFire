"use client";

import { useEffect, useMemo, useState } from "react";
import {
  US, GB, CA, AU, NZ, SG, AE, DE, FR, NL, JP, MX, CH, IE, ES, IT, PT, SE, NO, DK, BE, AT, PL, CZ, GR, FI,
  KR, TW, CN, IN, TH, MY, ID, PH, VN, HK, BR, AR, CL, CO, PE, CR, PA, IL, SA, QA, ZA, KE, NG, EG, TR,
} from "country-flag-icons/react/3x2";
import { Button, Select } from "@/components/ui";
import { PillTabs, MoneyHead, MoneyKey, MoneyList, MoneyRow, MoneyTrack, StackBar, Fig } from "./MoneyCards";
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

// Calm Citizenship (D-46): your passport's score first, what it means as rows,
// then the other passports as a list. Score parts keep one colour each.
type SortKey = "score" | "tax" | "retirement" | "investment" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Top" },
  { key: "tax", label: "Tax" },
  { key: "retirement", label: "Accounts" },
  { key: "investment", label: "Invest" },
  { key: "az", label: "A–Z" },
];

const PARTS = [
  { key: "tax", name: "Tax", max: 40, color: "#2a78d6" },
  { key: "retirement", name: "Retirement accounts", max: 30, color: "#1baf7a" },
  { key: "investment", name: "Investing", max: 30, color: "#6b5bd2" },
] as const;

const BAND_WORD: Record<CitizenshipBand["cls"], string> = { strong: "Strong", workable: "Workable", friction: "Friction" };
const BAND_INK: Record<CitizenshipBand["cls"], string> = { strong: "var(--uf-pos-ink)", workable: "var(--uf-warn-ink)", friction: "var(--uf-neg-ink)" };
const ranked = [...CITIZENSHIP_SCORES].sort((a, b) => citizenshipScore(b) - citizenshipScore(a));
const byName = [...CITIZENSHIP_SCORES].sort((a, b) => a.name.localeCompare(b.name));

function weakestPart(c: CitizenshipScore) {
  return [...PARTS].sort((a, b) => c[a.key] / a.max - c[b.key] / b.max)[0];
}

function Section({ t }: { t: string }) {
  return <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>{t}</div>;
}

/** A sentence with a ✓ or !, in words as well as colour. */
function Point({ ok, t }: { ok: boolean; t: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--uf-border)" }}>
      <span aria-hidden style={{ flex: "none", width: 24, height: 24, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
        background: `color-mix(in srgb, ${ok ? "#1baf7a" : "#e34948"} 16%, transparent)`, color: ok ? "var(--uf-pos-ink)" : "var(--uf-neg-ink)" }}>{ok ? "✓" : "!"}</span>
      <span className="uf-t-body" style={{ color: "var(--uf-ink-2)", minWidth: 0 }}>{t}</span>
    </div>
  );
}

function Score({ c }: { c: CitizenshipScore }) {
  return <><span style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" }}>{citizenshipScore(c)}</span><span className="uf-t-body" style={{ color: "var(--uf-ink-3)" }}> / 100</span></>;
}

function ScoreBar({ c }: { c: CitizenshipScore }) {
  return <>
    <StackBar total={100} label={`${c.name}: score by part`} parts={PARTS.map(p => ({ key: p.key, color: p.color, value: c[p.key] }))} />
    <MoneyKey items={PARTS.map(p => <><i aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: 9, background: p.color, marginRight: 6 }} />{p.name} <Fig>{c[p.key]}</Fig>/<Fig>{p.max}</Fig></>)} />
  </>;
}

/** Accounts, gains and income tax as rows, then the strengths and watch-outs. */
function PassportFacts({ c }: { c: CitizenshipScore }) {
  return <>
    <MoneyList>
      <MoneyRow dot={PARTS[1].color} icon="🏦" name="Retirement accounts" meta={CITIZENSHIP_ACCOUNT_LABEL[c.code] ?? "Varies — verify current rules"} value={<><Fig>{c.retirement}</Fig>/30</>} />
      <MoneyRow dot={PARTS[2].color} icon="📈" name="Capital gains" meta={CITIZENSHIP_CGT_LABEL[c.code] ?? "Varies — verify current rules"} value={<><Fig>{c.investment}</Fig>/30</>} />
      <MoneyRow dot={PARTS[0].color} icon="🧾" name="Income tax" meta={CITIZENSHIP_TAX_RATE_LABEL[c.code] ?? "Rate unavailable"} value={<><Fig>{c.tax}</Fig>/40</>} />
    </MoneyList>
    <Section t="Watch out for" />
    <div>{c.weaknesses.map(t => <Point key={t} ok={false} t={t} />)}</div>
    <Section t="Good for FIRE" />
    <div>{c.strengths.map(t => <Point key={t} ok t={t} />)}</div>
  </>;
}

export default function CitizenshipTab({ onOpenExpat }: { onOpenExpat?: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [mineCode, setMineCode] = useState<string>("");
  const [showAll, setShowAll] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    try {
      setMineCode(localStorage.getItem(CITIZENSHIP_STORAGE_KEY) ?? "");
    } catch { /* ignore */ }
  }, []);

  function pickMine(code: string) {
    setMineCode(code);
    setChanging(false);
    try { localStorage.setItem(CITIZENSHIP_STORAGE_KEY, code); } catch { /* ignore */ }
  }

  const sorted = useMemo(() => {
    if (sortKey === "az") return byName;
    if (sortKey === "score") return ranked;
    return [...CITIZENSHIP_SCORES].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [sortKey]);

  const mine = CITIZENSHIP_SCORES.find(c => c.code === mineCode);
  const picker = (
    <Select aria-label="Your citizenship" value={mineCode} onChange={(e) => pickMine(e.target.value)} style={{ maxWidth: 320 }}>
      <option value="">Choose a country</option>
      {byName.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </Select>
  );
  const note = (
    <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
      General, simplified guidance, not tax or legal advice; rules change, so verify anything you act on.
      {onOpenExpat && <>{" "}<button type="button" onClick={onOpenExpat} style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--uf-ink-2)", textDecoration: "underline", cursor: "pointer" }}>Where to live is in Expat FIRE</button></>}
    </span>
  );

  const open = openCode ? CITIZENSHIP_SCORES.find(c => c.code === openCode) : undefined;
  if (open) {
    const band = citizenshipBand(citizenshipScore(open));
    const diff = mine ? citizenshipScore(open) - citizenshipScore(mine) : null;
    return (
      <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <button type="button" onClick={() => setOpenCode(null)} style={{ justifySelf: "start", background: "none", border: 0, padding: "4px 0", font: "inherit", color: "var(--uf-ink-2)", cursor: "pointer" }}>‹ All passports</button>
        <MoneyHead label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Flag code={open.code} size={20} />{open.name}</span>} value={<Score c={open} />}
          sub={<><b style={{ color: BAND_INK[band.cls] }}>{BAND_WORD[band.cls]}</b>{open.code === mineCode ? " · your passport" : diff === null ? null : diff === 0 ? " · the same as yours" : <> · <Fig>{Math.abs(diff)}</Fig> points {diff > 0 ? "above" : "below"} yours</>}</>}>
          <ScoreBar c={open} />
        </MoneyHead>
        <PassportFacts c={open} />
        {open.code !== mineCode && <div><Button variant="secondary" size="sm" onClick={() => { pickMine(open.code); setOpenCode(null); }}>This is my passport</Button></div>}
        {note}
      </div>
    );
  }

  const top = showAll ? sorted : sorted.slice(0, 6);
  const shown = mine && !top.includes(mine) ? [...top, mine] : top;

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {!mine ? (
        <MoneyHead label="Your passport and FIRE" value={<span style={{ fontFamily: "var(--uf-font-display)", fontSize: 26 }}>Which passport do you hold?</span>}
          sub="Your passport decides how you're taxed abroad, which retirement accounts you can use and where you can invest.">
          {picker}
        </MoneyHead>
      ) : (() => {
        const band = citizenshipBand(citizenshipScore(mine));
        const rank = ranked.indexOf(mine) + 1;
        return (
          <MoneyHead label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Flag code={mine.code} size={20} />Your {mine.name} passport</span>} value={<Score c={mine} />}
            sub={<><b style={{ color: BAND_INK[band.cls] }}>{BAND_WORD[band.cls]}</b> · ranks <Fig>{rank}</Fig> of <Fig>{ranked.length}</Fig>. Weakest on {weakestPart(mine).name.toLowerCase()}.</>}>
            <ScoreBar c={mine} />
            {changing ? picker : <button type="button" onClick={() => setChanging(true)} style={{ justifySelf: "start", background: "none", border: 0, padding: 0, font: "inherit", color: "var(--uf-ink-2)", textDecoration: "underline", cursor: "pointer" }}>Change passport</button>}
          </MoneyHead>
        );
      })()}

      {mine && <>
        <Section t="What it means for you" />
        <PassportFacts c={mine} />
      </>}
      {note}

      <Section t="Compare passports" />
      <div style={{ minWidth: 0 }}><PillTabs label="Sort passports" value={sortKey} onChange={setSortKey} options={SORTS} /></div>
      <MoneyList footer={<Button variant="secondary" size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? "Show fewer" : `See all ${sorted.length}`}</Button>}>
        {shown.map(c => {
          const score = citizenshipScore(c), band = citizenshipBand(score), isMine = c.code === mineCode;
          return (
            <MoneyRow key={c.code} dot="var(--uf-ink-3)" icon={<Flag code={c.code} size={20} />} name={isMine ? `${c.name} · yours` : c.name}
              meta={`${BAND_WORD[band.cls]} · ${CITIZENSHIP_TAX_RATE_LABEL[c.code] ?? "Rate unavailable"}`}
              value={String(sortKey === "tax" || sortKey === "retirement" || sortKey === "investment" ? `${c[sortKey]}/${PARTS.find(p => p.key === sortKey)!.max}` : score)} strong
              bar={<MoneyTrack share={score / 100} color={isMine ? "var(--uf-ink-3)" : "var(--uf-teal)"} label={`${c.name}: ${score} of 100`} />}
              onClick={() => setOpenCode(c.code)} />
          );
        })}
      </MoneyList>

      <details className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>
        <summary style={{ cursor: "pointer" }}>How it&apos;s scored</summary>
        <p style={{ margin: "8px 0 0" }}>
          Out of 100: tax burden (40), retirement account access (30) and investment freedom (30). Cost of
          living isn&apos;t part of it; that varies more by city than by passport, so it lives in Expat FIRE.
          This is about the passport you hold, not where you live now, which is your tax home in Plan.
        </p>
      </details>
    </div>
  );
}
