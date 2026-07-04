# Open Tutorials: 클라우드 종속성 제거 및 로컬 데스크탑 독립 실행 앱 전환 리팩토링

- **작성일**: 2026-07-04
- **대상**: Open Tutorials (구 PennyPress) FE 리팩토링 및 오프라인 구동

---

## 1. 개요 및 배경

기존 PennyPress(페니프레스)는 Vercel(FE 호스팅) 및 Supabase Cloud(인증, 데이터베이스, 스토리지) 환경에 종속되어 운영되던 웹 SaaS 서비스였습니다. 데스크탑 로컬 환경에서 직접 실행 및 학습할 수 있는 **온디바이스/오프라인 앱**으로 전환하기 위해 클라우드 종속성을 100% 제거하고, 로컬 파일 시스템(`db.json` 및 `public/courses/`)을 데이터 스토리지로 활용하는 구조로 완전히 리팩토링했습니다.

---

## 2. 주요 리팩토링 작업 내역

### 2.1. 프로젝트 명칭 변경
- UI 헤더, 사이드바, 타이틀 메타데이터 및 문서 내의 모든 `PennyPress` 및 `페니프레스` 명칭을 `Open Tutorials`로 변경했습니다.
- [routes.ts](../../lib/constants/routes.ts) 상의 상수 및 [UserSidebar.tsx](../../components/layout/UserSidebar.tsx) 헤더 텍스트를 업데이트하였습니다.

### 2.2. 로컬 파일 DB 및 Mock Supabase Client 개발
- **로컬 JSON 데이터베이스**: Node.js `fs` 모듈 기반으로 `db.json` 파일을 직접 관리하는 [local-db-server.ts](../../lib/db/local-db-server.ts)를 작성했습니다. 데이터 검색 시 동적 관계 조인(Auto Join Resolver) 처리를 지원하여 `user_progress` 및 `course_packages` 등의 테이블을 자동으로 병합해 가져옵니다.
- **Mock Client**: 기존 Supabase JS SDK 문법을 수정 없이 재사용할 수 있도록 SQL Builder 체이닝과 Auth, Storage API를 대행해주는 [mock-client.ts](../../lib/supabase/mock-client.ts)를 구현했습니다. 
  - 서버 사이드 쿼리는 local-db-server를 직접 호출하고, 브라우저 쿼리는 `/api/local-db` POST API로 자동 위임됩니다.
  - Storage 업로드는 `public/courses/` 폴더 하위에 파일로 직접 쓰여 정적 파일 URL 서빙을 유도합니다.

### 2.3. 인증 흐름 및 미들웨어 우회
- [proxy.ts](../../proxy.ts) 미들웨어 코드를 수정하여 로컬 접속 시 로그인/가입 화면을 건너뛰고 항상 인증된 단일 로컬 사용자 세션(`local-user-id`)을 반환하도록 설계해, 루트(`/`) 접근 시 바로 `/dashboard`로 즉각 리다이렉트되도록 구성했습니다.

### 2.4. 권한 단일화 및 "강좌 관리" 기능 이관
- `lib/supabase/admin.ts` 내 `requireAdmin()`이 항상 로컬 세션을 성공시키도록 바꾸어 권한 체크를 단순화했습니다.
- 관리자 전용이던 `app/admin/courses`를 사용자 기능으로 이전하여 [app/(user)/courses/manage](../../app/(user)/courses/manage/page.tsx) 경로로 이관 완료하고, 내부 라우팅 연결 고리를 전면 수정했습니다.
- 어드민 전용 사이드바와 레이아웃, 사용되지 않는 stats, users, macros 관련 어드민 전용 UI 및 API는 삭제 조치되었습니다.

---

## 3. 리팩토링 내용 확인 및 실행 방법 (QA 가이드)

### 3.1. 로컬 환경 구동
```bash
# 1. 패키지 설치
pnpm install

# 2. Next.js 개발 서버 실행
pnpm run dev
```

### 3.2. 기능 동작 확인 (QA 체크리스트)

1. **자동 로그인 및 대시보드 진입**:
   - 브라우저로 `http://localhost:3000`에 접속했을 때 로그인 페이지(`/auth/login`)로 튕기지 않고 바로 `/dashboard`로 자동 전환되는지 확인합니다.
2. **사이드바 메뉴 정합성**:
   - 사이드바 타이틀이 `Open Tutorials`로 변경되었는지 확인합니다.
   - 대시보드 ➔ 강좌 검색 ➔ 나의 강좌 ➔ 강좌 관리 ➔ 에이전트 관리 ➔ 설정 순서로 메뉴가 노출되며 "결제 및 요금제" 등 제외된 메뉴가 안 나타나는지 확인합니다.
3. **강좌 관리 및 패키지 등록**:
   - "강좌 관리" 메뉴로 진입하여 "새 강좌 등록" ➔ 통합 강좌 ZIP 번들 업로드를 진행해봅니다.
   - 업로드 완료 시 로컬 디렉토리의 [db.json](../../db.json) 파일에 `courses` 및 `course_cards` 데이터가 온전히 써지는지, `public/courses` 폴더 하위에 실제 이미지 및 MDX 텍스트 파일들이 저장되는지 확인합니다.
4. **강좌 수강 및 진행률 동기화**:
   - "강좌 검색" ➔ 스타터 팩 강좌 상세 페이지에서 "강좌 수강 신청"을 누르고 "학습하기"로 진입합니다.
   - 카드를 넘겨가며 학습할 때 브라우저 새로고침을 하거나 대시보드로 돌아왔을 때, 진도율(%) 및 `user_progress` 데이터가 [db.json](../../db.json) 상에 실시간으로 보존되는지 점검합니다.
