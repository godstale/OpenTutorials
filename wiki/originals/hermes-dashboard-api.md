# Hermes Dashboard API

Dashboard API 호출 방법 인증 체계

Dashboard의 API 인증은 listen 주소에 따라 방식이 다릅니다:

Case A: loopback (127.0.0.1/localhost)  세션 토큰 방식

bash
1. Dashboard가 127.0.0.1:9120에서 실행 중 (--insecure 없이)

2. 세션 토큰 확인 방법
curl -s http://127.0.0.1:9120/ | grep -o 'data-session-token="[^"]*"'

3. API 호출 (토큰 필요)
curl -s http://127.0.0.1:9120/api/profiles \
  -H "X-Hermes-Session-Token: <토큰>"

또는 Authorization: Bearer 방식 (역호환)
curl -s http://127.0.0.1:9120/api/profiles \
  -H "Authorization: Bearer <토큰>"


토큰은 프로세스가 시작될 때 자동 생성됩니다. HERMES_DASHBOARD_SESSION_TOKEN 환경변수로 고정할 수도 있습니다:

bash
export HERMES_DASHBOARD_SESSION_TOKEN=my-fixed-token
hermes dashboard --port 9120 --skip-build


Case B: 0.0.0.0 (네트워크)  OAuth 인증 필요

bash
--insecure 없이 0.0.0.0에 바인딩하면 OAuth 게이트가 활성화
hermes dashboard --host 0.0.0.0 --port 9120 --skip-build
 OAuth 로그인 필수 (Nous Portal 등)


Case C: 0.0.0.0 + --insecure (비권장)

bash
인증 없이 모든 API 접근 가능 (내부망 전용)
hermes dashboard --host 0.0.0.0 --port 9120 --skip-build --insecure




인증이 필요 없는 PUBLIC API (curl로 바로 테스트 가능)

이 API들은 토큰/쿠키 없이 호출됩니다:

bash
curl -s http://127.0.0.1:9120/api/status
curl -s http://127.0.0.1:9120/api/config/defaults
curl -s http://127.0.0.1:9120/api/config/schema
curl -s http://127.0.0.1:9120/api/model/info
curl -s http://127.0.0.1:9120/api/dashboard/themes
curl -s http://127.0.0.1:9120/api/dashboard/plugins




실전 예제 (Profile 관리)

bash
TOKEN="<위에서 확인한 토큰>"

모든 Profile 조회
curl -s http://127.0.0.1:9120/api/profiles \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .

Config 읽기
curl -s http://127.0.0.1:9120/api/config \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .

모델 변경
curl -s -X POST http://127.0.0.1:9120/api/model/set \
  -H "X-Hermes-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "deepseek", "model": "deepseek-v4-flash"}'

Cron 작업 목록
curl -s http://127.0.0.1:9120/api/cron/jobs \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .

Gateway 재시작
curl -s -X POST http://127.0.0.1:9120/api/gateway/restart \
  -H "X-Hermes-Session-Token: $TOKEN"

환경변수 읽기
curl -s http://127.0.0.1:9120/api/env \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .

세션 검색
curl -s "http://127.0.0.1:9120/api/sessions/search?q=profile&limit=5" \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .




Nginx 뒤에서 호출하는 경우

현재 Nginx reverse proxy(9119)를 통해 접근 중이므로, loopback으로 간주됩니다. Nginx가 127.0.0.1:9120으로 프록시하고 있으므로 세션 토큰 방식이 적용됩니다:

bash
Nginx (Basic Auth) 를 통한 Dashboard API 호출
curl -s https://43.155.160.66:9119/api/profiles \
  -u "hermes:qawsedrf!1" \
  -H "X-Hermes-Session-Token: $TOKEN" | jq .




주요 API 엔드포인트 요약

| 엔드포인트               | 메서드 | 설명                                       |
|--------------------------|--------|--------------------------------------------|
| /api/status              | GET    |  Public  버전, gateway 상태             |
| /api/profiles            | GET    | 모든 profile 목록                          |
| /api/profiles            | POST   | 새 profile 생성                            |
| /api/config              | GET    | config.yaml 읽기                           |
| /api/config              | PUT    | config.yaml 저장                           |
| /api/env                 | GET    | .env 변수 목록 (값은 가림)                 |
| /api/env                 | PUT    | .env 변수 저장/수정                        |
| /api/env/reveal          | POST   | 특정 변수 원본값 공개                      |
| /api/model/set           | POST   | 모델/프로바이더 변경                       |
| /api/model/options       | GET    | 사용 가능한 모델 목록                      |
| /api/model/auxiliary     | GET    | 보조 모델 설정                             |
| /api/sessions            | GET    | 세션 목록 (?profile=name 으로 특정 프로필) |
| /api/sessions/search     | GET    | 세션 검색 (?q=keyword)                     |
| /api/cron/jobs           | GET    | cron 작업 목록                             |
| /api/gateway/restart     | POST   | gateway 재시작                             |
| /api/hermes/update/check | GET    | 업데이트 확인                              |
| /api/hermes/update       | POST   | 업데이트 실행                              |
| /api/curator             | GET    | curator 상태                               |
| /api/curator/run         | POST   | curator 실행                               |
| /api/system/stats        | GET    | CPU/메모리/디스크 통계                     |
| /api/logs                | GET    | 로그 조회 (?name=agent.log, ?lines=50)     |



