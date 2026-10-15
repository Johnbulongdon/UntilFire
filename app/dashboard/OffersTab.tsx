"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { disclosure, groupOffers, OFFER_KIND_LABEL, rateLabel, type OfferKind, type PartnerOffer } from "@/lib/partner-offers";

const KIND_INTRO: Record<OfferKind, string> = {
  savings: "For your emergency fund and money you need within a few years.",
  bank: "An everyday account with no monthly fees.",
  brokerage: "Where long-term money is invested toward your freedom date.",
};

/**
 * Money → Offers: "Where to keep your money". Savings, bank and brokerage
 * accounts UntilFire lists, picked for fit and never for what they pay. Every
 * button goes through /go/<slug>, and every offer says who earns from it.
 */
export default function OffersTab() {
  const [offers, setOffers] = useState<PartnerOffer[] | null>(null);
  const [referrer, setReferrer] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => {
        setOffers(Array.isArray(d.offers) ? d.offers : []);
        setReferrer(typeof d.referrer === "string" ? d.referrer : null);
      })
      .catch(() => setOffers([]));
  }, []);

  const groups = groupOffers(offers ?? []);

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className="uf-t-h1" style={{ margin: 0 }}>Where to keep your money</h1>
        <p className="uf-t-lead" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
          Accounts that fit a freedom plan. Picked for low fees and good rates, never for what they pay us.
        </p>
      </header>

      {offers === null && <p className="uf-t-body" style={{ color: "var(--uf-ink-2)" }}>Loading&hellip;</p>}
      {offers !== null && groups.length === 0 && (
        <Card>
          <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>
            No accounts are listed right now. Check back soon.
          </p>
        </Card>
      )}

      {groups.map((g) => (
        <section key={g.kind} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="uf-t-h2" style={{ margin: 0 }}>{OFFER_KIND_LABEL[g.kind]}</h2>
          <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>{KIND_INTRO[g.kind]}</p>
          {g.offers.map((o) => (
            <Card key={o.slug} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h3 className="uf-t-h3" style={{ margin: 0 }}>{o.name}</h3>
                {o.rateBps != null && <span className="uf-t-data">{rateLabel(o.rateBps)}</span>}
              </div>
              {o.bonusText && (
                <Badge tone="warning" style={{ alignSelf: "flex-start" }}>
                  {o.bonusText}
                  {o.bonusEndsOn ? ` · ends ${new Date(`${o.bonusEndsOn}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : ""}
                </Badge>
              )}
              {o.blurb && <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink-2)" }}>{o.blurb}</p>}
              <a
                href={`/go/${o.slug}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                // Secondary, as Button draws it: one primary per screen, and a
                // list of offers has no single action that outranks the rest.
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44,
                  fontFamily: "var(--uf-font)", fontWeight: 700, fontSize: 14, textDecoration: "none",
                  borderRadius: "var(--uf-r-pill)", border: "1px solid var(--uf-border-2)",
                  background: "var(--uf-card)", color: "var(--uf-ink)",
                }}
              >
                Open account
              </a>
              <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)" }}>{disclosure(referrer)}</p>
            </Card>
          ))}
        </section>
      ))}

      <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-2)", borderTop: "1px solid var(--uf-border)", paddingTop: 14 }}>
        UntilFire is not a bank or an adviser, and listing an account is not advice to open it. Rates and bonuses come from each provider and can change.
      </p>
    </div>
  );
}
