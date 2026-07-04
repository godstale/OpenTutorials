import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runProfileTask } from '@/lib/api/agent-worker';

export async function GET(request: Request) {
  await connection();
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // For this simplified local MVP, we'll fetch all configs with a cron_expression
  // In a real prod env, we'd use a real cron parser to check if they should run *now*
  const { data: configs, error } = await supabase
    .from('profile_subscription_configs')
    .select('*, subscription:hydra_agent_subscriptions!inner(user_id, status)')
    .not('cron_expression', 'is', null)
    .neq('cron_expression', '');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let triggered = 0;
  // A naive implementation to trigger the worker for all found scheduled configs
  for (const config of configs || []) {
    // Check if subscription is active
    if ((config.subscription as { status: string }).status !== 'active') continue;

    try {
      await runProfileTask({
        subscription_id: config.subscription_id,
        profile_id: config.profile_id,
        user_memory: config.user_memory ?? '',
        llm_model: config.llm_model,
        cron_expression: config.cron_expression ?? undefined,
      });

      await supabase.from('task_runs').insert({
        subscription_id: config.subscription_id,
        profile_id: config.profile_id,
        status: 'pending',
      });
      triggered++;
    } catch (err) {
      console.error(`Failed to run scheduled task for ${config.profile_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, triggered });
}
