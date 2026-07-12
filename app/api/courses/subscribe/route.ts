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
    const package_id = body.package_id || body.course_id; // Support both package_id and course_id
    if (!package_id) return NextResponse.json({ error: 'package_id 또는 course_id가 필요합니다.' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. 강좌(패키지) 구독 등록
    const { error: subErr } = await adminClient
      .from('user_package_subscriptions')
      .upsert({ user_id: user.id, package_id }, { onConflict: 'user_id,package_id' });

    if (subErr) throw subErr;

    // 2. 패키지 자체의 수강기록(user_progress) 자동 생성 (기존 건은 보존)
    await adminClient
      .from('user_progress')
      .upsert({
        user_id: user.id,
        course_id: package_id, // course_id 컬럼에 package_id 값을 대입하여 호환 유지
        last_card: 0,
        completed: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,course_id' });

    // 당시 활성화되어 있는 기본(Default) 에이전트의 ID를 해당 패키지의 agent_id에 자동으로 연결
    const { data: defaultAgent } = await adminClient
      .from('user_external_agents')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_ai_tutor', true)
      .maybeSingle();

    if (defaultAgent?.id) {
      const { data: currentPkg } = await adminClient
        .from('course_packages')
        .select('agent_id')
        .eq('id', package_id)
        .maybeSingle();

      if (!currentPkg?.agent_id) {
        await adminClient
          .from('course_packages')
          .update({ agent_id: defaultAgent.id })
          .eq('id', package_id);
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

    // 1. Fetch user subscriptions with package details
    const { data: subs, error: subsErr } = await adminClient
      .from('user_package_subscriptions')
      .select('*, package:course_packages(*)')
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
      const totalCourses = 1;
      const completedCourses = progressMap.get(sub.package_id) === true ? 1 : 0;

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
          agent_id: pkg?.agent_id,
          author_nickname: pkg?.author_nickname,
        }
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('[CourseSubscriptionsAPI] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
