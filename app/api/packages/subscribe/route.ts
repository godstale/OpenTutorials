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

    const { package_id } = await request.json();
    if (!package_id) return NextResponse.json({ error: 'package_id가 필요합니다.' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. 패키지 구독 등록
    const { error: subErr } = await adminClient
      .from('user_package_subscriptions')
      .upsert({ user_id: user.id, package_id }, { onConflict: 'user_id,package_id' });

    if (subErr) throw subErr;

    // 2. 패키지 하위 강좌 ID 조회
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
    console.error('[PackageSubscribeAPI] Error:', err);
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

    // 1. Fetch user subscriptions with package details
    const { data: subs, error: subsErr } = await adminClient
      .from('user_package_subscriptions')
      .select('*, package:course_packages(*, items:course_package_items(course_id))')
      .eq('user_id', user.id);

    if (subsErr) throw subsErr;

    // 2. Fetch all user progress records for progress check
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
        }
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('[PackageSubscriptionsAPI] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

