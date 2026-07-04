import type { HydraAgentSubscription } from '@/lib/types';
import { dummyHydraServices } from './dummy-hydra-services';

export const dummyHydraSubscriptions: HydraAgentSubscription[] = [
  {
    id: 'hsub-001',
    user_id: 'user-001',
    service_id: 'hydra-basic-001',
    service: dummyHydraServices[0],
    status: 'active',
    profile_configs: [
      {
        profile_id: 'profile-basic-001',
        user_memory: '나는 스타트업 창업자입니다. 매일 아침 IT 뉴스와 경쟁사 동향을 리서치해주세요.',
        llm_model: 'deepseek-v4-flash',
        slack_token: 'xoxb-****-****',
        slack_channel: '#daily-research',
        cron_expression: '0 8 * * 1-5',
        extra_config: {},
      },
    ],
    started_at: '2026-05-10T09:00:00Z',
  },
  {
    id: 'hsub-002',
    user_id: 'user-001',
    service_id: 'hydra-marketing-001',
    service: dummyHydraServices[2],
    status: 'active',
    profile_configs: [
      {
        profile_id: 'profile-mkt-001',
        user_memory: '우리 회사는 B2B SaaS 스타트업입니다. 주요 타겟은 중소기업 HR 담당자입니다.',
        llm_model: 'deepseek-v4-pro',
        slack_token: 'xoxb-****-****',
        slack_channel: '#marketing-research',
        extra_config: {},
      },
      {
        profile_id: 'profile-mkt-002',
        user_memory: '주간 콘텐츠 캘린더를 기준으로 SNS 포스트 3개와 블로그 아이디어 2개를 제안해주세요.',
        llm_model: 'deepseek-v4-pro',
        slack_token: 'xoxb-****-****',
        slack_channel: '#marketing-planning',
        cron_expression: '0 9 * * 1',
        extra_config: {},
      },
      {
        profile_id: 'profile-mkt-003',
        user_memory: '브랜드 컬러: #4F46E5 (인디고). 톤앤매너: 전문적이면서도 친근한 느낌.',
        llm_model: 'deepseek-v4-flash',
        extra_config: {},
      },
      {
        profile_id: 'profile-mkt-004',
        user_memory: 'Next.js + Tailwind CSS 스택을 사용합니다. 랜딩 페이지 컴포넌트를 만들어주세요.',
        llm_model: 'deepseek-v4-flash',
        extra_config: {},
      },
    ],
    started_at: '2026-06-01T09:00:00Z',
  },
];
