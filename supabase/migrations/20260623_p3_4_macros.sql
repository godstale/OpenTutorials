CREATE TABLE IF NOT EXISTS macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active macros"
  ON macros FOR SELECT TO authenticated
  USING (is_active = true);
