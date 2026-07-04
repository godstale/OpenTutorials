import { createClient } from '@/lib/supabase/server';
import type { HydraAgentService } from '@/lib/types';
import { connection } from 'next/server';
import { dummyHydraServices } from '@/lib/dummy-data/dummy-hydra-services';

export async function getHydraServices(): Promise<HydraAgentService[]> {
  await connection();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hydra_agent_services')
      .select('*, profiles:agent_profiles(*)')
      .eq('is_active', true)
      .order('subscriber_count', { ascending: false });
    if (error) {
      console.warn('Supabase query failed, falling back to dummy services:', error.message);
      return dummyHydraServices;
    }
    return (data ?? []) as unknown as HydraAgentService[];
  } catch (err) {
    console.warn('Failed to load services from Supabase, falling back to dummy services:', err);
    return dummyHydraServices;
  }
}

export async function getHydraServiceById(id: string): Promise<HydraAgentService | null> {
  await connection();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hydra_agent_services')
      .select('*, profiles:agent_profiles(*)')
      .eq('id', id)
      .single();
    if (error) {
      console.warn('Supabase query failed, falling back to dummy service:', error.message);
      return dummyHydraServices.find((s) => s.id === id) || null;
    }
    return data as unknown as HydraAgentService;
  } catch (err) {
    console.warn('Failed to load service from Supabase, falling back to dummy service:', err);
    return dummyHydraServices.find((s) => s.id === id) || null;
  }
}
