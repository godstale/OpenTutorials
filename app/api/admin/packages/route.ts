import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  await connection();
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: packages, error } = await supabaseAdmin
      .from('course_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (packages || []).map((pkg: any) => ({
      ...pkg,
      courses: [] // courses table was unified into course_packages, return empty array for backwards compatibility
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('[AdminPackagesAPI] GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
