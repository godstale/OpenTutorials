# 강좌 자동 수강/삭제 정합성 + 에이전트 상세 탭/통계 개선 작업 상세

날짜: 2026-07-05

## 개요
강좌 검색 화면 미구현으로 인해 강좌 등록 시 자동으로 수강 처리가 될 수 있도록 로직을 추가하고, 강좌 삭제 시 관련 수강 정보가 누출 없이 cascade 삭제되도록 개선하였습니다. 또한 에이전트 상세 페이지의 탭 순서를 변경하고 마지막으로 접속했던 탭을 LocalStorage를 활용해 기억하도록 보완하였습니다. 통계 탭에서는 raw 채팅 로그 데이터를 활용해 일별 사용 시간 및 사용 토큰을 버킷 단위로 집계하고, Recharts를 이용해 월별 막대그래프로 시각화하는 기능을 구현하였습니다.

## 상세 구현 내용

### 1. 강좌 업로드 시 자동 수강 신청 연동
- **대상 파일**: [upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
- **작업 상세**:
  - `handleSubmit`을 통해 강좌 패키지 및 모든 하위 강좌 업로드가 정상적으로 성공한 직후, 기존의 `/api/courses/subscribe` API로 수강 신청을 처리하도록 추가하였습니다.
  - 이로 인해 강좌를 새로이 등록한 직후 별도의 UI 조작 없이도 '나의 강좌' 대시보드에서 수강 중인 상태로 즉시 조회됩니다.
  - 수강 신청 도중 예외가 발생하더라도 강좌 자체는 정상 등록된 상태이므로 사용자 흐름에 방해가 되지 않도록 콘솔 로그만 기록하고 정상 완료되도록 처리하였습니다.

### 2. 강좌 삭제 시 수강 정보 cascade delete
- **대상 파일**: [route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/admin/packages/[id]/route.ts)
- **작업 상세**:
  - 기존에는 강좌 패키지를 삭제할 때 스토리지와 강좌 본문만 삭제되고 `user_package_subscriptions`, `user_progress`, `course_package_items`가 삭제되지 않는 정합성 오류가 존재했습니다.
  - DELETE 핸들러를 수정하여, 강좌가 삭제될 때 관련 데이터베이스 매핑 데이터들이 함께 정리되도록 수동 cascade delete 로직을 구현하였습니다.

### 3. 에이전트 상세 탭 순서 변경 및 탭 기억 기능
- **대상 파일**: [[id]/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-agents/[id]/page.tsx)
- **작업 상세**:
  - 사용성 개선을 위해 탭의 기본 노출 순서를 `[통계 - 대화 - 설정]` 순으로 변경하였습니다.
  - `activeTab` 상태를 제어 컴포넌트로 전환하였으며, 탭 클릭 시 `agent-tab-${id}` key를 이용해 LocalStorage에 보관하여 새로고침 시에도 마지막으로 보았던 탭이 활성화 상태를 유지하도록 개선하였습니다.

### 4. 통계 탭 일별 합산 및 월별 Recharts 그래프 기능
- **대상 파일**: [[id]/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-agents/[id]/page.tsx)
- **작업 상세**:
  - 의존성에 `recharts` 패키지를 추가하였습니다.
  - 에이전트의 대화 로그 목록을 가져와 **사용자 로컬 타임존** 기준으로 년/월/일(`YYYY-MM-DD`) 단위를 버킷 키로 하여 일별 사용 시간(duration_ms)과 일별 사용 토큰(input + output)을 합계 집계하였습니다.
  - 4개의 요약 카드(누적 사용 시간 등)도 이 일별 버킷 집계 데이터를 기반으로 일치되도록 재연산하였습니다.
  - 통계 탭 하단에 "일별 사용 현황" 카드 영역을 신설하고, 연/월 단위 이동이 가능한 네비게이터 UI를 배치하였습니다.
  - Recharts의 `BarChart`를 활용하여 일별 사용 시간(분 단위 변환)과 일별 사용 토큰을 직관적인 그래프 형태로 시각화하였으며, 데이터가 없을 경우에는 "이 달에는 기록된 대화가 없습니다."라는 대체 뷰를 노출하도록 설계하였습니다.
