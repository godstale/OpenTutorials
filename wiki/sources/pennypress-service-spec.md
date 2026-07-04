# PennyPress 서비스 명세서 (HydraAgent 호스팅 서비스)

**Source:** `docs/pennypress-service-spec.md`  
**Ingested:** 2026-06-20  
**Entities:** [[PennyPress]], [[HermesAgent]]  
**Concepts:** [[HydraAgentService]], [[AIAgentWorker]]  

---

## 서비스 개요

PennyPress는 NousResearch [[HermesAgent]]를 기반으로 구축된 자율형 AI 에이전트(HydraAgent) 호스팅 SaaS 플랫폼입니다. 사용자는 단순히 정적인 API를 호출하는 것을 넘어, 자신만의 프롬프트(User.md), LLM 모델 설정, 알림 채널 연동(Slack, Telegram) 및 크론 기반 정기 실행 설정을 완료한 독립적인 에이전트 팀 인스턴스를 관리하고 실행할 수 있습니다.

## 주요 제공 서비스 및 가격 모델

| 서비스 유형 | 서비스 명칭 | 프로파일 수 | 호스팅 월 비용 | 토큰당 단가 (1K) | 주요 대상 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`basic`** | Hermes Basic Agent | 1개 | ₩9,900 | ₩50 | 개인 업무 자동화, 단순 리서치 |
| **`mao_template`** | Hydra MAO Template | 3개 (역할 미지정)| ₩29,900 | ₩45 | 사용자 직접 역할 정의 멀티에이전트 조직 구성 |
| **`marketing_template`**| Hydra Marketing Agent| 4개 (지정 역할) | ₩59,900 | ₩40 | 리서치, 기획, 디자인, FE 개발 전문 마케팅 팀 |

## 데이터 모델 구조

- **[[HydraAgentService]]**: 서비스 자체에 대한 정의(이름, 유형, 태그, 기본 프로파일 정보, 지원 LLM 모델, 호스팅 및 토큰 가격 등)
- **AgentProfile**: 개별 에이전트 프로파일(역할 명칭, 설명, 기본 LLM 모델, SOUL.md 정보 등)
- **HydraAgentSubscription**: 사용자의 서비스 구독 정보(구독 상태, 개별 에이전트 인스턴스 설정 overrides)
- **ProfileSubscriptionConfig**: 개별 에이전트 인스턴스의 실행 상세 설정(User.md 메모리, LLM 모델 선택, 알림 채널 토큰/채널 ID, 크론 스케줄 표현식 등)

## 라이프사이클 및 시스템 플로우

1. **서비스 등록**: Admin이 PennyPress 웹을 통해 특정 Hermes Worker와 연계된 HydraAgent 서비스를 등록합니다.
2. **구독 신청**: 사용자는 마켓플레이스(`app/(user)/features/page.tsx`)에서 서비스를 확인하고 결제 및 구독을 진행합니다.
3. **에이전트 설정(커스터마이징)**: 호스팅 관리(`app/(user)/my-features/page.tsx`)에서 프로파일별 `User.md` 메모리 설정, 알림 및 크론 설정을 업데이트하면 Hermes Worker와 연동됩니다.
4. **정기 실행 및 알림**: 설정에 맞춰 Hermes Agent가 자율 동작하여 지정한 Slack/Telegram 채널로 작업 결과를 발송합니다.
5. **구독 취소**: 구독 취소 시 해당 에이전트의 로컬 설정 및 메모리는 보안을 위해 **영구 파기**되며 되돌릴 수 없습니다.

## 참조 문서

- 상세 사양 원본: [pennypress-service-spec.md](file:///C:/___Workspace/Projects/PennyPress/docs/pennypress-service-spec.md)
- 전체 가이드 문서: [AGENTS.md](../../AGENTS.md), [GEMINI.md](../../GEMINI.md), [CLAUDE.md](../../CLAUDE.md)
