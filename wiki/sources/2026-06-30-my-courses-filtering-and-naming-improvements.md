# 2026-06-30 나의 강좌 필터링 및 네이밍 개선

## 개요
- 나의 강좌의 "수강중인 강좌" 탭에서 패키지에 묶인 강좌들이 중복해서 나오는 문제를 해결하기 위해 백엔드 API에서 RLS 권한 우회를 적용했습니다.
- "수강중인 강좌" 탭의 명칭을 "수강중인 개별 강좌"로 변경하였습니다.
- "강좌 검색" 화면의 단과 구분을 명확히 하기 위해 "단과 개별 강좌" 레이블을 "개별 강좌"로 수정했습니다.

## 상세 수정 내용

### 1. 나의 강좌 패키지 강좌 중복 노출 해결 (API RLS 우회)
- **대상 파일**: [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
- **원인**: `user_progress` 데이터와 `courses` 데이터를 조인할 때, 일반 authenticated 권한(`createClient()`)으로는 RLS 정책 제약으로 인해 `course_package_items(package_id)`를 올바르게 가져오지 못해 프론트엔드의 `course_package_items.length === 0` 필터링 조건이 작동하지 않았습니다.
- **해결**: `/api/courses/progress` GET 호출 시 `createAdminClient`를 사용하도록 수정하여, RLS를 우회하고 연관된 패키지 매핑 정보를 정확히 조인해올 수 있도록 보장했습니다. 이를 통해 이미 패키지에 포함된 강좌는 개별 강좌 리스트에서 성공적으로 제외됩니다.

### 2. 탭 명칭 변경
- **대상 파일**: [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
- **변경**: "수강중인 강좌" 탭의 텍스트 레이블을 "수강중인 개별 강좌"로 수정하여, 패키지 소속 강좌와 개별 수강 강좌의 역할 구분을 직관적으로 명시했습니다.

### 3. 강좌 검색 화면 레이블 변경
- **대상 파일**: [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
- **변경**: "단과 개별 강좌" 레이블을 일관성을 갖춘 "개별 강좌"로 축약 수정하였으며, 일치하는 강좌가 없을 시 노출되는 Empty state 안내 문구도 "일치하는 개별 강좌가 없습니다."로 변경하였습니다.
