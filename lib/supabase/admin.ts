import { NextResponse } from 'next/server';
import { createMockSupabaseClient } from './mock-client';

export function createAdminClient() {
  return createMockSupabaseClient() as any;
}

// Admin 권한 체크 유틸 (API 라우트에서 호출) - 로컬 환경에서는 항상 허용
export async function requireAdmin(): Promise<
  | { user: { id: string; email: string }; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  return { user: { id: 'local-user-id', email: 'user@opentutor.local' }, errorResponse: null };
}

export async function getOrAssignTutorAgentId(
  userId: string,
  currentAgentId?: string | null
): Promise<string | null> {
  const supabaseAdmin = createAdminClient();
  
  const { data: agents } = await supabaseAdmin
    .from('user_external_agents')
    .select('id, is_ai_tutor')
    .eq('user_id', userId);

  if (agents && agents.length > 0) {
    // 1. If default tutor is set, we must use it
    const defaultAgent = agents.find((a: any) => a.is_ai_tutor === true);
    if (defaultAgent) {
      return defaultAgent.id;
    }
    // 2. If no default tutor is set, but the course already has an agent registered, keep it
    if (currentAgentId) {
      const exists = agents.some((a: any) => a.id === currentAgentId);
      if (exists) {
        return currentAgentId;
      }
    }
    // 3. Fallback to the first available agent
    return agents[0].id;
  }

  // 4. Create a default agent if none exist
  const defaultAgentData = {
    user_id: userId,
    name: '기본 AI 튜터',
    endpoint: 'http://localhost:8642/v1',
    is_ai_tutor: true,
    is_tutor_configured: false,
    agent_type: 'harness',
    status: 'offline',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: newAgent, error: createError } = await supabaseAdmin
    .from('user_external_agents')
    .insert(defaultAgentData)
    .select('id')
    .single();

  if (createError) {
    console.error('[TutorAssign] Failed to create a default tutor:', createError);
    return null;
  }

  return newAgent?.id || null;
}


