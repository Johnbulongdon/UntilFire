-- 0040_search_console.sql
-- Google Search Console performance, pulled daily into our own database.
--
-- Why store it at all when Google already has it: the question "are the 229
-- city pages actually indexed and ranking" cannot be answered from the app's
-- own analytics, which only ever see someone who already arrived. Search
-- Console sees the impressions that did not become visits — the difference
-- between "nobody can find us" and "we rank at position 60".
--
-- One table, three shapes, discriminated by `dimension`:
--
--   total  — one row per day, whole property. The trend line.
--   page   — one row per day per URL. Which pages Google shows at all.
--   query  — one row per day per search term. What people actually typed.
--
-- `dimension_value` is '' for totals rather than null, because null is not
-- comparable in a unique constraint: two null rows for the same day would
-- both insert, and the upsert that keeps this idempotent would stop working.
--
-- Idempotent by (date, dimension, dimension_value) so a run can safely
-- re-fetch a window. It has to: Search Console data is incomplete for
-- roughly three days after the fact and keeps changing until it settles, so
-- every run re-reads recent days and overwrites what it had.
CREATE TABLE IF NOT EXISTS seo_search_console (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  dimension       TEXT NOT NULL CHECK (dimension IN ('total', 'page', 'query')),
  dimension_value TEXT NOT NULL DEFAULT '',
  clicks          INTEGER NOT NULL DEFAULT 0,
  impressions     INTEGER NOT NULL DEFAULT 0,
  ctr             DOUBLE PRECISION,
  position        DOUBLE PRECISION,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, dimension, dimension_value)
);

CREATE INDEX IF NOT EXISTS seo_search_console_dimension_date_idx
  ON seo_search_console (dimension, date DESC);

-- No user owns this data — it is the property's, not a person's — so there is
-- no user_id to scope by and no policy that would make sense. RLS on with
-- zero policies denies every anon and authenticated client outright; the sync
-- job and the admin route reach it with the service role, which bypasses RLS.
-- Same shape as plaid_items.
ALTER TABLE seo_search_console ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE seo_search_console IS
  'Daily Google Search Console performance. Service-role only: RLS is on with no policies. Rows are upserted on (date, dimension, dimension_value) because Search Console keeps revising the last few days.';
COMMENT ON COLUMN seo_search_console.position IS
  'Average position, 1 = top of page one. Google averages this across impressions, so a page ranking 3rd for one term and 80th for another reports neither.';
