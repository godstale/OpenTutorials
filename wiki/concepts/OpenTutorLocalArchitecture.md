# Open Tutorials Local Architecture: Mock Supabase & local-db-server

- **작성일**: 2026-07-04
- **주제**: 로컬 데스크탑 독립 실행 앱을 위한 데이터/스토리지 아키텍처

---

## 1. 아키텍처 개요

Open Tutorials는 클라우드(Vercel, Supabase) 인프라 없이 일반 데스크탑 환경에서 완전 로컬(온디바이스)로 기동하는 Next.js 단독 실행 애플리케이션 구조를 가집니다. 기존 Supabase SDK를 걷어내는 코드 전면 수정 대신, **Supabase 클라이언트를 Mocking하여 가로채는 레이어**를 삽입해 코드 수정과 리팩토링 리스크를 획기적으로 줄였습니다.

```
                    ┌───────────────────────────────┐
                    │      React UI Components      │
                    └───────────────┬───────────────┘
                                    │
                                    ▼ (Supabase JS API 호출)
                    ┌───────────────────────────────┐
                    │     Mock Supabase Client      │
                    │      (mock-client.ts)         │
                    └───────┬───────────────┬───────┘
                            │               │
      (Node.js Server Side) │               │ (Browser Client Side)
                            ▼               ▼
           ┌────────────────┐       ┌───────────────┐
           │  local-db-     │       │ API Handler   │
           │  server.ts     │       │ /api/local-db │
           └────────┬───────┘       └───────┬───────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │              Local Storage System            │
         │  - db.json (JSON Data Table)                 │
         │  - public/courses/ (MDX Cards, Thumbnails)   │
         └──────────────────────────────────────────────┐
```

---

## 2. 핵심 구성요소 상세

### 2.1. Mock Supabase Client (`lib/supabase/mock-client.ts`)
기존 Supabase client 인스턴스처럼 체이닝 API를 구성하는 Thenable 클래스인 `MockQueryBuilder`를 반환합니다.
- **SQL Builder 체이닝 모킹**: `.from(table).select().eq().in().single()` 구문 분석 및 직렬화.
- **Promise-like Thenable**: `then()` 메소드를 오버라이딩하여, 컴포넌트 측에서 `.select()` 등의 터미널 메소드 직후 `await`을 걸었을 때 자동으로 `execute('select')`를 태워 데이터를 가져오도록 설계했습니다.
- **Auth & Storage API**: 
  - `auth.getUser()`: 항상 고정된 `{ id: 'local-user-id', email: 'user@opentutor.local' }` 세션 반환.
  - `storage.from('courses')`: 클라이언트에서 받은 에셋 파일을 base64로 패킹하여 `storage_upload` 및 `storage_download` 명령어로 전달.

### 2.2. local-db-server (`lib/db/local-db-server.ts`)
- **JSON 파일 데이터**: 루트의 `db.json` 파일을 메인 레포지토리 삼아 동기식 파일 IO(`fs.readFileSync/writeFileSync`)로 즉각 반영합니다.
- **조인 리졸버(Auto Join Resolver)**: 
  조인을 수동으로 처리해주는 로직을 select 작업 끝단에 탑재했습니다. `user_progress` 조회 시 매칭되는 `courses` 데이터를 병합하고, `course_packages` 목록 조회 시 하위 강좌들(`course_package_items`)과 강좌 상세 메타데이터를 매칭해 돌려줍니다.
- **로컬 스토리지 보존**: `storage_upload` 액션을 수신하면 `public/courses/[path]` 경로에 즉각 쓰기 작업을 거쳐, 웹 브라우저가 `/courses/...`를 통해 썸네일이나 카드 파일을 직접 로드할 수 있도록 서빙 경로를 구성했습니다.

---

## 3. 이점 및 기대 효과

1. **안전성 (Zero Regression)**: Supabase를 직접 호출하던 기존 대규모 비즈니스 로직과 UI 컴포넌트(1,400라인에 이르는 강좌 수강 클라이언트 등) 코드를 전혀 고치지 않고 그대로 호환시켰습니다.
2. **이식성 (Zero Setup)**: sqlite나 외부 로컬 DB 데몬 설치 없이 단순히 `db.json` 파일 하나만으로 DB 전체가 구성되므로, `pnpm install && pnpm run dev` 만으로 어떤 환경에서도 동일하게 작동합니다.
3. **독립성 (Full Offline Support)**: 기기 네트워크 연결이 해제된 비행기 모드 등의 환경에서도 AI 튜터 통신(FastAPI Worker)을 제외한 강좌 패키지 수강 및 관리의 모든 기능이 정상 구동됩니다.
