# PennyPress Database Schema

**원본 파일:** [DATABASE_SCHEMA.md](../../docs/DATABASE_SCHEMA.md)

**요약:**
PennyPress Phase 2의 Supabase 데이터베이스 스키마와 RLS 정책에 대한 문서. 
- **주요 테이블**: `hydra_agent_services`, `agent_profiles`, `user_profiles`, `hydra_agent_subscriptions`, `profile_subscription_configs`, `ai_worker_instances`, `task_runs`, `payment_records`, `token_packages`.
- **보안**: Service Role만이 접근해야 하는 `ai_worker_instances`에 대한 RLS 적용 및 기타 사용자의 본인 소유 데이터 접근 통제 정책 명시.
