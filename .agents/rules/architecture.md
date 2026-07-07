---
description: Next.js App Router 아키텍처 패턴. 라우트/컴포넌트 구조 설계 시 적용.
pattern: "app/**/*"
---

# Architecture — Next.js App Router

## 1. Route 구조
데스크탑 로컬 환경을 위해 아래와 같은 폴더 구조로 단순화되었습니다.
```
app/
  page.tsx              # 루트 진입 시 /dashboard로 즉시 리다이렉트
  (user)/               # 사용자 포털 (헤더 + 사이드바 레이아웃)
    layout.tsx          # 공통 레이아웃
    dashboard/          # 대시보드
    courses/            # 강좌 검색 및 관리
      manage/           # 강좌 관리
        upload/         # 강좌 번들 ZIP 업로드
    my-courses/         # 나의 강좌
    my-agents/          # 에이전트 관리
    settings/           # 사용자 설정
  api/                  # API Route Handlers
    local-db/           # db.json 중계 API
    agent/              # 로컬 에이전트/AI 튜터 연동 API
```

## 2. Server vs Client Component
- **기본값**: Server Component. 데이터 조회, 로컬 파일 시스템 작업, 민감 환경변수 접근 시 사용.
- **Client Component 필요 조건**: 이벤트 핸들러(onClick 등), React hooks(useState 등), 브라우저 API 접근 시 사용.
- **규칙**: `'use client'` 범위를 최소화하고, 트리 하단의 Leaf 컴포넌트에 주로 적용합니다.

## 3. 리다이렉션 및 라우트 우회 (proxy.ts)
- [proxy.ts](file:///C:/Workspace/Projects/OpenTutorials/proxy.ts) Next.js 미들웨어는 루트 `/`, `/auth`, `/login`, `/admin` 등의 모든 인증 및 관리자 진입 시도를 `/dashboard`로 강제 리다이렉트하여 로그인 절차 없이 진입하도록 제어합니다.
