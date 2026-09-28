-- Referral program: removing a creator, and holding a code for someone (D-27).
--
-- 'removed' is for a creator who broke the terms (impersonation, spam):
-- their link stops, their code is renamed so the real owner can take it,
-- their unpaid earnings are reversed and nothing new is earned. 'paused'
-- stays a temporary hold that keeps the code and existing earnings.
ALTER TABLE referral_partners DROP CONSTRAINT IF EXISTS referral_partners_status_check;
ALTER TABLE referral_partners
  ADD CONSTRAINT referral_partners_status_check CHECK (status IN ('active', 'paused', 'removed'));

-- A code the founder is keeping for a creator being pitched. Only an
-- account with this email can join with it; joining releases the hold.
CREATE TABLE referral_code_holds (
  code        TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service role only, like the rest of the program's tables.
ALTER TABLE referral_code_holds ENABLE ROW LEVEL SECURITY;
