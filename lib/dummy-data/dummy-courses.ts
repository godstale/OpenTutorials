import { Course, UserProgress } from '../types';

export const dummyCourses: Course[] = [
  {
    id: 'course-1',
    slug: 'intro-to-ai-agents',
    title: 'AI 에이전트 입문',
    description: 'AI 에이전트의 기본 개념과 동작 원리를 배우고, 간단한 에이전트를 구성해 봅니다.',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    published: true,
    disabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    toc: [
      {
        type: 'chapter',
        title: '제 1장: AI 에이전트 시작하기',
        description: 'AI 에이전트의 기본적인 배경 지식과 필요성을 학습합니다.',
        children: [
          {
            type: 'section',
            title: '1.1 개요 및 역사',
            description: '개념과 역사를 정립합니다.',
            children: [
              { type: 'subsection', filename: '01-intro.mdx', title: '에이전트 개요', description: 'AI 에이전트의 정의와 필요성에 대해 알아봅니다.' },
              { type: 'subsection', filename: '02-history.mdx', title: '역사 및 동향', description: '대규모 언어 모델(LLM)과 에이전트 기술의 발전 동향' }
            ]
          },
          {
            type: 'section',
            title: '1.2 핵심 설계 및 실습',
            description: '에이전트 설계 기법을 배웁니다.',
            children: [
              { type: 'subsection', filename: '03-architecture.mdx', title: '기본 아키텍처', description: '메모리, 도구 사용, 계획 수립 등 핵심 구성 요소' },
              { type: 'subsection', filename: '04-hands-on.mdx', title: '실습: 나만의 에이전트', description: 'Hermes 에이전트를 활용한 실습 튜토리얼' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'course-2',
    slug: 'advanced-prompt-engineering',
    title: '고급 프롬프트 엔지니어링',
    description: 'LLM의 성능을 극대화하기 위한 체계적인 프롬프트 작성 기법을 학습합니다.',
    thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800',
    published: true,
    disabled: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    toc: [
      {
        type: 'chapter',
        title: '제 1장: 프롬프트 엔지니어링 기초',
        description: '프롬프트의 원칙과 실습 기법을 배웁니다.',
        children: [
          {
            type: 'section',
            title: '1.1 기본 패턴',
            description: '가장 많이 사용되는 프롬프트 패턴들을 배웁니다.',
            children: [
              { type: 'subsection', filename: '01-principles.mdx', title: '프롬프트의 4대 원칙', description: '지시, 컨텍스트, 입력 데이터, 출력 형식 정의법' },
              { type: 'subsection', filename: '02-few-shot.mdx', title: 'Few-Shot & CoT', description: '예시 제시 기법과 Chain-of-Thought 생각의 사슬 적용' }
            ]
          },
          {
            type: 'section',
            title: '1.2 실무 가이드 및 평가',
            description: '시스템 프롬프트의 체계화와 평가 방법을 배웁니다.',
            children: [
              { type: 'subsection', filename: '03-system-prompts.mdx', title: '시스템 프롬프트 설계', description: '페르소나 부여 및 행동 제약조건 최적화 방법' },
              { type: 'subsection', filename: '04-evaluation.mdx', title: '프롬프트 평가 및 개선', description: '다양한 테스트 케이스를 통한 프롬프트 품질 측정' }
            ]
          }
        ]
      }
    ]
  },
];

export const dummyUserProgress: UserProgress[] = [
  {
    id: 'progress-1',
    user_id: 'user-1',
    course_id: 'course-1',
    last_card: 2,
    completed: false,
    updated_at: new Date().toISOString(),
  },
];
