# 어드민 강좌 삭제 진행 오버레이 조기 종료 및 목록 미동기화 수정 (트러블슈팅)

## 📅 작성일
2026-07-01

## 🏷️ 카테고리
`bugfix`, `admin-portal`, `state-synchronization`

## 🔍 문제 현상
- 어드민 포탈의 **강좌 관리** 화면(`app/admin/courses/page.tsx`)에서 특정 강좌를 삭제 시:
  1. 삭제 중임을 나타내는 블로킹 프로그레스 오버레이(Blocking Overlay)가 잠깐 나타났다가 바로 사라짐.
  2. 삭제 시도가 처리된 후, 강좌 삭제가 완료되었다는 안내도 없이 화면 목록에서 지워지지 않고 그대로 유지됨.
  3. 브라우저를 새로고침(F5)해야만 해당 강좌가 목록에서 사라짐 (DB 단에서는 정상적으로 삭제되었으나 클라이언트 상태에만 미반영).

## 🕵️ 원인 분석

### 1. 비동기 재귀 호출과 `try-finally` 구문의 간섭
기존 `deleteCourse` 함수는 수강 중인 사용자가 존재할 경우(409 Conflict) 강제 삭제 여부를 `window.confirm` 창으로 묻고, 동의 시 내부적으로 자기 자신을 다시 호출(`deleteCourse(course, true)`)하는 구조였습니다.
```typescript
// AS-IS 코드의 문제 부분
if (proceed) {
  deleteCourse(course, true);
  return;
}
```
- JavaScript의 `try-finally` 구문 특성상, `try` 블록 안에서 `return`을 하더라도 `finally` 블록이 강제 실행됩니다.
- `deleteCourse(course, true)`가 재귀 호출되어 내부 비동기 처리를 시작하자마자, 외부 호출의 `finally`에 적힌 `setIsDeleting(false)`가 즉시 호출되어 로딩 오버레이가 꺼져 버렸습니다.

### 2. State 갱신 미반영 및 성공 피드백 누락
- 성공적인 삭제(200 OK)가 완료되었음에도 유저에게 알림을 주는 피드백(`alert`)이 없었습니다.
- 상태 갱신 시 `setCourses(courses.filter(...))`를 사용하여 최신 상태 참조에 대한 클로저 안전성이 확보되지 못하여 드물게 변경 사항이 누락될 수 있는 상태였습니다.

---

## 🛠️ 해결책 및 반영 내용

### 1. 재귀 호출 비동기 제어 (`await` 추가)
재귀 호출 부분을 `await deleteCourse(course, true)`로 명시하여, 내부 재귀 함수가 완료된 후에 외부 함수의 `finally` 블록이 실행되도록 수정했습니다.
```typescript
// TO-BE 코드
if (proceed) {
  await deleteCourse(course, true);
  return;
}
```
이를 통해 강제 삭제를 위한 2차 삭제 요청이 진행되는 중에도 오버레이(isDeleting=true)가 계속 켜져 있으며, 모든 비동기 처리가 완전히 종료된 시점에 안전하게 오버레이가 닫힙니다.

### 2. 최신 State 반영 및 완료 피드백
- `setCourses` 업데이트 시 함수형 업데이트(`prev => prev.filter(...)`)를 적용하여 클로저 캐싱 문제를 해결했습니다.
- 삭제 완료 후 `alert('삭제가 완료되었습니다.')`를 띄워 사용자에게 명시적인 성공 알림을 전송하고, 사용자가 이 팝업을 닫는 시점(OK 클릭)에 화면 목록에서 지워지도록 UX를 보장했습니다.

---

## 📂 관련 파일
- [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
