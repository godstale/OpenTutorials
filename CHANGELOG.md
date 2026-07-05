# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> main에 반영(머지)되는 시점마다 이 파일에 버전 항목을 추가/갱신합니다. (참고: `wiki/log.md`는 작업 단위 상세 로그, 이 파일은 릴리즈 단위 요약입니다.)

## [Unreleased]

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
