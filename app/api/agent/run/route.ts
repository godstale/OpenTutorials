import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runProfileTask } from '@/lib/api/agent-worker';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscription_id, profile_id } = await request.json();

  // 구독 소유권 및 profile config 조회
  const { data: config } = await supabase
    .from('profile_subscription_configs')
    .select('*, subscription:hydra_agent_subscriptions!inner(user_id)')
    .eq('subscription_id', subscription_id)
    .eq('profile_id', profile_id)
    .single();

  if (!config || (config.subscription as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  try {
    const { task_id } = await runProfileTask({
      subscription_id,
      profile_id,
      user_memory: config.user_memory ?? '',
      llm_model: config.llm_model,
      cron_expression: config.cron_expression ?? undefined,
    });

    await supabase.from('task_runs').insert({
      subscription_id,
      profile_id,
      status: 'pending',
    });

    return NextResponse.json({ task_id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
