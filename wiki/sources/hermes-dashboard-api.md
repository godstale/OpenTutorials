---
title: "Hermes Dashboard API"
type: source
ingest_mode: full
source_file: wiki/originals/hermes-dashboard-api.md
created_at: 2026-06-21
author: PennyPress Team
team: PennyPress
tags: [Hermes, API, Dashboard, Authentication]
sources: []
last_updated: 2026-06-21
---

# Hermes Dashboard API 인증 및 사용법

이 문서는 PennyPress에서 Hermes Agent를 외부에서 제어하기 위한 **Dashboard API (9120 포트)**의 동작 방식, 인증 체계 및 엔드포인트 명세 탐색 방법에 대해 설명합니다.

## 핵심 요약

- Hermes Dashboard API는 바인딩 주소(`127.0.0.1` vs `0.0.0.0`)와 실행 옵션(`--insecure`)에 따라 인증 방식이 변경됩니다.
- 기본 로컬 루프백(`127.0.0.1:9120`) 실행 환경에서는 **세션 토큰 기반 인증**을 사용합니다. HTTP 요청 시 `X-Hermes-Session-Token` 헤더를 포함해야 합니다.
- 외부 제어(PennyPress) 시 Dashboard API 전용 공식 문서가 제공되지 않으므로, 실행 중인 서버의 `/openapi.json` 또는 `/docs` (Swagger UI)를 이용해 명세를 확인하는 것이 가장 정확합니다.

## 인증 체계 상세

### Case A: loopback (127.0.0.1 / localhost)
- **방식**: 세션 토큰 방식 (가장 일반적인 형태)
- **실행**: `hermes dashboard --port 9120 --skip-build`
- **토큰 추출 방법**: `curl -s http://127.0.0.1:9120/ | grep -o 'data-session-token="[^"]*"'`
- **호출 방법**:
  ```bash
  curl -s http://127.0.0.1:9120/api/profiles \
    -H "X-Hermes-Session-Token: <토큰>"
  ```
- **고정 토큰 사용**: `HERMES_DASHBOARD_SESSION_TOKEN` 환경변수 설정

### Case B: 0.0.0.0 (네트워크)
- **방식**: OAuth 인증 게이트 활성화 (Nous Portal 연동)
- **실행**: `hermes dashboard --host 0.0.0.0 --port 9120 --skip-build`

### Case C: 0.0.0.0 + --insecure
- **방식**: 인증 우회 (내부망 전용, 비권장)
- **실행**: `hermes dashboard --host 0.0.0.0 --port 9120 --skip-build --insecure`

## 인증 불필요 (Public API)
다음 엔드포인트는 토큰 없이 호출할 수 있습니다.
- `/api/status` : Gateway 상태 및 버전
- `/api/config/defaults`, `/api/config/schema`
- `/api/model/info`
- `/api/dashboard/themes`, `/api/dashboard/plugins`

## 주요 엔드포인트 (실전 예제)

| 기능 | HTTP | 엔드포인트 | 비고 |
|---|---|---|---|
| 프로필 조회/생성 | GET / POST | `/api/profiles` | 멀티 에이전트 생성에 필수 |
| Config 읽기/저장 | GET / PUT | `/api/config` | `config.yaml` 관리 |
| 모델 변경 | POST | `/api/model/set` | 프로바이더 및 모델명 설정 |
| Cron 작업 | GET | `/api/cron/jobs` | 예약된 작업 목록 |
| 시스템 통계 | GET | `/api/system/stats` | CPU/메모리 통계 |
| 세션 검색 | GET | `/api/sessions/search` | 특정 프로필에 대한 세션 조회 |
| 로그 조회 | GET | `/api/logs` | `agent.log` 등 파일 모니터링 |

## 외부 서비스 (PennyPress) 연동 가이드

PennyPress가 Hermes를 제어하기 위한 접근법은 다음과 같습니다.

1. **API Server (8642 포트)**:
   - 용도: OpenAI 호환 채팅 및 메시지 연동 전용.
   - 인증: `Authorization: Bearer <API_SERVER_KEY>` (비교적 간단).
2. **Dashboard API (9120 포트)**:
   - 용도: 프로필 생성, 환경 설정 변경, Cron 스케줄 관리 등 시스템 설정 제어.
   - 인증: 세션 토큰 인증. 단, CORS 제약이 `localhost`로 묶여있어 Nginx 프록시(ex. 9119포트)를 통한 프록시 호출이 요구될 수 있습니다.

## API 스키마 확인 (Swagger UI)

가장 권장되는 문서 확인 방법입니다.
서버가 127.0.0.1:9120 으로 동작 중일 때, 다음 경로에 접속하면 완전한 API 목록 및 상호작용 가능한 테스트 UI를 볼 수 있습니다.
- **Swagger UI**: `http://127.0.0.1:9120/docs`
- **OpenAPI Schema**: `http://127.0.0.1:9120/openapi.json`
