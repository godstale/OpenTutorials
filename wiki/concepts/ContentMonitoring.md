# ContentMonitoring

**Type:** Concept (Feature)
**Related:** [[PennyPress]], [[AIAgentWorker]], [[HermesAgent]]

---

PennyPress의 첫 번째 AI Agent 기능.

## 동작 방식

1. 사용자가 모니터링할 URL과 요청사항을 입력
2. Hermes Agent가 해당 URL의 컨텐츠를 주기적으로 방문/분석
3. 사용자가 원하는 정보 추출
4. Slack / Telegram / Email 중 선택한 채널로 결과 전달

## 파라미터 (예상)

- `target_url`: 모니터링할 URL
- `monitoring_request`: 어떤 정보를 추출할지 자연어 설명
- `interval`: 모니터링 주기 (시간/분)
- `notification_channel`: 알림 채널 (slack/telegram/email)
- `notification_target`: 채널별 수신 대상 (채널명, 채팅ID, 이메일)

## 구현 단계

- Phase 1: UI/파라미터 입력 폼 구현 (더미 데이터)
- Phase 2: Hermes Agent 연동으로 실제 모니터링 실행
