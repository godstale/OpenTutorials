# AIAgentWorker

**Type:** Concept (System Component)
**Related:** [[PennyPress]], [[HermesAgent]], [[ContentMonitoring]]

---

PennyPress 백엔드에서 LLM 기반 기능을 실행하는 서버 컴포넌트.

## 구조

- [[HermesAgent]] 기반으로 커스터마이징한 Worker 서버
- 하나의 인스턴스에 복수 프로파일 → 다중 사용자 처리
- Phase 3 이후 수평 확장 (Gateway 패턴) 가능하도록 인터페이스 설계

## FE와의 통신

- **요청**: FE → BE → Agent Worker HTTP API
- **응답**: SSE (Server-Sent Events) 스트림으로 실시간 상태 전달

## 환경변수

- `AGENT_WORKER_URL`: Worker 서버 엔드포인트
- `AGENT_WORKER_API_KEY`: 인증 키

## 배포

- Phase 2: 로컬 개발 환경
- Phase 3: Tencent Cloud
