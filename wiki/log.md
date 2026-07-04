## [2026-07-01] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

# Wiki Log

<!-- Append-only. 최신 항목을 위에 추가. -->

## 2026-07-04

- **[BUGFIX/UI/UX] 기본 강좌 삭제 잔재 해결, 강좌 관리 아이콘 변경 및 사이드바 활성화 버그 수정, 나의 강좌 섹션 단일화**
  - **수정/생성 파일**:
    - `lib/db/local-db-server.ts` — `DEFAULT_DB`에서 `course-1`, `course-2`, `package-1` 관련 초기화 데이터를 제거하여 최초 구동 시 기본 수강 강좌가 등록되지 않도록 함.
    - `db.json` — `user_package_subscriptions` 및 `user_progress` 등에서 삭제된 `package-1`의 레거시 잔재 데이터를 정리하여 나의 강좌 페이지에서 빈 카드가 표시되거나 비정상 수강 갯수가 카운트되는 오류 해결.
    - `components/layout/UserSidebar.tsx` — 강좌 관리 메뉴의 아이콘을 `Settings`에서 `Wrench`로 변경하고, "강좌 검색"의 `isActive` 활성화 경로 체크 로직에 `/courses/manage` 제외 처리를 적용하여 두 메뉴가 동시에 녹색으로 활성화되는 중복 표시 결함 수정.
    - `app/(user)/my-courses/page.tsx` — [나의 강좌] 페이지에서 "종합 코스", "개별 강좌"의 구분을 없애고 모든 패키지 및 개별 강좌 카드가 하나의 Grid 목록으로 일관되게 나열되도록 리팩토링.

- **[RULE] 코드 변경 및 작업 내역 Wiki 등록 의무화 지침 추가**
  - **수정/생성 파일**:
    - `GEMINI.md` — AI 튜터 가이드 규칙에 작업 내역 Wiki 등록 의무 지침 추가
    - `CLAUDE.md` — 가이드 동기화를 위해 작업 내역 Wiki 등록 의무 지침 추가
    - `AGENTS.md` — 가이드 동기화를 위해 작업 내역 Wiki 등록 의무 지침 추가
  - **작업 내용**:
    - 사용자 요청에 따라 코드 변경이나 파일 추가/수정 등 모든 작업에 대해 `wiki/`에 내역을 등록하도록 강제하는 "작업 내역 Wiki 등록 의무" 항목을 주요 규칙에 명문화함.

- **[ETC] 불필요한 폴더 및 파일에 대한 .gitignore 설정 보완**
  - **수정/생성 파일**:
    - `.gitignore` — 불필요한 로컬 저장소 및 개발 환경 캐시 패턴 추가
  - **작업 내용**:
    - 로컬 업로드 강좌 저장 경로(`public/courses/`), 로컬 가상환경 및 캐시 파일(`__pycache__/`, `.venv/` 등), 그리고 IDE 개인 설정 폴더(`.idea/`, `.history/`) 및 로컬 런타임 데이터베이스(`db.json`) 관련 Git 제외 설정을 보완하여 불필요한 변경 추적을 차단함.

## 2026-07-01

- **[FEATURE/INGEST] 어드민 강좌 등록 오류(고아 강좌) 검사 및 정리 기능 구현**
  - **수정/생성 파일**:
    - `app/api/admin/courses/check-orphans/route.ts` (신규) — 패키지에 묶이지 않은 고아 강좌 검출(GET) 및 스토리지 리소스와 DB 레코드 연쇄 삭제(POST) API 구현
    - `app/admin/courses/page.tsx` — 등록 오류 검사 버튼 배치 및 등록 오류 리스트 검출/선택 정리/전체 정리 기능을 수행하는 `OrphanedCoursesModal` Shadcn/Dialog UI 개발
  - **인제스트**: `wiki/sources/2026-07-01-admin-orphaned-courses-cleanup.md`

- **[BUGFIX/INGEST] 어드민 강좌 등록 시 스키마 캐시 미반영 예외 처리**
  - **수정/생성 파일**:
    - `app/api/admin/packages/upload/route.ts` — `course_packages` upsert 시 `version` / `changelog` 필드 미비로 인해 schema cache 에러가 발생할 경우 이를 제외하고 2차 upsert를 수행하며, `sequential_play` / `force_checkpoint` 컬럼까지 부족한 극단적 환경인 경우 이마저도 제외하고 최소 필수 필드로만 3차 upsert를 수행하는 다단계 방어(graceful fallback) 로직 구축
  - **인제스트**: `wiki/sources/2026-07-01-admin-course-upload-schema-cache-fallback.md`

- **[BUGFIX/INGEST] 어드민 강좌 삭제 진행 오버레이 조기 종료 및 목록 미동기화 수정**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 비동기 재귀 호출 `deleteCourse`에 `await`를 추가하여 `finally` 블록의 오버레이 종료 조기 호출을 방지하고, 최신 React state를 반영하도록 함수형 업데이트 및 명시적 성공 안내 팝업을 추가하여 화면 미동기화 및 진행 UX 개선
  - **인제스트**: `wiki/sources/2026-07-01-admin-course-deletion-recursion-fix.md`

- **[UI/UX/INGEST] 사용자 및 관리자 대시보드 UI 개선, 강좌 검색 및 나의 강좌 카드 이동성 및 여백 개선**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — 대시보드 학습 강좌 카드를 클릭하면 상세페이지로 링크 연결, 카드 여백 py-0 pb-0, footer padding pt-3 pb-3으로 밸런스 조정
    - `app/(user)/courses/page.tsx` — 종합 패키지 카드 py-0 패딩 적용, SaaS 추천 및 개별 신청 배지 타이틀 옆에서 삭제
    - `app/(user)/my-courses/page.tsx` — 강좌 카드 클릭 시 /my-courses/[slug] 상세로 이동 변경, [새 강좌 찾기] 버튼 emerald-600 테마 적용
    - `app/admin/dashboard/page.tsx` — 등록 외부 에이전트 및 활성 매크로 통계 카드 삭제, 대신 강좌 패키지 및 개별 강좌 통계로 대체
    - `app/api/admin/stats/route.ts` — 외부 에이전트 및 매크로 DB 쿼리 대신 course_packages 및 courses 카운트 쿼리로 교체, dummy fallback 추가
  - **인제스트**: `wiki/sources/2026-07-01-user-admin-dashboard-ui-improvements.md`

## 2026-06-30

- **[UI/UX/INGEST] 어드민 강좌 패키지 목록 카드 배경색 및 카드 형태 개선**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 부모 리스트 컨테이너 클래스를 `divide-y`에서 `space-y-4`로 교체하고, 개별 강좌 패키지 목록 및 로딩 스켈레톤 카드를 입체감 있는 테두리 카드 형태(`bg-white border shadow-sm`)로 개선
  - **인제스트**: `wiki/sources/2026-06-30-admin-package-card-background-fix.md`

- **[UI/UX/INGEST] 어드민 강좌 패키지 목록 레이아웃 개선 및 찌그러짐 현상 수정**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 패키지 리스트 썸네일 컨테이너 크기 수정 (`w-28 h-18` -> `w-24 h-16`) 및 강좌 패키지 액션 버튼 영역을 2x2 grid(2줄)로 레이아웃 개편
  - **인제스트**: `wiki/sources/2026-06-30-admin-package-layout-improvements.md`

- **[FEATURE/BUGFIX/INGEST] 대시보드 패키지 달성도 undefined 해결 및 어드민 패키지 매니페스트 수정 기능 구현**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — `course_package_items` 조인 페칭 추가 및 패키지 진행률(total, completed) 실시간 동적 계산 연산 추가
    - `app/admin/courses/page.tsx` — 패키지 리스트에 '매니페스트 수정' 버튼 추가 및 새로운 매니페스트(.json, .zip) 파일을 업로드/수정할 수 있는 EditManifestModal 다이얼로그 모달 추가
  - **인제스트**: `wiki/sources/2026-06-30-dashboard-package-progress-and-admin-edit-manifest.md`

- **[BUGFIX/INGEST] 대시보드 수강 중인 과목 집계 및 학습 중인 강좌 필터링 오류 해결**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — `createAdminClient`를 사용해 Supabase RLS 우회 후 패키지에 소속된 강좌들을 정상 필터링하도록 수정
  - **인제스트**: `wiki/sources/2026-06-30-dashboard-course-count-fix.md`

- **[FEAT/INGEST] 나의 강좌 패키지 필터링 우회 및 네이밍 레이블 개선**
  - **수정/생성 파일**:
    - `app/api/courses/progress/route.ts` — GET API에서 createAdminClient를 사용하여 RLS 우회해 course_package_items를 정상적으로 fetch
    - `app/(user)/my-courses/page.tsx` — "수강중인 강좌" 탭 -> "수강중인 개별 강좌" 변경
    - `app/(user)/courses/page.tsx` — "단과 개별 강좌" -> "개별 강좌" 및 관련 Empty state 안내 문구 수정
  - **인제스트**: `wiki/sources/2026-06-30-my-courses-filtering-and-naming-improvements.md`

## 2026-06-28

- **[FEAT/INGEST] 사이드바 메뉴 레이블 개선 및 설정 페이지 하위 메뉴 구조화**
  - **수정/생성 파일**:
    - `lib/constants/routes.ts` — "AI 강좌" → "강좌 검색" 레이블 수정, 설정 서브 라우트 상수 추가
    - `app/(user)/courses/page.tsx` — 타이틀 "강좌 탐색" → "강좌 검색"
    - `app/(user)/my-courses/page.tsx` — 타이틀 "나의 학습 진도" → "나의 강좌"
    - `app/(user)/settings/layout.tsx` (신규) — 프로필/에이전트/강좌 서브 내비게이션 레이아웃
    - `app/(user)/settings/page.tsx` — `/settings/profile` 리다이렉트로 교체
    - `app/(user)/settings/profile/page.tsx` (신규) — Supabase 실유저 데이터 연동, 닉네임 수정, 패스워드 변경 (Google 로그인 자동 감지·제외)
    - `app/(user)/settings/agent/page.tsx` (신규) — 추후 기능 배너 + 준비 중 카드 3개
    - `app/(user)/settings/course/page.tsx` (신규) — 추후 기능 배너 + 준비 중 카드 3개
  - **인제스트**: `wiki/sources/2026-06-28-sidebar-settings-overhaul.md`
- **[FEATURE] AI 튜터 설정 중 화면 Freeze 및 진행률 UI 표시**
  - **수정 파일**:
    - [components/features/AITutorProgressOverlay.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AITutorProgressOverlay.tsx) (신규 추가)
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-agents/page.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
  - **작업 내용**:
    - **AITutorProgressOverlay 컴포넌트 구현**: AI 튜터 설정 작업이 지연되는 동안 타 작업을 차단하도록 뒷단 화면을 반투명 블러링(glassmorphism) 및 포인터 이벤트 제어로 freeze하는 오버레이 구현.
    - **실시간 프로그래스 피드백**: API 응답 대기 시간(약 10~15초) 동안 사용자 경험을 극대화하기 위해 에이전트 연결, soul.md 빌드, 전송 및 최종 동기화 검증 단계를 가상의 0% ~ 100% 로딩 진행률과 단계별 상태 텍스트 애니메이션으로 피드백.
    - **진입 경로 연동**: 에이전트 목록의 간이 스위치 토글, 에이전트 추가 모달, 에이전트 상세 정보 변경 및 저장의 3개 진입점 모두에 설정 중인 경우 본 오버레이를 팝업하도록 통합 완료.

- **[FEATURE/BUGFIX] AI 튜터 답변 내 URL 클릭 시 새 창 링크 이동 지원**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [components/features/AgentChatTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - **URL 파싱 및 새 창 렌더링**: AI 튜터의 답변 내용 중 plain URL(`https://...` 등) 및 markdown 링크(`[label](url)`)를 감지하여, 새 창(target="_blank", rel="noopener noreferrer")에서 열리는 클릭 가능한 `a` 링크로 렌더링하는 `renderTextWithLinks` 헬퍼 함수를 추가.
    - **인라인 및 볼드 서식 통합**: 인라인 코드 및 볼드 서식 등 기존 마크다운 식 파서와 호환되도록 볼드체 내부와 일반 텍스트 구간 모두에 URL 링크 처리를 적용.

- **[FEATURE/BUGFIX] AI 튜터 연동 최적화 및 오프라인 대기 고착 오류 해결**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [lib/supabase/proxy.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/supabase/proxy.ts)
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts) (신규 API)
  - **작업 내용**:
    - **실시간 에이전트 핑 체크**: 학습 화면 진입 시 외부 에이전트 상태가 오프라인으로 멈춰있는 문제를 해결하기 위해 실시간 핑(ping) 테스트를 호출하고 DB와 UI 상태를 동기화.
    - **강좌 리소스 API 구현**: 전체 강좌의 설명, 목차, 모든 학습 카드 내용을 Markdown 파일로 패키징해 다운로드할 수 있는 API 설계. 외부 에이전트 접근을 위해 미들웨어 예외 추가.
    - **온디맨드 다운로드 프롬프트**: 매번 첫 턴마다 대용량 컨텍스트를 담던 비효율적 전송 방식 대신, 리소스 URL과 함께 캐싱/재다운로드 방지 프롬프트 지침만 항상 전송하게 경량화(1KB 미만 유지).

## 2026-06-27

- **[FEATURE] 사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용**
  - **수정 파일**:
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/(user)/my-features/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-features/page.tsx)
    - [app/(user)/billing/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/billing/page.tsx)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/admin/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/dashboard/page.tsx)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/features/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/features/page.tsx)
    - [app/admin/users/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/users/page.tsx)
    - [app/admin/macros/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/macros/page.tsx)
  - **작업 내용**:
    - 비동기 데이터 로딩 중 불완전한 상태에서 "데이터가 없습니다"와 같은 빈 상태(Empty State) 레이아웃이 노출되는 깜빡임(Flash of Empty State) UX 결함 해결.
    - 서버 컴포넌트에는 레이아웃을 정밀 반영하는 고품질 Skeleton UI fallback 적용.
    - 클라이언트 컴포넌트는 loading 상태일 때 카드 리스트/테이블 행 단위의 Skeleton 로더를 매칭 렌더링하고, 사용자 및 매크로 관리 등은 전체 화면 스피너 대신 테이블 내부만 스케줄 뼈대 로딩하도록 구성 변경하여 레이아웃 시프트 방지.

