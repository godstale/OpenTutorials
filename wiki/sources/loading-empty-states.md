---
title: "사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용"
date: "2026-06-27"
tags: ["loading-ui", "skeleton-ui", "ux", "empty-states", "nextjs", "suspense"]
---

# 사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용

## 1. 개요
PennyPress의 사용자 포털 및 관리자 포털 내 데이터 페칭 페이지에서 비동기 로드 시 일시적으로 "데이터가 없습니다", "구독 중인 서비스가 없습니다" 같은 빈 상태(Empty State) 레이아웃이 플래시(반짝임)되는 UX 결함을 교정하고, 일관되고 세련된 스켈레톤(Skeleton UI) 로더를 적용한 내역입니다.

## 2. 기존 문제점
- **서버 컴포넌트(Server Components) 로딩 상태 미흡**: `<Suspense fallback={...}>`의 fallback이 단순 텍스트("데이터를 불러오는 중입니다...")로 되어 있어, dynamic fetch가 일어나는 동안 미적인 완성도가 떨어지고 레이아웃 시프트가 심함.
- **클라이언트 컴포넌트(Client Components) 초기값 플래시**: 데이터 fetching 전 state 초기값 때문에 API 응답이 완료되기 전에 잠깐 동안 데이터가 빈 것으로 잘못 오인되어 Empty State 컴포넌트가 노출되는 버그 및 밋밋한 텍스트 "로딩 중..." 표시 문제.
- **페이지 레이아웃 깨짐**: 로딩 화면으로 전환할 때 전체 화면을 Spinner로 덮어버림으로써 헤더와 네비게이션바 등 기본 레이아웃이 일시적으로 사라지는 현상 발생.

## 3. 해결 및 리팩토링 내용

### Server Components (Suspense Fallback 고도화)
- **대시보드 페이지 (`app/(user)/dashboard/page.tsx`)**:
  - `DashboardSkeleton`을 컴포넌트 하단에 정의하고 `<Suspense fallback={<DashboardSkeleton />}>`를 적용.
  - 배너 카드, 통계 카드 그리드(4개), 구독 중인 에이전트 서비스 리스트 형태의 Skeleton 레이아웃을 구현하여 로딩 시 실제 페이지 레이아웃 구조와 어우러지게 배치.
- **호스팅 관리 페이지 (`app/(user)/my-features/page.tsx`)**:
  - `MyFeaturesSkeleton`을 구현하여 `SubscriptionCard` 구조를 본뜬 둥근 카드 모서리, 상세 메타데이터 줄, 버튼 위치에 맞는 스켈레톤 적용.
- **결제 및 요금제 페이지 (`app/(user)/billing/page.tsx`)**:
  - `BillingSkeleton`을 적용하여 예상 예상 금액 카드, 충전 패키지 그리드 등 복잡한 구조를 로드할 때의 어색한 흔들림을 완벽히 방어.

### Client Components (State 기반 Skeleton 렌더링 & 초기값 방어)
- **강좌 탐색 페이지 (`app/(user)/courses/page.tsx`)**:
  - `CoursesSkeleton`을 구현하여 기존 텍스트 "로딩 중..." 대신 6개의 카드형태 그리드 스켈레톤을 렌더링하도록 변경.
- **관리자 대시보드 (`app/admin/dashboard/page.tsx`)**:
  - 기존에 `loading ? '—' : ...`로 처리되어 데이터 로드 전 하이픈만 노출되던 부분을 `<Skeleton className="h-7 w-16" />`로 대체하여 세련된 펄스 효과 구현.
- **관리자 강좌 목록 (`app/admin/courses/page.tsx`)**:
  - 테이블 형태의 강좌 리스트 항목들에 행 단위의 `Skeleton` 로더를 매핑하여 로드 중 목록 위치를 일정 수준으로 고정.
- **관리자 서비스 목록 (`app/admin/features/page.tsx`)**:
  - `TableBody` 내부의 단일 로더 셀 대신 7개의 컬럼 규격에 맞춘 4개의 행 단위 TableRow Skeleton 구현.

### 레이아웃 비일탈 로더 패턴 (Layout Shift 방어)
- **관리자 회원 목록 (`app/admin/users/page.tsx`)**:
  - 기존 `if (loading) { return <Loader2 ... /> }` 구조는 헤더와 탭 목록을 완전히 덮어버렸으나, 레이아웃을 유지한 채 테이블 영역(`TableBody`) 내부만 Skeleton 행들로 치환하도록 구조를 변경.
- **관리자 매크로 목록 (`app/admin/macros/page.tsx`)**:
  - 회원 목록과 마찬가지로 페이지 기본 뼈대(Header, Button 등)는 유지하며 테이블 데이터 영역만 스켈레톤 로더로 전환하여 페이지 전환 부하 감각을 완화.

## 4. 교훈 및 특이사항
- **Hydration & State Lifecycle**: 클라이언트 컴포넌트의 비동기 fetch 로직 초기값 설정 시, API 호출 완료 전에 일시적으로 `isLoading`이 반영되지 않는 버그가 없는지 확인하고 이를 완벽히 방어.
- **Layout Shift & Skeleton Matching**: 단순 텍스트나 센터링 스피너는 레이아웃 변경 폭(Layout Shift)을 크게 만듦. 실제 렌더링될 구조에 최적화된 Skeleton 마크업을 매칭시키는 것이 현대 웹 앱의 프리미엄 UX 필수 요건임을 확인.
