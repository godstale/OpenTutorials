import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient, getOrAssignTutorAgentId } from '@/lib/supabase/admin';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { TocNode } from '@/lib/types';

const STORAGE_DIR = path.join(process.cwd(), 'public', 'courses');

function validateTocRecursive(
  nodes: TocNode[],
  pathStr: string,
  collectedFilenames: string[]
): { valid: boolean; error?: string } {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const currentPath = `${pathStr}[${i}]`;

    if (!node.type || !['chapter', 'section', 'subsection'].includes(node.type)) {
      return {
        valid: false,
        error: `${currentPath} 항목에 유효하지 않거나 누락된 type이 있습니다. ('chapter', 'section', 'subsection' 중 하나여야 합니다.)`,
      };
    }

    if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
      return {
        valid: false,
        error: `${currentPath} 항목에 title이 누락되었습니다.`,
      };
    }
    if (!node.description || typeof node.description !== 'string' || !node.description.trim()) {
      return {
        valid: false,
        error: `${currentPath} 항목에 description이 누락되었습니다.`,
      };
    }

    const cleanFilename = node.filename ? node.filename.replace(/\.(mdx?|json)$/, '') : '';
    if (node.title.trim() === cleanFilename) {
      return {
        valid: false,
        error: `${currentPath} 항목의 제목이 파일명('${cleanFilename}')과 동일합니다. 사용자가 읽기 좋은 적절한 한글 제목으로 수정해주세요.`,
      };
    }

    if (node.description.trim() === '강좌 상세 카드를 확인하세요.') {
      return {
        valid: false,
        error: `${currentPath} 항목의 요약 설명이 기본값('강좌 상세 카드를 확인하세요.')으로 방치되어 있습니다. 적절한 설명을 작성해주세요.`,
      };
    }

    if (node.filename) {
      collectedFilenames.push(node.filename);
    }

    if (node.children) {
      if (!Array.isArray(node.children)) {
        return {
          valid: false,
          error: `${currentPath} 항목의 children이 배열이 아닙니다.`,
        };
      }
      const childResult = validateTocRecursive(node.children, `${currentPath}.children`, collectedFilenames);
      if (!childResult.valid) {
        return { valid: false, error: childResult.error };
      }
    }
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (e: any) {
      return NextResponse.json({ error: `ZIP 파싱 실패: ${e.message}` }, { status: 400 });
    }

    const zipEntries = zip.getEntries();

    let manifestContent = '';
    let configContent = '';
    let hasWiki = false;
    let thumbnailEntry: any = null;
    const actualCardFiles = new Set<string>();
    const fileMap = new Map<string, Buffer>();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName.replace(/\\/g, '/');
      const entryBuffer = entry.getData();

      fileMap.set(entryName, entryBuffer);

      if (entryName === 'package-manifest.json') {
        manifestContent = entryBuffer.toString('utf8');
      } else if (entryName === 'config.json') {
        configContent = entryBuffer.toString('utf8');
      } else if (entryName === 'wiki.md') {
        hasWiki = true;
      } else if (entryName.startsWith('cards/')) {
        actualCardFiles.add(entryName.substring('cards/'.length));
      } else if (
        entryName.toLowerCase().startsWith('thumbnail.') ||
        entryName === 'thumbnail.png' ||
        entryName === 'thumbnail.jpg' ||
        entryName === 'thumbnail.jpeg'
      ) {
        thumbnailEntry = entry;
      }
    }

    // 1. 필수 파일 존재 검증
    if (!manifestContent) {
      return NextResponse.json({ error: 'package-manifest.json 파일이 존재하지 않습니다.' }, { status: 400 });
    }
    if (!configContent) {
      return NextResponse.json({ error: 'config.json 파일이 존재하지 않습니다.' }, { status: 400 });
    }
    if (!hasWiki) {
      return NextResponse.json({ error: 'wiki.md 파일이 존재하지 않습니다.' }, { status: 400 });
    }

    // 2. manifest JSON 파싱 및 기본 검증
    let manifestData: any;
    try {
      manifestData = JSON.parse(manifestContent);
    } catch (err: any) {
      return NextResponse.json({ error: 'package-manifest.json JSON 문법 에러: ' + err.message }, { status: 400 });
    }

    const { title, slug: rawSlug, description, published, bundler_protocol_version, target_age, category, tags } = manifestData;
    if (!title) {
      return NextResponse.json({ error: 'package-manifest.json에 title 필드가 누락되었습니다.' }, { status: 400 });
    }
    if (tags && !Array.isArray(tags)) {
      return NextResponse.json({ error: 'package-manifest.json의 tags는 문자열 배열(Array) 형태여야 합니다.' }, { status: 400 });
    }

    // 3. config JSON 파싱 및 TOC-Cards 매칭 검증
    let configJson: any;
    try {
      configJson = JSON.parse(configContent);
    } catch (err: any) {
      return NextResponse.json({ error: 'config.json JSON 문법 에러: ' + err.message }, { status: 400 });
    }

    if (!configJson.cards || !Array.isArray(configJson.cards) || configJson.cards.length === 0) {
      return NextResponse.json({ error: 'config.json 내에 cards 배열이 누락되었거나 비어있습니다.' }, { status: 400 });
    }
    if (!configJson.toc || !Array.isArray(configJson.toc)) {
      return NextResponse.json({ error: 'config.json 내에 toc(목차) 필드가 누락되었습니다.' }, { status: 400 });
    }

    const collectedFilenames: string[] = [];
    const validationResult = validateTocRecursive(configJson.toc, 'toc', collectedFilenames);
    if (!validationResult.valid) {
      return NextResponse.json({ error: `TOC 검증 실패: ${validationResult.error}` }, { status: 400 });
    }

    const cardsSet = new Set<string>(configJson.cards);
    if (cardsSet.size !== configJson.cards.length) {
      return NextResponse.json({ error: 'cards 배열에 중복된 파일 이름이 존재합니다.' }, { status: 400 });
    }

    const collectedSet = new Set(collectedFilenames);
    if (collectedSet.size !== collectedFilenames.length) {
      return NextResponse.json({ error: 'TOC 내에 중복된 filename이 존재합니다.' }, { status: 400 });
    }

    if (cardsSet.size !== collectedSet.size) {
      return NextResponse.json({
        error: `cards 개수(${cardsSet.size})와 toc의 filename 개수(${collectedSet.size})가 일치하지 않습니다.`
      }, { status: 400 });
    }

    for (const card of configJson.cards) {
      if (!collectedSet.has(card)) {
        return NextResponse.json({ error: `cards 배열 파일명 '${card}'이(가) toc의 최하단 노드 filename에 정의되어 있지 않습니다.` }, { status: 400 });
      }
      if (!actualCardFiles.has(card)) {
        return NextResponse.json({ error: `cards/ 폴더 내에 '${card}' 파일이 실제 존재하지 않습니다.` }, { status: 400 });
      }

      // 동영상 JSON 카드 검증
      if (card.endsWith('.json')) {
        const cardBuffer = fileMap.get(`cards/${card}`);
        if (cardBuffer) {
          try {
            const cardJson = JSON.parse(cardBuffer.toString('utf8'));
            if (!cardJson.title || typeof cardJson.title !== 'string') {
              return NextResponse.json({ error: `동영상 카드 '${card}'에 유효한 title이 누락되었습니다.` }, { status: 400 });
            }
            if (cardJson.type !== 'video') {
              return NextResponse.json({ error: `동영상 카드 '${card}'의 type은 반드시 'video'여야 합니다.` }, { status: 400 });
            }
            if (!cardJson.video_info || typeof cardJson.video_info !== 'object') {
              return NextResponse.json({ error: `동영상 카드 '${card}'에 video_info 객체가 누락되었습니다.` }, { status: 400 });
            }
            const vi = cardJson.video_info;
            if (vi.provider !== 'youtube') {
              return NextResponse.json({ error: `동영상 카드 '${card}'의 video_info.provider는 'youtube'만 지원됩니다.` }, { status: 400 });
            }
            if (!vi.video_id || typeof vi.video_id !== 'string') {
              return NextResponse.json({ error: `동영상 카드 '${card}'의 video_info.video_id가 누락되었거나 문자열이 아닙니다.` }, { status: 400 });
            }
            if (vi.subtitles && !Array.isArray(vi.subtitles)) {
              return NextResponse.json({ error: `동영상 카드 '${card}'의 video_info.subtitles는 배열이어야 합니다.` }, { status: 400 });
            }
          } catch (err: any) {
            return NextResponse.json({ error: `동영상 카드 '${card}' JSON 파싱 에러: ${err.message}` }, { status: 400 });
          }
        }
      }
    }

    const slug = rawSlug || title.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const supabaseAdmin = createAdminClient();

    // 4. 기존 에이전트 정보 유지 혹은 할당
    const { data: existingPkg } = await supabaseAdmin
      .from('course_packages')
      .select('id, agent_id')
      .eq('slug', slug)
      .maybeSingle();

    const tutorAgentId = await getOrAssignTutorAgentId('local-user-id', existingPkg?.agent_id);

    // 5. 썸네일 및 정적 리소스 로컬 파일시스템에 저장
    const packageDir = path.join(STORAGE_DIR, slug);
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }

    // ZIP 내부의 모든 파일들을 로컬 폴더에 압축 해제
    for (const [entryName, entryBuffer] of fileMap.entries()) {
      const targetFilePath = path.join(packageDir, entryName);
      fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
      fs.writeFileSync(targetFilePath, entryBuffer);
    }

    let finalThumbnail = manifestData.thumbnail || 'icon:book';
    if (thumbnailEntry) {
      finalThumbnail = `/courses/${slug}/${thumbnailEntry.entryName}`;
    }

    // 6. DB에 강좌 패키지 정보 upsert (toc, cards 필드 추가)
    const { data: packageData, error: packageErr } = await supabaseAdmin
      .from('course_packages')
      .upsert({
        slug,
        title,
        description: description || null,
        thumbnail: finalThumbnail,
        published: published ?? true,
        sequential_play: manifestData.sequential_play ?? false,
        force_checkpoint: manifestData.force_checkpoint ?? false,
        version: manifestData.version ?? '1.0.0',
        changelog: manifestData.changelog ?? '최초 릴리즈',
        bundler_protocol_version: bundler_protocol_version ?? '1.0.0',
        target_age: target_age ?? '전연령',
        category: category ?? '기타',
        agent_id: tutorAgentId,
        tags: Array.isArray(tags) ? tags : [],
        toc: configJson.toc,
        cards: configJson.cards,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (packageErr) throw packageErr;

    return NextResponse.json({ success: true, package: packageData, packageId: packageData.id }, { status: 201 });
  } catch (err: any) {
    console.error('[AdminPackageUpload] API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
