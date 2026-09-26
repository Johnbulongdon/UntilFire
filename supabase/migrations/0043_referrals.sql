-- 0043_referrals.sql
-- The creator referral program (D-27): 30% of what a referred customer pays
-- in their first 12 months of paying, paid out by hand, monthly.
--
-- Five tables, all service-role only: RLS on with no policies, the same
-- shape as plaid_items and seo_search_console. Creators see their own
-- numbers through /api/referrals/me, which checks their session and returns
-- totals only: never who they referred, never another creator's rows.
--
-- Money is integer cents. A commission row is created only when Stripe
-- collects a payment (invoice.paid), keyed by the invoice so a retried
-- webhook cannot pay twice. The rate is copied onto each row, so changing
-- the program later never rewrites what was already earned.

CREATE TABLE IF NOT EXISTS referral_partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  code              TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  payout_method     TEXT NOT NULL CHECK (payout_method IN ('paypal', 'wise')),
  -- Where the founder sends money. Private: shown only to the creator and admin.
  payout_email      TEXT NOT NULL,
  rate_bps          INTEGER NOT NULL DEFAULT 3000,
  months            INTEGER NOT NULL DEFAULT 12,
  terms_version     TEXT NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per click on /r/<code>. Only the partner and the time: no IP, no
-- user agent, nothing that identifies the visitor.
CREATE TABLE IF NOT EXISTS referral_visits (
  id         BIGSERIAL PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES referral_partners (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS referral_visits_partner_idx ON referral_visits (partner_id, created_at DESC);

-- Who was referred by whom. One per referred account, fixed once made: a
-- later click on someone else's link never moves it.
CREATE TABLE IF NOT EXISTS referral_attributions (
  referred_user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  partner_id       UUID NOT NULL REFERENCES referral_partners (id) ON DELETE CASCADE,
  rate_bps         INTEGER NOT NULL,
  months           INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS referral_attributions_partner_idx ON referral_attributions (partner_id);

CREATE TABLE IF NOT EXISTS referral_payouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES referral_partners (id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method       TEXT NOT NULL,
  -- The PayPal or Wise transaction id, so a payout can be traced later.
  reference    TEXT NOT NULL,
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by      UUID REFERENCES auth.users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS referral_payouts_partner_idx ON referral_payouts (partner_id, paid_at DESC);

-- Stored status is pending, paid or reversed; "payable" is a pending row
-- whose payable_at has passed (lib/referrals.ts), so no job has to flip it.
CREATE TABLE IF NOT EXISTS referral_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES referral_partners (id) ON DELETE CASCADE,
  referred_user_id  UUID NOT NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  collected_cents   INTEGER NOT NULL,
  rate_bps          INTEGER NOT NULL,
  commission_cents  INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'reversed')),
  earned_at         TIMESTAMPTZ NOT NULL,
  payable_at        TIMESTAMPTZ NOT NULL,
  payout_id         UUID REFERENCES referral_payouts (id) ON DELETE SET NULL,
  reversed_at       TIMESTAMPTZ,
  reversed_reason   TEXT
);
CREATE INDEX IF NOT EXISTS referral_commissions_partner_idx ON referral_commissions (partner_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS referral_commissions_referred_idx ON referral_commissions (referred_user_id, earned_at);

ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE referral_partners IS 'Creators in the referral program (D-27). Service-role only.';
COMMENT ON TABLE referral_commissions IS 'One row per collected invoice from a referred customer inside their 12-month window. Integer cents. Service-role only.';
