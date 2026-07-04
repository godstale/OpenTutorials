-- supabase/migrations/20260703_course_packages.sql
CREATE TABLE IF NOT EXISTS course_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES course_packages(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, course_id),
  UNIQUE(package_id, order_index)
);

CREATE TABLE IF NOT EXISTS user_package_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES course_packages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, package_id)
);

ALTER TABLE course_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_package_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published course packages"
  ON course_packages FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "Anyone can read course package items"
  ON course_package_items FOR SELECT TO authenticated;

CREATE POLICY "Users can manage their own package subscriptions"
  ON user_package_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
