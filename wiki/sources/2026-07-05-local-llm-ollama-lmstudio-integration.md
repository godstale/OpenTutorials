# 로컬 LLM(Ollama, LM Studio) 에이전트 연동 리서치

- **출처 문서**: [2026-07-05-local-llm-ollama-lmstudio-integration.md](../../docs/research/2026-07-05-local-llm-ollama-lmstudio-integration.md)
- **인제스트 날짜**: 2026-07-05
- **관련 엔티티**: [[PennyPress]]
- **관련 개념**: [[ExternalHermesAgent]], [[LocalLLMAgentIntegration]]

---

## 📌 리서치 배경 및 목적

Open Tutorials에 Ollama, LM Studio 등 로컬 LLM 런타임을 에이전트로 등록해 연동하려면 현재의 "외부 에이전트"(`UserExternalAgent`) 등록/관리/사용 구조가 어떻게 바뀌어야 하는지, 그리고 엔드포인트 URL/API 키 필드만으로 연동이 가능한지를 코드 조사 기반으로 정리한 리서치 문서.

## 🔍 결론 요약

- 현재 구조(`lib/types/index.ts`의 `UserExternalAgent`, `AddAgentModal.tsx`, `app/api/external-agents/**`)는 이미 OpenAI 호환 `/v1/chat/completions` + `/v1/models` 프로토콜을 전제로 설계되어 있고, UI 문구에도 "Ollama, LM Studio 등 외부 호환 API"가 이미 언급되어 있음. **엔드포인트/API 키 필드 자체는 추가 변경 없이 재사용 가능.**
- 다만 아래 3가지 로직이 로컬 LLM 서버와 맞지 않아 연동이 실패함:
  1. `app/api/external-agents/test/route.ts:31` — 연결 테스트가 `/health` 엔드포인트를 필수로 요구 (Ollama/LM Studio 둘 다 기본 미제공 → 테스트 상시 실패)
  2. `app/api/external-agents/[id]/chat/route.ts:90` — 모델 미지정 시 `'hermes-agent'`로 폴백 (로컬 LLM은 정확한 모델명이 아니면 즉시 에러)
  3. `AddAgentModal.tsx:88,126-135` — 모델을 "테스트 시 반환된 목록의 첫 번째"로 자동 선택, 사용자가 원하는 모델을 고를 UI가 없음
- 위 3가지 수정만으로 기존 구조 그대로 연동 가능하다고 판단.

## 🆚 Ollama / LM Studio API 비교

| 항목 | LM Studio | Ollama |
|---|---|---|
| OpenAI 호환 엔드포인트 | `http://localhost:1234/v1` | `http://localhost:11434/v1` |
| API 키 | 불필요 | 불필요 |
| `/v1/models`, `/v1/chat/completions` | 지원 | 지원 (최신 버전) |
| `/health` | 미지원 | 미지원 |
| 모델 식별자 | 로드된 모델의 정확한 식별자 필요 | `ollama pull` 태그(예: `llama3.1:8b`) 정확히 필요 |
| CORS | Next.js 서버(API Route)에서 fetch하므로 무관 | `OLLAMA_ORIGINS` 이슈는 브라우저 직접 호출 시에만 해당, 여기선 무관 |

## 🛠 권장 변경 사항 (구현 미착수, 리서치만 완료)

| # | 문제 | 위치 | 권장 조치 |
|---|---|---|---|
| 1 | `/health` 필수 체크 | `app/api/external-agents/test/route.ts` | `/v1/models` 성공 여부만으로 연결 판정하도록 완화 |
| 2 | 모델 `'hermes-agent'` 폴백 | `app/api/external-agents/[id]/chat/route.ts` | 모델 선택 필수화, 위험한 하드코딩 폴백 제거 |
| 3 | 모델 자동(첫 번째) 선택 | `AddAgentModal.tsx` | `/v1/models` 응답을 드롭다운으로 노출 |
| 4 | localhost→127.0.0.1 등 공통 로직 4곳+ 중복 | 각 API 라우트 + 프론트 3곳 | 공통 헬퍼로 추출 (provider 분기 추가 전 선행 권장) |
| 5 | `agent_type` 선택 가이드 부족 | `AddAgentModal.tsx` | Ollama/LM Studio는 반드시 `agent_type: 'llm'`로 등록하도록 안내 |

## ❓ 미해결 질문 / 다음 단계

1. Ollama `/v1/chat/completions` SSE 청크가 OpenAI 포맷과 완전히 동일한지 실제 인스턴스로 검증 필요
2. LM Studio 로컬 서버 모드 대상 E2E 테스트 필요
3. `/health` 체크 완전 제거 vs provider 힌트 기반 조건부 스킵 — 정책 결정 필요
4. 모델 드롭다운 UI 추가 위치(`AddAgentModal.tsx` vs `AgentSettingsTab.tsx`) 및 모델 unload/삭제 시 에러 핸들링 설계 필요
5. `hydra-agent/GUIDELINE.md` 원문 소실 상태 — 복구 여부 별도 판단 필요

## 참고 파일

`lib/types/index.ts`, `components/features/AddAgentModal.tsx`, `components/features/AgentSettingsTab.tsx`, `app/(user)/my-agents/page.tsx`, `lib/api/external-agents.ts`, `app/api/external-agents/test/route.ts`, `app/api/external-agents/[id]/chat/route.ts`, `app/api/external-agents/setup-tutor/route.ts`, `db.json`
