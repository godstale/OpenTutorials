-- Create storage bucket for courses
INSERT INTO storage.buckets (id, name, public) 
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies (idempotent)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'courses' );

DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
CREATE POLICY "Admin Upload Access"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'courses' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;
CREATE POLICY "Admin Update Access"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'courses' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;
CREATE POLICY "Admin Delete Access"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'courses' AND auth.role() = 'authenticated' );
