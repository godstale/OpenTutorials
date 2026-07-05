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
    
    // 1. 통합 패키지(강좌) 데이터 조회 (sequential_play, force_checkpoint 포함)
    const { data: pkg, error } = await supabase
      .from('course_packages')
      .select('*, items:course_package_items(order_index, course:courses(*))')
      .eq('slug', slug)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: '강좌를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 로그인되어 있다면 사용자의 전체 수강 상태 파악을 위해 progress 정보 로드
    let userSubscribed = false;
    let progressesMap: Record<string, any> = {};
    let externalAgents: any[] = [];

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    
    if (user) {
      const { data: subData } = await userClient
        .from('user_package_subscriptions')
        .select('id')
        .eq('package_id', pkg.id)
        .maybeSingle();
      userSubscribed = !!subData;

      const { data: progressList } = await userClient
        .from('user_progress')
        .select('*')
        .in('course_id', pkg.items.map((it: any) => it.course?.id).filter(Boolean));

      if (progressList) {
        progressesMap = Object.fromEntries(progressList.map((p: any) => [p.course_id, p]));
      }

      const { data: agentsData } = await userClient
        .from('user_external_agents')
        .select('id, name, agent_type, is_ai_tutor');
      externalAgents = agentsData || [];
    }

    // 데이터 포맷 정렬
    const courses = pkg.items
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((it: any) => {
        const course = it.course;
        if (!course) return null;
        return {
          ...course,
          order_index: it.order_index,
          user_progress: progressesMap[course.id] || null
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ...pkg,
      sequential_play: pkg.sequential_play ?? false,
      force_checkpoint: pkg.force_checkpoint ?? false,
      courses,
      user_subscribed: userSubscribed,
      external_agents: externalAgents
    });
  } catch (err: any) {
    console.error('[CourseDetailAPI] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