- **[BUGFIX] 관리자(/admin) 경로 진입 시 "This page couldn't load" 렌더링 크래시 해결**
  - **수정 파일**:
    - [app/admin/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/layout.tsx)
    - [components/admin/AdminSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/admin/AdminSidebar.tsx)
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - **원인 분석**: Next.js 15/16 + Turbopack + 캐싱 설정(`cacheComponents: true`) 하에서, 클라이언트 컴포넌트인 사이드바 내부에서 `usePathname()` dynamic hook을 호출할 때 정적 컴필레이션/SSR 초기 렌더링 도중 `pathname`이 `null`로 반환됩니다. 이 때 `pathname.startsWith()` 호출이 TypeError를 발생시키고, 이 에러가 `<Suspense>` 경계 밖으로 버블링되면서 서버 사이드 렌더링(SSR) 레이아웃이 500 에러("This page couldn't load")를 일으켰습니다. 이에 따라 브라우저에서 dynamic stream 로더 커넥션이 강제로 끊어지며 `Connection closed.` 콘솔 예외가 동반 발생했습니다.
    - **해결 방안**:
      - `AdminSidebar`를 `<Suspense>` 바운더리 내부로 배치하여 컴포넌트 렌더링 지연 및 동적 예외를 정상 격리했습니다.
      - `AdminSidebar` 및 `UserSidebar` 컴포넌트 내부에서 `pathname` 참조 시, `null`인 경우에 대해 안전한 삼항 연산 및 null-safe 논리 평가를 적용하여 startsWith 크래시를 전면 차단했습니다.

## 2026-06-26

- **[BUGFIX] Vercel CI 빌드 중 API 라우트 정적 렌더링(Prerendering) 오류 2차 해결**
  - **수정 대상**: `app/api/` 내의 모든 `GET` 라우트 총 12개
  - **작업 내용**:
    - **문제 원인**: Next.js 15 환경에서 `cacheComponents: true` (또는 Dynamic IO) 설정이 활성화되어 있을 경우 `export const dynamic = 'force-dynamic'` 옵션과 충돌하여 빌드 에러(`Route segment config "dynamic" is not compatible with nextConfig.cacheComponents`)가 발생했습니다.
    - **해결 방안**: 라우트 세그먼트 옵션(`force-dynamic`)을 모두 제거하고, 대신 `next/server`의 `connection()` 함수를 각 API `GET` 핸들러 최상단에서 `await connection();`으로 호출하도록 수정했습니다. 이를 통해 캐싱 설정과 충돌하지 않으면서도 API 라우트를 정상적으로 동적 렌더링으로 전환할 수 있습니다.


## 2026-06-23

- **[BUGFIX/TROUBLESHOOTING] 로그인 무한 리다이렉트 루프 및 Vercel 배포 구문 오류(Next.js 미들웨어) 트러블슈팅**
  - **수정 파일**:
    - `middleware.ts` -> `proxy.ts`
    - `lib/supabase/middleware.ts` -> `lib/supabase/proxy.ts`
  - **작업 내용**:
    - 로그인 직후 무한 리다이렉트 루프를 유발하던 Supabase SSR 쿠키 파싱 실패(`endsWith('-auth-token')`) 로직을 모두 제거하고, `updateSession` 내부의 `getUser()`로 세션 갱신 로직을 일원화했습니다.
    - 배포 중 `const declarations must be initialized` 오류가 발생한 원인을 찾아 `createServerClient` import 구문을 파일 최상단으로 옮겼습니다.
    - Next.js 16 최신 권고에 따라 deprecate된 `middleware.ts` 파일명을 `proxy.ts`로 이름을 원복하여 빌드 에러 및 경고를 완벽히 해결했습니다.

## 2026-06-21

- **[INGEST]** `wiki/originals/hermes-dashboard-api.md` → `sources/hermes-dashboard-api.md`
  - Concepts: [[HermesDashboardAPI]]
  - 작업 내용: Hermes의 설정 관리용 Dashboard API(9120) 인증 체계 (세션 토큰, OAuth, insecure), 엔드포인트 목록 및 외부 플랫폼 연동 방식 문서화

- **[INGEST]** `agent-synthesis` → `sources/hermes-agent-security-architecture.md`
  - Concepts: [[IframeSecurityTrilemma]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 아키텍처 (Vercel Proxy) 및 iframe 내에서의 인증, HTTPS 도입 전의 보안 트릴레마와 대안적 한계점(Nginx Referer spoofing 취약점) 기록

- **[INGEST]** `docs/sidebar-unimplemented-menus-update.md` → `sources/sidebar-unimplemented-menus-update.md`
  - 작업 내용: PennyPress 사용자 포털 사이드바 미구현 메뉴 시각적 비활성화 및 레이아웃 정리 내역 요약 문서 위키 등록

- **[FEAT/INGEST] 외부 에이전트 [칸반/웹UI] 연동 및 대시보드 자동 기동 통합**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh)
    - [components/features/AddAgentModal.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AddAgentModal.tsx)
    - [components/features/AgentKanbanTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentKanbanTab.tsx)
  - **작업 내용**:
    - **대시보드 동시 구동 및 정리**: `start.sh` 스크립트를 개선하여 API 게이트웨이(8642) 구동 시 백그라운드로 대시보드(9118)를 자동 기동하도록 하고, `trap`과 `cleanup` 핸들러로 게이트웨이 중단 시 좀비 프로세스 방지.
    - **등록 모달 자동 완성**: API Endpoint URL 입력 시 로컬 환경(localhost, 127.0.0.1)이 감지되면 Web UI URL 입력란에 `http://localhost:9118`이 자동으로 채워지는 편의 기능 적용.
    - **칸반 탭 원클릭 자동 연동**: `web_ui_url` 미지정 로컬 에이전트 접속 시, 원클릭 로컬 대시보드 연동 버튼 및 WSL 구동 방법 팁 박스를 노출해 원클릭으로 DB를 업데이트하고 연동.
    - **트러블슈팅 반영**: 게이트웨이를 `exec`로 구동 시 trap 시그널이 유실되어 대시보드가 orphaned되던 구조적 설계 에러를 해결(exec 제거 및 부모 프로세스 대기).
    - **WSL 환경 경로 에러 해결**: WSL 비대화형(non-interactive) 실행 시 Node.js 경로 누락으로 인해 대시보드가 Web UI 빌드에 실패하던 문제를 해결하기 위해, 스크립트 상단에 local Node.js 경로(`$HOME/.hermes/node/bin`)를 `PATH` 환경 변수에 자동으로 추가하는 설정을 도입하였습니다.

