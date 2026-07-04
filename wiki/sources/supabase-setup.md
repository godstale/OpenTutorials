# Supabase Setup Guide

**원본 파일:** [SUPABASE_SETUP.md](../../docs/SUPABASE_SETUP.md)

**요약:**
로컬/클라우드 배포 시 Supabase 프로젝트를 설정하기 위한 매뉴얼.
1. Supabase 프로젝트 생성
2. `.env.local` 환경 변수 설정 (NEXT_PUBLIC_SUPABASE_URL 등)
3. 데이터베이스 스키마 마이그레이션 적용 (대시보드 SQL 에디터 또는 CLI `db push`)
4. Auth 설정 (이메일 로그인 등)
5. 트러블슈팅 (Next.js 15 `cacheComponents` 호환성 문제 해결)
