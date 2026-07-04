import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = createAdminClient();
    const { data: packages, error } = await supabase
      .from('course_packages')
      .select('*, items:course_package_items(course:courses(*))')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 데이터 가공하여 하위 강좌 정보 주입
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
    console.error('[PackagesAPI] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
