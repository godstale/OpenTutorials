import { createClient } from '@/lib/supabase/client';
import type { UserExternalAgent } from '@/lib/types';

export async function getExternalAgents(): Promise<UserExternalAgent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_external_agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn(
        'Table public.user_external_agents not found. Falling back to an empty list. ' +
        'Please run migrations or paste the SQL in migrations/20260620133000_external_agents.sql into the Supabase SQL editor.'
      );
      return [];
    }
    console.error('Database query failed:', error);
    throw new Error(`${error.message} (${error.code || ''})`);
  }
  return (data ?? []) as UserExternalAgent[];
}

export async function getExternalAgentById(id: string): Promise<UserExternalAgent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_external_agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Database query failed:', error);
    throw new Error(`${error.message} (${error.code || ''})`);
  }
  return data as UserExternalAgent;
}

export async function createExternalAgent(agent: Omit<UserExternalAgent, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>): Promise<UserExternalAgent> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  if (agent.is_ai_tutor === true) {
    const { error: resetError } = await supabase
      .from('user_external_agents')
      .update({ is_ai_tutor: false, is_tutor_configured: false })
      .eq('user_id', user.id);
    if (resetError) {
      console.error('Database query failed:', resetError);
      throw new Error(`${resetError.message} (${resetError.code || ''})`);
    }
  }

  const { data, error } = await supabase
    .from('user_external_agents')
    .insert({
      ...agent,
      user_id: user.id,
      status: 'offline'
    })
    .select()
    .single();

  if (error) {
    console.error('Database query failed:', error);
    throw new Error(`${error.message} (${error.code || ''})`);
  }
  return data as UserExternalAgent;
}

export async function updateExternalAgent(
  id: string,
  updates: Partial<Omit<UserExternalAgent, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const supabase = createClient();

  if (updates.is_ai_tutor === true) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error: resetError } = await supabase
      .from('user_external_agents')
      .update({ is_ai_tutor: false, is_tutor_configured: false })
      .eq('user_id', user.id);
    if (resetError) {
      console.error('Database query failed:', resetError);
      throw new Error(`${resetError.message} (${resetError.code || ''})`);
    }
  }

  const { error } = await supabase
    .from('user_external_agents')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Database query failed:', error);
    throw new Error(`${error.message} (${error.code || ''})`);
  }
}

export async function deleteExternalAgent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_external_agents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Database query failed:', error);
    throw new Error(`${error.message} (${error.code || ''})`);
  }
}