- **[TROUBLESHOOTING/INGEST] WSL2 Hermes Agent IP 조회 및 바인딩 오류 해결 가이드 작성**
  - **수정 파일**:
    - [docs/wsl-hermes-ip-binding-troubleshooting.md](file:///C:/___Workspace/Projects/PennyPress/docs/wsl-hermes-ip-binding-troubleshooting.md) (신규 가이드 문서)
    - [wiki/sources/wsl-hermes-ip-binding-troubleshooting.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/wsl-hermes-ip-binding-troubleshooting.md) (위키 인제스트 요약)
  - **작업 내용**:
    - **원인 식별**: WSL 가상 IP(`172.30.34.189`)로 외부 에이전트 Endpoint 등록 시 연결에 실패하는 원인이 Hermes Agent의 `127.0.0.1` 로컬 루프백 바인딩 때문임을 확인하였습니다.
    - **해결 방안 기록**: `localhost` 포트 포워딩을 활용하여 등록 주소를 원복하거나, `~/.hermes-local/.env` 환경 변수 파일에 `API_SERVER_HOST=0.0.0.0` 설정을 추가하여 포트 바인딩을 확장하는 솔루션을 작성 및 위키 데이터베이스에 동기화하였습니다.

- **[BUGFIX] IP 접속 시의 로그인 폼 전송 오동작(끝에 `?` 붙으며 튕김) 해결**
  - **수정 파일**:
    - [next.config.ts](file:///C:/___Workspace/Projects/PennyPress/next.config.ts)
  - **작업 내용**:
    - **HMR/하이드레이션 차단 현상 해결**: 외부 사설 IP(`192.168.0.51`)를 통해 개발 서버에 접근했을 때, Next.js 기본 보안 제한으로 인해 크로스 오리진 자바스크립트 리소스(`webpack-hmr`) 로드가 차단되는 현상을 확인했습니다. 이로 인해 리액트 하이드레이션이 실패하고 자바스크립트가 무력화되어 로그인 버튼 클릭 시 `onSubmit` 이벤트 핸들러가 바인딩되지 못했고, 브라우저 기본 HTML GET 폼 제출 동작을 타며 URL에 `?`가 붙고 무한 새로고침되는 문제를 해결했습니다.
    - **설정 보완 및 서버 재기동**: [next.config.ts](file:///C:/___Workspace/Projects/PennyPress/next.config.ts) 에 `allowedDevOrigins: ['192.168.0.51', 'localhost']` 설정을 보완하고, Next.js 개발 서버를 재기동하여 설정을 즉각 반영했습니다.

- **[CLEANUP] 로컬 Supabase 자원 및 설정 제거**
  - **작업 내용**:
    - 원격 Supabase 사용 방침에 맞춰 로컬 `supabase` 설정 디렉토리를 완전히 제거했습니다.
    - 로컬 도커에 남아있던 모든 Supabase Docker 이미지들을 일괄적으로 삭제하여 디스크 용량을 최적화했습니다 (`docker rmi`).

- **[BUGFIX] 로그인 시도 시 세션 갱신 실패 및 무한 로그인 페이지 리다이렉트 오류 해결**
  - **수정 파일**:
    - [lib/supabase/proxy.ts](file:///C:/___Workspace/Projects/PennyPress/lib/supabase/proxy.ts)
  - **작업 내용**:
    - **근본 원인 파악**: Fluid Compute 개발 환경의 특성상 Next.js 기본 `middleware.ts` 대신 `proxy.ts`가 미들웨어 역할을 대행합니다. 그러나 기존 `lib/supabase/proxy.ts`에 정의된 `updateSession` 내부에서 실제 Supabase JS SDK API에 존재하지 않는 **`supabase.auth.getClaims()`**를 호출하여 런타임 오류가 발생했습니다.
    - **리다이렉트 루프 해결**: 이 예외로 인해 미들웨어 세션 갱신 과정에서 사용자가 비로그인 상태(`user = null`)로 판정되었고, 보호 대상 경로인 `/dashboard` 등으로 라우팅할 때 무조건 `/auth/login`으로 튕겨나가 폼 입력창만 리셋되고 로그인 화면이 유지되는 치명적 버그가 있었습니다.
    - **조치 사항**: `getClaims` 호출을 Supabase 표준 세션 조회 메서드인 **`supabase.auth.getUser()`** 로 전면 교체하여 세션 동기화 및 갱신 흐름이 복구되었습니다.
    - **환경 정리**: 분석 도중 Next.js 미들웨어로 잘못 오인하여 임시 생성했던 중복 파일 `middleware.ts`를 깔끔히 삭제하여 "Both middleware file... and proxy file... are detected" 충돌 경고를 해소했습니다.

## 2026-06-20

- **[BUGFIX/PERF] 외부 에이전트 상세 페이지 초기화 레이스 컨디션 및 사이드바 언마운트 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - **초기 상태 레이스 컨디션 해결**: 페이지 진입 시 DB의 이전 상태가 `'online'`일 경우 `fetchAgentAndUser`가 `setAgent`로 `'online'` 상태를 덮어씌워 오프라인 상태 초기화(`initializeStatus`)와 불일치하는 오류를 해결하기 위해, 최초 로드된 local state `status`를 무조건 `'offline'`으로 강제 고정하여 클린 오프라인 시작 사양을 완벽히 충족시켰습니다.
    - **사이드바 언마운트 방지**: `UserSidebar` 컴포넌트의 비동기 fetch(`getExternalAgents`) 도중 언마운트 시 발생 가능한 `setState` 메모리 누수 및 오동작을 예방하기 위해 `active` 플래그 체크 로직을 도입했습니다.
    - **UX 최적화**: 사용자가 수동으로 연결 확인을 시도할 때 대기 상태 진입 즉시 기존의 "자동 연결 해제 안내 배너"가 즉각 사라지도록 UI 피드백 속도를 보완했습니다.

- **[PERF] 연결 확인 비동기 호출 시 언마운트 후 DB 상태 변경 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - "연결 확인" 버튼 클릭 후 비동기 응답 대기 중에 사용자가 빠르게 다른 페이지로 이동하여 컴포넌트가 unmount되는 경우, 뒤늦게 로드 완료된 비동기 콜백에서 데이터베이스의 상태를 `online`으로 덮어써서 실제로는 오프라인 상태임에도 온라인 상태로 계속 남는 버그를 예방하기 위해 `isMountedRef`를 추가했습니다.
    - `handleRefreshStatus`에서 데이터베이스 업데이트 및 `setState` 트리거 이전에 `isMountedRef.current` 마운트 여부를 검사하여 unmounted 상태에서는 데이터베이스 수정 로직이 실행되지 않도록 안전 장치를 구현했습니다.

- **[PERF] 외부 에이전트 상세 페이지 데이터 페칭 레이스 컨디션 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - 에이전트 상세 페이지에서 `id` 변경이나 컴포넌트 언마운트가 일어날 때, 비동기 호출(`Promise.all`)이 진행 중인 경우 이전 상태 업데이트가 비정상적으로 덮어씌워지는 레이스 컨디션을 방지하기 위해 `active` 플래그를 도입했습니다.
    - `useEffect` cleanup 시 `active = false`로 지정하여 unmounted 상태일 때 `setState`가 트리거되지 않도록 처리했습니다.

- **[FEAT] Task 2: Page Lifecycle Initialization & Connection Updates**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - 개별 외부 에이전트 포털 진입/이탈 시 connection state의 일관성을 제어하기 위해 페이지 마운트 및 언마운트 시 해당 에이전트의 DB status 상태를 `'offline'`으로 자동 동기화하도록 `useEffect` 라이프사이클 훅을 연동했습니다.
    - 연결 상태 갱신 시 `agents-updated` 커스텀 이벤트를 디스패치하여 사이드바의 에이전트 서브메뉴 목록이 즉시 동적 동기화되도록 조치했습니다.
    - "연결 확인"(`handleRefreshStatus`) 클릭 시 테스트 API 응답 결과('online' 또는 'offline')를 데이터베이스에 즉시 업데이트(`updateExternalAgent`)하고, 성공 및 실패 여부와 무관하게 사이드바 갱신 이벤트(`agents-updated`)를 전달하도록 연결 갱신 영속성 로직을 보완했습니다.

- **[BUGFIX] 사이드바 외부 에이전트 동적 동기화 구현**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
    - [app/(user)/my-agents/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/page.tsx)
  - **작업 내용**:
    - `useRef` 최적화 도입 이후 동일 페이지 내에서 외부 에이전트 추가/삭제 시 사이드바 서브메뉴가 즉시 갱신되지 않고 이전 목록을 유지하는 동기화 누락 이슈를 보완했습니다.
    - 브라우저 수준의 `agents-updated` 커스텀 이벤트를 정의하여 에이전트 목록 로드 및 갱신 시 이벤트를 디스패치하도록 구성하고, `UserSidebar`에서 이를 수신해 사이드바 목록을 즉시 갱신하도록 처리했습니다.

- **[PERF] 사이드바 외부 에이전트 목록 조회 DB Fetch 최적화**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - 라우트가 바뀔 때마다 모든 페이지에서 `getExternalAgents()` DB 조회가 중복/불필요하게 매번 일어나는 문제를 최적화했습니다.
    - `useRef`를 활용해 최초 1회 로드 여부(`hasFetchedRef`)를 트래킹하도록 설계했습니다.
    - 최초 로드 상태가 아니거나, 현재 경로가 외부 에이전트 관련 경로(`/my-agents`로 시작) 혹은 에이전트 추가/삭제 변경이 일어날 수 있는 대시보드 경로(`/dashboard`)인 경우에만 선택적으로 API 호출을 수행하도록 필터링 조건을 추가하여 불필요한 백엔드 DB 부하를 경감시켰습니다.

- **[FEAT] Task 2: Implement Dynamic External Agent Loading and Sub-menu UI**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - 사이드바 내 "외부 에이전트" 항목을 정적 SIDEBAR_ITEMS에서 분리하고, "호스팅 관리" (index 2) 뒤에 하이브리드로 동적 렌더링되도록 구현했습니다.
    - 컴포넌트 마운트 및 페이지 이동 시 `getExternalAgents()` API를 호출하여 등록된 외부 에이전트 목록을 동적으로 로드하도록 로직을 추가했습니다.
    - 사이드바가 축소된 경우(isCollapsed) 토글 버튼 및 서브메뉴를 렌더링하지 않도록 처리했습니다.
    - 상세 페이지(/my-agents/[id]) 활성화 시 서브메뉴가 자동으로 확장(setIsOpen(true))되도록 자동 확장 훅을 통합했습니다.
    - 서브메뉴의 활성 상태 스타일링(isActive)을 `isAgentActive` 조건에 맞춰 `SidebarMenuSubButton`에 완벽히 연동하고, ChevronRight 아이콘을 토글 상태에 맞춰 회전(rotate-90) 처리했습니다.

- **[BUGFIX] Next.js 15 Prerendering 빌드 오류 해결**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/layout.tsx)
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - Next.js 15 빌드 과정에서 dynamic hook인 `usePathname()` 및 dynamic page params `use(params)`가 `<Suspense>` 경계 외부에서 호출되어 "Uncached data was accessed outside of <Suspense>" 오류로 빌드가 실패하던 현상을 해결했습니다.
    - 레이아웃 단에서 `usePathname`을 활용하는 `UserSidebar`를 `<Suspense>`로 감싸고, 개별 에이전트 상세 페이지(`AgentPortalPage`)에서도 dynamic params를 하위 컴포넌트 `AgentPortalContent`로 위임하여 `<Suspense>` 내부에서 `use(params)`를 동적 해석하게 함으로써 Next.js static prerendering 빌드를 정상 통과시켰습니다.

- **[FEAT] Task 5: Integrate Dynamic Chat History & Model Bindings in AgentChatTab**
  - **수정 파일**:
    - [components/features/AgentChatTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - 컴포넌트가 마운트될 때 `GET /api/external-agents/[id]/messages`를 호출하여 이전 대화 기록을 동적으로 로드하는 `useEffect` 훅을 통합했습니다.
    - "대화 비우기"(`handleClearChat`) 시 `DELETE /api/external-agents/[id]/messages`를 호출하여 로컬 상태뿐만 아니라 Supabase 데이터베이스에서도 대화 내역이 완전히 영구 삭제되도록 구현했습니다.
    - 헤더의 하드코딩된 에이전트 모델명을 dynamic `{agent.selected_model || 'hermes-agent'}`로 바인딩하여 활성화된 모델을 동적으로 출력하도록 개선했습니다.
    - 대화 시작 전 소개 카드 타이틀을 기존의 고정 텍스트에서 `{agent.name}와 대화 시작`으로 변경하여 개별 에이전트 이름이 노출되도록 개선했습니다.
    - `npx tsc --noEmit` 및 ESLint 린팅 검사를 통해 어떠한 구문 또는 타입 에러도 없음을 검증하고 코미트를 완료했습니다.


- **[FEAT] Task 4: Implement External Agent Chat Route with Streaming & Database Persistence**
  - **수정 파일**:
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - 외부 에이전트 전용 스트리밍 채팅 API 라우트 (`POST`)의 본 구성을 완료하였습니다.
    - Supabase Auth를 통한 소유권 및 세션 검증 로직을 탑재했습니다.
    - Node.js의 IPv6 선호 문제(`::1`)를 우회하기 위해 `localhost` 주소를 강제로 IPv4 루프백(`127.0.0.1`)으로 대체하는 로직을 통합했습니다.
    - 원격 에이전트의 API endpoint에 따라 `/v1/chat/completions` API를 `Authorization: Bearer <API_KEY>` 헤더와 함께 호출합니다.
    - 다운스트림의 SSE 응답 스트림을 브라우저 클라이언트에 전달하는 동시에, 응답 본문의 텍스트를 청크 단위로 버퍼링하고 파싱하여 `user_external_agent_messages` 테이블에 사용자와 어시스턴트 메시지를 각각 저장하도록 구현했습니다.
    - 대화 저장 후 데이터베이스 RPC 함수인 `prune_external_agent_messages`를 호출하여 특정 에이전트의 대화 히스토리를 최신 100개 메시지로 자동 정리(Pruning)하도록 구현했습니다.
    - `npx tsc --noEmit`을 이용해 전체 TypeScript 타입 에러 및 컴파일 경고가 없는 것을 검증했습니다.


- **[BUGFIX/TROUBLESHOOTING] 외부 에르메스 에이전트(Mock) 응답 문제 및 LLM 모델명 누락 오류 해결**
  - **오류 현상**:
    - 외부 에이전트를 WSL2 기반으로 정상 등록했으나, 채팅 창에서 대화 시 항상 Mock 답변("안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다...")만 출력됨.
    - Mock 서버 프로세스를 중단하고 실제 에이전트를 구동했을 때는 채팅 입력 시 아무런 응답이 나타나지 않음.
  - **원인**:
    1. **포트 충돌**: Windows 호스트에서 `agent-worker/main.py`가 에이전트 기본 포트인 `8642` 포트로 실행되어, WSL2 포트 포워딩을 가로채고 Mock 응답을 반환하고 있었음.
    2. **모델명 누락 (`Model: (not set)`)**: Mock 프로세스 종료 후 실제 에이전트에 연결되었으나, `~/.hermes-local/config.yaml`에 `model` 설정이 누락되어 DeepSeek API 호출 시 빈 값(`model=`)이 들어가면서 API 400 Bad Request 에러 발생 (`The supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you passed .`).
  - **조치 사항**:
    1. Windows 호스트에서 `8642` 포트를 점유하고 있던 파이썬 Mock 프로세스(`agent-worker/main.py`) 강제 종료.
    2. `agent-worker` 구동 시 가상환경 파이썬을 지정하여 기본 포트인 **8001** 포트로 실행하도록 해결 가이드 작성.
    3. WSL2 내부 `~/.hermes-local/config.yaml`에 `model: deepseek-v4-flash` 설정을 명시적으로 추가하여 모델명 누락 문제 해결 (`hermes config set model deepseek-v4-flash`).
    4. 기존 게이트웨이 서비스 프로세스 정지 후 에이전트 재가동 (`bash hermes-agent/start.sh`).
  - **결과**:
    - 포트 충돌이 해소되고 모델 설정이 정상 주입되어, 실제 로컬 WSL2 환경에서 구동 중인 Hermes Agent가 정상 응답을 출력하는 것을 검증 완료.

- **[BUGFIX/TROUBLESHOOTING] Node.js IPv6 루프백 주소 해석으로 인한 WSL2 외부 에이전트 연결 끊김(Disconnected) 오류 해결**
  - **오류 현상**:
    - 사용자가 WSL2에서 Hermes Agent를 구동하고 CLI(`hermes`)로는 정상 접속했으나, PennyPress 웹 UI(포털)의 에이전트 상태에서는 `Disconnected`(오프라인) 상태로 표시되는 문제가 발생함.
  - **원인**:
    - WSL2의 자동 포트 포워딩(`wslrelay.exe`)은 Windows 호스트의 IPv4 루프백(`127.0.0.1:8642`)만 수신하고 대기함.
    - 하지만 Next.js 백엔드 서버(Node.js v17+ 환경)에서 `localhost` 주소를 호스팅 도메인으로 해석할 때, IPv6 루프백 주소인 `::1`을 IPv4(`127.0.0.1`)보다 먼저 우선 해석 및 요청함.
    - `::1:8642` 포트는 리스닝 상태가 아니므로 `fetch` 요청이 Connection Refused(연결 거부) 오류를 일으켜 오프라인 상태로 인식됨.
  - **수정 사항**:
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) 및 [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) 파일 내에서 외부 에이전트 엔드포인트 URL 파싱 시, 호스트가 `localhost`인 경우 강제로 `127.0.0.1` IPv4 루프백으로 변환하도록 정규화 처리(`endpoint.replace('//localhost', '//127.0.0.1')`)를 적용함.
  - **결과**:
    - Next.js 백엔드 서버가 IPv6 우회(127.0.0.1 고정)를 진행하여 WSL2 환경의 API Gateway 서버(`http://localhost:8642/v1`)와 정상적으로 연결 동기화 및 SSE 스트리밍 채팅이 가능하도록 조치 완료.

- **[BUGFIX/TROUBLESHOOTING] 실제 에르메스 에이전트 로컬 연동 오류 해결 및 플랫폼 등록 성공**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh) (실행 경로 동적 해결 적용)
    - [hermes-agent/.env.example](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/.env.example) (`GATEWAY_ALLOW_ALL_USERS` 옵션 추가)
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) (Endpoint URL 정규화 적용)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) (Endpoint URL 정규화 적용)
    - [wiki/sources/install-actual-hermes-wsl2.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/install-actual-hermes-wsl2.md) (트러블슈팅 내용 업데이트)
  - **작업 내용**:
    - **start.sh 경로 에러 수정**: 일반 사용자 계정 권한 설치 시 `/usr/local/bin/hermes` 경로 대신 `~/.local/bin/hermes`를 사용하도록 바이너리 우선순위 검색 구조를 보완하여 `No such file or directory` 에러를 해결했습니다.
    - **보안 차단 해제**: 외부 연동 테스트를 위해 `GATEWAY_ALLOW_ALL_USERS=true` 설정을 추가하는 안내 및 템플릿을 보완했습니다.
    - **API 헬스체크 및 호출 경로 정규화**: 에이전트 등록 화면에서 `/v1` 주소 입력 시 `/health` 및 `/v1/models` 경로가 이중으로 꼬이는 버그를 해결하기 위해 URL 파싱을 정규화했습니다.
    - **데이터베이스 프로필 누락 해결**: 신규 회원가입 트리거 이전에 생성된 구 계정들의 프로필 데이터 누락 문제를 Supabase SQL Editor용 일괄 백필 쿼리로 해결하여 외래 키 위반 에러(`user_external_agents_user_id_fkey`)를 무력화하고 최종적으로 외부 에이전트 등록에 성공했습니다.

- **[FEAT] 실제 에르메스 에이전트(Hermes Agent) 로컬 연동 패키지 구축 및 설치/트러블슈팅 문서화**
  - **생성 파일**: 
    - `hermes-agent/install.sh`, `hermes-agent/start.sh`, `hermes-agent/config.yaml`, `hermes-agent/.env.example`, `hermes-agent/soul.md`, `hermes-agent/README.md`
    - `docs/INSTALL_ACTUAL_HERMES_WSL2.md`
  - **수정 파일**: `README.md` (가이드 링크 추가)
  - **작업 내용**:
    - 실제 에르메스 에이전트를 WSL2 로컬 PC 환경에 설치하고, API 서버(포트 `8642`)를 구동하여 PennyPress 웹 앱의 외부 에이전트 등록 및 통신 기능과 직접 연동할 수 있도록 자동화 셸 스크립트와 가이드 문서를 구축함.
  - **실패 사례 및 트러블슈팅**:
    - 에르메스 코어가 `root` 권한(혹은 `wsl -u root` 강제 설치)으로 설치되었을 경우, 가상환경 파이썬 인터프리터 원본이 `/root/.local/share/uv/...` 디렉토리에 생성되어 일반 사용자(`godstale`)가 실행할 때 `bad interpreter: Permission denied` 오류가 발생함.
    - 이를 해결하기 위해 기존 root 소유 설치본을 `sudo rm`으로 완전히 삭제하고, 일반 사용자 계정 권한으로 인스톨러(`curl ... | bash`)를 다시 실행해 일반 사용자 홈 경로 아래에 파이썬이 올바르게 맵핑되도록 수정하여 연동 권한 오류를 완벽히 해결함. 이 트러블슈팅 내역을 `docs/INSTALL_ACTUAL_HERMES_WSL2.md` 매뉴얼에 상세 기재해둠.

- **[BUGFIX]** Supabase URL/Key Mismatch resolution
  - Files modified: `.env.local`
  - 작업 내용:
    - 로그인 시 `invalid api key` 오류 발생을 수정하기 위해 `.env.local` 파일 내 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 원격 프로젝트 (`https://fbaxselsdfceyygdvpnj.supabase.co`)에 대응하는 올바른 클라우드 API 키 (`sb_publishable_t5P8hMAxS-bpDrz2AzkTTA_HDT5ltsz`)로 업데이트함.
    - curl.exe 테스트를 통하여 정상적인 API 게이트웨이 인증 확인(HTTP 200 OK).

