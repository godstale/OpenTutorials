import { createMockSupabaseClient } from './mock-client';

export async function createClient() {
  return createMockSupabaseClient() as any;
}

