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

    let buffer: Buffer;
    let source = '파일';
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      const reqSource = formData.get('source') as string;
      if (reqSource) {
        source = reqSource;
      }
    } else {
      buffer = Buffer.from(await request.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json({ error: '업로드된 파일이 비어 있습니다.' }, { status: 400 });
      }
    }
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

    // 2. manifest JSON 파싱 및 기본 검증
    let manifestData: any;
    try {
      manifestData = JSON.parse(manifestContent);
    } catch (err: any) {
      return NextResponse.json({ error: 'package-manifest.json JSON 문법 에러: ' + err.message }, { status: 400 });
    }

    const { title, slug: rawSlug, description, published, bundler_protocol_version, target_age, category, tags, author, courses, license, license_file } = manifestData;
    if (!title) {
      return NextResponse.json({ error: 'package-manifest.json에 title 필드가 누락되었습니다.' }, { status: 400 });
    }
    const targetAgeRegex = /^(all|\d+|\d+-\d+|\d+\+)$/;
    if (target_age && !targetAgeRegex.test(String(target_age).trim())) {
      return NextResponse.json({ error: 'package-manifest.json의 target_age가 규격(all, 10+, 8-13 등)에 맞지 않습니다.' }, { status: 400 });
    }
    if (!author || typeof author !== 'object') {
      return NextResponse.json({ error: 'package-manifest.json에 author (작성자 정보) 객체가 누락되었거나 유효하지 않습니다.' }, { status: 400 });
    }
    if (!author.nickname || typeof author.nickname !== 'string' || !author.nickname.trim()) {
      return NextResponse.json({ error: 'package-manifest.json의 author.nickname 필드가 누락되었거나 유효하지 않습니다.' }, { status: 400 });
    }
    if (tags && !Array.isArray(tags)) {
      return NextResponse.json({ error: 'package-manifest.json의 tags는 문자열 배열(Array) 형태여야 합니다.' }, { status: 400 });
    }

    const allowedLicenses = [
      'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0',
      'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0', 'CC0-1.0', 'all-rights-reserved', 'custom'
    ];
    if (license && !allowedLicenses.includes(license)) {
      return NextResponse.json({ error: 'package-manifest.json의 license 값이 올바르지 않습니다.' }, { status: 400 });
    }
    if (license === 'custom' && (!license_file || typeof license_file !== 'string' || !license_file.trim())) {
      return NextResponse.json({ error: 'license가 custom일 때 license_file 필드는 필수입니다.' }, { status: 400 });
    }
    if (license_file) {
      if (!fileMap.has(license_file)) {
        return NextResponse.json({ error: `package-manifest.json에 지정된 라이선스 파일 '${license_file}'이(가) ZIP 루트에 존재하지 않습니다.` }, { status: 400 });
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

    const packageDir = path.join(STORAGE_DIR, slug);
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }

    const isPackageZip = Array.isArray(courses) && courses.length > 0;

    let finalToc: any[] = [];
    let finalCards: string[] = [];
    let finalWiki = '';

    if (isPackageZip) {
      // --- 통합 패키지 ZIP 처리 흐름 (하위 강좌 ZIP들을 병합) ---
      let mergedWikiContent = '';

      for (const courseItem of courses) {
        const childSlug = courseItem.slug;
        if (!childSlug) {
          return NextResponse.json({ error: 'courses 배열 내의 하위 강좌에 slug 필드가 없습니다.' }, { status: 400 });
        }

        const childZipEntry = zip.getEntry(`courses/${childSlug}.zip`);
        if (!childZipEntry) {
          return NextResponse.json({ error: `하위 강좌 ZIP 파일 'courses/${childSlug}.zip'이 존재하지 않습니다.` }, { status: 400 });
        }

        const childZipBuffer = childZipEntry.getData();
        let childZip: AdmZip;
        try {
          childZip = new AdmZip(childZipBuffer);
        } catch (e: any) {
          return NextResponse.json({ error: `하위 강좌 '${childSlug}.zip' 파싱 실패: ${e.message}` }, { status: 400 });
        }

        const childEntries = childZip.getEntries();
        let childConfigContent = '';
        let childWikiContent = '';

        for (const childEntry of childEntries) {
          if (childEntry.isDirectory) continue;
          const childEntryName = childEntry.entryName.replace(/\\/g, '/');
          const childEntryBuffer = childEntry.getData();

          if (childEntryName === 'config.json') {
            childConfigContent = childEntryBuffer.toString('utf8');
          } else if (childEntryName === 'wiki.md') {
            childWikiContent = childEntryBuffer.toString('utf8');
          } else if (childEntryName.startsWith('cards/')) {
            const cardFilename = childEntryName.substring('cards/'.length);
            const destPath = path.join(packageDir, 'cards', childSlug, cardFilename);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, childEntryBuffer);
          } else if (childEntryName.startsWith('images/')) {
            const imageFilename = childEntryName.substring('images/'.length);
            const destPath = path.join(packageDir, 'images', imageFilename);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, childEntryBuffer);
          }
        }

        if (!childConfigContent) {
          return NextResponse.json({ error: `하위 강좌 '${childSlug}'에 config.json이 존재하지 않습니다.` }, { status: 400 });
        }

        let childConfigJson: any;
        try {
          childConfigJson = JSON.parse(childConfigContent);
        } catch (err: any) {
          return NextResponse.json({ error: `하위 강좌 '${childSlug}' config.json 파싱 실패: ` + err.message }, { status: 400 });
        }

        const prefixFilename = (filename: string) => {
          if (filename.startsWith(childSlug + '/')) return filename;
          return `${childSlug}/${filename}`;
        };

        const rewriteTocNode = (node: any) => {
          if (node.filename) {
            node.filename = prefixFilename(node.filename);
          }
          if (Array.isArray(node.children)) {
            node.children.forEach(rewriteTocNode);
          }
        };

        if (Array.isArray(childConfigJson.toc)) {
          childConfigJson.toc.forEach(rewriteTocNode);
          finalToc.push(...childConfigJson.toc);
        }

        if (Array.isArray(childConfigJson.cards)) {
          const rewrittenCards = childConfigJson.cards.map(prefixFilename);
          finalCards.push(...rewrittenCards);
        }

        if (childWikiContent) {
          mergedWikiContent += `## Part: ${courseItem.title || childSlug}\n\n` + childWikiContent + `\n\n`;
        }
      }

      finalWiki = mergedWikiContent;

      // 병합된 config.json 및 wiki.md 저장
      const mergedConfig = {
        cards: finalCards,
        toc: finalToc
      };
      fs.writeFileSync(path.join(packageDir, 'config.json'), JSON.stringify(mergedConfig, null, 2), 'utf8');
      if (finalWiki) {
        fs.writeFileSync(path.join(packageDir, 'wiki.md'), finalWiki, 'utf8');
      }
      fs.writeFileSync(path.join(packageDir, 'package-manifest.json'), manifestContent, 'utf8');
      if (license_file) {
        const licenseBuffer = fileMap.get(license_file);
        if (licenseBuffer) {
          fs.writeFileSync(path.join(packageDir, license_file), licenseBuffer);
        }
      }

    } else {
      // --- 단일 강좌 ZIP 처리 흐름 (기존 방식) ---
      if (!configContent) {
        return NextResponse.json({ error: 'config.json 파일이 존재하지 않습니다. (단일 강좌 구조)' }, { status: 400 });
      }
      if (!hasWiki) {
        return NextResponse.json({ error: 'wiki.md 파일이 존재하지 않습니다. (단일 강좌 구조)' }, { status: 400 });
      }

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
      }

      // ZIP 내부의 모든 파일들을 로컬 폴더에 압축 해제
      for (const [entryName, entryBuffer] of fileMap.entries()) {
        const targetFilePath = path.join(packageDir, entryName);
        fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
        fs.writeFileSync(targetFilePath, entryBuffer);
      }

      finalToc = configJson.toc;
      finalCards = configJson.cards;
      
      const wikiBuffer = fileMap.get('wiki.md');
      if (wikiBuffer) {
        finalWiki = wikiBuffer.toString('utf8');
      }
    }

    // 썸네일 파일 존재 검사 및 처리
    let finalThumbnail = manifestData.thumbnail || 'icon:book';
    const finalThumbnailEntry = thumbnailEntry || zip.getEntry('thumbnail.png') || zip.getEntry('thumbnail.jpg') || zip.getEntry('thumbnail.jpeg');
    if (finalThumbnailEntry) {
      const ext = finalThumbnailEntry.entryName.split('.').pop() || 'png';
      const destPath = path.join(packageDir, `thumbnail.${ext}`);
      fs.writeFileSync(destPath, finalThumbnailEntry.getData());
      finalThumbnail = `/courses/${slug}/thumbnail.${ext}`;
    }

    // 6. DB에 강좌 패키지 정보 upsert
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
        bundler_protocol_version: bundler_protocol_version ?? '1.1.3',
        target_age: target_age ?? 'all',
        category: category ?? 'Etc',
        agent_id: tutorAgentId,
        tags: Array.isArray(tags) ? tags : [],
        license: license || 'CC-BY-NC-4.0',
        license_file: license_file || null,
        author: author,
        author_id: 'local-user-id',
        author_nickname: author.nickname,
        author_email: author.email || null,
        author_homepage: author.website || null,
        source: source,
        toc: finalToc,
        cards: finalCards,
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
    console.error('[AdminPackageUpload] API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