- **[INGEST]** `docs/superpowers/plans/2026-06-20-external-hermes-agent-integration.md` → `sources/external-hermes-agent-integration.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ExternalHermesAgent]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 구현 계획 및 최종 구현 결과에 대한 요약 인제스트

- **[FEAT]** Task 6: Individual Agent Portal: Chat, Kanban, Settings (/my-agents/[id])
  - Files created: `app/(user)/my-agents/[id]/page.tsx`, `components/features/AgentChatTab.tsx`, `components/features/AgentKanbanTab.tsx`, `components/features/AgentSettingsTab.tsx`
  - 작업 내용:
    - `page.tsx`: Dynamic route wrapper checking user authentication and ownership before fetching external agent details via `getExternalAgentById(id)`. Features connection test refresh button.
    - `AgentChatTab.tsx`: Interactive chat UI with custom avatars, starter prompts, full AbortController (stop generating) support, and OpenAI-compatible SSE chunk stream buffering parser. Also includes styled copyable code blocks and bold/inline formatting.
    - `AgentKanbanTab.tsx`: Web UI embedding via iframe. Displays loading skeleton during frame loading, and falls back to blank target link in case of X-Frame-Options header block.
    - `AgentSettingsTab.tsx`: Summarizes agent credentials, supports full local form editing (updates endpoint, web UI url, API key), and queries supported models from remote `/v1/models` on mount or refresh to present as a badge list.
    - Verified linting (`npx eslint`) and type compilation (`npx tsc --noEmit`) cleanly without errors or warnings.

- **[REFACTOR]** Task 5: External Agent Directory & Registration UI Refactoring
  - Files modified: `components/features/AddAgentModal.tsx`, `app/(user)/my-agents/page.tsx`
  - 작업 내용:
    - `AddAgentModal.tsx`: Fixed any-type inside connection test, typed model mapping `(m: { id: string })`, handled save errors with a UI state `saveError` to display in the modal, and set `apiKey` and `webUiUrl` to `undefined` if empty to prevent empty string DB inserts.
    - `my-agents/page.tsx`: Wrapped `loadAgents` in `useCallback` and added it as a dependency in `useEffect`. Fixed `react/no-unescaped-entities` errors for double quotes by escaping with `&quot;`. Used `Promise.allSettled` instead of `Promise.all` in `handleSyncAll` to handle individual agent ping failures gracefully.
    - Verified linting and typescript compilation cleanly.

- **[REFACTOR]** External Agent APIs Security & Performance Refactoring
  - Files modified: `app/api/external-agents/[id]/chat/route.ts`, `app/api/external-agents/test/route.ts`
  - 작업 내용:
    - `test/route.ts`: Added Supabase auth check using `createClient` to verify session and prevent SSRF.
    - `[id]/chat/route.ts`: Passed `req.signal` to downstream `fetch` call and added `X-Accel-Buffering: no` header to streaming response to prevent proxy buffering.

- **[INGEST]** `docs/pennypress-service-spec.md` → `sources/pennypress-service-spec.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[HydraAgentService]], [[AIAgentWorker]]
  - 작업 내용: 최신 HydraAgent 호스팅 서비스 및 요금제 명세서 위키 등록

## 2026-06-14

- **[INGEST]** `.firecrawl/hermes-agent.md` → `sources/hermes-agent.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-api-server.md` → `sources/hermes-api-server.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-architecture.md` → `sources/hermes-architecture.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-guide-pytorch-kr.md` → `sources/hermes-guide-pytorch-kr.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-messaging.md` → `sources/hermes-messaging.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-quickstart.md` → `sources/hermes-quickstart.md` (summary-only)
- **[INGEST]** `docs/DATABASE_SCHEMA.md` → `sources/database-schema.md`
- **[INGEST]** `docs/SUPABASE_SETUP.md` → `sources/supabase-setup.md`
- **[INGEST]** `docs/HERMES_GUIDE.md` → `sources/hermes-guide.md`
  - Concepts: [[HermesArchitecture]], [[HermesSkills]], [[HermesCron]], [[HermesSecurity]]
- **[INGEST]** `docs/INSTALL_WINDOWS_WSL2.md` → `sources/install-windows-wsl2.md`
  - Concepts: [[WSL2Setup]], [[PM2Management]]
- **[INGEST]** `hydra-agent/GUIDELINE.md` → `sources/hydra-agent-guideline.md`
  - Concepts: [[HydraAgentGuideline]]

- **[INGEST]** `docs/superpowers/plans/2026-06-12-pennypress-phase2.md` → `sources/2026-06-12-pennypress-phase2.md`
  - Concepts: [[Phase2Plan]], [[SupabaseSchema]], [[HermesWorkerAPI]], [[SSEUpdates]]
  - 작업 내용: Phase 2 구현 계획 인제스트

- **[INGEST]** `docs/hydra-agent-local-setup-summary.md` → `sources/hydra-agent-local-setup.md`
  - Concepts: [[HydraAgentLocalSetup]]
  - 작업 내용: 3종 Hermes Agent 로컬 개발환경 구성 완료 (파일 작업)
  - 생성 파일: `hydra-agent/` 전체 (GUIDELINE.md, ecosystem.config.js, agents/*/setup.sh, config.yaml, soul.md ×8, scripts/ ×3)
  - 수정 파일: `lib/constants/hydra-agent.ts` (server-only 신규), `hydra-agent/HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md` (재작성), `.env.example`
  - 미완료: WSL2 실제 실행 및 기동 검증 (Task 11) — 사용자 직접 수행 필요
  - 실패 사례: routes.ts에 server 상수 혼입 → hydra-agent.ts 분리, .env.example 시크릿 노출 → 플레이스홀더 교체
  - 빌드: `pnpm build` 정상 완료

## 2026-06-13

- **[INGEST]** `docs/HydraAgentGoal.md` → `sources/hydra-agent-goal.md`
  - Concepts: [[HydraAgentService]]
  - 작업 내용: Feature 구독 모델 → HydraAgent 호스팅 모델 전면 전환 완료
  - 변경 파일: lib/types, lib/dummy-data, routes.ts, dashboard, features, my-features, billing, admin/features, CLAUDE.md, Phase2/3 플랜
  - 빌드: `pnpm build` 타입 오류 없이 정상 완료

- **[INGEST]** `DESIGN.md` → `sources/design-system.md`
  - Concepts: [[DesignSystem]]


## 2026-06-12

- **[INGEST]** `docs/PennyPress_Service_Plan.md` → `sources/pennypress-service-plan.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ContentMonitoring]], [[AIAgentWorker]], [[PointSystem]]
- **[INIT]** 프로젝트 위키 초기화. 서비스 기획서 인제스트 완료.

## [2026-06-20] graph | Knowledge graph rebuilt

45 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

47 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

48 nodes, 41 edges (41 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt
- **[BUGFIX] Next.js 15 Prerendering 빌드 오류 해결**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/layout.tsx)
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - Next.js 15 빌드 과정에서 dynamic hook인 `usePathname()` 및 dynamic page params `use(params)`가 `<Suspense>` 경계 외부에서 호출되어 "Uncached data was accessed outside of <Suspense>" 오류로 빌드가 실패하던 현상을 해결했습니다.
    - 레이아웃 단에서 `usePathname`을 활용하는 `UserSidebar`를 `<Suspense>`로 감싸고, 개별 에이전트 상세 페이지(`AgentPortalPage`)에서도 dynamic params를 하위 컴포넌트 `AgentPortalContent`로 위임하여 `<Suspense>` 내부에서 `use(params)`를 동적 해석하게 함으로써 Next.js static prerendering 빌드를 정상 통과시켰습니다.

- **[FEAT] Task 5: Integrate Dynamic Chat History & Model Bindings in AgentChatTab**
  - **수정 파일**:
    - [components/features/AgentChatTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - 컴포넌트가 마운트될 때 `GET /api/external-agents/[id]/messages`를 호출하여 이전 대화 기록을 동적으로 로드하는 `useEffect` 훅을 통합했습니다.
    - "대화 비우기"(`handleClearChat`) 시 `DELETE /api/external-agents/[id]/messages`를 호출하여 로컬 상태뿐만 아니라 Supabase 데이터베이스에서도 대화 내역이 완전히 영구 삭제되도록 구현했습니다.
    - 헤더의 하드코딩된 에이전트 모델명을 dynamic `{agent.selected_model || 'hermes-agent'}`로 바인딩하여 활성화된 모델을 동적으로 출력하도록 개선했습니다.
    - 대화 시작 전 소개 카드 타이틀을 기존의 고정 텍스트에서 `{agent.name}와 대화 시작`으로 변경하여 개별 에이전트 이름이 노출되도록 개선했습니다.
    - `npx tsc --noEmit` 및 ESLint 린팅 검사를 통해 어떠한 구문 또는 타입 에러도 없음을 검증하고 코미트를 완료했습니다.


- **[FEAT] Task 4: Implement External Agent Chat Route with Streaming & Database Persistence**
  - **수정 파일**:
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - 외부 에이전트 전용 스트리밍 채팅 API 라우트 (`POST`)의 본 구성을 완료하였습니다.
    - Supabase Auth를 통한 소유권 및 세션 검증 로직을 탑재했습니다.
    - Node.js의 IPv6 선호 문제(`::1`)를 우회하기 위해 `localhost` 주소를 강제로 IPv4 루프백(`127.0.0.1`)으로 대체하는 로직을 통합했습니다.
    - 원격 에이전트의 API endpoint에 따라 `/v1/chat/completions` API를 `Authorization: Bearer <API_KEY>` 헤더와 함께 호출합니다.
    - 다운스트림의 SSE 응답 스트림을 브라우저 클라이언트에 전달하는 동시에, 응답 본문의 텍스트를 청크 단위로 버퍼링하고 파싱하여 `user_external_agent_messages` 테이블에 사용자와 어시스턴트 메시지를 각각 저장하도록 구현했습니다.
    - 대화 저장 후 데이터베이스 RPC 함수인 `prune_external_agent_messages`를 호출하여 특정 에이전트의 대화 히스토리를 최신 100개 메시지로 자동 정리(Pruning)하도록 구현했습니다.
    - `npx tsc --noEmit`을 이용해 전체 TypeScript 타입 에러 및 컴파일 경고가 없는 것을 검증했습니다.


- **[BUGFIX/TROUBLESHOOTING] 외부 에르메스 에이전트(Mock) 응답 문제 및 LLM 모델명 누락 오류 해결**
  - **오류 현상**:
    - 외부 에이전트를 WSL2 기반으로 정상 등록했으나, 채팅 창에서 대화 시 항상 Mock 답변("안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다...")만 출력됨.
    - Mock 서버 프로세스를 중단하고 실제 에이전트를 구동했을 때는 채팅 입력 시 아무런 응답이 나타나지 않음.
  - **원인**:
    1. **포트 충돌**: Windows 호스트에서 `agent-worker/main.py`가 에이전트 기본 포트인 `8642` 포트로 실행되어, WSL2 포트 포워딩을 가로채고 Mock 응답을 반환하고 있었음.
    2. **모델명 누락 (`Model: (not set)`)**: Mock 프로세스 종료 후 실제 에이전트에 연결되었으나, `~/.hermes-local/config.yaml`에 `model` 설정이 누락되어 DeepSeek API 호출 시 빈 값(`model=`)이 들어가면서 API 400 Bad Request 에러 발생 (`The supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you passed .`).
  - **조치 사항**:
    1. Windows 호스트에서 `8642` 포트를 점유하고 있던 파이썬 Mock 프로세스(`agent-worker/main.py`) 강제 종료.
    2. `agent-worker` 구동 시 가상환경 파이썬을 지정하여 기본 포트인 **8001** 포트로 실행하도록 해결 가이드 작성.
    3. WSL2 내부 `~/.hermes-local/config.yaml`에 `model: deepseek-v4-flash` 설정을 명시적으로 추가하여 모델명 누락 문제 해결 (`hermes config set model deepseek-v4-flash`).
    4. 기존 게이트웨이 서비스 프로세스 정지 후 에이전트 재가동 (`bash hermes-agent/start.sh`).
  - **결과**:
    - 포트 충돌이 해소되고 모델 설정이 정상 주입되어, 실제 로컬 WSL2 환경에서 구동 중인 Hermes Agent가 정상 응답을 출력하는 것을 검증 완료.

- **[BUGFIX/TROUBLESHOOTING] Node.js IPv6 루프백 주소 해석으로 인한 WSL2 외부 에이전트 연결 끊김(Disconnected) 오류 해결**
  - **오류 현상**:
    - 사용자가 WSL2에서 Hermes Agent를 구동하고 CLI(`hermes`)로는 정상 접속했으나, PennyPress 웹 UI(포털)의 에이전트 상태에서는 `Disconnected`(오프라인) 상태로 표시되는 문제가 발생함.
  - **원인**:
    - WSL2의 자동 포트 포워딩(`wslrelay.exe`)은 Windows 호스트의 IPv4 루프백(`127.0.0.1:8642`)만 수신하고 대기함.
    - 하지만 Next.js 백엔드 서버(Node.js v17+ 환경)에서 `localhost` 주소를 호스팅 도메인으로 해석할 때, IPv6 루프백 주소인 `::1`을 IPv4(`127.0.0.1`)보다 먼저 우선 해석 및 요청함.
    - `::1:8642` 포트는 리스닝 상태가 아니므로 `fetch` 요청이 Connection Refused(연결 거부) 오류를 일으켜 오프라인 상태로 인식됨.
  - **수정 사항**:
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) 및 [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) 파일 내에서 외부 에이전트 엔드포인트 URL 파싱 시, 호스트가 `localhost`인 경우 강제로 `127.0.0.1` IPv4 루프백으로 변환하도록 정규화 처리(`endpoint.replace('//localhost', '//127.0.0.1')`)를 적용함.
  - **결과**:
    - Next.js 백엔드 서버가 IPv6 우회(127.0.0.1 고정)를 진행하여 WSL2 환경의 API Gateway 서버(`http://localhost:8642/v1`)와 정상적으로 연결 동기화 및 SSE 스트리밍 채팅이 가능하도록 조치 완료.

- **[BUGFIX/TROUBLESHOOTING] 실제 에르메스 에이전트 로컬 연동 오류 해결 및 플랫폼 등록 성공**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh) (실행 경로 동적 해결 적용)
    - [hermes-agent/.env.example](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/.env.example) (`GATEWAY_ALLOW_ALL_USERS` 옵션 추가)
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) (Endpoint URL 정규화 적용)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) (Endpoint URL 정규화 적용)
    - [wiki/sources/install-actual-hermes-wsl2.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/install-actual-hermes-wsl2.md) (트러블슈팅 내용 업데이트)
  - **작업 내용**:
    - **start.sh 경로 에러 수정**: 일반 사용자 계정 권한 설치 시 `/usr/local/bin/hermes` 경로 대신 `~/.local/bin/hermes`를 사용하도록 바이너리 우선순위 검색 구조를 보완하여 `No such file or directory` 에러를 해결했습니다.
    - **보안 차단 해제**: 외부 연동 테스트를 위해 `GATEWAY_ALLOW_ALL_USERS=true` 설정을 추가하는 안내 및 템플릿을 보완했습니다.
    - **API 헬스체크 및 호출 경로 정규화**: 에이전트 등록 화면에서 `/v1` 주소 입력 시 `/health` 및 `/v1/models` 경로가 이중으로 꼬이는 버그를 해결하기 위해 URL 파싱을 정규화했습니다.
    - **데이터베이스 프로필 누락 해결**: 신규 회원가입 트리거 이전에 생성된 구 계정들의 프로필 데이터 누락 문제를 Supabase SQL Editor용 일괄 백필 쿼리로 해결하여 외래 키 위반 에러(`user_external_agents_user_id_fkey`)를 무력화하고 최종적으로 외부 에이전트 등록에 성공했습니다.

- **[FEAT] 실제 에르메스 에이전트(Hermes Agent) 로컬 연동 패키지 구축 및 설치/트러블슈팅 문서화**
  - **생성 파일**: 
    - `hermes-agent/install.sh`, `hermes-agent/start.sh`, `hermes-agent/config.yaml`, `hermes-agent/.env.example`, `hermes-agent/soul.md`, `hermes-agent/README.md`
    - `docs/INSTALL_ACTUAL_HERMES_WSL2.md`
  - **수정 파일**: `README.md` (가이드 링크 추가)
  - **작업 내용**:
    - 실제 에르메스 에이전을 WSL2 로컬 PC 환경에 설치하고, API 서버(포트 `8642`)를 구동하여 PennyPress 웹 앱의 외부 에이전트 등록 및 통신 기능과 직접 연동할 수 있도록 자동화 셸 스크립트와 가이드 문서를 구축함.
  - **실패 사례 및 트러블슈팅**:
    - 에르메스 코어가 `root` 권한(혹은 `wsl -u root` 강제 설치)으로 설치되었을 경우, 가상환경 파이썬 인터프리터 원본이 `/root/.local/share/uv/...` 디렉토리에 생성되어 일반 사용자(`godstale`)가 실행할 때 `bad interpreter: Permission denied` 오류가 발생함.
    - 이를 해결하기 위해 기존 root 소유 설치본을 `sudo rm`으로 완전히 삭제하고, 일반 사용자 계정 권한으로 인스톨러(`curl ... | bash`)를 다시 실행해 일반 사용자 홈 경로 아래에 파이썬이 올바르게 맵핑되도록 수정하여 연동 권한 오류를 완벽히 해결함. 이 트러블슈팅 내역을 `docs/INSTALL_ACTUAL_HERMES_WSL2.md` 매뉴얼에 상세 기재해둠.

- **[BUGFIX]** Supabase URL/Key Mismatch resolution
  - Files modified: `.env.local`
  - 작업 내용:
    - 로그인 시 `invalid api key` 오류 발생을 수정하기 위해 `.env.local` 파일 내 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 원격 프로젝트 (`https://fbaxselsdfceyygdvpnj.supabase.co`)에 대응하는 올바른 클라우드 API 키 (`sb_publishable_t5P8hMAxS-bpDrz2AzkTTA_HDT5ltsz`)로 업데이트함.
    - curl.exe 테스트를 통하여 정상적인 API 게이트웨이 인증 확인(HTTP 200 OK).

- **[INGEST]** `docs/superpowers/plans/2026-06-20-external-hermes-agent-integration.md` → `sources/external-hermes-agent-integration.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ExternalHermesAgent]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 구현 계획 및 최종 구현 결과에 대한 요약 인제스트

- **[FEAT]** Task 6: Individual Agent Portal: Chat, Kanban, Settings (/my-agents/[id])
  - Files created: `app/(user)/my-agents/[id]/page.tsx`, `components/features/AgentChatTab.tsx`, `components/features/AgentKanbanTab.tsx`, `components/features/AgentSettingsTab.tsx`
  - 작업 내용:
    - `page.tsx`: Dynamic route wrapper checking user authentication and ownership before fetching external agent details via `getExternalAgentById(id)`. Features connection test refresh button.
    - `AgentChatTab.tsx`: Interactive chat UI with custom avatars, starter prompts, full AbortController (stop generating) support, and OpenAI-compatible SSE chunk stream buffering parser. Also includes styled copyable code blocks and bold/inline formatting.
    - `AgentKanbanTab.tsx`: Web UI embedding via iframe. Displays loading skeleton during frame loading, and falls back to blank target link in case of X-Frame-Options header block.
    - `AgentSettingsTab.tsx`: Summarizes agent credentials, supports full local form editing (updates endpoint, web UI url, API key), and queries supported models from remote `/v1/models` on mount or refresh to present as a badge list.
    - Verified linting (`npx eslint`) and type compilation (`npx tsc --noEmit`) cleanly without errors or warnings.

- **[REFACTOR]** Task 5: External Agent Directory & Registration UI Refactoring
  - Files modified: `components/features/AddAgentModal.tsx`, `app/(user)/my-agents/page.tsx`
  - 작업 내용:
    - `AddAgentModal.tsx`: Fixed any-type inside connection test, typed model mapping `(m: { id: string })`, handled save errors with a UI state `saveError` to display in the modal, and set `apiKey` and `webUiUrl` to `undefined` if empty to prevent empty string DB inserts.
    - `my-agents/page.tsx`: Wrapped `loadAgents` in `useCallback` and added it as a dependency in `useEffect`. Fixed `react/no-unescaped-entities` errors for double quotes by escaping with `&quot;`. Used `Promise.allSettled` instead of `Promise.all` in `handleSyncAll` to handle individual agent ping failures gracefully.
    - Verified linting and typescript compilation cleanly.

- **[REFACTOR]** External Agent APIs Security & Performance Refactoring
  - Files modified: `app/api/external-agents/[id]/chat/route.ts`, `app/api/external-agents/test/route.ts`
  - 작업 내용:
    - `test/route.ts`: Added Supabase auth check using `createClient` to verify session and prevent SSRF.
    - `[id]/chat/route.ts`: Passed `req.signal` to downstream `fetch` call and added `X-Accel-Buffering: no` header to streaming response to prevent proxy buffering.

- **[INGEST]** `docs/pennypress-service-spec.md` → `sources/pennypress-service-spec.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[HydraAgentService]], [[AIAgentWorker]]
  - 작업 내용: 최신 HydraAgent 호스팅 서비스 및 요금제 명세서 위키 등록

## 2026-06-14

- **[INGEST]** `.firecrawl/hermes-agent.md` → `sources/hermes-agent.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-api-server.md` → `sources/hermes-api-server.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-architecture.md` → `sources/hermes-architecture.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-guide-pytorch-kr.md` → `sources/hermes-guide-pytorch-kr.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-messaging.md` → `sources/hermes-messaging.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-quickstart.md` → `sources/hermes-quickstart.md` (summary-only)
- **[INGEST]** `docs/DATABASE_SCHEMA.md` → `sources/database-schema.md`
- **[INGEST]** `docs/SUPABASE_SETUP.md` → `sources/supabase-setup.md`
- **[INGEST]** `docs/HERMES_GUIDE.md` → `sources/hermes-guide.md`
  - Concepts: [[HermesArchitecture]], [[HermesSkills]], [[HermesCron]], [[HermesSecurity]]
- **[INGEST]** `docs/INSTALL_WINDOWS_WSL2.md` → `sources/install-windows-wsl2.md`
  - Concepts: [[WSL2Setup]], [[PM2Management]]
- **[INGEST]** `hydra-agent/GUIDELINE.md` → `sources/hydra-agent-guideline.md`
  - Concepts: [[HydraAgentGuideline]]

- **[INGEST]** `docs/superpowers/plans/2026-06-12-pennypress-phase2.md` → `sources/2026-06-12-pennypress-phase2.md`
  - Concepts: [[Phase2Plan]], [[SupabaseSchema]], [[HermesWorkerAPI]], [[SSEUpdates]]
  - 작업 내용: Phase 2 구현 계획 인제스트

- **[INGEST]** `docs/hydra-agent-local-setup-summary.md` → `sources/hydra-agent-local-setup.md`
  - Concepts: [[HydraAgentLocalSetup]]
  - 작업 내용: 3종 Hermes Agent 로컬 개발환경 구성 완료 (파일 작업)
  - 생성 파일: `hydra-agent/` 전체 (GUIDELINE.md, ecosystem.config.js, agents/*/setup.sh, config.yaml, soul.md ×8, scripts/ ×3)
  - 수정 파일: `lib/constants/hydra-agent.ts` (server-only 신규), `hydra-agent/HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md` (재작성), `.env.example`
  - 미완료: WSL2 실제 실행 및 기동 검증 (Task 11) — 사용자 직접 수행 필요
  - 실패 사례: routes.ts에 server 상수 혼입 → hydra-agent.ts 분리, .env.example 시크릿 노출 → 플레이스홀더 교체
  - 빌드: `pnpm build` 정상 완료

