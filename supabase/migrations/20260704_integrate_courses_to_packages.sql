-- supabase/migrations/20260704_integrate_courses_to_packages.sql

-- course_packages 테이블에 순차재생 및 체크포인트 강제 설정 추가
ALTER TABLE course_packages 
ADD COLUMN IF NOT EXISTS sequential_play BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS force_checkpoint BOOLEAN DEFAULT false;

-- courses 테이블에 태그 리스트 컬럼 추가 (각 강좌의 검색 소스로서 태그 사용)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
