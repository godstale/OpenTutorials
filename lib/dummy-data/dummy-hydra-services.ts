import type { HydraAgentService, HydraAgentDashboardStats } from '@/lib/types';

export const dummyHydraServices: HydraAgentService[] = [
  {
    id: 'hydra-basic-001',
    name: 'Hermes Basic Agent',
    description: '단일 프로파일로 구성된 가장 기본적인 AI Agent 호스팅 서비스입니다. 개인 업무 자동화, 정보 수집, 간단한 리서치 작업에 최적화되어 있습니다.',
    service_type: 'basic',
    tags: ['개인용', '자동화', '리서치', '단순작업'],
    profiles: [
      {
        id: 'profile-basic-001',
        name: 'General Assistant',
        role: '범용 AI 어시스턴트',
        description: '다양한 작업을 처리할 수 있는 범용 AI 어시스턴트 프로파일입니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '당신은 사용자의 요청을 충실하게 수행하는 AI 어시스턴트입니다...',
      },
    ],
    hosting_fee_monthly: 9900,
    token_cost_per_1k: 50,
    supported_llm_models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    subscriber_count: 342,
    created_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'hydra-mao-001',
    name: 'Hydra MAO Template',
    description: '3개의 기본 프로파일로 구성된 멀티 에이전트 조직 템플릿입니다. 프로파일 역할과 크론 작업을 직접 설정하여 나만의 AI 팀을 구성하세요.',
    service_type: 'mao_template',
    tags: ['멀티에이전트', '조직', '커스터마이징', '팀워크'],
    profiles: [
      {
        id: 'profile-mao-001',
        name: 'Agent Alpha',
        role: '미설정 (사용자 설정 필요)',
        description: '역할이 설정되지 않은 기본 프로파일입니다. 사용자가 직접 역할과 동작을 설정합니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '(사용자 설정 대기 중)',
      },
      {
        id: 'profile-mao-002',
        name: 'Agent Beta',
        role: '미설정 (사용자 설정 필요)',
        description: '역할이 설정되지 않은 기본 프로파일입니다. 사용자가 직접 역할과 동작을 설정합니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '(사용자 설정 대기 중)',
      },
      {
        id: 'profile-mao-003',
        name: 'Agent Gamma',
        role: '미설정 (사용자 설정 필요)',
        description: '역할이 설정되지 않은 기본 프로파일입니다. 사용자가 직접 역할과 동작을 설정합니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '(사용자 설정 대기 중)',
      },
    ],
    hosting_fee_monthly: 29900,
    token_cost_per_1k: 45,
    supported_llm_models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    subscriber_count: 87,
    created_at: '2026-04-15T09:00:00Z',
  },
  {
    id: 'hydra-marketing-001',
    name: 'Hydra Marketing Agent',
    description: '마케팅 업무 전문 멀티 에이전트 서비스입니다. 리서치, 기획, 디자인, 프론트엔드 4개 프로파일이 미리 설정되어 즉시 마케팅 업무를 시작할 수 있습니다.',
    service_type: 'marketing_template',
    tags: ['마케팅', '콘텐츠', '리서치', '기획', '디자인'],
    profiles: [
      {
        id: 'profile-mkt-001',
        name: 'Research Agent',
        role: '마케팅 리서처',
        description: '시장 조사, 경쟁사 분석, 트렌드 파악을 담당합니다.',
        llm_model: 'deepseek-v4-pro',
        soul_md_preview: '당신은 마케팅 리서치 전문가입니다. 시장 동향, 경쟁사 현황, 소비자 인사이트를 분석합니다...',
      },
      {
        id: 'profile-mkt-002',
        name: 'Planning Agent',
        role: '마케팅 기획자',
        description: '리서치 결과를 바탕으로 마케팅 전략과 콘텐츠 기획을 담당합니다.',
        llm_model: 'deepseek-v4-pro',
        soul_md_preview: '당신은 창의적인 마케팅 기획자입니다. 데이터 기반 전략 수립과 캠페인 기획이 전문입니다...',
      },
      {
        id: 'profile-mkt-003',
        name: 'Design Agent',
        role: '콘텐츠 디자이너',
        description: 'SNS 포스트, 배너 문안, 시각적 콘텐츠 스크립트를 제작합니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '당신은 비주얼 콘텐츠 전문가입니다. 매력적인 마케팅 소재를 기획하고 제작합니다...',
      },
      {
        id: 'profile-mkt-004',
        name: 'Frontend Agent',
        role: '랜딩페이지 개발자',
        description: '마케팅 랜딩 페이지 및 간단한 웹 콘텐츠 개발을 담당합니다.',
        llm_model: 'deepseek-v4-flash',
        soul_md_preview: '당신은 프론트엔드 개발 전문가입니다. React, Next.js 기반 마케팅 페이지를 빠르게 개발합니다...',
      },
    ],
    hosting_fee_monthly: 59900,
    token_cost_per_1k: 40,
    supported_llm_models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'claude-sonnet'],
    subscriber_count: 156,
    created_at: '2026-05-01T09:00:00Z',
  },
];

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  basic: 'Basic',
  mao_template: 'MAO Template',
  marketing_template: 'Marketing',
};

export const SERVICE_TYPE_FILTERS = ['전체', 'basic', 'mao_template', 'marketing_template'];

export const HYDRA_SERVICE_TAGS = [
  '개인용', '자동화', '리서치', '단순작업',
  '멀티에이전트', '조직', '커스터마이징', '팀워크',
  '마케팅', '콘텐츠', '기획', '디자인',
];

export const dummyHydraStats: HydraAgentDashboardStats = {
  active_agents: 3,
  total_hosting_cost_monthly: 89800,
  total_token_cost_this_month: 12400,
  active_subscriptions: 2,
};