## 2026-06-13

- **[INGEST]** `docs/HydraAgentGoal.md` → `sources/hydra-agent-goal.md`
  - Concepts: [[HydraAgentService]]
  - 작업 내용: Feature 구독 모델 → HydraAgent 호스팅 모델 전면 전환 완료
  - 변경 파일: lib/types, lib/dummy-data, routes.ts, dashboard, features, my-features, billing, admin/features, CLAUDE.md, Phase2/3 플랜
  - 빌드: `pnpm build` 타입 오류 없이 정상 완료

- **[INGEST]** `DESIGN.md` → `sources/design-system.md`
  - Concepts: [[DesignSystem]]


## 2026-06-12

- **[INGEST]** `docs/PennyPress_Service_Plan.md` → `sources/pennypress-service-plan.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ContentMonitoring]], [[AIAgentWorker]], [[PointSystem]]
- **[INIT]** 프로젝트 위키 초기화. 서비스 기획서 인제스트 완료.

## [2026-06-20] graph | Knowledge graph rebuilt

45 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

47 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

48 nodes, 41 edges (41 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

49 nodes, 45 edges (45 extracted).

## 2026-06-23
- **Ingest**: [[admin-ui-fixes]] - Admin Page UI Fixes & Error Handling.
-   [ 2 0 2 6 - 0 6 - 2 3 ]   U p d a t e d   [ [ a d m i n - a p i - 5 0 0 - e r r o r ] ]   w i t h   f a l l b a c k   m o c k   d a t a   s o l u t i o n  

## 2026-06-26
- **Ingest**: [[2026-06-26-ai-agent-course-integration]] - PennyPress AI Agent 강좌 서비스 연동 (Vivo Academy 마이그레이션)
- **Ingest**: [[vivo-lecture-guidelines]] - Vivo Academy 강의 생성 및 AI Agent 가이드라인
- **Slug:** `admin-course-upload-bugfix`
- **Action:** Ingested new source about fixing course zip upload bug and refactoring to Supabase Storage.

## 2026-06-27
- **Ingest**: [[loading-empty-states]] - 사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용
- **Ingest**: [[vercel-preview-oauth-troubleshooting]] - Vercel Preview Deployment 환경에서 Google 로그인 requested path is invalid 에러 해결 가이드
- **Ingest**: [[admin-course-preview-bugfix]] - PennyPress: Admin 강좌 미리보기 버그 픽스 및 Next.js 15 Suspense 연동

## 2026-06-28
- **[BUGFIX] Windows Zip 파일 경로 구분자 백슬래시(\) 버그 수정**
  - **수정 파일**: [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
  - **작업 내용**:
    - Windows 환경에서 압축한 강좌 zip 파일에서 `entry.entryName` 추출 시 경로 구분자로 백슬래시(`\`)가 생겨 Supabase Storage에 백슬래시가 포함된 잘못된 경로 구조로 저장되던 현상을 해결했습니다.
    - `entry.entryName.replace(/\\/g, '/')` 처리를 더해 항상 표준 슬래시(`/`) 구분자로 Storage에 저장되도록 보정했습니다.
    - 업로드 API 파일 내 ESLint 오류(any 사용 및 catch parameter)를 정리하여 안전한 타입 구조(`CourseConfig` 인터페이스, `catch(error: unknown)`)를 확보하고 빌드/린트를 정상 통과시켰습니다.
  - **Concepts**: [[WindowsZipPathHandling]]
- **[BUGFIX] Supabase Storage 비-ASCII 키 제한으로 인한 업로드 오류 및 슬러그 정규화 개선**
  - **수정 파일**:
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
  - **작업 내용**:
    - Supabase Storage 버킷이 한글 및 특수기호(`—` 등)가 포함된 경로 업로드를 `Invalid key`로 차단하는 문제를 해결했습니다.
    - `docs/arduino-beginner` 강좌 설정에 명시적인 ASCII 슬러그 `"slug": "arduino-beginner"`를 추가하고 zip 파일을 재생성했습니다.
    - 업로드 API에서 슬러그 자동 생성 및 명시적 슬러그 수신 시 ASCII 문자(소문자, 숫자, 하이픈 등)만 남도록 강력하게 정규화(slugify)하는 위생 처리 로직을 적용했습니다.
    - 개별 파일 업로드 실패 시 단순히 무시하지 않고, 전체 업로드 처리를 500 에러로 중단하도록 업로드 API 에러 핸들링을 보완했습니다.

- **[FEATURE] 강좌 삭제 예외 처리, 비활성화 기능 도입, 스크롤 오류 및 AI 에이전트 연동 개선**
  - **수정 파일**:
    - [supabase/migrations/20260629_add_disabled_to_courses.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260629_add_disabled_to_courses.sql)
    - [supabase/migrations/20260630_user_progress.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260630_user_progress.sql)
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
    - [app/api/admin/courses/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/[id]/route.ts)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/api/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/route.ts)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **강좌 삭제 시 예외 처리**: 관리자 페이지에서 강좌 삭제 시, 수강 중인 유저(`user_progress` 데이터)가 존재할 경우 Conflict 에러(409)를 리턴하고, 관리자 UI에서 재확인 동의창을 띄우는 프레젠테이션 계층 로직을 설계했습니다.
    - **강좌 비활성화(Disable) 기능**: `courses` 테이블에 `disabled` 필드를 추가하고, 수강 기록 진도를 트래킹하기 위한 `user_progress` 테이블을 원격 Supabase DB에 마이그레이션(db push)했습니다. 비활성화된 강좌는 일반 유저 탐색에서 숨겨지고, 이미 수강 중인 강좌 목록 및 학습 상세 페이지에서는 학습 진행 및 진입을 강제 차단하는 UI를 적용했습니다.
    - **학습 화면 레이아웃 스크롤 오류 해결**: 학습 화면 우측 및 하단 바가 absolute 배치로 인해 스크롤 동작을 방해하고 콘텐츠 하단을 가리던 CSS를 일반 flex-flow 레이아웃으로 변경하여 스크롤 문제를 깔끔하게 해결했습니다.
    - **AI 튜터 외부 에이전트 대화 API 연동**: 임시 setTimeout 더미를 제거하고, 사용자의 등록된 온라인 상태인 `user_external_agents` 목록을 조회하여 해당 에이전트 ID로 SSE 스트리밍 질문-답변(chat completions) API를 연동했습니다. 온라인 에이전트가 존재하지 않을 시에는 가이드 및 설정 바로가기 링크를 제공합니다.
  - **Concepts**: [[CourseManagement]], [[UserProgressTracking]], [[SSEStreamingChat]]

- **[FEATURE] 강좌 학습 화면 AI 튜터 연동 및 숨김 콘텍스트 프롬프트 고도화**
  - **수정 파일**:
    - [supabase/migrations/20260701_add_is_ai_tutor_to_external_agents.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260701_add_is_ai_tutor_to_external_agents.sql)
    - [docs/supabase_setup_query.txt](file:///C:/Workspace/Projects/PennyPress-FE/docs/supabase_setup_query.txt)
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/api/external-agents.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/api/external-agents.ts)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-agents/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - **데이터베이스 스키마 확장**: `user_external_agents` 테이블에 `is_ai_tutor` BOOLEAN 컬럼을 마이그레이션 및 문서 상에 동기화하였습니다.
    - **타입 및 배타적 단일 선택 로직**: `UserExternalAgent` 타입에 `is_ai_tutor`를 반영하고, `createExternalAgent` 및 `updateExternalAgent` 호출 시 해당 에이전트의 `is_ai_tutor`가 `true`일 경우 동일 사용자의 타 에이전트들의 값을 모두 `false`로 자동 초기화하여 유일성을 물리적/논리적으로 보장했습니다.
    - **UI 컴포넌트 업데이트**: 에이전트 등록 모달 및 설정 상세 탭 내에 "AI 튜터용 에이전트로 설정" 스위치를 제공하였고, 조회 및 카드 목록 화면에서 지정 여부와 배지(AI 튜터)를 미려하게 노출했습니다.
    - **조합형 프롬프트 고도화**: 강좌 학습 화면에서 `is_ai_tutor` 지정 에이전트가 없을 경우 `미연동 - 설정 필요` 상태를 반환하도록 예외 처리했습니다. 질문 전송 시 백엔드 API에는 강좌 전체 내용 및 각 카드 내용(System Message) + 현재 학습 중인 카드의 내용(Context Header)을 자동으로 조합하여 전송하고, 사용자 화면의 채팅 버블에는 질문 원본과 답변만 표시하여 학습 집중도를 극대화했습니다. 또한, DB에는 조합형 프롬프트 대신 원래 질문을 저장하도록 API를 보완하여 다른 탭의 히스토리가 오염되지 않도록 마감했습니다.
  - **Concepts**: [[AITutorIntegration]], [[ExclusiveSingleSelection]], [[ContextHiddenPrompting]]

- **[BUGFIX] 강좌 학습 화면 AI 튜터 우측 사이드바 레이아웃 높이/너비 overflow 수정 및 마크다운 렌더러 도입**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **세로 스크롤 고정 및 overflow 해결**: 우측 사이드바 `<aside>` 및 대화 리스트 `<ScrollArea>` 영역에 `min-h-0`, `overflow-hidden` 레이아웃 제약 조건을 적용하여, AI 답변이 길어질 때 사이드바 전체 높이가 커지며 하단 입력 창이 뷰포트 밖으로 밀리고 스크롤이 먹통이 되는 현상을 깔끔하게 해결했습니다.
    - **가로 overflow 및 줄바꿈 해결**: 대화 말풍선 영역에 `min-w-0`, `whitespace-pre-wrap`, `break-words` 스타일을 적용하여, 긴 답변이나 특수 서식이 가로 영역을 벗어나 깨지거나 뭉개지지 않도록 조치했습니다.
    - **코드블록 및 서식 파싱 렌더러 도입**: 에이전트 상세 챗 탭의 `ChatMessageContent` 컴포넌트 로직을 도입하여 코드블록(``` 언어 ...) 내의 가로 스크롤 및 복사 기능, 백틱(```) 인라인 코드, 볼드(`**text**`) 서식을 지원하여 AI 튜터 답변 가독성을 대폭 끌어올렸습니다.
  - **Concepts**: [[LayoutOverflowFix]], [[ScrollFix]], [[ChatMarkdownRenderer]]
- **[FEATURE] Vercel SSO 우회를 위한 Supabase Storage 리소스 업로드 및 fallback ToC 구현**
  - **수정 파일**:
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **API Route 고도화**: `/api/courses/[slug]/resource` 엔드포인트 호출 시, 강좌 리소스 Markdown 파일을 컴파일하고 Supabase Storage `courses` 버킷의 `${slug}/resource.md` 경로로 자동 업로드(`upsert: true`)하도록 연동했습니다. `?json=true` 쿼리 파라미터를 지원하여 7일간 유효한 Signed URL을 JSON 형태로 반환할 수 있게 확장했습니다.
    - **클라이언트 연동 및 SSO 우회**: 학습 화면 마운트 시 스토리지 URL을 비동기로 로드하고, 질문 전송 시 `systemPrompt` 내 `resourceUrl` 자리에 해당 Supabase Storage URL(domain: `*.supabase.co`)을 주입하여 Vercel SSO 차단 환경을 우회하도록 구성했습니다.
    - **이중화 Fallback 안전장치**: 스토리지 연동 실패 시나 로컬 더미 데이터 모드로 인해 `*.supabase.co` URL 획득에 실패할 경우, 세션의 첫 질문 시점에 클라이언트가 보유한 목차(ToC) 데이터를 프롬프트 내에 직접 인라인 텍스트로 보조 전송하는 안전장치를 추가했습니다.
  - **Concepts**: [[SSOBypassSupabaseStorage]], [[InlineToCFallback]]

- **[FEATURE] 강좌 학습 화면 AI 튜터 "히든 메시지" 파싱 및 자료 준비 상태 UI 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **히든 메시지 파싱 및 추출 로직 추가**: 에이전트 답변 본문에서 `<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": boolean} -->` 형식의 특수 주석을 감지하여 JSON 메타데이터를 파싱하고 본문에서 숨기는(strip) 정규식 로직을 추가했습니다. 실시간 스트리밍 중에도 닫히지 않은 부분 주석(`<!--`)을 임시 필터링하여 사용자 화면에 지저분한 원본 주석이 흘러 나오지 않게 처리했습니다.
    - **강좌 자료 다운로드 상태 추적**: `courseDownloadStatus` React State (`checking`, `downloaded`, `not_downloaded`)를 추가하고, 파싱된 다운로드 상태 결과를 반영하도록 구현했습니다.
    - **프롬프트 가이드라인 지시 사항 추가**: 첫 진입 시 시스템 점검 질문(`checkPrompt`) 및 시스템 역할 프롬프트(`systemPrompt`)에 히든 메시지를 첨부하여 진행 여부 상태를 응답하도록 AI 튜터용 인라인 가이드 지시문을 추가했습니다.
    - **실시간 비동기 UI 배지 구현**: 우측 AI 튜터 패널 헤더의 온라인 상태 표시 하단에 강좌 자료 준비 배지를 시각화했습니다. 로딩 애니메이션 스피너와 녹색 깜빡임 글로우 애니메이션, 앰버색 다운로드 에러 상태 등을 HSL 테마에 어우러지게 구현하여 고품질의 미려한 UX를 확보했습니다.
  - **Concepts**: [[HiddenMessageParsing]]

- **[FEATURE] 시스템 점검 메시지 화면 비노출 처리 및 AI 튜터 자동 셋업 프롬프트 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
    - [app/api/external-agents/setup-tutor/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/external-agents/setup-tutor/route.ts)
  - **작업 내용**:
    - **시스템 점검 메시지 비노출**: `sendMessage` 함수에 `isSystemCheck` 옵션을 추가하여, 페이지 첫 진입 시 구동되는 자료 점검(`checkPrompt`) 요청과 그 응답 스트림이 사용자 채팅 목록에 보이지 않고 백그라운드에서만 비동기로 실행되도록 하여 대화방 청결도를 대폭 개선했습니다.
    - **AI 튜터 자동 셋업 프롬프트 API 추가**: 외부 에이전트 등록/수정 시 `is_ai_tutor` 설정이 체크된 경우, 해당 에이전트의 OpenAI 호환 completions API로 에이전트 전용 `soul.md` 자동 생성/수정을 요청하는 셋업 프롬프트를 전송하도록 연동했습니다.
    - **응답 검증 가드**: 에이전트가 본인의 파일 생성/편집 도구를 활용해 `soul.md` 작성을 완료하고 `SUCCESS` 메시지를 포함하여 응답하는지 검증하는 프록시 엔드포인트 `/api/external-agents/setup-tutor`를 구축하였습니다.
  - **Concepts**: [[HiddenMessageParsing]], [[AITutorExclusivePersonaSetup]]



- **[FEATURE] 강좌 목차 노출, 수강 신청 및 에이전트/대시보드 UI 연동 개선**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/courses/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/(user)/settings/profile/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/settings/profile/page.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/api/admin/courses/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/[id]/route.ts)
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/layout/UserSidebar.tsx)
    - [supabase/migrations/20260702_add_max_card_to_user_progress.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260702_add_max_card_to_user_progress.sql)
  - **작업 내용**:
    - **강좌 목차 노출 및 템플릿**: 강좌 상세 페이지에 "강좌 목차 카드"를 추가하고, `config.json` 포맷에 `toc` 필드를 추가해 각 MDX 카드에 매치되는 제목/설명을 정의했습니다. AI Agent 및 강좌 업로드 가이드용 `docs/arduino-beginner` 템플릿의 `config.json`을 수정하고 `arduino-beginner.zip`을 재생성하였으며, 관리자 업로드 페이지 지침에 `toc` 정의를 보강했습니다.
    - **강좌 등록 연동 및 페이지 차단**: 강좌 검색 및 상세 페이지의 "수강하기/강좌 수강하기" 버튼을 "강좌 등록/강좌 등록하기"로 개편하고, 클릭 시 페이지 이동 대신 팝업(Dialog)으로 등록 성공 메시지를 표시해 "나의 강좌"로 유도하도록 설계했습니다. 등록 시 백엔드 `/api/courses/progress` API를 호출해 `user_progress` 레코드를 생성합니다.
    - **강좌 삭제 시 소프트 딜리트**: 관리자가 강좌를 DELETE 시 수강 중인 유저가 있을 경우 강좌를 하드 딜리트하지 않고 `disabled = true`로 상태만 변경하도록 차단/우회하여, 구독 중인 유저들의 `user_progress`가 CASCADE 딜리트되는 문제를 방지했습니다.
    - **나의 강좌 화면 개편**: 수강 중인 강좌와 완료된 강좌를 탭(Tabs)으로 나누어 표기하도록 개선하고, 학습 진도율은 마지막 뷰가 아닌 학습 진행의 "최대치"(`max_card`)를 기준으로 연동했습니다. `user_progress` 테이블에 `max_card` 필드를 추가하는 DB 마이그레이션을 생성하고, 진도 업데이트 API와 화면 계산 로직을 보완했습니다.
    - **대시보드 및 메뉴명 개선**: 대시보드 문구를 "AI 튜터를 이용한 인터랙티브 강좌" 학습과 에이전트 호스팅에 맞춰 수정하고, 현황 카드를 [활성 에이전트], [이번 달 토큰 사용량], [수강중인 과목], [완료한 강좌]로 세분화해 실시간 DB 쿼리 데이터와 연동했습니다. 사이드 바 메뉴 "외부 에이전트"를 "에이전트 관리"로 명칭을 변경했습니다.
    - **Google 계정 로그인 경고 배너**: 설정 > 프로필 페이지 하단의 Google 계정 비밀번호 안내를 단순 카드에서 노란색 계열의 Warning Alert 배너(`AlertTriangle` 아이콘)로 변경해 가독성과 시인성을 강화했습니다.
  - **Concepts**: [[CourseTOCAndRegistration]], [[SoftDeleteSubscribers]], [[MaxCardProgressTracking]], [[GoogleLoginWarningBanner]]

