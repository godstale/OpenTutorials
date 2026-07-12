# GitHub 강좌 목록(courses.json) 캐싱 방지 및 버저닝 오류 해결

## 개요
GitHub 원격 저장소(`OpenTutorials-Browser`)에 등록된 `courses.json` 내 강좌들의 버전이 `1.0.1`로 업데이트되었음에도 불구하고, 로컬 환경에서 지속적으로 이전 버전인 `1.0.0`으로 조회되어 업데이트 배포 뱃지 및 강좌 상세 화면 내 업데이트 버튼이 노출되지 않던 캐싱 문제를 해결했습니다.

## 원인 분석
1. **브라우저 및 네트워크 캐싱**:
   - `https://raw.githubusercontent.com/` CDN 및 로컬 브라우저가 이전 fetch 요청의 캐시된 응답(`1.0.0`)을 그대로 반환함.
2. **Next.js fetch 캐싱**:
   - Next.js의 내장 fetch 캐시 메커니즘으로 인해 최신 `courses.json` 정보가 실시간으로 동기화되지 못함.
3. **오프라인 폴백 하드코딩**:
   - `page.tsx` 내 `useOfflineFallback` 메소드의 하드코딩된 기본 버전이 여전히 `1.0.0`으로 남아있어 네트워크 오프라인 시 버전이 누락되어 보임.

## 변경 사항

### 1. fetch 캐시 방지 처리
- **강좌 검색 화면 (`app/(user)/courses/page.tsx`)**:
  - `fetch` 호출 시 `courses.json` URL 끝에 `?t=${Date.now()}` 타임스탬프 쿼리 파라미터를 동적으로 덧붙여 캐시 적중을 방지.
  - fetch 옵션에 `{ cache: 'no-store' }`를 추가하고, 헤더에 `Cache-Control: no-cache` 및 `Pragma: no-cache`를 설정하여 브라우저 및 CDN 프록시 캐시를 원천 무력화.
- **강좌 상세화면 (`app/(user)/courses/[slug]/client.tsx`)**:
  - 상세화면 내부의 업데이트 감지(`checkUpdate`) fetch 로직에도 동일하게 캐시 무력화 파라미터 및 옵션을 연동하여 항상 원격 저장소의 최신 강좌 버전 명세와 비교하도록 제어.

### 2. 오프라인 폴백 버전 최신화
- `page.tsx`의 `useOfflineFallback` 내 `"iot-communication"` 강좌의 하드코딩된 버전을 `1.0.1`로 갱신하여 예외 상황에서도 버전 정합성을 갖추도록 개선.

## 영향 범위 및 관련 파일
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
- [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
