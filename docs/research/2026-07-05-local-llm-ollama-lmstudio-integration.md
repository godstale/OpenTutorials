# 로컬 LLM(Ollama, LM Studio) 에이전트 연동 리서치

- **작성일**: 2026-07-05
- **목적**: 사용자가 Ollama, LM Studio 등으로 로컬에서 구동한 LLM을 Open Tutorials의 "에이전트 등록/관리/사용" 구조에 연결하려면 무엇이 바뀌어야 하는지 조사.
- **범위**: 코드 변경은 포함하지 않음(리서치 전용). 다른 에이전트가 이어서 구현 작업을 할 수 있도록 현재 구조와 갭을 정리한 참고 문서.

---

## 1. 결론 요약

- 현재 에이전트 등록 구조(`UserExternalAgent` 타입, 등록 UI, 채팅/테스트 API 라우트)는 이미 OpenAI 호환 `/v1/chat/completions` + `/v1/models` 프로토콜을 전제로 설계되어 있고, UI 문구에도 "Ollama, LM Studio 등 외부 호환 API"라는 표현이 이미 존재한다. 즉 **필드(엔드포인트 URL, API 키) 자체를 추가/변경할 필요는 없다.**
- 다만 3가지 로직이 로컬 LLM 서버와 맞지 않아 **연동 자체가 실패**한다:
  1. 연결 테스트가 `/health` 엔드포인트를 필수로 요구함 (Ollama/LM Studio 둘 다 기본 미제공)
  2. 모델 미지정 시 `'hermes-agent'`로 폴백함 (로컬 LLM은 정확한 모델명이 아니면 즉시 에러)
  3. 모델 선택이 "테스트 시 반환된 모델 목록의 첫 번째를 자동 선택"하는 방식이라, 여러 모델을 pull/load해둔 사용자가 원하는 모델을 고를 수 없음
- 위 3가지만 수정하면 기존 구조 그대로 Ollama/LM Studio 연동이 가능하다고 판단됨.

---

## 2. 현재 구조 (코드 조사 결과)

### 2.1 타입 정의

`lib/types/index.ts` (127~143번째 줄) — `UserExternalAgent`:

```ts
export interface UserExternalAgent {
  id: string;
  user_id: string;
  name: string;
  endpoint: string;
  api_key?: string;
  web_ui_url?: string;
  status: 'online' | 'offline' | 'error';
  selected_model?: string;
  dashboard_api_url?: string;
  dashboard_session_token?: string;
  is_ai_tutor?: boolean;
  is_tutor_configured?: boolean;
  agent_type?: 'harness' | 'llm';
  created_at: string;
  updated_at: string;
}
```

- `provider` 필드나 `headers` 맵은 없음 — 인증은 항상 `Authorization: Bearer <api_key>`로 하드코딩.
- `agent_type: 'harness' | 'llm'`이 이미 존재. `'llm'`을 고르면 서버가 매 요청마다 DB(`user_external_agent_messages`)에서 대화 이력을 재구성해서 함께 전송한다 (stateless completion 서버 대응 설계) — Ollama/LM Studio에 정확히 맞는 모드.

> ⚠️ 주의: 이 프로젝트에는 이름이 비슷한 **별개의 "HydraAgent" 마켓플레이스/구독 시스템**(`HydraAgentService` 타입, `app/api/agent/*`, `lib/api/agent-worker.ts`)이 존재한다. 이건 호스팅된 워커 프로필을 관리하는 무관한 기능이니 혼동하지 말 것.

### 2.2 등록/관리 UI

- **등록 모달**: `components/features/AddAgentModal.tsx`
  - 입력 필드: `name`, `endpoint`, `apiKey`, `webUiUrl`, `isAiTutor`(스위치), `agentType`(`'harness' | 'llm'` 라디오, 208~236번째 줄)
  - `agent_type: 'llm'` 라벨 문구(233/337번째 줄 부근)에 이미 "Ollama, LM Studio 등 외부 호환 API"라고 명시되어 있음 → 설계 의도는 처음부터 존재했으나 실제 프로토콜 분기 로직은 구현되지 않음
  - 모델은 별도 드롭다운이 없고, "연결 테스트"(44~80번째 줄, `/api/external-agents/test` 호출) 성공 시 반환된 모델 목록의 **첫 번째 항목을 자동으로 `selected_model`에 저장**(88, 126~135번째 줄)
- **수정 화면**: `components/features/AgentSettingsTab.tsx` (30~227번째 줄) — 동일 필드 + `dashboardApiUrl`/`dashboardSessionToken`(무관한 Kanban 프록시 기능)
- **목록 페이지**: `app/(user)/my-agents/page.tsx` — CRUD 호출, "상태 동기화" 버튼이 에이전트별로 `/api/external-agents/test`를 재호출
- **데이터 접근 레이어**: `lib/api/external-agents.ts` — `user_external_agents` 테이블에 대한 Supabase CRUD 래퍼

