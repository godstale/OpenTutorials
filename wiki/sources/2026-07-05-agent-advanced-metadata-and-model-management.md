# 에이전트 상세 정보 고도화 및 하네스 에이전트 모델 수동 관리

## 개요
사용자가 다양한 에이전트 구동 서버(Ollama, LM Studio 등)와 프레임워크(Hermes, Open claw 등)를 연동하는 과정에서 발생할 수 있는 엣지 케이스들을 해소하고, 시각적 정보 표기를 통합하기 위해 에이전트의 메타데이터 뱃지 뷰어 및 하네스 에이전트의 모델 수동 설정과 관리 기능을 대폭 강화했습니다.

## 주요 개선 및 구현 사항

### 1. 메타데이터 3종 뱃지화 연동
- **파일**: [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
- **변경 사항**:
  - 기존에 개별 행으로 길게 늘어져 있던 '에이전트 타입', '실행 환경', '에이전트 프로그램' 정보를 하나의 **'에이전트 타입'** 행에 3개의 뱃지로 통합하여 나란히 렌더링하도록 개선하였습니다.
  - 가시성 향상을 위해 각 뱃지별로 테마 색상(Indigo 및 Zinc)을 지정하여 구분하였습니다.
  - 중복 표현되던 기존 개별 행('실행 환경', '에이전트 프로그램')은 삭제하여 상세 UI 레이아웃의 여백과 복잡도를 줄였습니다.

### 2. 에이전트 프로그램 '기타(Other)' 옵션 및 퀵 설정 보완
- **파일**:
  - [index.ts](file:///C:/Workspace/Projects/OpenTutor/lib/types/index.ts) — `agent_program` 유니온 타입에 `'other'` 추가.
  - [AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx) — 에이전트 프로그램 선택창 컬럼을 3개로 확장하고 '기타' 버튼을 추가함. 퀵 매핑 시 `'other'` 가 들어오면 포트를 수동으로 작성할 수 있도록 템플릿 처리하여 덮어쓰기 결함을 예방함.
  - [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx) — 정보 수정 화면 내의 에이전트 프로그램 선택 그리드를 동일하게 3개로 확장하고 '기타'를 추가. 또한 상세 조회 시 텍스트 포맷터인 `programNames` 맵핑 객체를 추가하여 `'other'` 일 때 `'기타'`, `'lmstudio'` 일 때 `'LM Studio'` 등 완벽한 한글/영문 매핑명으로 이쁘게 변환되도록 수정하여 LM Studio 등이 빈 값이나 소문자로 렌더링되던 오류 가능성을 해결했습니다.

### 3. 하네스 에이전트 LLM 모델명 수동 입력 및 모델 조회 고도화
- **배경**: 하네스 에이전트 프레임워크(예: NousResearch Hermes)는 자체적으로 completions 모델 목록(`/v1/models`) 조회를 응답하지 않거나 단일값만 내려주기 때문에, 사용자가 연동해서 사용하는 실제 로컬/원격 LLM 모델명(예: Gemma-2 등)을 선택하거나 인지하기 어려운 구조적 제약이 있었습니다.
- **해결 방안**:
  - **등록 시**: [AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx)에서 연결 테스트 성공 시, 에이전트 타입이 하네스(`'harness'`)이거나 감지된 모델 목록이 0개인 경우 기본 Select 드롭다운 대신 **직접 모델명을 타이핑할 수 있는 텍스트 Input**이 등장하도록 폼을 연동했습니다.
  - **수정 시**: [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)의 에디터 폼에서도 하네스 에이전트이거나 불러온 원격 모델이 없을 경우 모델 선택 방식을 텍스트 Input으로 처리하여 모델명을 유연하게 변경/저장할 수 있게 하였습니다.
  - **조회 및 수동 갱신**: 우측의 '지원 모델 조회' 카드에서 하네스 에이전트 정보가 없거나 비어있는 경우, 수동 조회(Refresh)를 시도하도록 안내하는 메시지와 함께 **모델명을 직접 적어 수동 업데이트**할 수 있는 간편 텍스트 폼을 탑재하여 즉각적인 모델 갱신 편의성을 보장했습니다.

## 변경 결과 UI 구성안
```
+-----------------------------------------------------------+
| [에이전트 정보 설정]                                      |
| 에이전트 타입: [LLM 에이전트] [로컬] [LM Studio]          |
| 활성 모델: gemma-2-9b-it                                  |
| API Endpoint: http://localhost:1234/v1                    |
+-----------------------------------------------------------+
```
수동 입력이 가능해지면서 하네스 및 LLM 에이전트 모두 로컬 LLM 환경(Ollama/LM Studio)과 완벽하게 조화될 수 있도록 정합성이 확보되었습니다.
