CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  last_card INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own progress"
  ON user_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON user_progress FOR SELECT TO service_role
  USING (true);
