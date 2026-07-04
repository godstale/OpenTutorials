# Open Tutorials FE — AI Tutor Guide

> **Sync:** CLAUDE.md, GEMINI.md, AGENTS.md 는 동일한 내용을 유지합니다. 변경 시 세 파일 모두 업데이트하세요.

---

## 프로젝트 개요

Open Tutorials는 로컬 환경에서 AI 튜터와 함께 학습하고 강의(Course) 콘텐츠를 업로드 및 관리할 수 있는 데스크탑 친화적 로컬 애플리케이션 플랫폼입니다.
- 기존의 클라우드(Vercel/Supabase) 및 SaaS 호스팅 요금제 모델을 완전히 걷어내고, **데스크탑에서 직접 실행하고 로컬 파일 시스템(`db.json` 및 `public/courses/`)을 활용**하는 온디바이스형 도구로 전환되었습니다.
- **핵심 서비스**:
  - 1. **학습 콘텐츠 수강 및 진행률 관리**: 다양한 강좌 패키지를 다운로드/업로드하여 로컬 카드 형식으로 학습하고 진행률을 자동 저장합니다.
  - 2. **강좌 관리 및 업로드**: 사용자가 직접 zip 번들 형식의 강의 매니페스트와 콘텐츠 카드를 업로드하여 강좌 데이터베이스를 로컬로 구축할 수 있습니다.
  - 3. **로컬 에이전트 및 AI 튜터**: 로컬 또는 외부 에이전트를 등록하여 학습 시 질문에 답해주는 AI 튜터를 설정 및 연동합니다.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + Shadcn UI |
| Backend/DB | Local JSON Database (db.json) + Mock Supabase Client |
| AI Worker | Hermes Agent / External AI API |
| 실시간 | Local Fetch / API Routes |

---

## 프로젝트 구조

```
app/
  page.tsx              # 루트 진입 시 /dashboard로 즉시 리다이렉트
  (user)/               # 사용자 포털
    layout.tsx          # 공통 레이아웃 (헤더 + 사이드바)
    dashboard/          # 대시보드
    courses/            # 강좌 검색
      manage/           # [이관됨] 강좌 관리 및 매크로 업로드
        upload/         # 강좌 번들 ZIP 업로드
    my-courses/         # 나의 강좌
    my-agents/          # 에이전트 관리
    settings/           # 사용자 설정
  api/                  # API Route Handlers
    local-db/           # 브라우저 Mock Client의 요청을 db.json으로 중계
    agent/              # AI Worker 연동

components/
  ui/                   # Shadcn UI 기본 컴포넌트
  layout/               # Header, Sidebar (사용자 메뉴 정리됨)
  features/             # 기능 관련 컴포넌트
  dashboard/            # 대시보드 위젯

lib/
  db/
    local-db-server.ts  # Node.js fs 모듈 기반 db.json Read/Write 및 Storage 모킹
  supabase/
    mock-client.ts      # [신규] Supabase JS Client 문법 모킹 클래스
    server.ts           # Mock Supabase 클라이언트 반환 (Server)
    client.ts           # Mock Supabase 클라이언트 반환 (Client)
    admin.ts            # Mock Supabase 관리자 클라이언트 및 requireAdmin 우회
  types/                # 공유 TypeScript 타입 정의
  constants/            # 상수 (routes, config 등)
  dummy-data/           # 로컬 초기 적재용 데이터 및 참고 포맷
  utils.ts              # 공통 유틸리티

proxy.ts                # Next.js 미들웨어 (인증 화면 우회 및 dashboard 리다이렉트)
```

---

## 중요 규칙

### 로컬 DB 및 데이터 스토리지 패턴
- 모든 로컬 쿼리는 `lib/supabase/mock-client.ts`를 경유하며, 실제 가공은 `lib/db/local-db-server.ts`가 `db.json`을 직접 핸들링합니다.
- 데이터베이스 추가 수정 삭제 시 기존 Supabase API 문법(`.from().select().eq().single()`)을 그대로 활용합니다.
- 파일 Storage에 에셋 업로드/다운로드 시 `public/courses` 폴더 하위에 파일이 직접 적재되며, 브라우저에서는 Next.js 정적 서빙(`/courses/[path]`)을 통해 즉각 연동됩니다.

### Supabase 클라이언트 사용
- 코드 수정 없이 기존 구문을 그대로 유지하여 사용합니다:
```typescript
// Server Component / Route Handler
import { createClient } from '@/lib/supabase/server';
// Client Component
import { createClient } from '@/lib/supabase/client';
```

### 권한 및 보안 우회
- 데스크탑 전용 로컬 환경이므로, 로그인 및 회원가입은 비활성화되며 무조건 기본 사용자 (`local-user-id`) 세션을 사용하여 대시보드로 자동 진입합니다.
- `requireAdmin()` 유틸리티는 항상 성공을 반환하여, 기존 Admin 계정으로 제한되던 모든 API와 화면 기능을 일반 사용자 모드에서 무리 없이 실행할 수 있도록 보장합니다.

### 작업 내역 Wiki 등록 의무 (★필수★)
- **코드 수정이나 파일 추가/변경 등 모든 작업**을 완료한 후에는 반드시 작업 내역을 `wiki/`에 등록/기록해야 합니다. (예: `wiki/log.md` 업데이트 및 관련 상세 문서 작성 등)

---

## 규칙 파일 참조

| 파일 | 적용 범위 |
|------|-----------|
| `.agents/rules/coding-standards.md` | TypeScript/React 코딩 컨벤션 |
| `.agents/rules/git-workflow.md` | 커밋 메시지, 브랜칭 전략 |
| `.agents/rules/design-system.md` | Shadcn/Tailwind 디자인 패턴 |
| `.agents/rules/architecture.md` | Next.js App Router 아키텍처 패턴 |
| `.agents/rules/api-conventions.md` | API 패턴 |
| `hydra-agent/GUIDELINE.md` | Hermes Agent 설치/운영/배포 규칙 |
