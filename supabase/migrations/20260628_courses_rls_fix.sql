-- Fix RLS policies: allow anon role to read published courses
-- Previously "TO authenticated" blocked unauthenticated users from reading public courses

DROP POLICY IF EXISTS "Anyone can read published courses" ON courses;
CREATE POLICY "Anyone can read published courses"
  ON courses FOR SELECT TO anon, authenticated
  USING (published = true);

-- Admin can read all courses (for preview of unpublished courses)
DROP POLICY IF EXISTS "Admins can read all courses" ON courses;
CREATE POLICY "Admins can read all courses"
  ON courses FOR SELECT TO service_role
  USING (true);

DROP POLICY IF EXISTS "Anyone can read course cards" ON course_cards;
CREATE POLICY "Anyone can read course cards"
  ON course_cards FOR SELECT TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read course wiki" ON course_wiki;
CREATE POLICY "Anyone can read course wiki"
  ON course_wiki FOR SELECT TO anon, authenticated;
