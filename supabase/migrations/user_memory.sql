-- user_memory table: stores learned insights about the user from conversations
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('preference', 'pattern', 'goal', 'avoid', 'insight')),
  insight TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_memory_user_id_idx ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS user_memory_category_idx ON user_memory(category);
CREATE INDEX IF NOT EXISTS user_memory_last_reinforced_idx ON user_memory(last_reinforced_at DESC);

ALTER TABLE user_memory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE user_memory TO postgres, anon, authenticated, service_role;
