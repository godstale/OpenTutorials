# LocalLLMAgentIntegration (개념)

- **설명**: Ollama, LM Studio 등 사용자 PC에서 직접 구동되는 로컬 LLM 런타임을 [[ExternalHermesAgent]]와 동일한 `UserExternalAgent` 등록 구조(`endpoint` + `api_key?` + `selected_model?`)로 연동하는 방식을 가리키는 개념.
- **핵심 전제**:
  - 두 도구 모두 OpenAI 호환 `GET /v1/models`, `POST /v1/chat/completions` 엔드포인트를 로컬(`http://localhost:1234/v1` LM Studio, `http://localhost:11434/v1` Ollama)에 노출하며, API 키가 필요 없다.
  - Open Tutorials는 브라우저가 아닌 Next.js 서버(API Route)에서 fetch하므로 Ollama의 CORS 제한(`OLLAMA_ORIGINS`)은 영향을 주지 않는다.
  - `agent_type: 'llm'`으로 등록하면 서버가 매 요청마다 DB(`user_external_agent_messages`)에서 대화 이력을 재구성해 함께 전송하는 기존 로직이 stateless 로컬 LLM 서버에 그대로 들어맞는다.
- **현재 구조와의 갭** (2026-07-05 리서치 기준, 구현 완료):
  1. 연결 테스트가 `/health`를 필수로 요구 — 완화 완료 (health check가 실패하더라도 `/v1/models` 성공 시 성공 판정).
  2. 모델 미지정 시 `'hermes-agent'`로 폴백 — 개선 완료 (`selected_model`이 명시적으로 지정되지 않은 경우 400 에러를 반환하는 예외 처리 도입).
  3. 모델을 "테스트 응답의 첫 번째 항목"으로 자동 선택 — 개선 완료 (AddAgentModal 및 AgentSettingsTab에 드롭다운/Select UI를 구축하여 사용자가 직접 모델을 선택하도록 개선).
- **결론**: 엔드포인트/API 키 필드 구조 자체는 변경 없이, 위의 3가지 로직 및 중복 URL 정규화 로직(`lib/utils/agent-endpoint.ts`)을 개선하여 완벽히 연동됨.

## Discussed In
- [[2026-07-05-local-llm-ollama-lmstudio-integration]] — 최초 리서치, 코드 조사 및 갭 분석
