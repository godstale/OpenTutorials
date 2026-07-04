# PennyPress External Hermes Agent Integration 구현 계획 및 결과

- **출처 문서**: [2026-06-20-external-hermes-agent-integration.md](file:///C:/___Workspace/Projects/PennyPress/docs/superpowers/plans/2026-06-20-external-hermes-agent-integration.md)
- **인제스트 날짜**: 2026-06-20
- **관련 엔티티**: [[PennyPress]], [[HermesAgent]]
- **관련 개념**: [[ExternalHermesAgent]]

---

## 📌 기능 개요

사용자가 외부에서 자체적으로 호스팅하는 [[HermesAgent]] API 서버를 [[PennyPress]] 서비스에 직접 등록하고 관리할 수 있도록 연동 기능을 구축하였습니다. 
이를 통해 사용자는 자율 호스팅 에이전트의 상태를 한눈에 모니터링하고, 플랫폼 내에서 실시간 SSE 대화 및 Kanban Web UI 연동, 지원 모델 목록 확인 등을 수행할 수 있습니다.

---

## 🛠️ 구현 내용 요약

### 1. Supabase 데이터베이스 마이그레이션 (Task 1)
- **파일**: `supabase/migrations/20260620133000_external_agents.sql`
- **내용**: `user_external_agents` 테이블을 추가하여 사용자별 외부 에이전트의 이름, 엔드포인트 URL, API Key, Web UI URL 등을 저장합니다.
- **보안**: RLS(Row Level Security)를 활성화하여 인증된 사용자 본인의 에이전트 정보만 접근/수정할 수 있도록 접근 통제 정책을 적용했습니다.

### 2. 타입 및 클라이언트 API 연동 (Task 2)
- **파일**: `lib/types/index.ts`, `lib/api/external-agents.ts`
- **내용**: `UserExternalAgent` 인터페이스 타입을 정의하고, Supabase SDK 기반의 CRUD 함수(`getExternalAgents`, `getExternalAgentById`, `createExternalAgent`, `updateExternalAgent`, `deleteExternalAgent`)를 구현했습니다.

### 3. 백엔드 보안 및 연결 프록시 라우트 구현 (Task 3)
- **접속 테스트 프록시 (`/api/external-agents/test`)**:
  - 사용자가 입력한 에이전트 엔드포인트의 `/health` 및 `/v1/models`로 통신을 테스트하여 서버 연결성 및 API Key의 유효성을 검증합니다.
  - SSRF(Server-Side Request Forgery) 방지를 위해 Supabase Auth 세션 인증을 거친 요청만 통신을 중계합니다.
- **실시간 SSE 채팅 프록시 (`/api/external-agents/[id]/chat`)**:
  - OpenAI와 호환되는 외부 에이전트의 `/v1/chat/completions` API를 중계하여 Next.js 서버에서 클라이언트로 Server-Sent Events(SSE) 스트리밍을 제공합니다.
  - API Key 유출을 차단하기 위해 서버사이드에서 DB의 인증 정보를 조회하여 통신합니다.
  - Proxy 버퍼링을 막는 `X-Accel-Buffering: no` 헤더 및 클라이언트 요청 중단(`AbortSignal`)에 반응하는 다운스트림 fetch `req.signal` 연동을 적용했습니다.

### 4. 내비게이션 및 대시보드 통합 (Task 4)
- **파일**: `lib/constants/routes.ts`, `components/layout/UserSidebar.tsx`, `app/(user)/dashboard/page.tsx`
- **내용**: 
  - 사이드바 메뉴에 "외부 에이전트"(`Bot` 아이콘) 링크를 연동했습니다.
  - 대시보드 상단에 등록된 에이전트 중 온라인 상태인 에이전트 수의 통계를 보여주는 요약 카드를 추가했습니다.

### 5. 외부 에이전트 목록 및 등록 UI (Task 5)
- **파일**: `components/features/AddAgentModal.tsx`, `app/(user)/my-agents/page.tsx`
- **내용**:
  - `AddAgentModal.tsx`: 신규 등록 시 "연결 테스트"를 성공적으로 마친 경우에만 저장할 수 있는 Shadcn 기반의 모달 컴포넌트입니다.
  - `my-agents/page.tsx`: 등록된 외부 에이전트 목록을 카드 그리드 형식으로 노출하고, 각 에이전트 카드는 온라인/오프라인 상태 배지, 개별 포털 이동 링크, Kanban 팝업 및 에이전트 삭제 기능을 지원합니다. `Promise.allSettled`를 도입해 연결 실패가 전체 목록 로딩에 영향을 주지 않도록 리팩토링했습니다.

### 6. 개별 에이전트 포털 UI (Task 6)
- **파일**: `app/(user)/my-agents/[id]/page.tsx` 및 탭 컴포넌트들
- **내용**:
  - **대화 탭 (`AgentChatTab.tsx`)**: OpenAI 호환 SSE 청크 스트림 버퍼 파서를 사용하여, 실시간으로 에이전트 답변을 한 글자씩 렌더링하고 코드 블록 복사 및 마크다운 포맷팅을 지원하는 고도화된 채팅 화면입니다.
  - **칸반 탭 (`AgentKanbanTab.tsx`)**: 에이전트의 Web UI URL을 `iframe`으로 내장해 대시보드 이탈 없이 작업을 모니터링할 수 있으며, X-Frame-Options 제한 시 새 창에서 열 수 있는 대체 링크를 제공합니다.
  - **설정 탭 (`AgentSettingsTab.tsx`)**: 에이전트 상세 정보 조회/수정과 더불어, 에이전트가 로드하고 있는 LLM 모델 목록을 동적으로 가져와 배지로 표시합니다.

### 7. 대화 내역 DB 저장 및 지원 모델 동적 연동 (2026-06-20 추가 구현)
- **파일**: `supabase/migrations/20260620134000_external_agent_chat_and_model.sql`, `app/api/external-agents/[id]/messages/route.ts`
- **대화 내역 영속화 및 100개 제한**:
  - `user_external_agent_messages` 테이블을 신설하여, 대화방을 이동하거나 브라우저를 닫아도 이전 대화 내역이 유실되지 않고 안전하게 복원되도록 처리했습니다.
  - Next.js API 라우트 핸들러(`/api/external-agents/[id]/chat`)에서 에이전트 SSE 스트림의 모든 청크를 서버사이드에서 누적(Buffer)하여 스트림 완료 시 자동으로 DB에 인서트합니다.
  - 최신 100개의 메시지만 보존하고 이전 내역은 자동 청소하는 PostgreSQL RPC 함수(`prune_external_agent_messages`)를 구축하여 데이터베이스 용량 급증을 방지했습니다.
  - 대화 삭제 시 DB 내역도 일괄 삭제하는 API와 UI 연동을 추가했습니다.
- **모델 동적 연동 및 설정**:
  - `user_external_agents` 테이블에 `selected_model` 컬럼을 신설하여 사용자가 활성화하고자 하는 에이전트 모델명을 직접 지정할 수 있도록 지원합니다.
  - 설정 탭에서 조회된 원격 모델 목록 중 활성 모델을 클릭하는 즉시 DB에 변경사항이 저장되며, 대화 및 API 통신 시 선택한 모델명이 동적으로 주입되어 동작합니다.
  - 신규 등록 모달(`AddAgentModal.tsx`)에서 연결 테스트 성공 시 발견된 최하단 LLM 모델이 자동으로 활성 기본값으로 지정되도록 개선했습니다.