- **[FEATURE] 나의 강좌 상세 화면, 구독 취소 및 AI 튜터 갱신 안내 구현**
  - **수정 파일**:
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/my-courses/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/page.tsx)
    - [app/(user)/my-courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/client.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
  - **작업 내용**:
    - **나의 강좌 상세 화면 & 다이렉트 런칭**: 각 강좌를 클릭 시 진입하는 `/my-courses/[slug]` 상세 화면을 구축했습니다. 상세 화면에서 Progress Bar와 현재 목차 중 활성화된 단계를 표시하고, 클릭 시 해당 카드로 다이렉트 런칭(`/learn/[slug]?card=[Index]`) 가능하게 했습니다.
    - **구독 취소 기능**: 파괴적인 구독 취소 확인 Dialog를 구현하고, 백엔드 `DELETE /api/courses/progress` API를 통하여 수강 이력을 삭제하고 목록으로 전환하게 연동했습니다.
    - **AI 튜터 자료 동기화 및 갱신 알림**: `course.updated_at`과 `user_progress.updated_at`을 비교해 강좌 수정 시 기존 학습 파일을 지우고 새 번들을 새로 다운로드받아 분석하도록 AI 튜터 시스템 점검 프롬프트를 보강했습니다. 동시 실행 시 즉각 DB Progress updated_at을 리프레시하여 중복 셋업 알림을 예방했습니다.
    - **관리자 업로드 에러 핸들링**: ZIP 업로드 실패 시 선택된 파일 상태 및 input node value를 비워 버튼이 disabled 상태를 유지하도록 하고, 신규 파일 선택 시 idle로 복구하게 연동했습니다.
    - **번들러 생성 가이드 배너**: 콘텐츠 등록 화면에 AI Agent를 통해 ZIP 번들을 자동 생성하도록 유도하고 `PennyPress-Bundler` 레포지토리를 바로가기 할 수 있는 안내 영역을 보강했습니다.
  - **Concepts**: [[MyCoursesDetailView]], [[CourseSubscriptionCancellation]], [[CourseUpdatePromptSystem]], [[AdminUploadErrorRecovery]], [[BundlerRepositoryGuide]]

- **[FIX] 완료 강좌 목록 노출 오류 해결 및 학습 상세 화면 하단 잘림 UI 개선**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
  - **작업 내용**:
    - **완료한 강좌 노출 오류 수정**: Supabase DB에 `max_card` 컬럼 추가 마이그레이션이 반영된 이후, PostgREST API 스키마 캐시 불일치로 인한 `PGRST204` 에러("Could not find the 'max_card' column...")가 발생하여 진도 업데이트(upsert)가 실패하고 progress API GET이 오류를 반환해 강좌 리스트가 누락되던 문제를 발견했습니다. `/api/courses/progress` route.ts API의 에러 감지 조건에 `PGRST204` 코드를 추가하여, 스키마 캐시 문제 발생 시에도 안전하게 fallback upsert가 동작하고 completed 상태가 정상 저장/조회되도록 고도화했습니다.
    - **학습 화면 하단 네비게이션 잘림 개선**: `UserLayout`의 패딩(`py-8`)과 `UserHeader`(`h-16`)의 합산 높이가 `learn` 페이지의 `h-[calc(100vh-4rem)]` 컨테이너와 중첩되면서 하단 [이전], [다음/완료] 버튼 영역이 뷰포트 하단을 넘어가 잘리던 UI 버그를 해결하기 위해, 메인 컨테이너 높이를 `h-[calc(100vh-8rem)]`로 조정하여 뷰포트 내에 전체 UI가 스크롤 없이 미려하게 렌더링되도록 수정했습니다.
  - **Concepts**: [[PostgRESTSchemaCacheRecovery]], [[LearnLayoutViewportOptimization]]

- **[FEATURE] 강좌 학습 화면 기본 사이드바 최소화 및 좌측 목차(TOC) 자유 이동 구현**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/layout.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **좌측 사이드바 기본 최소화**: 사용자가 강좌 학습 상세 화면(`/learn/[slug]`)에 진입 시, `useSidebar()` 훅을 사용하여 애플리케이션의 공통 좌측 사이드바가 자동으로 닫히도록(최소화 상태) 개선하였습니다.
    - **전체 카드 목차(TOC) 노출 및 자유 이동**: 최소화된 사이드바의 잔여 공간을 활용하여 학습 화면 좌측에 강좌의 전체 카드 목록(TOC) 및 진행률(Progress Bar)이 표시되는 전용 패널을 추가했습니다.
    - **학습 범위 내 자유 이동 가드**: 사용자가 이미 수강하여 해제된 카드(Index <= maxUnlockedIndex) 사이에서는 자유롭게 목차를 눌러 넘나들 수 있도록 구현했으며, 아직 도달하지 않은 카드들은 락(Lock) 아이콘과 비활성 스타일을 처리해 학습 순서를 제어했습니다.
    - **전체 화면 레이아웃 최적화**: `no-layout-padding` CSS 규칙 및 Tailwind `has-` 선택자를 통해, 학습 화면에 진입했을 때만 전체 화면 너비와 높이(`h-[calc(100vh-4rem)]`)를 100% 사용하여 학습에 최적화된 대화식 콘솔 뷰를 구축했습니다.
  - **Concepts**: [[CourseTOCNavigation]], [[SidebarAutoCollapse]], [[FullScreenConsoleLayout]]

- **[FEATURE] 강좌(Course) 목차 구조를 단순 Flat 배열에서 계층적 트리(Chapter-Section-Subsection) 구조로 개편**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/my-courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
  - **작업 내용**:
    - **타입 정의 수정**: `lib/types/index.ts`에 `TocNodeType` 및 `TocNode` 인터페이스를 새롭게 추가하고, `Course.toc`의 속성을 `TocNode[]` 구조로 리팩토링했습니다.
    - **강좌 업로드 API 유효성 검사 수정**: `app/api/admin/courses/upload/route.ts`에서 업로드된 `config.json`의 `toc` 트리 구조가 올바른지 재귀적으로 검증하는 헬퍼 함수를 구축했습니다. `title`과 `description`의 누락이나 기본값 방치를 체크하고, 최하단 리프 노드(`filename` 속성을 지님)들의 목록을 수집하여 `cards` 배열과 1:1 중복 없이 매칭되는지 완전하게 확인합니다.
    - **강좌 상세 및 내 강좌 UI 페이지 수정**: `courses/[slug]/client.tsx`와 `my-courses/[slug]/client.tsx`에서 목차 렌더링을 계층적 트리 뷰로 전환하고, 아코디언/접기펼치기 상태 및 들여쓰기 인덴테이션을 depth에 맞춰 미려하게 스타일링했습니다.
    - **학습 플레이어 UI 및 사이드바 수정**: `learn/[slug]/client.tsx` 학습 사이드바를 트리 구조로 재구축하여, 현재 카드가 포함된 Subsection이 하이라이트되고 상위 Chapter/Section이 자동으로 펼쳐진 상태를 유지하도록 고도화하였습니다.
    - **TOC 파싱 및 Fallback 로직 재귀 전환**: API Route, 서버 컴포넌트, 학습 플레이어 내의 Flat TOC 전제 파싱 및 Fallback 텍스트 생성 로직을 트리 재귀 탐색 알고리즘으로 전면 리팩토링했습니다.
  - **Concepts**: [[CourseHierarchicalTOC]], [[RecursiveTOCValidation]], [[CollapsibleTOCTree]], [[ActiveCardTOCAutoExpand]]

## [2026-06-28] graph | Knowledge graph rebuilt

83 nodes, 57 edges (57 extracted).

## 2026-06-29
- **[BUGFIX] 강좌 학습 상세 화면 레이아웃 깨짐 및 스크롤바 미표시 버그 수정**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/layout.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **레이아웃 높이 계산 최적화**: `.no-layout-padding` 환경(학습 상세 화면 등 전체 화면 콘솔 뷰)에서 `main` 및 자식 `div` 요소에 적용되어 있던 `h-full` 클래스로 인해 `UserHeader`(64px)와 합쳐진 높이가 `100vh + 64px`로 과대 계산되던 버그를 수정했습니다. `h-full`을 제거하고 `flex-1 min-h-0`의 flex 높이 계산 방식으로 통일하여 화면이 브라우저 아래로 밀려나 하단에 여백이 생기고 상단 헤더가 잘리던 현상을 깔끔하게 해결했습니다.
    - **좌측 목차 사이드바 스크롤 복구**: 목차 목록이 길어질 때 사이드바 전체가 뷰포트를 벗어나 아래위가 잘리고 내부 스크롤이 작동하지 않던 버그를 고쳤습니다. 사이드바 컨테이너에 `min-h-0` 클래스를 부여하고 `ScrollArea` 컴포넌트에도 `min-h-0`을 추가하여, 주어진 영역 안에서 안전하게 세로 스크롤바가 노출되고 스크롤되도록 보완했습니다.
  - **Concepts**: [[LearnLayoutViewportOptimization]], [[ScrollFix]]

- **[BUGFIX] 강좌(Course) 체크포인트 QnA 실행 불가 버그 수정 및 AI 튜터 평가 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
    - [docs/arduino-beginner/arduino-beginner.zip](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/arduino-beginner.zip)
    - [scripts/zip-arduino.js](file:///C:/Workspace/Projects/PennyPress-FE/scripts/zip-arduino.js)
  - **작업 내용**:
    - **원인 분석**: 기존에는 강좌 `config.json` 내에 정의되어 있던 `checkpoints` 리스트를 서버 컴포넌트(`page.tsx`)와 클라이언트 학습 컴포넌트(`client.tsx`)가 수신 및 처리하지 않는 상태였습니다. 이에 따라 체크포인트가 설정된 강좌 카드를 통과해도 QnA 팝업이나 AI 튜터 평가 개입이 전혀 이루어지지 않았습니다.
    - **체크포인트 바인딩 및 차단**: `page.tsx`에서 Supabase Storage의 `config.json` 로딩 시 `checkpoints` 속성 타입을 선언하고, 이를 `LearnPageClient`로 무사히 전달하도록 props를 바인딩했습니다. `client.tsx`에서 학습자가 특정 카드를 모두 학습한 뒤 다음 카드로 넘어가려 할 때, 해당 카드가 체크포인트 지정 카드일 경우 슬라이드 전환을 일시 중단하고 QnA 모드(`isCheckpointMode = true`)로 전환하는 차단 로직을 추가했습니다.
    - **AI 튜터 QnA 질문 및 평가 자동화**: 체크포인트 진입 시 AI 튜터(외부 에이전트)에게 QnA 질문을 요청하는 백그라운드 지시 프롬프트(`isCheckpointTrigger = true`)를 사용자 대화 창에 노출하지 않은 채 전송하여 질문을 유도하고, 사용자가 입력한 답변을 AI 튜터가 `checkpoints.prompt` 내의 기준에 기반해 자율적으로 정답 여부를 판정하도록 유도했습니다.
    - **히든 메시지 연동 및 건너뛰기**: 에이전트의 응답 스트림 끝에 `<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": true/false} -->` 형태의 HTML 주석 주입을 감지하여, 정답 통과 시 `passedCheckpoints` 세트에 카드를 추가하고 차단을 해제하였습니다. 예외 탈출로를 위해 "QnA 건너뛰기" 기능과 TOC 수동 이동 시 건너뛰기 확인 대화상자(window.confirm)를 적용했습니다.
    - **빌드 유효성 검사 스크립트 수정 및 번들 재생성**: `scripts/zip-arduino.js` 스크립트 내 flat TOC 기준 카드 개수 1:1 유효성 검사 로직을 계층적 트리 TOC 검사 방식으로 수정하여 에러를 수정했습니다. 수정된 설정을 바탕으로 아두이노 테스트 번들인 `arduino-beginner.zip`을 재생성하여 배포 환경에 즉각 대응했습니다.
  - **Concepts**: [[CourseCheckpointQnA]], [[HiddenMessageEvaluation]], [[HierarchicalTOCZipping]]

- **[FEATURE] 체크포인트 [다음] 버튼 전환 및 안내 팝업 노출 기능 구현**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **체크포인트 버튼 전환**: 강좌 화면에서 현재 진행 중인 카드에 통과하지 않은 체크포인트가 설정되어 있는 경우, 기존의 `[다음]` 버튼을 주황색 테마의 `[체크포인트]`(자물쇠 아이콘 포함) 버튼으로 동적으로 전환하여 사용자가 직관적으로 체크포인트 상태임을 인지하도록 개선했습니다.
    - **안내 팝업 1회 노출**: `[체크포인트]` 버튼을 처음 클릭할 때, AI 튜터와 QnA를 진행하고 통과해야만 다음 강좌로 진행할 수 있음을 알려주는 모달 안내 창(Dialog)을 띄우도록 했습니다. 팝업에서 "QnA 시작하기"를 클릭하면 AI 튜터의 QnA 세션이 시작되며, 팝업은 각 체크포인트당 최초 1회만 노출되어 불필요하게 반복되지 않도록 최적화했습니다.
    - **QnA 진행 중 제어**: 이미 QnA가 진행 중인 상태에서 버튼을 다시 누르면 오른쪽 AI 튜터와의 대화를 통해 질의응답을 완료해야 함을 알리는 알림 메시지를 제공합니다.
    - **이미 답변 완료한 카드의 체크포인트 스킵**: 사용자가 이미 답변을 완료(QnA 통과)했거나 진도를 더 많이 나간 예전 카드를 다시 보는 경우에는 `alreadyPassed` 로직을 확장하여 `[체크포인트]` 버튼으로 전환되지 않고 `[다음]` 버튼으로 즉시 다음 카드로 넘어갈 수 있도록 수정했습니다.
    - **팝업 텍스트 포맷팅 및 간격 조정**: 체크포인트 안내 팝업 내 마크다운 굵게 표시용 `**`이 텍스트로 그대로 렌더링되던 문제를 React HTML 굵은 텍스트 구조로 변경하고, 하단의 [닫기] 및 [QnA 시작하기] 버튼 간의 마진(gap)이 다이얼로그 레이아웃에서 좁게 붙어 보이지 않도록 `sm:gap-0` 클래스를 제거하여 마진을 확보했습니다.
  - **Concepts**: [[CheckpointNextButton]], [[OnceNoticeDialog]], [[CompletedCardCheckpointSkip]], [[DialogUIImprovements]]

- **[FEATURE] 강좌 패키지 (Course Package) 종합 로드맵 기능 구현**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/constants/routes.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/constants/routes.ts)
    - [components/admin/AdminSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/admin/AdminSidebar.tsx)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **신규 파일**:
    - `supabase/migrations/20260703_course_packages.sql`
    - `app/api/admin/packages/upload/route.ts`
    - `app/api/admin/packages/route.ts`
    - `app/api/admin/packages/[id]/route.ts`
    - `app/api/packages/route.ts`
    - `app/api/packages/subscribe/route.ts`
    - `app/api/packages/[slug]/route.ts`
    - `app/admin/packages/page.tsx`
    - `app/admin/packages/upload/page.tsx`
    - `app/(user)/packages/[slug]/page.tsx`
    - `app/(user)/packages/[slug]/client.tsx`
    - `docs/course-package-bundler-guide.md`
  - **작업 내용**:
    - **데이터베이스 스키마 및 RLS 설정**: 패키지 정보(`course_packages`), 매핑 테이블(`course_package_items`), 수강 구독 관리(`user_package_subscriptions`) 테이블을 신설하는 마이그레이션 SQL 파일을 생성하고 RLS 정책을 수립하였습니다.
    - **API 및 어드민 기능 구현**: 매니페스트 JSON 업로드(/api/admin/packages/upload) 및 검증, 패키지 목록/상세 API, 패키지 삭제/수정 API(/api/admin/packages/[id]), 사용자가 패키지를 구독하는 API(/api/packages/subscribe)를 구현하여 일괄 수강 등록을 처리합니다.
    - **어드민 패널 패키지 관리 화면**: 패키지 등록 상태를 관리하는 `/admin/packages` 화면과 JSON 복사/붙여넣기 및 드래그앤드롭 매니페스트 파일 업로드가 가능한 `/admin/packages/upload` 화면을 작성하고 어드민 사이드바에 연동했습니다.
    - **사용자 포털 및 탭 연동**: `courses/page.tsx`에 탭을 추가해 '단과 강좌'와 '강좌 패키지'를 구분 렌더링하고, `my-courses/page.tsx` 상단에 수강 중인 패키지의 전체 강좌 개수 대비 완료 상태를 프로그레스 바 대시보드로 시각화했습니다.
    - **종합 로드맵 상세 Timeline**: `/packages/[slug]` 페이지에 타임라인 기반 패키지 챕터 뷰를 구현해, 각 챕터 강좌의 상태(학습 전, 학습 중, 완료)를 표기하고 이어 학습할 수 있는 환경을 구축했습니다.
    - **플레이어 리다이렉션 모달 연동**: 학습 플레이어 진입 시 `package=[slug]` 쿼리 파라미터를 식별하여, 강좌 완료(마지막 카드 통과) 시 다음 챕터로 바로 수강 이동을 연결하는 네비게이션 다이얼로그 모달을 추가했습니다.
    - **외부 번들러 가이드 배포**: 외부 번들링 도구에서 패키지 매니페스트를 올바르게 명세화하고 플랫폼과 통합하기 위한 지침 문서 `docs/course-package-bundler-guide.md`를 신규 작성하여 배포했습니다.
  - **Concepts**: [[CoursePackageRoadmap]], [[PackageSubscriptionBulkProgress]], [[TimelineCurriculumUX]], [[PlayerRedirectChain]]

- **[FEATURE/FIX] 강좌 패키지 및 단과 강좌 등록 통합, 노출 필터링 및 복습/미리보기 편의 개선**
  - **수정 파일**:
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/packages/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/page.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/admin/packages/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/upload/page.tsx)
    - [app/api/admin/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/route.ts)
    - [app/api/admin/packages/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/[id]/route.ts)
    - [app/api/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/route.ts)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/packages/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/packages/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **통합 등록 페이지**: `강좌 등록` 및 `강좌 패키지 등록`을 하나의 통합 등록 페이지(`/admin/courses/upload`)로 통합했습니다. 배치 ZIP 파일 업로드와 선택적 매니페스트 JSON 등록/수정이 가능하며, 등록 시 네비게이션 Freezing 오버레이 및 순차 업로드 전송 프로그레스를 표시합니다.
    - **패키지 강좌의 노출 필터링**: `course_package_items`에 연관된(패키지에 포함된) 강좌는 어드민 및 사용자 포털 강좌 검색 결과에서 자동 제외하여, 단과 개별 강좌만 목록에 노출되도록 개선했습니다.
    - **패키지 삭제 연쇄 처리**: 패키지 삭제 시 패키지 메타 정보뿐만 아니라 패키지에 묶인 하위 강좌들까지 DB 및 Storage에서 한 번에 연쇄 자동 삭제하도록 보완했습니다.
    - **사용자 포털 검색 레이아웃 개편**: 탭(Tabs)을 들어내고, 한 화면에 `종합 강좌 패키지` 섹션과 `단과 개별 강좌` 섹션을 수직 배치하여 동시 탐색의 직관성을 극대화했습니다.
    - **나의 강좌 탭 분류 세분화**: 나의 강좌 페이지를 `수강중인 강좌 패키지`, `수강중인 강좌`, `완료한 강좌` 3개 탭으로 세분화하고, 개별 강좌 탭들에서는 패키지 포함 강좌를 생략하여 패키지 단위로만 보이도록 정돈했습니다.
    - **복습 및 미리보기 모드 편의 제어**: 완료된 강좌에 `다시 보기` 버튼을 적용하고, 다시 보기(`?review=true`) 및 미리보기(`?preview=true`)로 수강 진입 시에는 AI 튜터 QnA의 통과 대기 없이 사용자가 즉각 체크포인트를 스킵할 수 있는 스킵 편의 장치를 구현했습니다.
  - **Concepts**: [[UnifiedUploadPortal]], [[PackagedCourseFiltering]], [[CascadePackageDeletion]], [[UnifiedCourseSearchLayout]], [[TriStateMyCoursesTabs]], [[ReviewModeCheckpointBypass]]

