import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  await connection();
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('*, course_package_items(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch courses error:', error);
      return NextResponse.json([]);
    }

    // Filter out courses that are part of a package
    const filteredCourses = (courses ?? []).filter(
      (c: any) => !c.course_package_items || c.course_package_items.length === 0
    );

    return NextResponse.json(filteredCourses);
  } catch (error: any) {
    console.error('Courses API GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
