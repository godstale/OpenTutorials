import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connection();
  const { slug } = await params;
  try {
    const supabase = createAdminClient();
    
    // 1. 패키지 데이터 조회
    const { data: pkg, error } = await supabase
      .from('course_packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: '패키지를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 로그인되어 있다면 사용자의 전체 수강 상태 파악을 위해 progress 정보 로드
    let userSubscribed = false;

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    
    if (user) {
      const { data: subData } = await userClient
        .from('user_package_subscriptions')
        .select('id')
        .eq('package_id', pkg.id)
        .maybeSingle();
      userSubscribed = !!subData;
    }

    return NextResponse.json({
      ...pkg,
      courses: [], // courses table was unified into course_packages, return empty array for backwards compatibility
      user_subscribed: userSubscribed
    });
  } catch (err: any) {
    console.error('[PackageDetailAPI] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
