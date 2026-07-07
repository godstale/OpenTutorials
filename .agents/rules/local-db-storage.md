---
description: Local JSON DB (db.json), Mock Supabase Client, 및 Storage 에셋 관리 규칙. 데이터 조회/수정/삭제 시 적용.
pattern: "**/{lib/db,lib/supabase,api/local-db}/**/*"
---

# Local DB & Storage

이 프로젝트는 기존의 Supabase 클라우드 서비스를 걷어내고, 데스크탑 로컬 파일 시스템(`db.json` 및 `public/courses/`)을 활용하는 온디바이스형 도구입니다.

## 1. 데이터 처리 패턴
- 모든 로컬 쿼리는 [mock-client.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/supabase/mock-client.ts)를 경유합니다.
- 실제 데이터의 Read/Write 가공은 [local-db-server.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/db/local-db-server.ts)가 `db.json`을 직접 핸들링합니다.
- 데이터베이스 추가, 수정, 삭제 시 기존 Supabase API 문법(`.from().select().eq().single()`)을 그대로 활용합니다.

## 2. Supabase 클라이언트 사용
코드를 수정하지 않고 기존 구문을 그대로 유지하여 사용합니다:
```typescript
// Server Component / Route Handler
import { createClient } from '@/lib/supabase/server';

// Client Component
import { createClient } from '@/lib/supabase/client';
```

## 3. 권한 및 보안 우회 (Bypass)
- 데스크탑 전용 로컬 환경이므로, 로그인 및 회원가입은 비활성화됩니다.
- 무조건 기본 사용자 (`local-user-id`) 세션을 사용하여 대시보드로 자동 진입합니다.
- `requireAdmin()` 유틸리티는 항상 성공을 반환하여, 기존 Admin 계정으로 제한되던 모든 API와 화면 기능을 일반 사용자 모드에서 실행할 수 있도록 보장합니다.

## 4. 파일 스토리지 (Storage)
- 파일 Storage에 에셋 업로드/다운로드 시 `public/courses/` 폴더 하위에 파일이 직접 적재됩니다.
- 브라우저에서는 Next.js 정적 서빙(`/courses/[path]`)을 통해 즉각 연동됩니다.
