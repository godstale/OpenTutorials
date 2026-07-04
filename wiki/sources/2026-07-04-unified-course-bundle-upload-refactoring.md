# PennyPress: 통합 번들(.zip) 기반 강좌 업로드 리팩토링 및 클라이언트 사전 검증 도입

## 📅 작성일
2026-07-04

## 🏷️ 카테고리
`refactoring`, `admin-portal`, `file-upload`, `validation`

## 🔍 문제 현상 및 기획 배경
- **기존 방식의 비효율성**: 기존에는 강좌 패키지를 등록하기 위해 하위 강좌 ZIP 파일들(N개)과 매니페스트 JSON 파일을 각각 분리하여 업로드해야 했음. 이로 인해 사용자가 실수로 파일을 빠뜨리거나 매니페스트 파일의 형식이 맞지 않을 경우 업로드 도중 에러가 나거나, 등록 후 데이터 불일치 상태가 유발되었음.
- **서버 검증의 한계**: 파일 용량이 큰 상태에서 업로드가 다 완료된 후에야 서버 단에서 오류를 감지하여 응답하므로, 사용자는 대기 시간 낭비 및 트러블슈팅의 불편을 겪음.

## 🛠️ 해결책 및 반영 내용

### 1. 단일 통합 번들 ZIP 포맷 명세 정립
- 여러 ZIP 파일과 매니페스트, 썸네일을 하나의 통합 번들 ZIP 파일(`*.zip`)로 패키징하는 새로운 규격을 도입함.
- `package-manifest.json` 파일이 루트에 필수 포함되며, 하위 강좌 ZIP 파일들은 `courses/` 디렉토리 아래에 slug명과 일치하게 배치되어야 함.
- 자세한 구조는 [course-bundle-migration-guide.md](file:///C:/Workspace/Projects/PennyPress-FE/docs/course-bundle-migration-guide.md) 지침서로 문서화.

### 2. 브라우저 사이드 사전 유효성 검사 (Pre-validation) 도입
- `jszip` 라이브러리를 추가하여, 사용자가 번들 파일을 선택/드래그 시 업로드 전 브라우저상에서 전체 무결성 검증을 진행함.
- **검증 프로세스**:
  1. 루트에 `package-manifest.json` 파일 존재 및 JSON 파싱 문법 검사.
  2. 매니페스트에 정의된 하위 강좌 slug가 `courses/${slug}.zip` 형태로 실제로 ZIP 안에 들어있는지 매핑 검사.
  3. 각 하위 강좌 ZIP 파일을 임시로 풀어 내부 루트에 `config.json`과 `wiki.md`가 포함되어 있는지 검사.
  4. `config.json` 내 `toc` 목차에 정의된 최하위 강의 `filename` 목록과 `cards` 디렉토리 하위의 파일 목록이 1:1로 매핑되는지 대조.
- 사전 검증을 완벽히 통과해야만 **[강좌 등록]** 버튼이 활성화되도록 제어하여, 서버 에러 발생 가능성을 원천적으로 차단함.

### 3. 서버 단 업로드 API 리팩토링
- 단일 번들 ZIP을 Multipart로 전달받아 처리하도록 `app/api/admin/courses/upload/route.ts`를 리팩토링.
- `type` 쿼리 파라미터(`?type=package` 또는 `?type=course`)에 따라 분기 처리를 하도록 구현하여 단일 라우트 내에서 패키지 생성과 개별 강좌 등록을 선택적으로 일괄 처리함.

### 4. 마이그레이션 예시 및 가이드 마련
- 강좌 생성 프로젝트(Course Generator) 및 개발자가 사용할 수 있는 Node.js 기반 `archiver` 활용 패키징 셸 스크립트 작성 예시 제공.
- 테스트용 IoT 통신 강좌 구조([docs/iot-communication/](file:///C:/Workspace/Projects/PennyPress-FE/docs/iot-communication)) 및 ZIP 번들을 직접 구축하여 검증 완료.

### 5. Vercel Payload Limit (4.5MB) 및 Gateway Timeout 해결을 위한 분할 업로드
- **문제 현상**: 대형 강좌 번들 업로드 시 Vercel Serverless Function 하드 리밋(4.5MB Payload)에 걸려 `413 Payload Too Large` 에러가 평문으로 리턴되고, 이를 클라이언트가 `.json()`으로 파싱하다가 `Unexpected token 'R'` JSON 에러가 발생하는 문제 발견.
- **해결 아키텍처**:
  - 클라이언트가 이미 `JSZip`을 통해 압축 번들을 해석하여 메모리에 각 데이터를 확보하고 있음을 적극 활용.
  - **1단계 (`type=package`)**: 패키지 메타데이터(JSON) 및 패키지 썸네일(Blob)만 가볍게 전송하여 패키지(`course_packages`)를 업서트하고 UUID를 생성. (용량 약 수십 KB 미만)
  - **2단계 (`type=course`)**: 하위 강좌 ZIP 파일을 하나씩 추출하여 개별 루프로 전송. 각 챕터/하위 강좌 ZIP은 일반적으로 1MB 수준으로 4.5MB 리밋을 무난히 우회.
  - **효과**: Vercel의 Payload Limit(4.5MB) 및 Gateway Timeout(10초) 문제를 완벽히 해결함과 동시에, 각 챕터가 업로드될 때마다 진행률(%)과 상태 텍스트를 디테일하게 업데이트하도록 UX 개선.

---

## 📂 관련 파일
- [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
- [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
- [docs/course-bundle-migration-guide.md](file:///C:/Workspace/Projects/PennyPress-FE/docs/course-bundle-migration-guide.md)
- [docs/iot-communication/](file:///C:/Workspace/Projects/PennyPress-FE/docs/iot-communication)
- [package.json](file:///C:/Workspace/Projects/PennyPress-FE/package.json)
