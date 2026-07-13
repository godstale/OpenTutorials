// ── HydraAgent types ──────────────────────────────────────────────────────────

export type HydraServiceType = 'basic' | 'mao_template' | 'marketing_template';
export type LLMModel = 'deepseek-v4-flash' | 'deepseek-v4-pro' | 'claude-sonnet' | 'gpt-4o';

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  description: string;
  llm_model: LLMModel;
  soul_md_preview: string;
}

export interface HydraAgentService {
  id: string;
  name: string;
  description: string;
  service_type: HydraServiceType;
  tags: string[];
  profiles: AgentProfile[];
  hosting_fee_monthly: number;
  token_cost_per_1k: number;
  supported_llm_models: LLMModel[];
  subscriber_count: number;
  created_at: string;
  image_url?: string;
}

export interface ProfileSubscriptionConfig {
  profile_id: string;
  user_memory: string;
  llm_model: LLMModel;
  slack_token?: string;
  slack_channel?: string;
  telegram_token?: string;
  telegram_chat_id?: string;
  cron_expression?: string;
  extra_config: Record<string, unknown>;
}

export interface HydraAgentSubscription {
  id: string;
  user_id: string;
  service_id: string;
  service: HydraAgentService;
  status: 'active' | 'paused' | 'cancelled';
  profile_configs: ProfileSubscriptionConfig[];
  started_at: string;
  expires_at?: string;
}

export interface HydraAgentDashboardStats {
  active_agents: number;
  total_hosting_cost_monthly: number;
  total_token_cost_this_month: number;
  active_subscriptions: number;
}

// ── User & Admin types ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  points: number;
  subscription_status: 'none' | 'active' | 'expired';
  subscription_expires_at?: string;
  created_at: string;
}

export interface AdminUser extends UserProfile {
  is_admin: boolean;
  total_spent: number;
  feature_count: number;
}

export interface AIWorkerInstance {
  id: string;
  name: string;
  endpoint: string;
  status: 'running' | 'stopped' | 'error';
  profile_count: number;
  active_tasks: number;
  created_at: string;
  last_heartbeat: string;
}

// ── Payment types ─────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_email: string;
  type: 'point_charge' | 'subscription';
  amount: number;
  points?: number;
  status: 'completed' | 'refunded' | 'pending';
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration: 'monthly' | 'yearly';
  price: number;
  token_limit: number;
}

export interface PointPackage {
  id: string;
  points: number;
  price: number;
  bonus_points?: number;
}

export interface AdminDashboardStats {
  dau: number;
  mau: number;
  total_revenue_this_month: number;
  total_payments_this_month: number;
  new_users_today: number;
  active_workers: number;
}

export interface UserExternalAgent {
  id: string;
  user_id: string;
  name: string;
  endpoint: string;
  api_key?: string;
  web_ui_url?: string;
  status: 'online' | 'offline' | 'error';
  selected_model?: string;
  dashboard_api_url?: string;
  dashboard_session_token?: string;
  is_ai_tutor?: boolean;
  is_tutor_configured?: boolean;
  agent_type?: 'harness' | 'llm';
  env_type?: 'local' | 'cloud';
  agent_program?: 'hermes' | 'openclaw' | 'ollama' | 'lmstudio' | 'other' | 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'kimi';
  created_at: string;
  updated_at: string;
}

export interface AgentMacro {
  id: string;
  title: string;           // 목록에 표시될 제목 (예: "매일 아침 뉴스 브리핑")
  description?: string | null;     // 사용자에게 보여줄 설명
  prompt_template: string; // 실제 채팅창에 채울 프롬프트 내용
  category: string;        // 분류: 'cron' | 'config' | 'general'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Course & Learn types ──────────────────────────────────────────────────────

export type TocNodeType = 'chapter' | 'section' | 'subsection';

export interface TocNode {
  type: TocNodeType;
  title: string;
  description: string;
  filename?: string;
  children?: TocNode[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  disabled?: boolean;
  tags?: string[];
  agent_id?: string | null;
  created_at: string;
  updated_at: string;
  toc?: TocNode[];
  cards?: string[];
}

export interface UserProgress {
  id: string;
  user_id: string;
  course_id: string;
  last_card: number;
  completed: boolean;
  updated_at: string;
}

export interface CourseAuthor {
  nickname: string;
  email?: string | null;
  website?: string | null;
}

export interface CoursePackage {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  sequential_play?: boolean;
  force_checkpoint?: boolean;
  target_age?: string | null;
  category?: string | null;
  tags?: string[];
  author?: CourseAuthor | null;
  author_id?: string | null;
  author_nickname?: string | null;
  author_email?: string | null;
  author_homepage?: string | null;
  bundler_protocol_version?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  courses?: Course[];
  toc?: TocNode[];
}

export interface CoursePackageItem {
  id: string;
  package_id: string;
  course_id: string;
  order_index: number;
  created_at: string;
}

export interface UserPackageSubscription {
  id: string;
  user_id: string;
  package_id: string;
  created_at: string;
  package?: CoursePackage;
}

