---
title: "PennyPress: Admin 강좌 등록 버그 픽스 및 Storage 리팩토링"
date: "2026-06-26"
tags: ["bugfix", "refactoring", "supabase", "nextjs", "adm-zip"]
---

# PennyPress: Admin 강좌 등록 버그 픽스 및 Storage 리팩토링

## 1. 개요
PennyPress 관리자 페이지에서 강좌(ZIP 번들) 등록 시 "등록 완료" 메시지 후 목록에 노출되지 않는 버그를 수정하고, 마이그레이션 가이드 권장 사항에 따라 파일 스토리지 기반 아키텍처로 리팩토링한 작업 내역.

## 2. 기존 문제점 (원인 파악)
- `app/admin/courses/upload/page.tsx` 내부 `upload` 함수가 백엔드 저장 로직 없이 `setTimeout`을 통한 Mocking 코드로 구성되어 있었음.
- DB 저장 및 리스트 조회 쿼리가 부재하였으며, 강좌 리스트(`app/admin/courses/page.tsx` 및 `app/(user)/courses/page.tsx`) 역시 `dummyCourses`를 그대로 렌더링하고 있었음.

## 3. 해결 및 리팩토링 내용
- **Supabase DB 마이그레이션**: `courses`, `course_cards`, `course_wiki` 테이블의 스키마를 정의 및 생성 (`20260626_courses.sql`). 파일 스토리지 정책 수립 (`20260627_courses_storage.sql`). 기존 파일명 충돌 버그 해결을 위해 마이그레이션 파일 접두사(버전)를 겹치지 않게 리네임 조치.
- **API 연동**: `adm-zip` 패키지를 추가(`pnpm install adm-zip`)하여 ZIP 압축 해제 기능 구현.
  - `POST /api/admin/courses/upload`: ZIP 파일을 풀어 `config.json`은 DB `courses` 테이블에 업데이트하고, 나머지 파일들은 Supabase Storage `courses` 버킷(`[slug]/` 경로)에 업로드하도록 구현.
  - `GET /api/admin/courses`, `GET /api/courses`: DB에서 강좌 데이터를 조회하는 API 라우트 추가.
- **Frontend 업데이트**: Admin 및 User 사이드 강좌 리스트 컴포넌트에서 `dummyCourses` 사용을 중지하고 실제 GET API를 통해 데이터를 렌더링하도록 수정.

## 4. 교훈 및 특이사항
- 초기 프로토타이핑(Mock) 코드가 프로덕션 기능에 남아있을 때 발생할 수 있는 맹점을 확인.
- 미디어 파일과 마크다운 텍스트를 모두 DB에 적재하는 대신 파일 스토리지와 메타데이터 DB를 분리하는 권장 아키텍처(Storage + DB)의 중요성을 재확인.
- Supabase CLI 사용 시 마이그레이션 파일 접두사(타임스탬프)가 중복될 경우 Duplicate Key Error가 발생함을 확인하고 리네임하여 조치.
