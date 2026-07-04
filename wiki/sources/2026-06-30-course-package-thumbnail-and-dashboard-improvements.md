# 강좌/패키지 썸네일 및 대시보드 학습 현황 개선

## 1. 개요
강좌 및 패키지의 비주얼 시각화를 위해 개별 강좌 및 패키지에 **썸네일 이미지 및 사전 정의(predefined) 아이콘**을 등록하는 기능을 구현하였습니다. 또한, 사용성이 떨어지던 사용자 대시보드의 "구독 중인 서비스" 영역을 실제 학습이 활발히 진행 중인 강좌를 시각적으로 보여주는 **"학습 중인 강좌"** 영역으로 전면 개선하였습니다. 통계 카드 내 "수강중인 과목" 개수도 사용자의 수강 현실에 맞춰 개별 강좌와 강좌 패키지의 합산으로 정교화하였습니다.

---

## 2. 세부 구현 사항

### A. 강좌 관리 > 강좌 및 패키지 썸네일/아이콘 등록 자동화
- **개별 강좌 등록 시 썸네일/아이콘 추가**:
  - UI(`/admin/courses/upload`)의 강좌 번들 업로드 목록에서 각 ZIP 파일 행마다 썸네일 이미지 파일을 업로드하거나, 플랫폼 사전 정의(predefined) 아이콘 중 하나를 선택할 수 있도록 구현했습니다.
  - 사전 정의된 아이콘으로는 `bot`(AI 에이전트), `brain`(LLM), `cpu`(하드웨어), `terminal`(프롬프트), `sparkles`(생성형 AI), `workflow`(자동화), `zap`(트리거), `code`(개발), `megaphone`(마케팅), `palette`(디자인), `database`(데이터베이스), `cloud`(클라우드), `lock`(보안), `globe`(웹), `smartphone`(모바일), `line-chart`(비즈니스 분석), `git`(버전 관리), `message-square`(메시징), `layers`(아키텍처), `gamepad`(게임), `scale`(윤리/법률), `graduation-cap`(이론) 등이 대폭 확장되어 총 23개 분야로 제공됩니다.
  - 업로드 실행 시 `FormData`에 ZIP 파일(`file`)과 함께 이미지(`thumbnail`) 또는 선택된 아이콘 ID(`selectedIcon`)를 실어 `/api/admin/courses/upload` API로 전송합니다.
  - 썸네일 이미지도 없고 아이콘도 지정하지 않은 경우, 기본 일반 아이콘(`icon:book`)이 자동으로 등록 및 지정됩니다.
- **강좌 패키지 ZIP 번들 등록 기능**:
  - 패키지 자체의 썸네일 이미지와 `package-manifest.json`을 하나로 묶은 ZIP 번들(`package-bundle.zip`)로 등록할 수 있습니다.
  - ZIP 파일 내에 썸네일이 동봉되지 않더라도 `package-manifest.json` 내 `"thumbnail"` 필드에 `"icon:megaphone"`, `"icon:bot"` 처럼 정의해 두면, 별도의 이미지 리소스 업로드 필요 없이 플랫폼 아이콘으로 자동 연동됩니다. 썸네일 지정이 생략되면 패키지 역시 기본 일반 아이콘(`icon:book`)으로 자동 등록됩니다.

### B. 공통 CourseIcon 컴포넌트 구현 및 렌더링 통합
- 공통 렌더링 헬퍼 컴포넌트인 [components/ui/course-icon.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/ui/course-icon.tsx)를 신설했습니다.
- 이 컴포넌트는 `thumbnail` 값을 식별하여 `icon:` 접두사로 시작하는 경우 매칭되는 Lucide 아이콘 컴포넌트를 렌더링하고, 이미지 주소(http/https 등)인 경우 `img` 태그로 렌더링하며, 값 자체가 없는 경우 기본 일반 아이콘(`BookOpen`)을 렌더링합니다.
- 대시보드, 강좌 검색 리스트, 단과 강좌 및 패키지 상세 보기, 어드민 목록 조회 화면 등 썸네일이 필요한 모든 영역의 렌더링 코드를 이 컴포넌트로 일원화했습니다.

### C. 사용자 대시보드(Dashboard) UX 개선
- **구독 중인 서비스 ➡️ 학습 중인 강좌**:
  - 기존의 미사용 호스팅 구독 목록("구독 중인 서비스") 영역을 들어내고, 사용자가 현재 수강 신청하여 학습 진행 중(`completed = false`)인 강좌들을 썸네일/아이콘과 함께 카드 형태로 렌더링하는 **"학습 중인 강좌"** 패널을 구축했습니다.
  - 각 학습 중 강좌 카드에는 강좌 타이틀, 요약 설명, 학습 최대 달성률(Progress Bar 및 퍼센티지), 전체 10단계 카드 기준 학습 진도 단계, 그리고 클릭 시 해당 강좌 수강 플레이어로 다이렉트 이동하는 `"이어서 학습"` 버튼을 배치했습니다.
- **수강중인 과목 개수 계산 정밀화**:
  - 통계 요약 카드("수강중인 과목")의 수치가 단순히 전체 강좌 개수로 계산되던 한계를 수정하여, **`수강중인 개별 강좌 수` + `수강중인 강좌 패키지 수`**의 합산 값으로 연동 및 표시되도록 DB 쿼리 및 연동 코드를 개선했습니다.

---

## 3. 관련 파일 변경 내역
- [components/ui/course-icon.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/ui/course-icon.tsx) — 사전 정의 아이콘 및 이미지 썸네일 통합 렌더링 컴포넌트 (신설, 23개 기술 학습 분야)
- [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx) — 수강 통계 산출 및 학습 중인 강좌 UI 패널 렌더링 변경
- [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx) — 강좌/패키지 리스트 내 CourseIcon 통합
- [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx) — 강좌 상세 내 CourseIcon 통합
- [app/(user)/my-courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/client.tsx) — 나의 강좌 상세 내 CourseIcon 통합
- [app/(user)/packages/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/packages/[slug]/client.tsx) — 패키지 상세 내 CourseIcon 통합
- [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx) — 어드민 목록 조회 내 CourseIcon 통합
- [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx) — 강좌 개별 썸네일/아이콘 선택 및 패키지 ZIP/JSON 통합 드롭 영역 UI 구현
- [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts) — Multipart 썸네일 파일 업로드 또는 selectedIcon의 DB `icon:ID` 연동 및 디폴트 폴백
- [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/upload/route.ts) — Multipart 패키지 ZIP 내 썸네일 파싱 업로드 또는 manifest 내 `icon:ID` 연동 및 디폴트 폴백
- [GUIDE_THUMBNAIL_INTEGRATION.md](file:///C:/Workspace/Projects/PennyPress-FE/GUIDE_THUMBNAIL_INTEGRATION.md) — 외부 Agent 강좌 생성기(PennyPress-Bundler) 연동을 위한 규격 지침서 (썸네일/아이콘 통합)
