# 설계: 강좌 자동 수강/삭제 정합성 + 에이전트 상세 탭/통계 개선

날짜: 2026-07-05

## 배경

- 강좌 검색(`/courses`) 화면이 "Coming Soon" placeholder로 전환되면서, 사용자가 강좌를 수강 상태로 전환할 UI 진입점이 사라졌다. 강좌 관리(`/courses/manage`) 화면에서 관리자가 강좌를 등록해도 수강 처리가 되지 않는다.
- 강좌 관리에서 패키지를 삭제할 때 확인창은 "수강 중인 사용자의 진행 정보가 완전히 삭제됩니다"라고 안내하지만, 실제 백엔드는 `user_package_subscriptions`/`user_progress`/`course_package_items`를 정리하지 않아 안내와 동작이 불일치한다.
- 에이전트 상세 화면의 탭 순서가 [대화-통계-설정]이며, 마지막으로 본 탭이 기억되지 않는다.
- 통계 탭의 "누적 사용 시간"/"누적 사용 토큰"은 전체 로그를 단순 합산한 값이며, 일 단위 추이를 볼 수 있는 그래프가 없다.

## A. 강좌 자동 수강 등록 + 삭제 시 cascade

### A-1. 자동 수강

- 대상 파일: `app/(user)/courses/manage/upload/page.tsx` (`handleSubmit`)
- 패키지 등록(`/api/admin/courses/upload?type=package`) 및 모든 하위 강좌 업로드(`/api/admin/courses/upload?type=course`)가 전부 성공한 직후, 기존 `/api/courses/subscribe` (`app/api/courses/subscribe/route.ts` `POST`)를 `{ package_id: packageId }`로 호출한다.
- 이 API는 이미 다음을 처리한다: `user_package_subscriptions` upsert, 하위 강좌 전체에 대한 `user_progress` upsert, 기본 AI 튜터(`is_ai_tutor: true`) 자동 배정. 별도 로직 추가 불필요, 재사용만 한다.
- 등록 경로는 현재 ZIP 업로드 하나뿐이다(관리 화면의 "GITHUB 에서 추가" 섹션은 `github_url` 필드 기반 표시 UI만 있고 실제 등록 플로우는 아직 없음). 추후 GitHub 등록 플로우가 추가되면 동일한 `/api/courses/subscribe` 호출을 재사용해 동일 동작을 보장한다.
- 실패 처리: 구독 호출이 실패해도 강좌 등록 자체는 이미 완료된 상태이므로, 콘솔에 오류만 남기고 기존 "등록 완료" 성공 흐름(라우팅 등)을 막지 않는다.

### A-2. 삭제 cascade

- 대상 파일: `app/api/admin/packages/[id]/route.ts` (`DELETE`)
- 기존 courses/storage 정리 로직 뒤에 다음을 추가로 삭제한다:
  - `course_package_items` where `package_id = id`
  - `user_package_subscriptions` where `package_id = id`
  - `user_progress` where `course_id IN courseIds` (기존에 조회해 둔 `courseIds` 재사용)
- 확인창 문구는 변경하지 않는다(이미 정확한 안내를 하고 있었음 — 동작만 문구에 맞춘다).

## B. 에이전트 상세 탭 순서 + 마지막 탭 기억

- 대상 파일: `app/(user)/my-agents/[id]/page.tsx`
- `TabsList`/`TabsContent` 순서를 통계 → 대화 → 설정으로 재배치한다.
- `Tabs`를 비제어(`defaultValue="chat"`) 방식에서 제어 컴포넌트로 전환:
  - `id`는 `use(params)`로 렌더 초기부터 동기적으로 확보 가능하므로, `useState<string>(() => localStorage.getItem(`agent-tab-${id}`) ?? 'statistics')`로 초기값을 설정한다.
  - `<Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); localStorage.setItem(`agent-tab-${id}`, v); }}>`
  - 저장된 값이 없는 최초 방문 시 기본값은 새 순서의 첫 탭인 `statistics`.

## C. 통계 탭 — 일별 합산 + 월별 그래프

- 대상 파일: `app/(user)/my-agents/[id]/page.tsx`의 `AgentStatisticsTab`
- 신규 의존성: `recharts` (React 19 호환, 현재 프로젝트에 차트 라이브러리 없음).
- 일별 집계:
  - 각 `ChatLog.timestamp`(ISO 문자열)를 `new Date(...)`로 파싱한 뒤 **로컬 타임존 기준** 연/월/일로 버킷 키(`YYYY-MM-DD`)를 만든다(UTC 슬라이싱 대신 로컬 날짜 사용 — 사용자의 실제 하루 기준과 일치시키기 위함).
  - `Map<dateKey, { ms: number; tokens: number }>`로 `duration_ms`, `input_token_size + output_token_size`를 합산한다.
  - 기존 "누적 사용 시간"/"누적 사용 토큰" 카드 값은 이 일별 버킷의 합계로 재계산한다(최종 숫자는 기존과 동일, 계산 기반만 일별 집계로 통일 — 그래프와 동일한 소스 사용).
- 월별 그래프:
  - 상태: `viewMonth = { year, month }`, 초기값은 현재 연/월.
  - 네비게이터 UI: "◀ 2026년 7월 ▶" 형태, 다음 달 버튼은 `viewMonth`가 현재 연월 이상이면 비활성화(미래 데이터 없음).
  - 선택된 달의 1일부터 말일까지 모든 날짜에 대해 배열을 만들고(데이터 없는 날은 0), `recharts`의 `BarChart` 2개로 표시:
    - "일별 사용 시간" (ms → 분 단위로 변환, 툴팁에는 `formatTotalDuration`류 헬퍼로 "n분 n초" 표시)
    - "일별 사용 토큰"
  - 선택한 달에 로그가 전혀 없으면 차트 대신 "이 달에는 기록된 대화가 없습니다" 빈 상태 문구를 표시한다.
- 레이아웃: 기존 4개 통계 카드 + "강좌 할당 통계" 카드 아래에 "일별 사용 현황" 카드를 새로 추가한다. 기존 카드 레이아웃/문구는 변경하지 않는다.

## 범위 밖 (Out of scope)

- 강좌 검색(`/courses`) 화면 자체의 재구현은 이번 작업 범위가 아니다.
- GitHub 기반 강좌 등록 플로우 신규 구현은 범위 밖이다(추후 구현 시 A-1의 구독 호출을 그대로 재사용하면 됨).
- 채팅 로그의 토큰 계산 방식(`estimateTokenSize` 휴리스틱) 자체는 변경하지 않는다.
