CREATE TABLE surveys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  satisfaction  INT         CHECK (satisfaction BETWEEN 1 AND 5),
  features_used TEXT[],
  missing       TEXT,
  missing_other TEXT,
  recommend     TEXT        CHECK (recommend IN ('yes', 'maybe', 'no')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own survey" ON surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view own survey" ON surveys
  FOR SELECT USING (auth.uid() = user_id);
