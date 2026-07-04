import { createMockSupabaseClient } from './mock-client';

export function createClient() {
  return createMockSupabaseClient() as any;
}