### 2.3 런타임 호출 API 라우트

**연결 테스트** — `app/api/external-agents/test/route.ts`:

```ts
const resolvedEndpoint = endpoint.replace('//localhost', '//127.0.0.1');   // 19번째 줄
const cleanEndpoint = resolvedEndpoint.replace(/\/$/, '');
const baseUrl = cleanEndpoint.endsWith('/v1') ? cleanEndpoint.slice(0, -3) : cleanEndpoint;
const v1Url  = cleanEndpoint.endsWith('/v1') ? cleanEndpoint : `${cleanEndpoint}/v1`;

await fetch(`${baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });   // 31번째 줄 — 필수 체크
...
if (api_key) headers['Authorization'] = `Bearer ${api_key}`;                              // 46번째 줄
await fetch(`${v1Url}/models`, { method: 'GET', headers, signal: AbortSignal.timeout(5000) }); // 49번째 줄
```

`/health`가 없으면 테스트가 실패로 처리됨 — **Ollama/LM Studio는 기본적으로 `/health`를 제공하지 않으므로 여기서 막힌다.**

**실제 채팅(SSE 스트리밍)** — `app/api/external-agents/[id]/chat/route.ts`:

```ts
const targetModel = agent.selected_model || 'hermes-agent';   // 90번째 줄 — 위험한 폴백

const response = await fetch(`${v1Url}/chat/completions`, {   // 92번째 줄
  method: 'POST',
  headers,
  body: JSON.stringify({ model: targetModel, messages: requestMessages, stream: true }),
  signal: req.signal,
});
```

- 응답은 OpenAI SSE 포맷(`choices[0].delta.content`)으로 파싱(201~211번째 줄) 후 그대로 브라우저에 중계됨 — Ollama/LM Studio의 `/v1/chat/completions` 스트리밍 응답과 포맷 호환.
- `agent_type === 'llm'`이면 매 요청마다 서버가 DB에서 히스토리를 재구성(54~76번째 줄)해서 함께 보냄 — 로컬 stateless LLM 서버에 적합.

**튜터 설정(soul.md 주입)** — `app/api/external-agents/setup-tutor/route.ts`: 동일 패턴으로 `/chat/completions`에 `stream: false`로 1회 호출.

**공통 이슈**: `localhost → 127.0.0.1` 치환, trailing slash 제거, `/v1` 접미사 정규화, Bearer 헤더 구성 로직이 최소 4곳(test/chat/setup-tutor 라우트 + 프론트 3곳: `AddAgentModal.tsx` 109~111줄, `AgentSettingsTab.tsx` 160~162줄, `my-agents/page.tsx` 84~86줄)에 중복 구현되어 있음. Provider별 분기를 추가하기 전에 공통 헬퍼로 추출하는 리팩토링을 선행하는 게 유지보수에 유리함.

### 2.4 db.json 저장 형태 (실제 레코드 예시)

```json
{
  "id": "eb3f795e-786c-47a3-b9aa-285fabce25a9",
  "name": "My Tutor",
  "endpoint": "http://43.155.160.66:8642/v1",
  "api_key": "fjeoi@!#ddjkEWHD3972",
  "selected_model": "hermes-agent",
  "is_ai_tutor": true,
  "is_tutor_configured": true,
  "user_id": "local-user-id",
  "status": "offline",
  "agent_type": "harness"
}
```

### 2.5 `hydra-agent/GUIDELINE.md`

CLAUDE.md/AGENTS.md/GEMINI.md가 참조하지만, **실제 리포지토리에는 파일이 존재하지 않음**. `wiki/sources/hydra-agent-guideline.md`와 `wiki/concepts/HydraAgentGuideline.md`에 한 줄 요약만 남아있고 상세 규칙 원문은 소실된 상태. Hermes Agent 배포 규칙까지 정리하려면 이 문서를 먼저 복구/재작성해야 할 수 있음.

---

## 3. Ollama / LM Studio API 사양 비교

| 항목 | LM Studio | Ollama |
|---|---|---|
| OpenAI 호환 엔드포인트 | `http://localhost:1234/v1` | `http://localhost:11434/v1` |
| API 키 | 불필요 (임의 문자열도 허용) | 불필요 |
| `GET /v1/models` | 지원 (로드된 모델 목록) | 지원 (pull된 모델 목록) |
| `POST /v1/chat/completions` (스트리밍 포함) | 지원 | 지원 (최신 버전 기준) |
| `GET /health` | **미지원** | **미지원** |
| 모델 식별자 | 로드된 모델의 정확한 파일/식별자명 | `ollama pull`로 받은 정확한 태그 (예: `llama3.1:8b`) — 없으면 즉시 에러 |
| 네이티브(비-OpenAI) API | 자체 확장 REST API(`/api/v0/...`, 통계 필드 포함) | `/api/chat`, `/api/generate`, `/api/tags` 등 (OpenAI 포맷과 다름) |
| CORS | 브라우저 직접 호출 시 이슈 가능 | `OLLAMA_ORIGINS` 미설정 시 브라우저 직접 호출 차단 |

