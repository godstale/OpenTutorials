# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> main에 반영(머지)되는 시점마다 이 파일에 버전 항목을 추가/갱신합니다. (참고: `wiki/log.md`는 작업 단위 상세 로그, 이 파일은 릴리즈 단위 요약입니다.)

## [Unreleased]

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
