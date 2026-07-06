import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = createAdminClient();
    const { data: packages, error } = await supabase
      .from('course_packages')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch packages for courses error:', error);
      return NextResponse.json([]);
    }

    // 데이터 가공하여 하위 강좌 정보 주입
    const formatted = (packages || []).map((pkg: any) => ({
      ...pkg,
      sequential_play: pkg.sequential_play ?? false,
      force_checkpoint: pkg.force_checkpoint ?? false,
      courses: [] // courses table was unified into course_packages, return empty array for backwards compatibility
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Courses API GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