## 2026-06-30

- **[FEAT/INGEST] Admin 강좌 등록 warning 팝업, 삭제 blocking progress 구현 및 대용량 업로드 Gateway Timeout 해결**
  - **수정/생성 파일**:
    - `app/api/admin/courses/upload/route.ts` — 동시성 제어 및 재시도로 Gateway Timeout 예방
    - `app/admin/courses/page.tsx` — 강좌 및 패키지 삭제 시 Blocking Progress Overlay 구현
    - `app/admin/courses/upload/page.tsx` — 단과 강좌 ZIP 다중 등록 시 경고 모달(AlertDialog) 연동
  - **인제스트**: `wiki/sources/admin-course-upload-improvements.md`
- **[FEATURE/FIX] 강좌/패키지 통합 관리 UI 개선 및 어드민 탭 통합**
  - **수정 파일**:
    - [components/ui/tabs.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/ui/tabs.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/packages/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/page.tsx)
    - [lib/constants/routes.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/constants/routes.ts)
  - **작업 내용**:
    - **AI Agent 권장 문구 복구**: 강좌 / 패키지 통합 등록 화면 하단의 "강좌 번들 구조 참고" 안내 영역에 `AI Agent로 자동 생성하기 (추천)` 메시지 박스와 바로가기 링크를 다시 추가하여 복구했습니다.
    - **어드민 강좌/패키지 메뉴 통합**: 기존 Admin > 강좌 관리, 패키지 관리의 두 개 개별 메뉴를 단일 [강좌 관리] 메뉴로 완전히 통합하고, 탭(Tabs) 컴포넌트를 이용해 한 화면에서 개별 강좌 리스트와 강좌 패키지 리스트를 모두 조회 및 관리할 수 있도록 개선했습니다. 기존 `/admin/packages` 접근 시 `/admin/courses`로 자동 리다이렉트되도록 구성하고, 사이드바에서 패키지 메뉴를 정리했습니다.
    - **탭 컴포넌트 시인성 대폭 개선**: 기본 Shadcn UI 탭 컴포넌트의 낮은 명도/대비 문제를 해결하기 위해 global `components/ui/tabs.tsx`를 고도화했습니다. 활성 탭에 테마 색상(Indigo-600)의 백그라운드 pill/언더라인 하이라이트 및 font-semibold 스타일을 적용하고, 탭 리스트의 배경색 대비를 넓혀 활성 탭이 직관적이고 미려하게 구분되도록 시각적 완성도를 높였습니다.
  - **Concepts**: [[AdminUnifiedCourseManagement]], [[TabVisibilityAesthetics]], [[AIAgentBundlerGuideRestoration]]

