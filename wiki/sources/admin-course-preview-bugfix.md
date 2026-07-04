---
title: "PennyPress: Admin 강좌 미리보기 버그 픽스 및 Next.js 15 Suspense 연동"
date: "2026-06-27"
tags: ["bugfix", "nextjs", "supabase", "mdx", "suspense"]
---

# PennyPress: Admin 강좌 미리보기 버그 픽스 및 Next.js 15 Suspense 연동

## 1. 개요
관리자 페이지의 강좌 관리 화면에서 새로 등록한 강좌(ZIP 업로드)의 "미리보기" 버튼 클릭 시 "강좌를 찾을 수 없습니다." 에러가 발생하는 버그를 수정하고, Next.js 15 App Router 환경(Dynamic IO 및 Component Caching 활성화)에서 빌드타임 Static Prerender 에러 없이 정상적으로 빌드될 수 있도록 데이터 로딩 방식을 전면 개편한 기록.

## 2. 원인 분석 (Root Cause)
1. **정적 데이터 탐색 한계**:
   - 강좌 학습 화면 (`app/(user)/learn/[slug]/client.tsx`) 내부에서 기존 Mock-up 데이터인 `dummyCourses`에서만 강좌를 검색하고 있었음.
   - ZIP 업로드를 통해 DB(`courses` 테이블)에 새로 저장된 강좌 데이터 및 스토리지(`courses` 버킷)에 적재된 MDX 카드 리스트는 존재하지만, `dummyCourses`에는 없기 때문에 `"강좌를 찾을 수 없습니다."`가 표시됨.
2. **Next.js 15 dynamic IO 빌드 컴파일 에러**:
   - `/learn/[slug]` 경로에서 동적 라우팅을 구현하기 위해 `generateStaticParams()`를 사용하고 있었으나, 컴포넌트 내부에서 Supabase server-side client (`createClient()`)의 `cookies()` API를 호출함에 따라 빌드 시 `Uncached data was accessed outside of <Suspense>` 에러가 발생함.
   - `export const dynamic = 'force-dynamic'`을 선언하여 강제 동적 라우팅으로 전환하려 시도했으나, 프로젝트 구성의 `nextConfig.cacheComponents: true` 설정과 충돌(`Route segment config "dynamic" is not compatible with nextConfig.cacheComponents`)하여 빌드 자체가 차단됨.
   - Next.js 15 Dynamic IO의 특성상 async Server Component 내부에서 dynamic parameter(`await params`) 및 DB/Storage 등의 Uncached data fetching을 수행하는 경우, 해당 작업을 명확히 `<Suspense>` 경계 내부로 고립시켜주어야 함.

## 3. 해결 내용
- **Server Component 구조 수정 (`app/(user)/learn/[slug]/page.tsx`)**:
  - `generateStaticParams()` 및 `dynamic` segment 설정을 제거하여 Next.js가 억지로 특정 정적 페이지로 고정하거나 강제 컴파일 오류를 내지 않도록 조치.
  - `LearnPage`를 동기(synchronous) 컴포넌트로 리팩토링하고, Promise 형태의 `params`를 Suspense-wrapped 하위 컴포넌트인 `LearnPageContent`로 직접 전달하도록 수정.
  - `LearnPageContent` 내부에서 `await params`와 `createClient()` (cookies API 호출), 그리고 Supabase Storage (`courses` 버킷)에서 `config.json` 및 각 카드 MDX 콘텐츠 다운로드, `next-mdx-remote/serialize`를 통한 MDX 컴파일을 차단 없이 처리하도록 구현.
  - 이로써 모든 비정형 dynamic API 및 데이터 탐색이 `<Suspense>` 내부에서만 일어남으로써 Next.js 15 빌드 파이프라인에서 완벽히 dynamic route(Partial Prerender)로 감지 및 패스됨.
- **Client Component 업데이트 (`app/(user)/learn/[slug]/client.tsx`)**:
  - `dummyCourses` 탐색 코드를 삭제하고, 상위 서버 컴포넌트로부터 전달받은 `course` 및 `cards` 배열(MDXRemoteSerializeResult 포함)을 Props로 직접 주입받아 동작하도록 수정.
  - 학습 카드 영역 렌더링 시, `cards` 리스트의 `mdxSource`를 사용해 `<MDXRemote>` 컴포넌트로 실제 MDX 강의 본문을 반응형으로 렌더링하도록 연동 (fallback으로 순수 텍스트 렌더링도 함께 보장).

## 4. 결과 및 교훈
- 빌드 명령어(`pnpm build`)를 통해 빌드 시 `/learn/[slug]` 경로가 Partial Prerender (`◐`) 상태로 정상 컴파일 완료됨을 최종 확인.
- Next.js 15 App Router 환경(특히 `cacheComponents` 활성화 시)에서 동적 데이터 소스를 활용하는 정적/동적 라우팅 구현 시에는 dynamic API 및 Uncached fetching을 반드시 `<Suspense>` 컴포넌트로 포장하여 Next.js가 정상적으로 정적 쉘을 준비하고 바일아웃(Bailout)을 처리할 수 있도록 구조화해야 함을 학습함.
