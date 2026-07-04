-- supabase/migrations/20260705_add_version_and_changelog_to_packages.sql
ALTER TABLE course_packages ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE course_packages ADD COLUMN IF NOT EXISTS changelog TEXT DEFAULT '최초 릴리즈';
