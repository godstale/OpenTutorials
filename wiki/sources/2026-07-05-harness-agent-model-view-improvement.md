# 하네스 에이전트 지원 모델 조회 카드 및 설정 폼 개선

## 개요
하네스 에이전트(예: Hermes, Open claw 등)는 에이전트 프로그램 내부에 자체적인 LLM 모델 설정이 하드코딩되거나 별도 탑재되어 구동되기 때문에, 프론트엔드 단에서 실시간으로 호출 가능한 여러 LLM 모델 목록을 수동 갱신하거나 교체하는 과정이 불필요하거나 지원되지 않습니다.
이에 따라 사용자에게 혼선을 주지 않도록 다음 사항을 개선했습니다.
1. **지원 모델 조회 카드**: 새로고침(refresh) 버튼을 숨기고, 모델 리스트 대신 해당 프로그램에 설정된 LLM을 사용한다는 안내 메시지 박스를 노출합니다.
2. **신규 에이전트 등록 및 정보 수정 화면**: 하네스 에이전트인 경우 '활성 모델' 필드를 화면에서 숨깁니다.
3. **연결 상태 확인**: 하네스 에이전트인 경우 연결 검증 시 LLM 모델 조회를 필수적으로 진행하거나 검증하지 않으며, API 정상 응답 시 즉시 '연결 성공' 처리합니다.

## 주요 변경사항

### 1. 갱신(Refresh) 버튼 조건부 렌더링 및 안내 메시지 박스 추가
- **파일**: [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
- **변경 사항**: 
  - 에이전트 정보 및 지원 모델 조회 카드 헤더의 새로고침 버튼 렌더링부에 `{agent.agent_type !== 'harness' && (...)}` 조건식을 추가하여 하네스 에이전트일 때는 버튼을 숨겼습니다.
  - `CardContent` 내부 렌더링 시 하네스 에이전트 전용 안내 메시지 박스(*"하네스 에이전트의 경우 해당 프로그램에 설정된 LLM 을 사용합니다."*)를 표출하도록 조건 분기했습니다.
  - 컴포넌트 마운트 시 `fetchModels`를 호출하는 `useEffect`에서 하네스 에이전트일 경우 API를 통한 불필요한 모델 조회/자동 동기화가 일어나지 않도록 제어했습니다.

### 2. 에이전트 등록 및 정보 수정 폼 내 '활성 모델' 필드 노출 제어
- **파일**: [AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx), [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
- **변경 사항**:
  - 두 컴포넌트 모두 정보 입력/수정 영역에서 활성 모델 필드를 `{agentType === 'llm' && (...)}` 조건식으로 감싸, LLM 에이전트 등록/수정 과정에만 모델 설정이 표시되고 하네스 에이전트일 때는 화면에 노출되지 않도록 막았습니다.
  - `AgentSettingsTab.tsx`의 일반 보기 모드(정보 조회 폼)에서도 활성 모델 표시 행에 `{agent.agent_type !== 'harness' && (...)}` 조건을 주어 하네스 에이전트일 때는 표시하지 않도록 했습니다.

### 3. 연결상태 확인 로직 최적화
- **파일**: [AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx), [AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
- **변경 사항**:
  - `handleTestConnection` 함수에서 API 요청 결과 성공 시, `agentType === 'harness'`인 경우 즉시 `selectedModel`을 기본값인 `'hermes-agent'`로 세팅하고 검증 절차를 조기 종료하도록 수정했습니다.
  - 이로써 하네스 에이전트는 원격 서버에서 LLM 모델 목록 조회가 무응답이거나 실패하더라도, 서버 연결 자체가 살아있다면 정상적으로 연결 성공 처리를 완료할 수 있습니다.

## 기대 효과
- **사용자 경험(UX) 개선**: 에이전트 종류(하네스 에이전트 vs LLM API 에이전트)에 따른 기능적 차이를 명확히 인지할 수 있도록 불필요한 입력 요소와 조회 버튼을 차단하고 직관적인 안내를 제공합니다.
- **연결 유연성 확보**: 하네스 에이전트 서버가 `/v1/models` 등의 API 명세를 정확하게 제공하지 않더라도 연결상태를 확인하고 에이전트를 성공적으로 관리할 수 있습니다.
