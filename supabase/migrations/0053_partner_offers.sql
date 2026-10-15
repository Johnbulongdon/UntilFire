-- 0053_partner_offers.sql
-- Partner offers: savings, bank and brokerage accounts UntilFire lists for
-- people who already have their result. Each offer carries UntilFire's own
-- referral link; a later step lets a creator add their link for the same
-- offer (only for offers on this list, approved in /admin).
--
-- Service-role only, like the referral tables: RLS on, no policies. The
-- public list is served by /api/offers, and every click goes through
-- /go/<slug>, which redirects only to a URL stored here.

CREATE TABLE IF NOT EXISTS partner_offers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  kind           TEXT NOT NULL CHECK (kind IN ('savings', 'bank', 'brokerage')),
  name           TEXT NOT NULL,
  -- One plain sentence on why it fits a freedom plan.
  blurb          TEXT NOT NULL DEFAULT '',
  -- Annual rate in basis points, for savings (420 = 4.20% APY).
  rate_bps       INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 2000),
  -- "$300 bonus for a new account"; hidden after bonus_ends_on.
  bonus_text     TEXT,
  bonus_ends_on  DATE,
  -- UntilFire's referral link. Its host must be allowed_domain or a subdomain.
  url            TEXT NOT NULL,
  allowed_domain TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'US',
  status         TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('live', 'hidden')),
  sort           INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per click: the offer and whose link was used. No user id, IP or
-- user agent, the same as referral_visits.
CREATE TABLE IF NOT EXISTS partner_offer_clicks (
  id         BIGSERIAL PRIMARY KEY,
  offer_id   UUID NOT NULL REFERENCES partner_offers (id) ON DELETE CASCADE,
  -- NULL when UntilFire's own link was used.
  partner_id UUID REFERENCES referral_partners (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS partner_offer_clicks_offer_idx ON partner_offer_clicks (offer_id, created_at DESC);

ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_offer_clicks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE partner_offers IS 'Accounts UntilFire lists, with its own referral link. Service-role only.';
COMMENT ON TABLE partner_offer_clicks IS 'Clicks on partner offers; no personal data. Service-role only.';
