import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  const { id, profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Validate user owns the subscription
  const { data: sub } = await supabase
    .from('hydra_agent_subscriptions')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const { error } = await supabase
    .from('profile_subscription_configs')
    .upsert({
      subscription_id: id,
      profile_id: profileId,
      ...body
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
