"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { rateLabel } from "@/lib/partner-offers";
import type { ToolOffer } from "@/lib/accounts-tools-client";
import { isSetupGoal, type SetupGoal } from "@/lib/account-setup";
import { useToolsAPI } from "./useToolsAPI";
import ProviderLinksPanel from "./ProviderLinksPanel";
import s from "./AccountsTools.module.css";
export default function OffersTab() {
  const params = useSearchParams();
  const rawGoal = params.get("goal");
  const initialGoal = isSetupGoal(rawGoal) ? rawGoal : "invest";
  const { api, owner } = useToolsAPI();
  const [state, setState] = useState<{
    owner: string;
    offers: ToolOffer[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState<SetupGoal>(initialGoal);
  const [country, setCountry] = useState("US");
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [handoff, setHandoff] = useState<{ slug: string; href: string } | null>(
    null,
  );
  const generation = useRef(0);
  const offers = state && state.owner === owner ? state.offers : [];
  const detail = offers.find((o) => o.slug === selected);
  const loading = state?.owner !== owner;
  const load = useCallback(async () => {
    const n = ++generation.current;
    try {
      const d = await api<{ offers: ToolOffer[] }>("/api/offers");
      if (n === generation.current && owner) {
        setState({ owner, offers: d.offers });
        setError("");
      }
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    }
  }, [api, owner]);
  const cancelLoad = useCallback(() => {
    generation.current += 1;
  }, []);
  useEffect(() => {
    void load();
    return cancelLoad;
  }, [load, cancelLoad]);
  async function open(o: ToolOffer) {
    setBusy(true);
    setError("");
    // Reserve a tab during the gesture; asynchronous fetches otherwise hit popup blocking.
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const d = await api<{ href: string }>("/api/offers/open", {
        slug: o.slug,
        referralKey: o.referralKey,
      });
      if (!/^\/go\/[a-z0-9-]+\?intent=[a-f0-9-]+$/.test(d.href))
        throw new Error("Couldn’t open this provider.");
      const progress = await api<{
        journeys: import("@/lib/account-setup").AccountSetup[];
      }>("/api/account-setup");
      const current = progress.journeys.find((j) => j.goal === goal);
      await api("/api/account-setup", {
        goal,
        version: current?.version ?? 0,
        action: "started",
        label: o.name,
      });
      setHandoff({ slug: o.slug, href: popup ? "" : d.href });
      if (popup) popup.location.href = d.href;
    } catch (e) {
      popup?.close();
      setError((e as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  }
  if (params.get("view") === "links")
    return (
      <div className={s.page}>
        <a className={s.link} href="/dashboard?tab=offers">
          ‹ Accounts &amp; tools
        </a>
        <ProviderLinksPanel />
      </div>
    );
  if (handoff)
    return (
      <div className={s.page}>
        <div className={s.hero}>
          <span className={s.icon}>↗</span>
          <h1>Continue with your provider</h1>
          <p>Come back when you’re ready. Your plan stays here.</p>
        </div>
        <div className={s.card}>
          <h2>How did it go?</h2>
          <p className={s.muted}>
            Opening a link doesn’t confirm an account is open.
          </p>
          {handoff.href && (
            <a
              className={s.link}
              href={handoff.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              Open provider ↗
            </a>
          )}
          <a
            className={s.link}
            href={"/dashboard?tab=account-setup&goal=" + goal}
          >
            Return to my plan →
          </a>
          <Button
            onClick={() => {
              setHandoff(null);
              setSelected(null);
            }}
          >
            Browse accounts
          </Button>
        </div>
      </div>
    );
  const visible = offers.filter(
    (o) =>
      (goal === "invest" ? o.kind === "brokerage" : o.kind !== "brokerage") &&
      o.country === country,
  );
  return (
    <div className={s.page}>
      <header className={s.row + " " + s.between}>
        <div>
          <h1 className="uf-t-h1">Accounts &amp; tools</h1>
          <p className={s.muted}>Find a home for your next step.</p>
        </div>
        <a className={s.link} href="/dashboard?tab=offers&view=links">
          My referral links
        </a>
      </header>
      {params.get("link") === "refresh" && (
        <p role="status" className={s.muted}>
          This link expired or changed. Open the provider details again.
        </p>
      )}
      {error && (
        <div role="alert" className={s.error}>
          {error} <Button onClick={() => void load()}>Retry</Button>
        </div>
      )}
      {!detail ? (
        <>
          <div className={s.hero}>
            <span className={s.icon}>{goal === "invest" ? "↗" : "↓"}</span>
            <h2>
              {goal === "invest"
                ? "Long-term money. A clearer next step."
                : "A place for money you’ll need sooner."}
            </h2>
            <p>Already have an account? You can use that.</p>
            <a
              className={s.link}
              href={"/dashboard?tab=account-setup&goal=" + goal}
            >
              Use an existing account →
            </a>
          </div>
          <div className={s.row}>
            <div role="group" aria-label="Account purpose" className={s.row}>
              {(["invest", "save"] as const).map((g) => (
                <Button
                  key={g}
                  aria-pressed={g === goal}
                  variant={g === goal ? "primary" : "secondary"}
                  onClick={() => {
                    setGoal(g);
                    setCompare([]);
                    setShowCompare(false);
                  }}
                >
                  {g === "invest" ? "Investing" : "Savings & banking"}
                </Button>
              ))}
            </div>
            <label className={s.field}>
              Country
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCompare([]);
                  setShowCompare(false);
                }}
              >
                {[...new Set(["US", ...offers.map((o) => o.country)])].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          {loading && !error && <p role="status">Loading accounts…</p>}
          {!loading && !visible.length && (
            <div className={s.card}>
              <h2>No reviewed accounts here yet</h2>
              <p className={s.muted}>
                Use an account you already have, or check back later.
              </p>
            </div>
          )}
          <div className={s.grid}>
            {visible.map((o) => (
              <article key={o.slug} className={s.card}>
                <div className={s.row + " " + s.between}>
                  <span className={s.icon}>{o.name.slice(0, 1)}</span>
                  {o.rateBps !== null && (
                    <span className={s.pill}>{rateLabel(o.rateBps)}</span>
                  )}
                </div>
                <h2>{o.name}</h2>
                <p className={s.muted}>{o.blurb}</p>
                {o.bonusText && <span className={s.pill}>{o.bonusText}</span>}
                <Button onClick={() => setSelected(o.slug)}>
                  View details →
                </Button>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={compare.includes(o.slug)}
                    disabled={!compare.includes(o.slug) && compare.length >= 2}
                    onChange={() =>
                      setCompare((c) =>
                        c.includes(o.slug)
                          ? c.filter((x) => x !== o.slug)
                          : [...c, o.slug],
                      )
                    }
                  />
                  Compare {o.name}
                </label>
              </article>
            ))}
          </div>
          {compare.length > 0 && (
            <section
              className={s.compare}
              data-expanded={showCompare}
              aria-label="Compare accounts"
            >
              <div className={s.row}>
                <strong>{compare.length} of 2 selected</strong>
                <Button
                  disabled={compare.length !== 2}
                  onClick={() => setShowCompare((v) => !v)}
                >
                  {showCompare ? "Hide comparison" : "Compare"}
                </Button>
                <Button
                  onClick={() => {
                    setCompare([]);
                    setShowCompare(false);
                  }}
                >
                  Clear
                </Button>
              </div>
              {showCompare && (
                <div className={s.grid}>
                  {offers
                    .filter((o) => compare.includes(o.slug))
                    .map((o) => (
                      <div key={o.slug}>
                        <h3>{o.name}</h3>
                        <p className={s.muted}>{o.blurb}</p>
                        <p>{rateLabel(o.rateBps) ?? "No listed APY"}</p>
                        <p className={s.small}>{o.referralLabel}</p>
                        <Button onClick={() => setSelected(o.slug)}>
                          View details
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <>
          <Button
            onClick={() => setSelected(null)}
            style={{ justifySelf: "start" }}
          >
            ‹ All accounts
          </Button>
          <article className={s.card}>
            <span className={s.icon}>{detail.name.slice(0, 1)}</span>
            <h1>{detail.name}</h1>
            <p>{detail.blurb}</p>
            {detail.rateBps !== null && (
              <span>{rateLabel(detail.rateBps)}</span>
            )}
            {detail.bonusText && (
              <span className={s.pill}>{detail.bonusText}</span>
            )}
            <p className={s.muted}>
              Check the provider’s eligibility, fees and terms before applying.
            </p>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void open(detail)}
            >
              {busy ? "Opening…" : "Continue to " + detail.name + " ↗"}
            </Button>
            <p className={s.small}>{detail.referralLabel}</p>
            <a
              className={s.link}
              href={"/dashboard?tab=account-setup&goal=" + goal}
            >
              I already have an account
            </a>
          </article>
        </>
      )}
      <p className={s.small}>
        UntilFire isn’t a bank or an adviser. Availability, rates and terms can
        change.
      </p>
    </div>
  );
}
