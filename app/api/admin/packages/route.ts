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
      .select('*, items:course_package_items(course:courses(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (packages || []).map((pkg: any) => ({
      ...pkg,
      courses: pkg.items
        ? pkg.items
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((it: any) => it.course)
            .filter(Boolean)
        : []
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('[AdminPackagesAPI] GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
