# HydraAgentService

**유형:** 개념/서비스 모델  
**관련:** [[PennyPress]], [[HermesAgent]], [[hydra-agent-goal]]

---

## 정의

HydraAgentService는 [[HermesAgent]]를 기반으로 미리 구성된 AI Agent 호스팅 서비스이다. PennyPress 사용자는 목적에 맞는 서비스를 선택하고 구독함으로써 자신만의 AI 에이전트 팀을 즉시 운용할 수 있다.

## 서비스 유형

### basic (Hermes Basic Agent)
- 단일 프로파일
- DeepSeek v4 flash 사용
- 월 ₩9,900, 토큰 ₩50/1K
- 개인 업무 자동화, 리서치에 적합

### mao_template (Hydra MAO Template)
- 3개 프로파일 (역할 미설정, 사용자가 직접 설정)
- 멀티 에이전트 조직 구성 가능
- 월 ₩29,900, 토큰 ₩45/1K

### marketing_template (Hydra Marketing Agent)
- 4개 프로파일 (리서치, 기획, 디자인, 프론트엔드)
- 마케팅 업무에 최적화된 미리 설정된 역할
- 월 ₩59,900, 토큰 ₩40/1K

## TypeScript 인터페이스

```typescript
interface HydraAgentService {
  id: string;
  name: string;
  description: string;
  service_type: 'basic' | 'mao_template' | 'marketing_template';
  tags: string[];
  profiles: AgentProfile[];
  hosting_fee_monthly: number;
  token_cost_per_1k: number;
  supported_llm_models: LLMModel[];
  subscriber_count: number;
  created_at: string;
  image_url?: string;
}
```

## 구독 플로우

1. 에이전트 마켓플레이스 (`/features`) 에서 서비스 선택
2. 구독 신청 → Phase 3에서 TossPayments 호스팅 결제
3. 호스팅 관리 (`/my-features`) 에서 프로파일별 설정:
   - User.md (사용자 메모리)
   - LLM 모델 선택
   - Slack/Telegram 채널 연동
   - 크론 설정 (정기 실행)
4. 구독 취소 시 에이전트 메모리 영구 삭제 (불가역)

## 과금 모델

- **호스팅 비용**: 월 정액 (서비스 유형에 따라 차등)
- **토큰 비용**: 사용량 기반 (LLM API 호출 토큰 수 × 서비스별 단가)

## 관련 파일

- 더미 데이터: `lib/dummy-data/dummy-hydra-services.ts`
- 타입 정의: `lib/types/index.ts`
- 마켓플레이스 UI: `app/(user)/features/page.tsx`
- 호스팅 관리 UI: `app/(user)/my-features/page.tsx`
- 결제 UI: `app/(user)/billing/page.tsx`
- Admin 관리: `app/admin/features/page.tsx`
