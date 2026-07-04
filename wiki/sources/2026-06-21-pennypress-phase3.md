---
title: "PennyPress Phase 3 Implementation Plan — 외부 에이전트 고도화 및 플랫폼 확장"
type: source
ingest_mode: full
source_file: docs/superpowers/plans/2026-06-21-pennypress-phase3.md
created_at: 2026-06-21
author: AI Agent
team: PennyPress
tags: [plan, phase3, external-agent, admin, macro]
sources: []
last_updated: 2026-06-21
---

# PennyPress Phase 3 Implementation Plan

## Summary
기존 계획되었던 결제 연동(TossPayments) 및 자체 호스팅(HydraAgent) 서비스는 장기 딜레이하고, 이미 완료된 클라우드 배포 위에서 "외부 에이전트 연동 및 관리 기능"을 중점 고도화하는 새로운 Phase 3 계획 문서.

## Key Concepts
- [[ExternalHermesAgent]]: 외부 에이전트 연동 및 Dashboard API 활용 원격 설정
- 에이전트 상세 상태 분석 (agent, llm, token, gateway 등 시각화)
- 채팅 기반 크론/매크로(Macro) 제어: 기존 채팅 UI를 확장한 대화형 에이전트 설정 기능
- Admin 대시보드: 회원 관리 및 매크로 제공 기능 관리

## 상세 태스크
- **Task P3-1**: Supabase 지원 부가 기능 연동 (Google 로그인 등)
- **Task P3-2**: Dashboard API 기반 외부 에이전트 원격 설정
- **Task P3-3**: 외부 에이전트 상태 상세 분석 시각화 (기존 미구현 '에이전트 검색' 화면 리뉴얼)
- **Task P3-4**: 채팅 기반 크론(Cronjob) 및 매크로(Macro) 제어 기능 구현
- **Task P3-5**: 관리자(Admin) 대시보드 및 하위 페이지(회원 관리, 매크로 관리) 고도화
