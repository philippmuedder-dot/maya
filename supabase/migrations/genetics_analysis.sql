-- ============================================================
-- MIGRATION: Create genetics_analysis table
-- Run manually in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS genetics_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genetics_analysis_user_id_idx ON genetics_analysis(user_id);

ALTER TABLE genetics_analysis DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE genetics_analysis TO postgres, anon, authenticated, service_role;