- **[FEATURE/FIX] 강좌 패키지 명칭 통일, 리스트 UI 간소화 및 학습 화면 미리보기 개선**
  - **수정/생성 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx) — 미리보기 모드 Badge 추가, 체크포인트 비활성화, TOC 전체 해제 지원
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx) — 용어 변경, 패키지 챕터 리스트 제거, 타이틀 클릭 시 상세 이동, 미리보기 클릭 시 첫 강좌 학습 이동
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx) — 용어 변경
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx) — 용어 변경
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx) — 용어 변경
    - [CHANGELOG.md](file:///C:/Workspace/Projects/PennyPress-FE/CHANGELOG.md) — 용어 변경
    - [wiki/log.md](file:///C:/Workspace/Projects/PennyPress-FE/wiki/log.md) — 용어 변경 및 기록 업데이트
    - `wiki/sources/2026-06-30-course-package-preview-and-naming-improvements.md` — 상세 문서 신설
  - **작업 내용**:
    - **명칭 통일**: 전반적으로 혼재되던 "로드맵 패키지"를 "강좌 패키지"로 명칭을 전면 통일하였습니다.
    - **어드민 패키지 목록 개선**: 강좌 패키지 목록 카드 하단의 챕터 리스트를 숨겨 레이아웃을 간소화하고, 타이틀을 클릭하여 상세 페이지(`/packages/[slug]`)로 이동하도록 링크를 연결하였습니다.
    - **패키지 미리보기 개선**: 미리보기 버튼을 누를 시 첫 강좌 학습 화면(`/learn/[slug]?preview=true&package=[slug]`)으로 연결하고, 미리보기 모드에서는 체크포인트와 카드 진도 해제 제약을 완전히 건너뛰도록(Bypass) 구현했습니다. 타이틀 영역에 애니메이션이 적용된 '미리보기 모드' 배지를 노출하였습니다.
  - **Concepts**: [[CoursePackageNamingStandard]], [[AdminPackageListUX]], [[PreviewModeFullBypass]]

- **[FEATURE] 강좌/패키지 등록 시 썸네일 이미지 업로드 및 대시보드 학습 현황 UI 개선**
  - **수정/생성 파일**:
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/upload/route.ts)
    - [GUIDE_THUMBNAIL_INTEGRATION.md](file:///C:/Workspace/Projects/PennyPress-FE/GUIDE_THUMBNAIL_INTEGRATION.md)
    - `wiki/sources/2026-06-30-course-package-thumbnail-and-dashboard-improvements.md`
  - **작업 내용**:
    - **강좌 개별 썸네일 이미지 업로드**: 강좌 번들(.zip) 등록 시 UI 상에서 개별 썸네일 이미지를 업로드할 수 있는 파일 선택기를 연동하고, 서버 API가 이 이미지를 Storage에 업로드하고 DB에 public URL을 저장하도록 개선했습니다.
    - **강좌 패키지 ZIP 번들 등록**: 기존 JSON 매니페스트만 등록하던 것에서 패키지 썸네일과 매니페스트를 묶은 ZIP 번들로도 등록할 수 있도록 확장했습니다. ZIP 업로드 시 서버가 내부 파일을 파싱하여 썸네일을 스토리지에 올리고 DB를 갱신합니다.
    - **대시보드 학습 현황 UI 전면 개편**: "구독 중인 서비스" 영역을 현재 사용자가 수강 중인 강좌 목록을 보여주는 "학습 중인 강좌" 패널로 전환하고, 썸네일, 제목, Progress Bar를 통한 학습 진도율, "이어서 학습" 버튼을 렌더링하여 학습 편의성을 대폭 강화했습니다.
    - **수강 과목 수 합산 계산법 변경**: 통계 카드 내 수강 과목의 수가 개별 수강 강좌 수와 패키지 수의 합산으로 직관적으로 산출되도록 개선했습니다.
    - **외부 에이전트 연동 가이드 MD 배포**: 외부 강좌 생성 에이전트가 썸네일과 패키지 번들을 생성해 플랫폼에 업로드하는 규격 지침서를 작성해 배포했습니다.
  - **Concepts**: [[CourseThumbnailUpload]], [[PackageZipBundleUpload]], [[ActiveLearningDashboard]], [[SubscribedCoursesCountRefinement]], [[AgentCourseGeneratorGuideline]]

## [2026-07-01] graph | Knowledge graph rebuilt

93 nodes, 57 edges (57 extracted).


## 2026-07-04

- **[REFACTOR] 단일 통합 번들(.zip) 기반 강좌 업로드 및 클라이언트 사전 검증(Pre-validation) 도입**
  - **수정 파일**:
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [package.json](file:///C:/Workspace/Projects/PennyPress-FE/package.json)
    - [pnpm-lock.yaml](file:///C:/Workspace/Projects/PennyPress-FE/pnpm-lock.yaml)
  - **생성 파일**:
    - [docs/course-bundle-migration-guide.md](file:///C:/Workspace/Projects/PennyPress-FE/docs/course-bundle-migration-guide.md)
    - [docs/iot-communication/](file:///C:/Workspace/Projects/PennyPress-FE/docs/iot-communication)
    - [wiki/sources/2026-07-04-unified-course-bundle-upload-refactoring.md](file:///C:/Workspace/Projects/PennyPress-FE/wiki/sources/2026-07-04-unified-course-bundle-upload-refactoring.md)
  - **작업 내용**:
    - **통합 번들 규격 수립**: 기존 하위 강좌 ZIP들과 매니페스트 JSON을 각각 올리던 방식에서, 하나의 통합 번들 ZIP 파일에 `package-manifest.json`과 `thumbnail.png`, `courses/` 하위 ZIP들을 포장해 올리는 규격을 설계함.
    - **브라우저 사전 검증 (JSZip)**: 업로드 시작 전 브라우저상에서 `jszip`을 사용해 번들 ZIP의 압축을 파싱하고, 매니페스트 구조 유효성, 하위 강좌 ZIP 실제 매핑 여부, 하위 강좌의 `config.json` 및 `wiki.md` 존재 여부, 목차(TOC)와 카드 MD 파일 목록의 1:1 일치 여부 등을 사전 검사하여 검증 통과 시에만 [강좌 등록]을 활성화함.
    - **서버 API 리팩토링**: 단일 번들을 수신받아 서버 단에서 해제 및 업로드(Supabase Storage 및 PostgreSQL 트랜잭션 처리)를 일관되게 수행하도록 업로드 API를 리팩토링함.
  - **Concepts**: [[UnifiedCourseBundle]], [[BrowserSideZipValidation]]

## 2026-07-04

- **[FIX] 강좌 수강 중 오류 로그 해결, 학습 화면 레이아웃 폭 확장 및 API 디버깅 로그 가독성 개선**
  - **수정 파일**:
    - [lib/supabase/mock-client.ts](file:///C:/Workspace/Projects/OpenTutor/lib/supabase/mock-client.ts)
    - [lib/db/local-db-server.ts](file:///C:/Workspace/Projects/OpenTutor/lib/db/local-db-server.ts)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/courses/progress/route.ts)
  - **작업 내용**:
    - **TypeError: fileData.text is not a function 해결**: 로컬 Supabase mock client의 `download` API가 서버사이드(Node.js) 환경에서도 `Blob` 객체를 정상적으로 반환하도록 수정하여 `.text()` 호출 시의 타입 에러를 해결했습니다.
    - **createSignedUrl 누락 해결**: mock client의 storage 객체에 `createSignedUrl` API 모킹 버전을 추가하여 리소스 API에서 오류 없이 정상 작동하도록 구현했습니다.
    - **supabase.rpc 누락 및 메세지 Pruning 구현**: mock client에 `rpc` 메서드를 추가하고, `local-db-server.ts` 내에 `rpc` 액션 라우팅을 작성했습니다. 이를 통해 외부 에이전트 연동 시 호출되는 `prune_external_agent_messages` rpc에 대응하여 로컬 DB(`db.json`) 내부의 메시지들을 최신 100개로 자동 Pruning 하도록 로직을 작성했습니다.
    - **학습 화면 콘텐츠 폭 확장**: 학습 플레이어 화면(`app/(user)/learn/[slug]/client.tsx`) 중앙 콘텐츠의 고정 가로폭 제약(`max-w-3xl`)을 `max-w-full`로 수정하여 사용 가능한 최대폭을 차지하도록 개선했습니다.
    - **진도 관리 API 콘솔 로그 최적화**: `/api/courses/progress` API의 GET/POST 요청 시 DB의 전체 레코드를 통째로 console.log에 출력하여 로그가 비대해지던 문제를 개선하여, 데이터의 개수(GET) 및 관련 과목 ID(POST) 등의 핵심 요약/디버깅 정보만 남기도록 정제했습니다.
  - **Concepts**: [[MockSupabaseBlobResponse]], [[MockSupabaseCreateSignedUrl]], [[MockRPCPruning]], [[LearnPlayerFullWidthLayout]], [[APIConsoleLogOptimization]]

## 2026-07-04

- **[UI] 강좌 업로드 화면 레이아웃 순서 변경**
  - **수정 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
  - **작업 내용**:
    - **카드 배치 순서 변경**: "새 강좌 등록" 화면 좌측 컬럼의 "통합 번들 ZIP 업로드" 카드와 "강좌 번들 자동 생성기" 안내 카드의 순서를 변경하여 사용자가 핵심 기능인 업로드 영역을 먼저 볼 수 있도록 개선했습니다.
  - **Concepts**: [[CourseUploadUILayout]]

- **[UI] 강좌 업로드 화면 내 마이그레이션 가이드 페이지 분리**
  - **수정 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
  - **생성 파일**:
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/guide/page.tsx)
  - **작업 내용**:
    - **가이드 화면 분리**: 업로드 화면 하단의 거대한 마이그레이션 설명 박스를 `/courses/manage/upload/guide`라는 서브 페이지로 완전히 분리했습니다.
    - **헤더 바로가기 추가**: 강좌 업로드 페이지 상단 헤더 우측에 "구조 및 마이그레이션 가이드" 바로가기 버튼을 추가하여, 필요할 때 새 탭으로 가이드를 열어두고 참고할 수 있도록 개선했습니다.
  - **Concepts**: [[SeparateMigrationGuidePage]]


