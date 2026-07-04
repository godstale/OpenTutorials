# PennyPress 사이드바 메뉴 개선 및 설정 페이지 하위 메뉴 구조화

**인제스트 날짜:** 2026-06-28  
**브랜치:** feat/course-improvements  
**슬러그:** 2026-06-28-sidebar-settings-overhaul

---

## 개요

사용자 포털 사이드바 레이블 정확도 향상 및 설정(Settings) 페이지를 프로필/에이전트/강좌 3개 하위 메뉴로 구조화한 작업.

---

## 변경 사항

### 1. 사이드바 레이블 수정

- **파일**: `lib/constants/routes.ts`
- **변경**: `SIDEBAR_ITEMS` 내 "AI 강좌" → **"강좌 검색"** 으로 레이블 수정
- **이유**: 해당 페이지는 강좌를 검색/탐색하는 화면이며, 기존 "AI 강좌"는 페이지 기능을 정확히 반영하지 못했음

### 2. 강좌 검색 페이지 타이틀 통일

- **파일**: `app/(user)/courses/page.tsx`
- **변경**: `<h1>` 타이틀 "강좌 탐색" → **"강좌 검색"** 으로 수정하여 사이드바 메뉴 레이블과 일치

### 3. 나의 강좌 페이지 타이틀 통일

- **파일**: `app/(user)/my-courses/page.tsx`
- **변경**: `<h2>` 타이틀 "나의 학습 진도" → **"나의 강좌"** 로 수정하여 사이드바 메뉴 레이블과 일치

### 4. 설정 페이지 서브 내비게이션 레이아웃 신설

- **파일**: `app/(user)/settings/layout.tsx` (신규)
- **구조**: 좌측에 수직 내비게이션 (`프로필 / 에이전트 / 강좌`) + 우측 콘텐츠 영역
- **활성 상태**: `usePathname()`으로 현재 경로 감지, 활성 항목은 primary 색상으로 강조

### 5. 설정 루트 페이지 리다이렉트

- **파일**: `app/(user)/settings/page.tsx`
- **변경**: 기존 단일 설정 카드 UI 제거 → `/settings/profile`로 자동 리다이렉트

### 6. 설정 > 프로필 페이지 (실제 Supabase 연동)

- **파일**: `app/(user)/settings/profile/page.tsx` (신규)
- **기능**:
  - 실제 Supabase Auth 유저 데이터 로드 (`supabase.auth.getUser()`)
  - 아바타, 닉네임(full_name) 수정 (`supabase.auth.updateUser({ data: { full_name } })`)
  - 이메일은 읽기 전용으로 표시
  - 로그아웃 버튼
  - **패스워드 변경**: `supabase.auth.updateUser({ password })` 연동
  - **Google 로그인 감지**: `user.identities`에서 `provider === 'google'` 여부 판별
    - Google 로그인 시: 패스워드 변경 카드 숨김, "Google 계정에서 관리" 안내 카드 표시
    - 일반(이메일) 로그인 시: 패스워드 변경 카드 노출

### 7. 설정 > 에이전트 페이지

- **파일**: `app/(user)/settings/agent/page.tsx` (신규)
- **구성**: 파란색 "준비 중인 기능" 배너(`Alert` 컴포넌트) + 3개 준비 중 카드 (기본 에이전트 설정, 알림 및 크론 설정, 에이전트 연동 관리)
- **목적**: 추후 에이전트 설정 기능 추가를 위한 자리 확보

### 8. 설정 > 강좌 페이지

- **파일**: `app/(user)/settings/course/page.tsx` (신규)
- **구성**: 에이전트 설정 페이지와 동일한 패턴 (파란색 배너 + 3개 준비 중 카드: 학습 환경 설정, 학습 알림 설정, 수료증 및 성취 관리)

---

## 라우트 상수 추가

`lib/constants/routes.ts`에 설정 하위 경로 상수 추가:

```typescript
SETTINGS_PROFILE: '/settings/profile',
SETTINGS_AGENT: '/settings/agent',
SETTINGS_COURSE: '/settings/course',
```

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `lib/constants/routes.ts` | 레이블 수정, 서브 라우트 상수 추가 |
| `app/(user)/courses/page.tsx` | 타이틀 수정 |
| `app/(user)/my-courses/page.tsx` | 타이틀 수정 |
| `app/(user)/settings/layout.tsx` | 신규 — 서브 내비게이션 레이아웃 |
| `app/(user)/settings/page.tsx` | 리다이렉트로 교체 |
| `app/(user)/settings/profile/page.tsx` | 신규 — 프로필 + 패스워드 변경 |
| `app/(user)/settings/agent/page.tsx` | 신규 — 에이전트 설정 (준비 중) |
| `app/(user)/settings/course/page.tsx` | 신규 — 강좌 설정 (준비 중) |

---

## 관련 개념

- [[DesignSystem]] — Shadcn UI `Alert`, `Card`, `Avatar` 패턴 활용
- [[ExternalHermesAgent]] — 에이전트 설정 하위 메뉴의 향후 대상
