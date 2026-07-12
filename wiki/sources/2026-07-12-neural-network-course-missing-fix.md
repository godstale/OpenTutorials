# 강좌 검색 화면 내 "신경망과 LLM 개론" 강좌 미노출 버그 해결

## 개요
로컬 및 온라인 강좌 패키지 목록 연동 시, 로컬 파일 시스템에는 이미 존재하지만 원격 GitHub 저장소(`courses.json`)에 포함되어 있지 않던 "신경망과 LLM 개론"(`neutral-network-and-llm`) 강좌가 강좌 검색 화면에서 유실되던 문제를 해결했습니다.

## 원인 분석
1. **GitHub 의존적 검색 목록**:
   - 강좌 검색 화면(`CoursesPage`)은 원격 또는 로컬 오프라인 fallback을 통해서 `onlineCourses` 상태만을 렌더링하고 있었습니다.
   - 하지만 GitHub 원격 `courses.json`에는 "아두이노 IoT 프로젝트 마스터 클래스" 단 1개만 정의되어 있었고, 오프라인 fallback 함수(`useOfflineFallback()`) 역시 아두이노 강좌 1개만 하드코딩되어 정의되어 있었습니다.
2. **로컬 패키지 및 원격 패키지 분리**:
   - "신경망과 LLM 개론" 강좌는 로컬 `public/courses/neutral-network-and-llm` 디렉토리에 정상 존재했으나, 검색 목록에 정의되지 않아 UI 상에 로드되지 않고 있었습니다.
   - 이로 인해 로컬 가져오기(import-local) API가 구현되어 있음에도 불구하고 검색 결과가 없어 사용자가 강좌 등록/수강을 진행할 수 없는 상태였습니다.

## 변경 사항

### 1. 강좌 검색 화면 (`app/(user)/courses/page.tsx`)
- **`useOfflineFallback` 함수 최신화**:
  - 오프라인/예외 폴백 상황에 "신경망과 LLM 개론" 강좌 메타데이터를 추가하여 로컬에서 온디바이스로 오프라인 사용 시 정상적으로 노출 및 임포트될 수 있게 보완했습니다.
- **`ensureRequiredCourses` 헬퍼 함수 추가 및 연동**:
  - 원격 GitHub fetch가 성공하여 최신 `courses.json`을 가져왔더라도, 해당 JSON 리스트에 "신경망과 LLM 개론" 강좌가 없는 경우 이를 목록의 끝에 보장하여 병합해주는 `ensureRequiredCourses` 필터 로직을 결합했습니다.

### 2. 강좌 상세 화면 (`app/(user)/courses/[slug]/client.tsx`)
- **`checkUpdate` 내 fallback 정보 병합**:
  - 강좌 상세 화면에서 버전 업데이트 여부를 감지할 때, 원격 `courses.json`에 "신경망과 LLM 개론" 데이터가 누락되어 있더라도 에러나 빈 객체가 되지 않도록 기본 버전 v1.0.0 및 관련 정보를 동일하게 주입하여 안전하게 세부 조회를 마칠 수 있게 변경했습니다.

## 영향 범위 및 관련 파일
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
- [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
- [wiki/log.md](file:///C:/Workspace/Projects/OpenTutorials/wiki/log.md)
