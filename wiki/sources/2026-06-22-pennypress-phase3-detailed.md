---
title: "PennyPress Phase 3 상세 구현 계획서 — 외부 에이전트 고도화 및 Admin 고도화"
type: source
ingest_mode: full
source_file: docs/superpowers/plans/2026-06-22-pennypress-phase3-detailed.md
created_at: 2026-06-22
author: AI Agent
team: PennyPress
tags: [plan, phase3, google-oauth, dashboard-api, macro, admin, external-agent]
sources: []
last_updated: 2026-06-22
---

# PennyPress Phase 3 상세 구현 계획서

## Summary
인터뷰 기반으로 구체화된 Phase 3 구현 계획. Google 로그인 → Dashboard API → 매크로/Cron → Admin 고도화 순서로 구현. P3-3(에이전트 상태 시각화)은 향후 계획으로 보류.

## 인터뷰 결정사항
- [[ExternalHermesAgent]] Dashboard API 접근: 사용자가 직접 URL + 세션 토큰 등록. Next.js API 라우트가 프록시 역할
- 매크로 동작: 채팅 입력창 자동 채우기 (사용자 확인 후 전송)
- 미인증 회원 관리: 목록 조회, 인증 메일 재발송, 수동 인증, 계정 삭제 (Supabase Admin API 사용)
- 구현 순서: P3-1 → P3-2 → P3-4 → P3-5

## Key Concepts
- [[ExternalHermesAgent]]: Dashboard API(9120) 원격 설정 제어
- AgentMacro: Admin이 등록한 프롬프트 템플릿. 채팅창 자동 채우기
- Supabase Admin API: service_role 키로 미인증 회원 포함 전체 사용자 관리

## 구현 태스크
- **Task P3-1**: Google OAuth 로그인 (Supabase 소셜 로그인 연동)
- **Task P3-2**: Dashboard API 프록시 라우트 + AgentSettingsTab 설정 UI + 원격 제어 탭
- **Task P3-4**: macros 테이블 생성 + 매크로 API + AgentChatTab 매크로 선택 UI
- **Task P3-5**: Admin 회원 관리(미인증 포함) + 매크로 CRUD + 통계 실데이터 연동

## DB 변경사항
- `user_external_agents` 테이블에 `dashboard_api_url`, `dashboard_session_token` 컬럼 추가
- `macros` 테이블 신규 생성

## 신규 환경변수
- `SUPABASE_SERVICE_ROLE_KEY`: Admin API 사용을 위해 필요 (서버사이드 전용)

## 향후 계획
- P3-3 에이전트 상태 시각화, Dashboard Session Token 암호화, TossPayments, 자체 호스팅
