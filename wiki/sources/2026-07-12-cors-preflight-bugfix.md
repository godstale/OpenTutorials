# GitHub 강좌 목록 fetch 시 CORS Preflight(OPTIONS) 오류 해결

## 개요
강좌 검색 화면 및 상세화면에서 원격 GitHub 저장소의 `courses.json` 데이터를 fetch할 때 발생하던 CORS 에러(`Failed to fetch`)를 수정하여 정상적으로 원격 강좌 정보를 호출할 수 있도록 해결했습니다.

## 원인 분석
1. **주소창 직접 접속 vs fetch API**:
   - 브라우저 주소창에 직접 URL(`https://raw.githubusercontent.com/...`)을 입력할 때는 CORS 정책 제약이 적용되지 않아 정상 조회가 가능했습니다.
   - 하지만 로컬 웹 애플리케이션(`http://localhost:3000`)의 클라이언트 스크립트 내부에서 `fetch` 호출을 수행할 때는 동일 출처 정책(Same-Origin Policy)에 의해 CORS 보호막이 작동합니다.
2. **CORS Preflight(OPTIONS) 유발**:
   - 기존의 캐시 우회 코드에 적용되어 있던 `headers` 옵션인 `Cache-Control: no-cache` 및 `Pragma: no-cache` 설정이 포함되어 요청이 전송되었습니다.
   - 브라우저는 기본 안전 헤더 범위를 벗어나는 임의의 캐시 제어용 헤더가 들어있으면, 실제 데이터 요청 전에 서버가 이를 수용하는지 확인하는 `OPTIONS` (Preflight) 사전 조회를 실행합니다.
   - GitHub Raw CDN 서버(`raw.githubusercontent.com`)는 preflight OPTIONS 요청을 올바르게 승인하지 않으므로, 사전 검사 통과 실패로 인해 실제 GET 요청 자체가 전송되지 못하고 `Failed to fetch` 에러가 발생한 것이었습니다.

## 해결 방안
- 타임스탬프 파라미터 `?t=${Date.now()}` 및 `{ cache: 'no-store' }` 만으로도 로컬 브라우저와 CDN 레벨의 캐싱은 완벽히 방지됩니다.
- 따라서 CORS Preflight 요청을 유발하던 커스텀 헤더를 fetch 옵션에서 제거하고 단순 요청(Simple Request) 구조로 변환하여 CORS 차단을 해제하였습니다.

## 수정 대상 파일
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
- [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