외부 서비스(PennyPress)에서 활용하는 방법

PennyPress가 Hermes를 제어해야 한다면, 크게 두 가지 접근법이 있습니다:

1) API Server (8642)  OpenAI 호환 채팅 전용
   - PennyPress가 Hermes Agent와 대화만 하면 됨
   - /v1/chat/completions 또는 /api/sessions/{id}/chat
   - Authorization: Bearer <API_SERVER_KEY> 인증 (간단)

2) Dashboard API (9120)  설정/관리
   - PennyPress가 Profile 생성, Config 변경, Cron 등록 등 필요
   - 세션 토큰 또는 --insecure 모드로 API 호출
   - CORS가 localhost로 제한되어 있으므로 Nginx를 통해 프록시하여 호출

Dashboard API에 대한 전용 문서 페이지는 아직 공식 사이트에 없습니다. 대신 관련 자료 링크와 소스 코드 참조 경로를 알려드립니다.



공식 문서 링크 (관련 페이지)

| 내용                                | URL                                                                               |
|-------------------------------------|-----------------------------------------------------------------------------------|
| Profiles (멀티 에이전트)            | https://hermes-agent.nousresearch.com/docs/user-guide/profiles                    |
| Messaging Gateway (API Server 포함) | https://hermes-agent.nousresearch.com/docs/user-guide/messaging                   |
| CLI 명령어 (dashboard CLI 옵션)     | https://hermes-agent.nousresearch.com/docs/reference/cli-commands                 |
| Configuration (설정 옵션)           | https://hermes-agent.nousresearch.com/docs/user-guide/configuration               |
| Dashboard 웹 UI 소개                | https://hermes-agent.nousresearch.com/docs/user-guide/profiles#from-the-dashboard |
| 공식 문서 홈                        | https://hermes-agent.nousresearch.com/docs                                        |



Dashboard API에 대한 전용 문서는 없음

Dashboard API는 아직 공식 문서에서 별도 페이지로 분리되지 않았습니다. 현재 문서에는 CLI 명령 (hermes dashboard --port 9120) 수준의 설명만 있고, REST API 엔드포인트 명세는 포함되어 있지 않습니다.



최신 API 명세를 확인하는 방법

가장 정확한 정보는 소스 코드 자체입니다:

bash
1) 전체 API 엔드포인트 목록 (Dashboard API)
grep -rn "@app\." /home/ubuntu/.hermes/hermes-agent/hermes_cli/web_server.py \
  | grep "/api/" | grep -v "def \|#" | head -60

2) API Server (8642) 엔드포인트
head -32 /home/ubuntu/.hermes/hermes-agent/gateway/platforms/api_server.py

3) 인증 공개 경로
cat /home/ubuntu/.hermes/hermes-agent/hermes_cli/dashboard_auth/public_paths.py


또는 GitHub 저장소에서 직접 보기:

| 파일                               | GitHub URL                                                                                         |
|------------------------------------|----------------------------------------------------------------------------------------------------|
| web_server.py (Dashboard API 전부) | https://github.com/NousResearch/hermes-agent/blob/master/hermes_cli/web_server.py                  |
| api_server.py (API Server 8642)    | https://github.com/NousResearch/hermes-agent/blob/master/gateway/platforms/api_server.py           |
| public_paths.py (인증 불필요 API)  | https://github.com/NousResearch/hermes-agent/blob/master/hermes_cli/dashboard_auth/public_paths.py |
| Profiles 소스                      | https://github.com/NousResearch/hermes-agent/blob/master/hermes_cli/profiles.py                    |



빠른 API 탐색 명령

현재 서버에서 바로 엔드포인트를 탐색하려면:

bash
TOKEN 추출 (Dashboard HTML에 내장)
TOKEN=$(curl -s http://127.0.0.1:9120/ | grep -oP 'data-session-token="\K[^"]+')

모든 엔드포인트 탐색 (fastapi OpenAPI/Swagger)
FastAPI는 기본적으로 /docs 와 /openapi.json 제공
curl -s http://127.0.0.1:9120/openapi.json \
  -H "X-Hermes-Session-Token: $TOKEN" | jq '.paths | keys'


FastAPI는 /openapi.json과 /docs (Swagger UI)를 자체 제공하므로, Dashboard가 실행 중이면:

- http://127.0.0.1:9120/openapi.json  전체 API 스키마 (JSON)
- http://127.0.0.1:9120/docs  Swagger UI (브라우저에서 대화형 테스트)

이것이 가장 간단하고 정확한 참조 방법입니다.
