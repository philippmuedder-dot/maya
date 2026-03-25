-- ─── v2 features migration ─────────────────────────────────────────────────
-- Run this in the Supabase SQL editor for project xltmetnhuclenfhdegim

-- 1. user_preferences — timezone / travel mode
CREATE TABLE IF NOT EXISTS user_preferences (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text NOT NULL,
  current_timezone text NOT NULL DEFAULT 'Europe/Berlin',
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
GRANT ALL ON user_preferences TO anon, authenticated, service_role;

-- 2. breathwork_logs — HRV training sessions
CREATE TABLE IF NOT EXISTS breathwork_logs (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        text NOT NULL,
  date           date NOT NULL,
  type           text NOT NULL, -- 'box' | '478' | 'resonance'
  duration_mins  int  NOT NULL,
  feeling_after  int,           -- 1-10
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE breathwork_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON breathwork_logs TO anon, authenticated, service_role;

-- 3. daily_checkins — add financial stress columns
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS financial_stress   int;
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS financial_stressor text;
