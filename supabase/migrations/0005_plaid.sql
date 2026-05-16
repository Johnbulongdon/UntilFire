-- ─── plaid_items ─────────────────────────────────────────────────────────────
-- One row per connected bank per user. Service role only — anon/authenticated
-- roles have no policies and therefore no access.
CREATE TABLE IF NOT EXISTS plaid_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id      TEXT        NOT NULL,
  plaid_access_token TEXT        NOT NULL,
  institution_id     TEXT        NOT NULL,
  institution_name   TEXT        NOT NULL,
  cursor             TEXT        DEFAULT NULL,
  last_synced_at     TIMESTAMPTZ DEFAULT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS plaid_items_user_id_idx
  ON plaid_items(user_id);

-- One active connection per institution per user
CREATE UNIQUE INDEX IF NOT EXISTS plaid_items_user_institution_idx
  ON plaid_items(user_id, institution_id);

ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies. Service role bypasses RLS automatically.
GRANT ALL ON plaid_items TO service_role;

DROP TRIGGER IF EXISTS update_plaid_items_updated_at ON plaid_items;
CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── expenses table amendments ───────────────────────────────────────────────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source               TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'plaid'));

CREATE INDEX IF NOT EXISTS expenses_plaid_tx_id_idx
  ON expenses(plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;
