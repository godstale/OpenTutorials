import { createClient } from '@/lib/supabase/server';
import type { HydraAgentSubscription } from '@/lib/types';
import { dummyHydraSubscriptions } from '@/lib/dummy-data/dummy-hydra-subscriptions';

export async function getUserSubscriptions(userId: string): Promise<HydraAgentSubscription[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hydra_agent_subscriptions')
      .select(`
        *,
        service:hydra_agent_services(*, profiles:agent_profiles(*)),
        profile_configs:profile_subscription_configs(*)
      `)
      .eq('user_id', userId)
      .neq('status', 'cancelled');
    if (error) {
      console.warn('Supabase query failed, falling back to dummy subscriptions:', error.message);
      return dummyHydraSubscriptions;
    }
    return (data ?? []) as unknown as HydraAgentSubscription[];
  } catch (err) {
    console.warn('Failed to load subscriptions from Supabase, falling back to dummy subscriptions:', err);
    return dummyHydraSubscriptions;
  }
}

export async function createSubscription(
  userId: string,
  serviceId: string
): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hydra_agent_subscriptions')
    .insert({ user_id: userId, service_id: serviceId })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfileConfig(
  subscriptionId: string,
  profileId: string,
  config: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profile_subscription_configs')
    .upsert({ subscription_id: subscriptionId, profile_id: profileId, ...config });
  if (error) throw new Error(error.message);
}
