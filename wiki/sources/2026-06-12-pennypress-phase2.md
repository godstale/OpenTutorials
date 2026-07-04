---
title: "PennyPress Phase 2 Implementation Plan — HydraAgent 연동"
type: source
ingest_mode: full
source_file: docs/superpowers/plans/2026-06-12-pennypress-phase2.md
created_at: 2026-06-12
author: 
team: 
tags: [plan, phase2, hydra-agent]
sources: []
last_updated: 2026-06-14
---

# PennyPress Phase 2 Implementation Plan

## Summary
Hermes Agent Worker 서버를 로컬에서 구동하고 Next.js FE와 연동하여 HydraAgent 호스팅 서비스를 실제로 실행하는 Phase 2 구현 계획 문서. SSE로 실시간 에이전트 상태 업데이트 및 더미 데이터를 Supabase 실제 DB로 교체하는 태스크를 포함함.

## Key Concepts
- [[Phase2Plan]]: Phase 2 전체 마일스톤 및 태스크
- [[SupabaseSchema]]: HydraAgent 모델을 위한 Supabase DB 스키마 (Task P2-1)
- [[HermesWorkerAPI]]: FastAPI를 이용한 Hermes Agent Worker API 래퍼 (Task P2-3, P2-4)
- [[SSEUpdates]]: SSE 기반 실시간 상태 스트리밍 (Task P2-5)
