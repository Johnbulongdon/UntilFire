-- 0044_friend_referrals.sql
-- "Give a month, get a month" (D-27): any user can share a link. The friend
-- gets the 60-day trial a creator link gives; when the friend first pays,
-- the person who shared it gets a month of Pro as a Stripe account credit.
--
-- Friends reuse the creator machinery (the /r/<code> link, the cookie, the
-- claim, the attribution) as partners of kind 'friend'. They have no payout
-- details, so those columns become optional; a creator still needs them,
-- which the join route enforces.

ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'creator' CHECK (kind IN ('creator', 'friend'));
ALTER TABLE referral_partners ALTER COLUMN payout_method DROP NOT NULL;
ALTER TABLE referral_partners ALTER COLUMN payout_email DROP NOT NULL;
ALTER TABLE referral_partners ALTER COLUMN terms_version DROP NOT NULL;
ALTER TABLE referral_partners ALTER COLUMN terms_accepted_at DROP NOT NULL;

-- One free month per friend who pays, never more: the unique referred user
-- makes a retried webhook or a second invoice a no-op.
CREATE TABLE IF NOT EXISTS referral_credits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referred_user_id  UUID NOT NULL UNIQUE,
  stripe_invoice_id TEXT NOT NULL,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  -- 'pending' until the referrer has a Stripe customer to credit (they
  -- subscribe later); 'applied' once the balance transaction exists.
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied')),
  stripe_balance_transaction_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS referral_credits_referrer_idx ON referral_credits (referrer_user_id, status);

ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE referral_credits IS 'Free months earned by users whose friends became paying customers (D-27). Service-role only.';
