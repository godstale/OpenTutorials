# HermesAgent

**Type:** Entity (External Tool)
**Related:** [[PennyPress]], [[AIAgentWorker]], [[ContentMonitoring]]

---

NousResearch의 오픈소스 self-improving AI agent 프레임워크.

## 참조

- GitHub: https://github.com/nousresearch/hermes-agent
- PennyPress에서 [[AIAgentWorker]] 구현의 기반으로 사용

## PennyPress에서의 역할

- Tencent Cloud에서 실행되는 AI Worker 서버의 핵심 엔진
- 여러 LLM 모델 추상화 레이어 제공
- 하나의 Worker 인스턴스에 복수 프로파일 운용으로 다중 사용자 처리
- Phase 2부터 실제 구현 시작
