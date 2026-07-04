# PennyPress 외부 에이전트 [칸반/웹UI] 연동 및 대시보드 자동 기동 구현

- **출처 문서**: [2026-06-21-external-agent-kanban-integration.md](file:///C:/___Workspace/Projects/PennyPress/docs/superpowers/plans/2026-06-21-external-agent-kanban-integration.md)
- **인제스트 날짜**: 2026-06-21
- **관련 엔티티**: [[PennyPress]], [[HermesAgent]]
- **관련 개념**: [[ExternalHermesAgent]], [[WSL2Setup]]

---

## 📌 기능 개요

사용자가 로컬 WSL2 환경 등에서 개별적으로 구동하는 외부 [[HermesAgent]]의 웹 대시보드(Kanban 보드 포함)를 자동으로 동시 구동시키고, PennyPress 웹 포탈 화면에서 이 대시보드 URL(http://localhost:9118)을 자동으로 감지하고 매핑하여 원클릭으로 손쉽게 연동할 수 있도록 등록 모달 및 칸반 탭 화면의 흐름을 보완하였습니다.

---

## 🛠️ 구현 내용 요약

### 1. WSL Hermes Agent `start.sh` 스크립트 수정 및 대시보드 자동 기동
- **대상 파일**: [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh)
- **내용**:
  - `start.sh` 실행 시 API 게이트웨이(8642) 뿐만 아니라, 웹 대시보드(포트 9118)도 백그라운드로 자동 구동되도록 `hermes dashboard --port 9118 --host 0.0.0.0 --insecure --no-open &` 명령을 연동했습니다.
  - 쉘 프로세스가 종료되거나 `Ctrl + C` 등 인터럽트 신호(`INT`, `TERM`, `EXIT`)가 오면, 백그라운드 대시보드 프로세스까지 자동으로 함께 소멸되도록 `trap`과 `cleanup()` 핸들러를 구성하여 프로세스 라이프사이클을 일치시켰습니다.
  - WSL 환경에서 대시보드 구동 시 Vite 빌드를 위한 로컬 Node.js 경로(`$HOME/.hermes/node/bin`)를 `PATH` 최상단에 자동으로 추가하여 빌드 환경 충돌 문제를 예방했습니다.

### 2. 신규 에이전트 등록 모달 `AddAgentModal.tsx` 개선
- **대상 파일**: [components/features/AddAgentModal.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AddAgentModal.tsx)
- **내용**:
  - Endpoint URL 입력값이 `localhost` 또는 `127.0.0.1`로 끝나는지 판별하는 `isLocalEndpoint` 유틸 함수를 구현했습니다.
  - API Endpoint 입력 시 로컬 Endpoint가 감지되고 `webUiUrl` 필드가 비어 있으면 자동으로 `http://localhost:9118`이 채워지도록 개선하여 등록 편의성을 극대화했습니다.

### 3. 개별 에이전트 칸반 탭 `AgentKanbanTab.tsx` 개선
- **대상 파일**: [components/features/AgentKanbanTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentKanbanTab.tsx)
- **내용**:
  - `web_ui_url`이 비어 있는 에이전트 상세 페이지 접근 시, 에이전트 Endpoint가 로컬인지 감지하여 서로 다른 안내 문구를 출력하도록 분기했습니다.
  - 로컬 에이전트일 경우: **"로컬 대시보드 자동 연동 (http://localhost:9118)"** 버튼과 WSL에서 대시보드를 띄우는 가이드 블록(`bash hermes-agent/start.sh`)을 함께 제공합니다.
  - 버튼을 클릭하면 `updateExternalAgent` API를 이용해 DB에 `web_ui_url`을 저장하고 화면을 새로고침하여 즉시 iframe으로 로컬 대시보드를 임베딩 렌더링합니다.

---

## 🔍 주요 트러블슈팅 (Troubleshooting)

### Q. `exec` 사용 시 `trap` 핸들러가 작용하지 않아 대시보드가 강제로 유지되는 현상
- **원인**: 초기 설계안대로 `exec "$HERMES_BIN" gateway`를 사용하여 게이트웨이를 실행할 경우, 셸 프로세스가 게이트웨이 바이너리로 전전 교체되어 버립니다. 이 과정에서 셸에 등록된 `trap cleanup EXIT INT TERM` 핸들러가 모두 유실되었고, 결과적으로 게이트웨이를 강제 종료해도 백그라운드 대시보드 프로세스는 계속 살아남아 9118 포트를 점유하는 치명적 오류가 발견되었습니다.
- **해결책**: 스펙 준수 리뷰 과정에서 이 문제를 식별하여 `exec` 키워드를 제거했습니다. `"$HERMES_BIN" gateway`로 포어그라운드 자식 프로세스 형태로만 구동하게 하여 부모 셸 프로세스가 정상 유지되도록 수정했으며, 그 결과 게이트웨이 종료 시 `EXIT` 트랩이 정상 작동해 대시보드 프로세스가 깔끔하게 함께 종료되도록 조치하였습니다.

---

## 🧪 검증 결과
- **타입 검사**: 프로젝트 루트에서 `npx tsc --noEmit` 명령을 실행해 어떠한 TypeScript 에러도 없음을 검증 완료했습니다.
- **린팅**: ESLint 검사 통과 및 코드 퀄리티 승인(APPROVED)을 획득하였습니다.
