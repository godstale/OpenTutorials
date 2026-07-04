# 강좌 상세 페이지 레이아웃 개선, 학습 순차 제약 배지 수정 및 버전/변경 이력(Change Log) 연동 구현

**작업일자:** 2026-07-01  
**작성자:** Antigravity (AI Coding Assistant)  
**상태:** 완료 (Completed)  

---

## 1. 개요
강좌 상세 화면의 UI 일관성을 확보하고, 사용자가 학습 순서(sequential_play)에 종속된 강좌를 학습할 때의 배지 노출 조건과 학습 버튼 상태를 개선하였습니다. 또한 강좌 패키지의 변경 사항과 버전 정보를 연동하기 위해 데이터베이스 스키마와 API, 화면 렌더링 로직을 추가하고 외부 Agent 연동을 위한 규격 지침 문서를 작성했습니다.

---

## 2. 주요 개선 및 구현 내용

### 2.1. 강좌 상세 페이지 및 정보 카드 레이아웃 개선
- **수정 위치**: `app/(user)/courses/[slug]/client.tsx`
- **구현**:
  - `Course Header Card` 내부 여백을 고려하여 최상단과 최하단의 패딩을 제거함과 동시에, 경계선 및 옅은 회색 배경색(`bg-zinc-50/50`)이 어색하게 끊겨 보이던 문제를 배경색 및 테두리를 제거하여 투명하게 개선했습니다.
  - `버전 및 변경 이력 (CHANGE-LOG) 카드` 역시 내부 여백을 위해 최상단/최하단 패딩을 제거하고, 상단 옅은 회색 타이틀 영역의 배경색 및 테두리를 제거하여 투명하게 정렬시켰습니다.

### 2.2. 커리큘럼 타임라인 배지 노출 정교화
- **수정 위치**: `app/(user)/courses/[slug]/client.tsx`
- **구현**:
  - 기존에는 `isStarted` 상태(학습 진행 중)인 모든 하위 강좌들에 `"학습 중 (0%)"` 배지가 붙어있었습니다.
  - 현재 시점에 학습자가 이어서 학습해야 하는 대상인 **유일한 1개 강좌**(`nextCourse` 객체)의 제목 옆에만 `"학습 중"` 배지가 노출되도록 조건을 정교화했습니다.
  - 그 외의 아직 시작하지 않았거나 다른 대기 중인 파트는 `"대기 중"`으로 표시되도록 조율했습니다.

### 2.3. 순차 학습(sequential_play) on 상태 시 버튼 표시 제어
- **수정 위치**: `app/(user)/courses/[slug]/client.tsx`
- **구현**:
  - 순차 학습 옵션이 켜져 있을 때(`sequential_play = true`), 학습해야 할 대상(`nextCourse`) 및 그 이전에 이미 진행했거나 완료했던 강좌(`index <= nextCourseIndex`)들에만 `[이어서 학습 / 다시 보기 / 파트 학습 시작]` 버튼이 노출되도록 제어했습니다.
  - `nextCourseIndex`보다 뒤에 있는 잠긴 미래 강좌들에 대해서는 버튼을 렌더링하지 않고 숨김 처리함으로써, 오클릭을 방지하고 순차 흐름을 강제했습니다.

### 2.4. 패키지 버전 및 변경 이력(Change Log) 추가 연동
- **DB 마이그레이션 (`supabase/migrations/20260705_add_version_and_changelog_to_packages.sql`)**:
  - `course_packages` 테이블에 `version` (TEXT, 기본값 `'1.0.0'`) 및 `changelog` (TEXT, 기본값 `'최초 릴리즈'`) 컬럼을 추가하는 DDL 마이그레이션을 작성했습니다.
- **서버 API (`app/api/admin/packages/upload/route.ts`)**:
  - 패키지 업로드 시 ZIP 파일 내의 `package-manifest.json`에서 `version`과 `changelog`를 파싱하여 `upsert` 구문에 포함하도록 로직을 수정했습니다.
- **상세 UI 연동 (`app/(user)/courses/[slug]/client.tsx`)**:
  - 강좌 상세 정보 하단에 **"버전 및 변경 이력 (CHANGE-LOG)"** 카드를 신설했습니다.
  - 현재 버전 배지(`v1.2.0`)와 `whitespace-pre-wrap` 스타일이 적용된 변경 이력을 노출하여 업데이트 상황을 투명하게 안내합니다.
- **외부 에이전트 지침서 (`GUIDE_VERSION_CHANGELOG_INTEGRATION.md`)**:
  - 강좌를 자동 빌드해 주는 에이전트(`PennyPress-Bundler`)가 변경 내용을 자동으로 증가시키고 `package-manifest.json`에 주입할 수 있도록 규격과 예제를 작성한 가이드라인 문서를 루트에 배포했습니다.

---

## 3. 변경 파일 목록

- [app/(user)/courses/\[slug\]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx) — Header Card 패딩 개선, 버전 카드 추가, 학습 중 배지 정밀화, 순차학습 버튼 표시 제약 적용
- [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/upload/route.ts) — package-manifest.json 내 version, changelog 파싱 및 DB 적재 로직 구현
- [supabase/migrations/20260705_add_version_and_changelog_to_packages.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260705_add_version_and_changelog_to_packages.sql) — course_packages 컬럼 추가 마이그레이션 SQL 생성
- [GUIDE_VERSION_CHANGELOG_INTEGRATION.md](file:///C:/Workspace/Projects/PennyPress-FE/GUIDE_VERSION_CHANGELOG_INTEGRATION.md) — 외부 AI 에이전트 연동용 가이드 지침서 작성
