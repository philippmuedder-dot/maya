-- ============================================================
-- MIGRATION: Create genetic_variants table
-- Run manually in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS genetic_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  rsid TEXT NOT NULL,
  gene TEXT,
  genotype TEXT,
  trait TEXT,
  impact TEXT CHECK (impact IN ('positive', 'neutral', 'risk')),
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genetic_variants_user_id_idx ON genetic_variants(user_id);
CREATE INDEX IF NOT EXISTS genetic_variants_impact_idx ON genetic_variants(impact);

ALTER TABLE genetic_variants DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE genetic_variants TO postgres, anon, authenticated, service_role;

-- Also create the genetics storage bucket (run separately or via Supabase UI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('genetics', 'genetics', false)
-- ON CONFLICT (id) DO NOTHING;
