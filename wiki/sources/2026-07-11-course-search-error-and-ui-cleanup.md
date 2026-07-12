# 강좌 검색 목록 로딩 에러 해결 및 UI/UX 정교화 작업

## 개요
오프라인 로컬 환경 또는 네트워크 지연으로 인해 GitHub의 `courses.json` 원격 강좌 데이터베이스 패키지 목록을 페치하지 못할 때 발생하는 콘솔 에러 및 예외 차단 조치를 수행했습니다. 또한 화면 구성의 시각적 요소 중 불필요한 연동 배너를 삭제하고 타이틀 및 사이드바 내 아이콘 메타데이터를 일체화하여 화면을 정교화했습니다.

## 변경 사항

### 1. 원격 강좌 연동 예외 처리 개선
- **기존 방식**:
  - `fetch` 성공 여부(`!res.ok`) 체크 시 `throw new Error('온라인 강좌 목록을 가져오는 데 실패했습니다.')`로 예외를 강제 발생시킨 후, `catch`문 내에서 `console.error`로 예외 객체 전면 노출.
  - 이로 인해 Next.js 렌더링이나 브라우저 콘솔에서 빨간색 에러 로그 및 개발 단계의 에러 오버레이 팝업 등이 뜨는 현상 유발.
- **개선 방식**:
  - `fetch` 실패 또는 예외 발생 시 에러를 Throw하는 대신 `console.warn`을 통해 경고성 로그만 출력한 뒤 즉시 로컬 Mock 폴백 목록(`useOfflineFallback()`)을 로드하도록 제어.
  - GitHub 원격 `courses.json` 내 `downloadUrl`이 상대 경로인 경우에도 로컬 도메인이 아닌 GitHub 원격 저장소(`https://raw.githubusercontent.com/...`) 절대 URL로 보간되도록 `handleDownloadCourse` 내 경로 탐색 로직 강화.

### 2. 강좌 검색 UI 정교화 및 배너 제거
- **GitHub 저장소 연동 배너 제거**:
  - 강좌 검색 화면 상단에 반복적으로 노출되던 "GitHub 강좌 저장소 연동" 안내 카드 삭제.
- **아이콘 일체화**:
  - 강좌 검색 화면 타이틀 아이콘: `Compass` -> `Search` (검색 아이콘)
  - 사이드바 내 "강좌 검색" 메뉴 아이콘: `GraduationCap` -> `Search` (검색 아이콘)
  - `lib/constants/routes.ts` 내 사이드바 아이콘 메타데이터 역시 `Search` 및 `Wrench`로 최신화 동기화.

## 영향 범위 및 관련 파일
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
- [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx)
- [lib/constants/routes.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/constants/routes.ts)
