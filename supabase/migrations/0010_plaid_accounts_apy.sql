-- Add APY field to plaid_accounts for manual HYSA/savings rate tracking.
-- Plaid does not provide APY natively; users enter it manually per account.
-- The sync upsert (sync/route.ts) does not include this column so it is safe
-- from being overwritten on re-sync.
ALTER TABLE public.plaid_accounts
  ADD COLUMN IF NOT EXISTS apy numeric(6,4) DEFAULT NULL;
