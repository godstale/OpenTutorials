import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const package_id = body.package_id || body.course_id; // course_id로도 받을 수 있도록 하위호환성 유지
    if (!package_id) return NextResponse.json({ error: 'package_id 또는 course_id가 필요합니다.' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. 강좌(패키지) 구독 등록
    const { error: subErr } = await adminClient
      .from('user_package_subscriptions')
      .upsert({ user_id: user.id, package_id }, { onConflict: 'user_id,package_id' });

    if (subErr) throw subErr;

    // 2. 강좌 하위 장/챕터들 ID 조회
    const { data: items, error: itemsErr } = await adminClient
      .from('course_package_items')
      .select('course_id')
      .eq('package_id', package_id);

    if (itemsErr) throw itemsErr;

    // 3. 각 하위 강좌의 수강기록(user_progress) 일괄 자동 생성 (기존 건은 보존)
    if (items && items.length > 0) {
      const progressInserts = items.map((item: any) => ({
        user_id: user.id,
        course_id: item.course_id,
        last_card: 0,
        completed: false,
        updated_at: new Date().toISOString()
      }));

      await adminClient
        .from('user_progress')
        .upsert(progressInserts, { onConflict: 'user_id,course_id' });

      // 당시 활성화되어 있는 기본(Default) 에이전트의 ID를 해당 강좌의 agent_id에 자동으로 연결
      const { data: defaultAgent } = await adminClient
        .from('user_external_agents')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_ai_tutor', true)
        .maybeSingle();

      if (defaultAgent?.id) {
        const courseIds = items.map((item: any) => item.course_id);
        await adminClient
          .from('courses')
          .update({ agent_id: defaultAgent.id })
          .in('id', courseIds);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[CourseSubscribeAPI] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createAdminClient();

    // 1. 사용자의 강좌 구독 정보 페치
    const { data: subs, error: subsErr } = await adminClient
      .from('user_package_subscriptions')
      .select('*, package:course_packages(*, items:course_package_items(course_id))')
      .eq('user_id', user.id);

    if (subsErr) throw subsErr;

    // 2. 각 하위 강좌들의 수강완료 여부 체크를 위해 user_progress 리스트 페치
    const { data: progressList, error: progressErr } = await adminClient
      .from('user_progress')
      .select('course_id, completed')
      .eq('user_id', user.id);

    if (progressErr) throw progressErr;

    const progressMap = new Map(progressList?.map((p: any) => [p.course_id, p.completed]) || []);

    const formatted = (subs || []).map((sub: any) => {
      const pkg = sub.package;
      const items = pkg?.items || [];
      const totalCourses = items.length;
      const completedCourses = items.filter((item: any) => progressMap.get(item.course_id) === true).length;

      return {
        id: sub.id,
        user_id: sub.user_id,
        package_id: sub.package_id,
        created_at: sub.created_at,
        total_courses: totalCourses,
        completed_courses: completedCourses,
        package: {
          id: pkg?.id,
          slug: pkg?.slug,
          title: pkg?.title,
          description: pkg?.description,
          thumbnail: pkg?.thumbnail,
          published: pkg?.published,
          sequential_play: pkg?.sequential_play ?? false,
          force_checkpoint: pkg?.force_checkpoint ?? false,
        }
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('[CourseSubscriptionsAPI] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
