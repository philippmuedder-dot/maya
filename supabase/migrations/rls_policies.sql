-- ============================================================
-- MIGRATION: Enable RLS on all tables + create user policies
-- Run manually in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE whoop_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoop_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloodwork_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eating_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE breathwork_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacral_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for whoop_tokens first (standalone)
CREATE POLICY "Users see own data" ON whoop_tokens
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Create RLS policies for all other tables (user_id = email)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'whoop_daily_data','daily_checkins','daily_briefings',
    'daily_tasks','supplements','supplement_logs',
    'bloodwork_results','apple_health_data','energy_logs',
    'flow_states','creative_seeds','decisions','weekly_plans',
    'workouts','eating_windows','breathwork_logs','user_memory',
    'user_preferences','work_calendar_tokens','chat_messages',
    'sacral_responses'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Users see own data" ON %I
       FOR ALL USING (user_id = current_setting(''request.jwt.claims'', true)::json->>''email'')',
      t
    );
  END LOOP;
END $$;

-- Note: service_role key bypasses RLS automatically in Supabase.
-- All server-side API routes use createServiceClient() which uses
-- SUPABASE_SERVICE_ROLE_KEY — these are unaffected by RLS policies.
