-- ─── meal_logs migration ─────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor for project xltmetnhuclenfhdegim

CREATE TABLE IF NOT EXISTS meal_logs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          text NOT NULL,
  photo_url        text,
  meal_type        text,           -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods_identified text[],
  tags             text[],
  rough_macros     jsonb,
  ai_summary       text,
  ai_analysis      jsonb,
  notes            text,
  logged_at        timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE meal_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON meal_logs TO postgres, anon, authenticated, service_role;
