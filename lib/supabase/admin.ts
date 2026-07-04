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

