# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> main에 반영(머지)되는 시점마다 이 파일에 버전 항목을 추가/갱신합니다. (참고: `wiki/log.md`는 작업 단위 상세 로그, 이 파일은 릴리즈 단위 요약입니다.)

## [Unreleased]

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
