# WSL2 Hermes Agent IP 조회 및 바인딩 오류 트러블슈팅

**원본 파일:** [wsl-hermes-ip-binding-troubleshooting.md](../../docs/wsl-hermes-ip-binding-troubleshooting.md)

**요약:**
WSL2 환경에서 실행 중인 Hermes Agent의 IP 주소를 조회하고, 플랫폼 등록 시 외부 에이전트 Endpoint URL에 해당 IP를 적용했을 때 발생하는 연결 거부(Disconnected) 오류에 대한 문제 분석 및 솔루션 가이드.
- **주요 원인**: Hermes Agent가 기본적으로 로컬 루프백(`127.0.0.1`)으로 바인딩되어 외부 인터페이스 IP(`172.30.34.189`)로의 접속을 거부하는 보안 차단 현상.
- **해결 방안**:
  1. `localhost` 포트 포워딩 기능을 활용하여 `http://localhost:8642/v1`로 엔드포인트 설정 원복 (추천).
  2. `~/.hermes-local/.env` 환경 변수 파일에 `API_SERVER_HOST=0.0.0.0`을 추가하고 에이전트를 재기동하여 모든 인터페이스로 바인딩 주소를 개방.
