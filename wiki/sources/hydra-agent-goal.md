# HydraAgent 서비스 전환 목표 및 구현 결과

**원본 파일:** `docs/HydraAgentGoal.md`  
**인제스트 날짜:** 2026-06-13  
**관련:** [[PennyPress]], [[HermesAgent]], [[HydraAgentService]]

---

## 개요

PennyPress FE의 핵심 서비스 개념을 "기능(Feature) 구독 서비스"에서 "HydraAgent 호스팅 서비스"로 전면 교체한 작업의 목표 문서이자 완료 기록이다.

## 제거된 모델

- 사용자가 `Feature`(컨텐츠 모니터링, 뉴스 요약 등)를 검색하고 파라미터를 설정해 구독하는 방식.
- `Feature`, `ParameterSchema`, `UserFeatureSubscription` 타입.
- `lib/dummy-data/dummy-features.ts`, `dummy-subscriptions.ts` 파일.
- `components/features/FeatureCard.tsx`, `FeatureModal.tsx`, `SubscriptionCard.tsx` 컴포넌트.

## 도입된 모델: HydraAgent 호스팅 서비스

### 서비스 유형 3종
| 유형 | 이름 | 프로파일 수 | 월 비용 |
|------|------|-----------|---------|
| `basic` | Hermes Basic Agent | 1개 | ₩9,900 |
| `mao_template` | Hydra MAO Template | 3개 (미설정) | ₩29,900 |
| `marketing_template` | Hydra Marketing Agent | 4개 (리서치/기획/디자인/FE) | ₩59,900 |

### 핵심 타입 (lib/types/index.ts)
- `HydraAgentService` — 서비스 메타데이터, 프로파일 목록, 가격 정보
- `AgentProfile` — 역할, SOUL.md 미리보기, LLM 모델
- `HydraAgentSubscription` — 사용자 구독 정보, 프로파일별 설정
- `ProfileSubscriptionConfig` — User.md, LLM 선택, Slack/Telegram 연동, 크론 설정
- `HydraAgentDashboardStats` — 활성 에이전트 수, 호스팅 비용, 토큰 비용

### 지원 LLM
- `deepseek-v4-flash`, `deepseek-v4-pro`, `claude-sonnet`, `gpt-4o`

## 변경된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `lib/types/index.ts` | Feature 타입 제거, HydraAgent 타입 추가 |
| `lib/dummy-data/dummy-hydra-services.ts` | 신규 — 서비스 3종 더미 데이터 |
| `lib/dummy-data/dummy-hydra-subscriptions.ts` | 신규 — 구독 더미 데이터 |
| `lib/dummy-data/dummy-stats.ts` | dummyDashboardStats 제거 |
| `lib/constants/routes.ts` | "기능 검색" → "에이전트 검색", "사용 현황" → "호스팅 관리", "기능 관리" → "서비스 관리" |
| `app/(user)/dashboard/page.tsx` | HydraAgent 통계 + 구독 서비스 카드 |
| `app/(user)/features/page.tsx` | 에이전트 마켓플레이스로 전면 재작성 |
| `app/(user)/my-features/page.tsx` | 호스팅 관리 페이지로 전면 재작성 (프로파일별 설정 토글) |
| `app/(user)/billing/page.tsx` | 호스팅 비용 + 토큰 비용 모델로 재작성 |
| `app/admin/features/page.tsx` | HydraAgent 서비스 관리 테이블로 재작성 |
| `CLAUDE.md` | 데이터 모델 섹션 HydraAgent 타입으로 업데이트 |
| `docs/superpowers/plans/2026-06-12-pennypress-phase2.md` | HydraAgent DB 스키마, API, Worker 연동 기반 재작성 |
| `docs/superpowers/plans/2026-06-12-pennypress-phase3.md` | 호스팅+토큰 결제 모델 기반 재작성 |

## 과금 모델

- **호스팅 비용**: 월 정기 결제 (서비스별 hosting_fee_monthly)
- **토큰 비용**: 사용량 기반 (token_cost_per_1k × 사용 토큰 수)

## 구독 취소 주의사항

구독 취소 시 해당 에이전트의 User.md(메모리) 데이터가 영구 삭제된다. 되돌릴 수 없음.

## 빌드 결과

`pnpm build` 타입 오류 없이 정상 완료 (2026-06-13).

## 관련 경계 조건 (변경 금지)

- `app/auth/`, `lib/supabase/`, `middleware.ts` — Auth 관련
- `app/(user)/settings/` — 사용자 설정
- `components/ui/` — Shadcn UI 컴포넌트 구조
- `docs/superpowers/plans/2026-06-12-pennypress-phase1.md` — Phase 1 플랜
