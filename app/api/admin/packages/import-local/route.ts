import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient, getOrAssignTutorAgentId } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'public', 'courses');

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const { 
      slug, 
      title, 
      description, 
      version, 
      author, 
      category, 
      tags, 
      target_age, 
      thumbnail,
      bundler_protocol_version,
      license,
      license_file
    } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug 필드가 누락되었습니다.' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'title 필드가 누락되었습니다.' }, { status: 400 });
    }

    const packageDir = path.join(STORAGE_DIR, slug);
    if (!fs.existsSync(packageDir)) {
      return NextResponse.json({ 
        error: `로컬 강좌 폴더가 존재하지 않습니다: public/courses/${slug}` 
      }, { status: 404 });
    }

    const configPath = path.join(packageDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ 
        error: `config.json 파일이 존재하지 않습니다: public/courses/${slug}/config.json` 
      }, { status: 400 });
    }

    let configJson: any;
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      configJson = JSON.parse(configContent);
    } catch (err: any) {
      return NextResponse.json({ 
        error: `config.json 파싱 실패: ${err.message}` 
      }, { status: 400 });
    }

    if (!configJson.cards || !Array.isArray(configJson.cards)) {
      return NextResponse.json({ 
        error: 'config.json 내에 cards 배열이 누락되었거나 비어있습니다.' 
      }, { status: 400 });
    }
    if (!configJson.toc || !Array.isArray(configJson.toc)) {
      return NextResponse.json({ 
        error: 'config.json 내에 toc(목차) 필드가 누락되었습니다.' 
      }, { status: 400 });
    }

    // wiki.md 로드
    let finalWiki = '';
    const wikiPath = path.join(packageDir, 'wiki.md');
    if (fs.existsSync(wikiPath)) {
      finalWiki = fs.readFileSync(wikiPath, 'utf8');
    }

    // 썸네일 경로 감지
    let finalThumbnail = thumbnail || 'icon:book';
    const possibleThumbnails = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg'];
    for (const file of possibleThumbnails) {
      if (fs.existsSync(path.join(packageDir, file))) {
        finalThumbnail = `/courses/${slug}/${file}`;
        break;
      }
    }

    if (license_file) {
      const licensePath = path.join(packageDir, license_file);
      if (!fs.existsSync(licensePath)) {
        return NextResponse.json({ 
          error: `package-manifest.json에 지정된 라이선스 파일 '${license_file}'이(가) 로컬 폴더에 존재하지 않습니다.` 
        }, { status: 400 });
      }
    }

    // author 정규화
    let authorObj: any = { nickname: 'Unknown' };
    if (typeof author === 'string') {
      authorObj = { nickname: author };
    } else if (author && typeof author === 'object') {
      authorObj = {
        nickname: author.nickname || author.name || 'Unknown',
        email: author.email || null,
        website: author.website || author.homepage || null,
      };
    }

    const supabaseAdmin = createAdminClient();

    // 에이전트 정보 조회/할당
    const { data: existingPkg } = await supabaseAdmin
      .from('course_packages')
      .select('id, agent_id')
      .eq('slug', slug)
      .maybeSingle();

    const tutorAgentId = await getOrAssignTutorAgentId('local-user-id', existingPkg?.agent_id);

    // DB에 강좌 패키지 정보 upsert
    const { data: packageData, error: packageErr } = await supabaseAdmin
      .from('course_packages')
      .upsert({
        slug,
        title,
        description: description || null,
        thumbnail: finalThumbnail,
        published: true,
        sequential_play: configJson.sequential_play ?? false,
        force_checkpoint: configJson.force_checkpoint ?? false,
        version: version || '1.0.0',
        changelog: '로컬 복원 등록',
        bundler_protocol_version: bundler_protocol_version || '1.1.3',
        target_age: target_age || '전연령',
        category: category || '기타',
        agent_id: tutorAgentId,
        tags: Array.isArray(tags) ? tags : [],
        license: license || 'CC-BY-NC-4.0',
        license_file: license_file || null,
        author: authorObj,
        author_id: 'local-user-id',
        author_nickname: authorObj.nickname,
        author_email: authorObj.email || null,
        author_homepage: authorObj.website || null,
        source: 'GITHUB',
        toc: configJson.toc,
        cards: configJson.cards,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (packageErr) throw packageErr;

    // course_wiki 테이블에 wiki.md 콘텐츠 적재 (AI Tutor 연동용)
    if (finalWiki) {
      await supabaseAdmin
        .from('course_wiki')
        .upsert({
          course_id: packageData.id,
          content: finalWiki,
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_id' });
    }

    return NextResponse.json({ success: true, package: packageData, packageId: packageData.id }, { status: 201 });
  } catch (err: any) {
    console.error('[ImportLocalPackage] API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
