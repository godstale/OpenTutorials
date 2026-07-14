# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> main에 반영(머지)되는 시점마다 이 파일에 버전 항목을 추가/갱신합니다. (참고: `wiki/log.md`는 작업 단위 상세 로그, 이 파일은 릴리즈 단위 요약입니다.)

## [Unreleased]

## [v0.3.9] - 2026-07-14

### 강좌 렌더링 보완 및 오프라인 폴백 제거 (v0.3.9)

단일 카드를 갖는 챕터의 렌더링 오류를 수정하고, 하드코딩된 오프라인 폴백 강좌 및 데이터 동기화 주입 로직을 전면 제거하여 로컬 DB 및 동적 강좌 조회 데이터를 정비한 릴리즈.

#### Added
- 단일 카드를 갖는 챕터(자식 챕터가 없는 경우)의 커리큘럼 렌더링 보완 ([client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx), [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)).

#### Changed
- 하드코딩된 오프라인 폴백 강좌 목록 및 보정 주입 로직 전체 제거 ([manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx)).
- 로컬 데이터베이스(`db.json`) 내 "신경망과 LLM 개론" 강좌 패키지 및 수강 데이터 일괄 제거.

#### Fixed
- 자식이 없는 챕터(예: 강좌 소개 등) 수강 화면 및 목록 팝업에서 커리큘럼 카드가 올바르게 노출되지 않던 렌더링 버그 수정.

---

## [v0.3.8] - 2026-07-13

### AI 튜터 QnA 컨텍스트 확장 및 하네스 에이전트 전송 최적화 (v0.3.8)

AI 튜터와의 QnA 시 전체 맥락 파악이 부족했던 문제를 해결하기 위해 시스템 프롬프트에 강좌 전체 목차(TOC) 정보를 주입하고, 하네스 에이전트의 불필요한 카드 내용 중복 전송을 개선한 릴리즈.

#### Added
- LLM 에이전트(로컬/클라우드) 시스템 프롬프트에 강좌 전체 목차(TOC) 정보 주입 로직을 추가하여 AI 튜터가 전체적인 단원 뼈대와 흐름을 함께 파악하도록 기능 향상 ([client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx)).

#### Changed
- 하네스 에이전트(Hermes)의 QnA 토큰 효율성 극대화를 위해 첫 질문이나 다운로드 성공 전 카드가 바뀌었을 때만 카드 본문을 전송하도록 조건부 전송 로직 적용 및 토큰 시뮬레이션 계산 로직 동기화.
- 강좌 `02-neural-network-text.mdx` 및 통합 리소스 `resource.md`에 손글씨 인식에 사용되는 "총 4개의 은닉층" 정보를 명시적으로 기입하여 AI 튜터가 오류 없이 구조 사양을 파악하게 개선.

---

## [v0.3.7] - 2026-07-13

### 다국어(i18n) 전면 확장 및 강좌 목록 레이아웃 개선 (v0.3.7)

강좌 관리·검색·수강 화면 전반의 하드코딩된 인라인 문자열을 `useLanguage()` 훅 기반 다국어 처리로 전환하고, 강좌 번들 목록의 UI 배치를 개선한 릴리즈.

#### Added
- `AdminCoursesPage`(`app/(user)/courses/manage/page.tsx`) 내 하드코딩된 한국어/영어 인라인 문자열 전체를 `t()` 함수로 전환
- 다국어 리소스(`ko.ts` / `en.ts`)에 신규 번역 키 63개 이상 추가 (Course Management 섹션 대폭 확장)
  - 강좌 카드 라벨: `lblCourseBundleList`, `lblSubCourseCount`, `lblAssignedAgent`, `lblSequential`, `lblCheckpointForce` 등
  - 업데이트·삭제 플로우: `lblConfirmUpdate`, `lblDownloadingZip`, `lblDeletingCourse`, `lblDeleteFailed` 등
  - 매니페스트 편집: `lblEditManifest`, `lblManifestDropClick`, `lblZipRegistered`, `lblUpdateComplete` 등
  - Orphan 정리: `lblCheckingOrphans`, `lblOrphanCount`, `lblOrphanCleanSuccess`, `lblCleanSelected` 등
- 강좌 검색 화면(`app/(user)/courses/page.tsx`) 및 수강 화면(`app/(user)/my-courses/page.tsx`) 추가 다국어 적용