Open Tutorials는 브라우저가 아니라 **Next.js 서버(API Route)에서 fetch**하므로 CORS는 문제되지 않음 (서버-서버 호출). 따라서 네이티브 API를 쓸 필요 없이 두 도구 모두 OpenAI 호환 `/v1` 레이어로 충분히 연동 가능.

---

## 4. 갭 분석 및 권장 변경 사항

| # | 문제 | 위치 | 권장 조치 |
|---|---|---|---|
| 1 | `/health` 필수 체크로 연결 테스트가 항상 실패 | `app/api/external-agents/test/route.ts:31` | `/health` 실패를 치명적 에러로 취급하지 않고, `/v1/models` 성공 여부만으로 연결 판정하도록 완화 |
| 2 | 모델 미지정 시 `'hermes-agent'` 폴백 | `app/api/external-agents/[id]/chat/route.ts:90` | 로컬 LLM 등록 시 모델 선택을 필수값으로 강제, 위험한 하드코딩 폴백 제거 |
| 3 | 모델 자동 선택(첫 번째 항목)만 지원, 사용자 선택 불가 | `AddAgentModal.tsx:88,126-135` | `/v1/models` 응답을 드롭다운으로 노출해 사용자가 원하는 모델을 직접 선택하게 UI 개선 |
| 4 | localhost→127.0.0.1 치환 등 공통 로직이 4곳 이상 중복 | 각 API 라우트 + 프론트 3곳 | provider 분기 추가 전에 공통 헬퍼(`lib/utils/agent-endpoint.ts` 등)로 추출 |
| 5 | `agent_type` 선택 가이드 부족 | `AddAgentModal.tsx` | Ollama/LM Studio 등록 시 반드시 `'llm'` 타입을 선택하도록 UI/문서에서 안내 (harness로 등록하면 서버가 히스토리 재생을 하지 않아 매 턴 문맥 유실) |

**유지해도 되는 부분**:
- `api_key`는 이미 optional 처리(`if (agent.api_key) headers['Authorization']=...`)라 키 없는 로컬 서버에 그대로 동작
- SSE 스트리밍 파싱 포맷(OpenAI 호환)도 그대로 호환됨
- `agent_type: 'llm'`의 서버사이드 히스토리 재구성 로직이 stateless 로컬 LLM에 정확히 맞음 — 구조 변경 불필요, 등록 시 타입 선택만 올바르게 하면 됨

---

## 5. 미해결 질문 / 다음 단계 (이어서 작업할 에이전트를 위한 메모)

1. Ollama의 `/v1/chat/completions` 스트리밍 SSE 청크가 OpenAI 포맷과 100% 동일한지 실제 로컬 인스턴스로 검증 필요 (버전에 따라 `usage` 필드 유무 등 미세 차이 가능).
2. LM Studio 로컬 서버 모드 UI에서 "Reachable at http://localhost:1234"로 뜨는 실제 서버를 대상으로 `/v1/models`, `/v1/chat/completions` E2E 테스트 필요.
3. `/health` 체크를 완전히 제거할지, provider 힌트(예: endpoint에 `11434`/`1234` 포함 여부)에 따라 조건부로 스킵할지 결정 필요.
4. 모델 드롭다운 UI를 `AddAgentModal.tsx`/`AgentSettingsTab.tsx` 중 어디에 우선 추가할지, 그리고 등록 후 모델이 로컬에서 unload/삭제된 경우의 에러 핸들링(현재는 없음) 설계 필요.
5. `hydra-agent/GUIDELINE.md` 원문 복구 여부 — 배포 규칙까지 함께 정리하려면 필요.

---

## 참고 파일 목록

- `lib/types/index.ts` (127~154번째 줄)
- `components/features/AddAgentModal.tsx`
- `components/features/AgentSettingsTab.tsx`
- `app/(user)/my-agents/page.tsx`
- `lib/api/external-agents.ts`
- `app/api/external-agents/test/route.ts`
- `app/api/external-agents/[id]/chat/route.ts`
- `app/api/external-agents/setup-tutor/route.ts`
- `db.json` (`user_external_agents`, `user_external_agent_messages`)
- `wiki/sources/hydra-agent-guideline.md`, `wiki/concepts/HydraAgentGuideline.md`
