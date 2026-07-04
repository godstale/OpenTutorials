# 강좌 패키지 명칭 통일, 리스트 UI 간소화 및 학습 화면 미리보기 개선

이 문서는 PennyPress 강좌 패키지 명칭의 통일("로드맵 패키지" -> "강좌 패키지"), 어드민 패키지 목록에서 상세 챕터 리스트의 제거 및 패키지명 클릭 시 상세 페이지 이동 링크 구현, 그리고 패키지 [미리보기] 클릭 시 첫 강좌의 학습 플레이어로 이동하며 체크포인트를 생략할 수 있게 하는 등의 사용성 개선 내용을 다룹니다.

---

## 1. ⚙️ 주요 변경 내용 및 구현 내역

### 1) "로드맵 패키지" 용어 일괄 변경 ("강좌 패키지")
- **배경**: 사용자와 어드민 패널 전반에 혼용되거나 중복 사용되던 "로드맵 패키지" 용어를 일괄적으로 "강좌 패키지"로 개편하고 명칭을 통일하였습니다.
- **적용**:
  - `app/admin/courses/page.tsx`, `app/admin/courses/upload/page.tsx`
  - `app/(user)/courses/page.tsx`, `app/(user)/my-courses/page.tsx`
  - `CHANGELOG.md` 및 프로젝트 내 다른 문서(WIKI 등)의 로드맵 패키지 관련 키워드 교체 완료.

### 2) 어드민 패키지 리스트 뷰 간소화 및 링크 연결
- **배경**: 어드민 강좌 패키지 탭의 리스트 항목마다 하단에 소속 챕터(강좌)의 배지 리스트가 모두 노출되어 화면 세로 길이가 과도하게 늘어나는 문제 해결.
- **해결 방안**:
  - `app/admin/courses/page.tsx` 내의 각 패키지 카드 하단에 표시되던 챕터 타이틀 배지 렌더링 코드 영역을 삭제했습니다.
  - 대신 패키지명 타이틀 영역(`<h3>`)에 클릭 이벤트 및 스타일(`hover:text-indigo-600 cursor-pointer hover:underline`)을 부여하여, 클릭 시 즉시 패키지 상세 조회 화면(`/packages/${pkg.slug}`)으로 이동해 챕터를 자세히 볼 수 있도록 기능을 개선했습니다.

### 3) 패키지 [미리보기] 버튼 동작 개선 및 학습 화면 연동
- **배경**: 이전의 패키지 [미리보기] 버튼은 단지 패키지 상세 화면(`/packages/[slug]`)으로만 이동하여 실질적인 강좌 미리보기 기능을 제공하지 못했습니다.
- **해결 방안**:
  - 패키지 [미리보기] 버튼 클릭 시, 해당 패키지에 포함된 첫 번째 강좌의 학습 플레이어(`/learn/${first_course_slug}?preview=true&package=${package_slug}`)로 바로 리다이렉트되도록 개선했습니다.
  - **체크포인트 완전 스킵**: 미리보기 모드(`preview=true`)로 진입할 경우, 학습 화면 TOC의 모든 카드 잠금이 해제(`maxUnlockedIndex`를 마지막 카드로 설정)되고, 다음 카드 이동 시 체크포인트 평가 팝업 및 QnA 요청이 자동으로 무시(Bypass)되도록 처리했습니다.
  - **미리보기 배지 표시**: 미리보기 중임을 인지하기 쉽도록 학습 화면의 헤더 타이틀 영역 우측에 `미리보기 모드` 배지(애니메이션 포함)를 노출하였습니다.

---

## 2. 📂 수정된 주요 파일
- [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx) — 미리보기 모드 Badge 추가, 체크포인트 비활성화, TOC 전체 해제 지원
- [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx) — 용어 변경, 패키지 챕터 리스트 제거, 타이틀 클릭 시 상세 이동, 미리보기 클릭 시 첫 강좌 학습 이동
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx) — 용어 변경
- [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx) — 용어 변경
- [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx) — 용어 변경
- [CHANGELOG.md](file:///C:/Workspace/Projects/PennyPress-FE/CHANGELOG.md) — 용어 변경
- [wiki/log.md](file:///C:/Workspace/Projects/PennyPress-FE/wiki/log.md) — 용어 변경 및 기록 업데이트

---

## 3. 💡 Concepts
- [[CoursePackageNamingStandard]]: 로드맵 패키지 명칭을 강좌 패키지로 명명 규칙 단일화.
- [[AdminPackageListUX]]: 어드민 강좌 패키지 목록에서 하위 요소를 숨겨 레이아웃 피로도를 완화하고 상세 뷰로 라우팅 통합.
- [[PreviewModeFullBypass]]: 미리보기 모드에서 체크포인트 및 카드 해제 제약을 완전 우회하여 원활하게 전체 학습 경로를 검증할 수 있는 환경 제공.
