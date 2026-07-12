import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connection();
  const { slug } = await params;
  try {
    const supabase = createAdminClient();
    
    // 1. 통합 패키지(강좌) 데이터 조회 (sequential_play, force_checkpoint, toc, cards 포함)
    const { data: pkg, error } = await supabase
      .from('course_packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: '강좌를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 로그인되어 있다면 사용자의 전체 수강 상태 파악을 위해 progress 정보 로드
    let userSubscribed = false;
    let userProgress = null;
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

      const { data: progressData } = await userClient
        .from('user_progress')
        .select('*')
        .eq('course_id', pkg.id)
        .maybeSingle();
      
      userProgress = progressData || null;

      const { data: agentsData } = await userClient
        .from('user_external_agents')
        .select('id, name, agent_type, is_ai_tutor');
      externalAgents = agentsData || [];
    }

    let licenseFileExists = false;
    if (pkg.license_file) {
      const licensePath = path.join(process.cwd(), 'public', 'courses', slug, pkg.license_file);
      licenseFileExists = fs.existsSync(licensePath);
    }

    return NextResponse.json({
      ...pkg,
      sequential_play: pkg.sequential_play ?? false,
      force_checkpoint: pkg.force_checkpoint ?? false,
      user_subscribed: userSubscribed,
      user_progress: userProgress,
      external_agents: externalAgents,
      license_file_exists: licenseFileExists,
      // 하위 호환성을 위한 courses 빈 배열 폴백
      courses: []
    });
  } catch (err: any) {
    console.error('[CourseDetailAPI] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