#### Changed
- 강좌 번들 목록 UI 배치 변경 — 카드 그리드 레이아웃 및 상세 보기 패널 위치 조정으로 가독성 향상
- 다국어 동적 변수 처리 패턴 통일: `t('key').replace('{placeholder}', value)` 체이닝 방식 적용
- `db.json` 로컬 데이터 갱신 (강좌 메타데이터 동기화)

---

## [v0.3.6] - 2026-07-12

### 다국어(ko/en) 지원 및 라이선스 정보 수정 (v0.3.6)

전체 레이아웃 및 설정 화면에 다국어(한국어/영어) 선택 및 적용 기능을 구현하고, Next.js Hydration Mismatch 오류를 동적 임포트(dynamic SSR: false)로 해결하였으며, 강좌 기본 라이선스 정보 표기 오류(All Rights Reserved -> CC-BY-NC-4.0)를 로컬 DB와 UI 컴포넌트에 반영하여 바로잡은 릴리즈.

#### Added
- 다국어 상태 관리를 위한 `LanguageProvider` 및 `useLanguage` 훅 구현 ([LanguageContext.tsx](file:///C:/Workspace/Projects/OpenTutorials/lib/context/LanguageContext.tsx))
- 한글 및 영어 다국어 리소스 정의 파일 추가 ([ko.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/ko.ts), [en.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/en.ts))
- UI 설정 화면에 언어 선택(한국어 / 영어) 옵션 추가 ([ui/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx))

#### Changed
- 사이드바 메뉴 텍스트 및 레이아웃 요소들에 다국어 번역 리소스 적용
- 강좌 메타데이터 라이선스 기본 폴백 값을 `all-rights-reserved`에서 `CC-BY-NC-4.0`으로 변경 및 오프라인 대체 강좌 리스트 데이터 반영
- 강좌 번들 매니페스트 프로토콜 스펙에 `language` 필드를 추가하여 다국어 강좌 필터링 기반 마련 (v1.2.1)
- 로컬 DB(`db.json`) 내 등록 강좌들의 라이선스 데이터 수정 및 중복 필드 제거

#### Fixed
- `LanguageProvider` 상태 주입 시점에 발생하던 Next.js/React 18 Hydration Mismatch 에러를 `UserSidebar` 및 `UserHeader` 컴포넌트의 비동기 동적 SSR 비활성화(`ssr: false`)로 해결
- 강좌 상세 정보 팝업 내 라이선스 파일(LICENSE) 존재 여부를 서버에서 동적 검증하고, 존재하지 않는 경우 크리에이티브 커먼즈(CC) 공식 사이트 리다이렉트 링크로 폴백 처리하여 404 에러 방지

---

## [v0.3.5] - 2026-07-11

### 강좌 검색 화면 내 상세 정보 및 목차(TOC) 팝업 다이얼로그 구현 (v0.3.5)

사용자가 강좌 검색 시 개별 강좌 카드를 클릭해 상세 스펙과 커리큘럼(목차)을 직관적으로 탐색하고, 팝업 내에서 즉시 수강 신청, 다운로드 또는 학습 개시 동작을 수행할 수 있도록 편의성을 극대화한 릴리즈.

#### Added
- 강좌 검색 카드 클릭 시 강좌에 내포된 소개글, 카테고리, 대상 연령, 메타 태그 등을 한눈에 볼 수 있는 상세 정보 팝업 다이얼로그(Dialog) 구현
- Shadcn UI의 Accordion 컴포넌트를 연동하여 강좌 내 등록된 상세 목차(TOC: Chapter 및 하위 Lesson 제목/설명)를 접고 펼쳐가며 브라우징하는 계층형 뷰어 영역 추가
- 강좌 설치/수강 상태를 실시간 연계하여 다이얼로그 내부에서도 "학습 시작하기", "수강 신청하기", "강좌 다운로드"가 즉시 작동하도록 조작 버튼 구현 및 로딩 피드백 반영

#### Changed
- 팝업 내용이 많아질 때 다이얼로그가 화면 높이 크기(Viewport)를 벗어나는 문제를 방지하기 위해 최대 높이를 `85vh`로 제한하고, 상하단 배너/푸터는 고정(shrink-0)한 채 중간 본문 영역만 부드럽게 단일 스크롤(`flex-1 overflow-y-auto`)되도록 스크롤 레이아웃 최적화
- 로컬 미설치 신규 강좌의 경우 목차 영역에 "다운로드 시 확인 가능" 안내 텍스트가 표시되도록 처리
- 공통 및 로컬 `CoursePackage` 인터페이스에 `toc` 필드 타입을 추가하여 TypeScript 빌드 및 컴파일 안정성 확보

---

## [v0.3.4] - 2026-07-10

### 학습 화면 진입 및 카드 이동 시 대화 히스토리 자동 초기화 (v0.3.4)

로컬 LLM 에이전트(Ollama, LM Studio 등) 연동 시 긴 프롬프트 맥락으로 인해 대화 응답이 극도로 느려지거나 타임아웃되는 현상을 방지하기 위해, 강좌 첫 진입 및 카드 이동 시 대화 맥락을 자동으로 초기화하고 백그라운드 시스템 점검 메시지를 DB 이력에서 영구 격리한 릴리즈.

#### Added
- 강좌 상세 수강/학습 화면 진입 및 목차 내 카드(단원) 간 이동 시 UI 대화창과 데이터베이스의 누적 대화 기록(`user_external_agent_messages`)을 자동으로 초기화(`DELETE` 요청)하는 자동 리셋 기능 도입

#### Changed
- 강좌 진입 시 백그라운드로 작동하는 자동 `[시스템 점검]` 통신 및 답변 내역이 DB 대화 이력에 남지 않도록 차단하여, 사용자가 첫 질문을 던질 때 불필요한 시스템 안내 텍스트가 대화 히스토리에 포함되는 문제 차단

---

## [v0.3.3] - 2026-07-09

### AI 튜터 고도화, 자동 컨텍스트 요약 및 대화 표(Table) 렌더링 구현 (v0.3.3)

AI 튜터와의 대화 경험을 극대화하기 위해 자동 요약(컨텍스트 압축), 로컬 LLM 에이전트 스펙 최적화, 마크다운 표 파싱 렌더링 및 3단 컬럼 너비 리사이즈 기능을 도입하고 다양한 진도율/학습 완료 로직 버그를 해결한 릴리즈.

#### Added
- AI 에이전트의 최대 토큰 임계값에 임박할 때 이전 대화를 자동으로 요약 및 압축하는 스마트 컨텍스트 보존 기능 및 전용 DB API 연동
- 에이전트 설정 화면에 자동 압축 시작 임계값(Compression Threshold, 50% ~ 80%) 사용자 설정 옵션 추가
- 에이전트 답변 내 마크다운 표(`| ... |`)를 zinc 테마의 세련되고 반응형 가로 스크롤이 가능한 HTML Table로 파싱해 렌더링하는 전용 테이블 파서 구현 및 뷰 적용
- 학습 화면의 목차(TOC) 및 AI 튜터 패널 너비를 마우스/포인터 드래그로 실시간 조절 가능한 3단 컬럼 리사이저 기능(PointerEvent 기반) 및 localStorage 설정 영속화
- 설정 > UI 화면 내 너비 설정을 기본값으로 돌리는 [너비 초기화] 기능 추가
- 에이전트 대화 말풍선 하단에 전송 시각(HH:MM) 표시 및 1-클릭 클립보드 복사(Copy)와 복사 성공 피드백(체크마크) 기능 도입
- 강좌 상세 화면 최상단에 수강 이력(진도율)만 선택적으로 초기화하여 처음부터 수강할 수 있게 하는 [학습 진도율 리셋] 기능 구현

#### Changed
- Ollama 및 LM Studio 등 로컬 호스팅 기반의 순수 LLM 에이전트에 대해 강좌 파일 로컬 다운로드 분석 프로세스를 우회하고 불필요한 시스템 다운로드 상태 뱃지들을 UI에서 숨기도록 최적화
- 강좌 번들 명세(v1.1.0)에 맞춰 `CoursePackage` 타입에 `target_age`, `category` 필드 연동 및 시스템 프롬프트 조립 로직 일원화(`buildSystemPrompt`, `buildCurrentCardContext`)
- 동영상 카드 수강 시 원본 JSON 데이터 대신 정제된 자막 텍스트만 프롬프트 컨텍스트에 주입하도록 하여 토큰 사용 효율화 및 AI의 내용 학습 이해도 향상
- 설정 페이지 내 현재 동작하지 않거나 비활성화 상태인 준비 중 카드 레이아웃 요소들을 일괄 제거하여 UI 군더더기 정리
- 학습 화면 최상단 레이아웃(보기) 전환 컴포넌트를 Flex 3분할 구조 조정을 통해 화면 정중앙에 배치되도록 개선

#### Fixed
- 대화창 내에서 첫 웰컴 안내 메시지는 복사하지 않도록 조건을 추가하여 UI 간소화
- 질문 전송 시 유저 메시지와 에이전트 상태 메시지가 동일한 밀리초에 생성될 때 React 렌더링 루프에서 중복 키 충돌 경고(`Encountered two children with the same key`)가 발생하는 현상을 고유 ID 생성 유틸(`generateUniqueId`) 도입으로 해결
- 카드를 열어보는 행위만으로 강좌가 완료 처리되지 않도록, 마지막 카드의 [다음] 버튼 또는 체크포인트 통과를 완료의 명시적 트리거로 지정하여 학습 완료 판정 조건 엄격화
- 모든 진도 관련 뷰(대시보드, 내 강좌 목록, 강좌 상세, 학습 창 TOC)가 실시간 학습 진행을 모순 없이 표시하도록 `max_card - 1` 규칙을 적용해 진도율 동기화 및 렌더링 체크마크 오작동 수정

---

## [v0.3.2] - 2026-07-08

### 에이전트 설정 고도화 및 설정 전체 리셋 기능 추가 (v0.3.2)

앱 전역에서 에이전트 성능 매개변수로 사용 가능한 최대 토큰 수 설정을 도입하고, 저장된 레이아웃 너비 및 사용자 설정을 한 번에 기본값으로 초기화하는 [전체 리셋] 기능을 구현한 릴리즈.

#### Added
- 에이전트 설정 화면에 '최대 토큰 수(Max Tokens)' 설정 기능 추가 (4k, 8k, 16k, 32k, 64k, 128k 제공, 기본값 16k)
- 설정 관리 페이지 최상단 우측에 모든 설정값(에이전트 토큰, 폰트 선호도, 목차/튜터 너비 설정, 우회 여부 등)을 한 번에 기본값으로 되돌리는 [전체 리셋] 기능 구현
- 에이전트 전역 설정값을 쉽게 로드하고 갱신할 수 있는 `useAgentSettings` 공통 훅 설계

#### Fixed
- `DetailedCourse` 타입에 `cards` 필드가 누락되어 발생하던 TypeScript 컴파일 오류 수정
- Toast 컴포넌트가 Context 외부에서 사용될 때 발생하는 렌더링 에러 해결을 위해 `RootLayout`을 `ToastProvider`로 래핑

---

## [v0.3.1] - 2026-07-07

### UI 테마 개선 및 학습 환경 고도화 (v0.3.1)

앱 전체의 컬러 테마를 일체화하고, 사용자 설정 화면 및 학습 화면의 레이아웃 편의성을 크게 향상한 릴리즈.

#### Added
- 학습 화면 내 동적 레이아웃 토글(Dynamic Layout Toggle) 기능 도입

#### Changed
- UI 설정 화면 등 주요 디자인에 에메랄드(Green) 테마를 일관되게 적용
- UI 설정 화면의 미리보기 불필요 카드 제거 및 글꼴 변경 인터랙션 개선
- 로컬 DB API 및 에이전트 대화 로그 관련 설정 보완

#### Fixed
- 강좌 통계(Package Stats) 및 에이전트 자동 매핑, 미리보기 라우팅 버그 수정
- ESLint 구성 파일 및 린트 경고 대응

---

## [v0.3.0] - 2026-07-06

### 강좌 패키지 태그(tags) 기능 도입 및 프로토콜 규격 고도화 (v0.3.0)

강좌 패키지 메타데이터 및 업로드 API 프로세스에 `tags` 필드를 도입하고, 관련 프로토콜 스펙 및 타입을 동기화하여 강좌 상세 화면에 태그 뱃지들이 정상적으로 출력되도록 개선한 릴리즈.

#### Added
- 강좌 패키지(`CoursePackage`) 타입 정의 및 `package-manifest.json` 메타데이터에 선택적 배열 속성 `tags` 스펙 추가
- `docs/bundler/protocol.md` 프로토콜 스펙 문서를 `v1.1.0`으로 마이너 업데이트하고, `tags` 속성 명세 및 활용 예제 반영

#### Changed
- 강좌 패키지 업로드 API(`app/api/admin/packages/upload`)에서 `tags` 필드를 파싱하고, 배열 형식 여부를 검증한 후 `db.json`에 upsert 하도록 파이프라인 연동
- 기존 로컬 DB(`db.json`)에 수동으로 예시 태그 데이터를 마이그레이션하여 상세 화면에서 태그 뱃지가 즉시 노출되도록 보완

---

## [v0.2.0] - 2026-07-06

### 폰트 고도화 및 학습 화면 마크다운 스타일 정밀 튜닝 (v0.2.0)

앱 전체 폰트 가독성을 높이고 학습 마크다운 문서 내 표(Table), 소스 코드 등을 보다 미려하고 사용성 높게 정리한 릴리즈.

#### Added
- Noto Sans KR 변동 폰트(Variable Font) 로컬 제공 및 앱 기본 폰트 패밀리 지정
- 학습 마크다운 문서 내 코드 블록 구문 강조 및 1-클릭 클립보드 복사(Copy) 편의 기능 지원
- 강좌 업로드 완료 시, 유효한 AI 튜터 에이전트를 해당 강좌에 자동 연동/할당하는 백엔드 로직
- 외부 강좌 빌더와의 공조 유지를 위한 `docs/bundler/protocol.md` 내 학습 카드 마크다운 권장 규격 가이드라인 작성

#### Changed
- H1~H4 헤더, 문단, 목록(UL/OL), 인용구, 테이블 등 마크다운 내 기본 HTML 태그들을 Shadcn/Next 테마에 걸맞은 프리미엄 스타일로 전면 개편

#### Fixed
- MDX 컴파일러에 `remark-gfm`을 주입하여 깃허브 마크다운 스타일 테이블 깨짐 현상 복구
- 강좌 목록 및 상세 화면에서 학습 이어보기(Resume) 클릭 시 엉뚱한 카드로 오라우팅되는 카드 인덱스 불일치 버그 수정
- 대시보드(Dashboard) 내 강좌 카드의 진도 단계(카드 개수) 하드코딩 오류 수정 및 구독 패키지 중복 노출 제거

---

## [v0.1.0] - 2026-07-05

### 최초 공식 마이너 릴리즈 (v0.1.0)

로컬 데스크탑 온디바이스 앱으로 전환된 이후 첫 공식 태그. 클라우드(Vercel/Supabase) 의존성을 걷어내고 `db.json` + `public/courses` 기반 로컬 실행 환경으로 전환한 이후의 주요 기능을 포함합니다.

#### Added
- 강좌 번들 ZIP 업로드 및 로컬 DB 등록 (`courses/manage/upload`), Course Bundler Protocol v1.0.0 스펙 및 하위 지침 문서(`docs/bundler/`) 정립
- 마크다운 학습 카드 및 유튜브 동영상 카드(`type: "video"`, 자막 포함) 재생 지원, 팝업형 자막 탐색 UI
- 나의 강좌(패키지) 진행률 추적, 자동 수강 등록, 구독 취소, 이어보기
- 로컬/외부 AI 튜터 에이전트 등록·설정, 대화 로그 보존, 에이전트별 통계 대시보드
- 강좌 제작자를 위한 별도 Bundler 생성기 프로젝트 연동 안내 ([OpenTutorials-Bundler](https://github.com/godstale/OpenTutorials-Bundler))

#### Changed
- Vercel/Supabase 호스팅 및 로그인·회원가입 플로우를 제거하고 로컬 단일 사용자(`local-user-id`) 세션으로 전환
- 강좌 이미지 등 정적 에셋을 Supabase Storage 대신 `public/courses/` 로컬 정적 서빙으로 전환

#### Fixed
- 설정 메뉴 프로필/리다이렉트, 나의 강좌·학습 화면 레이아웃 문제 다수 수정
- react-player v3 API 마이그레이션에 따른 동영상 카드 재생 불가 문제 근본 해결

---
