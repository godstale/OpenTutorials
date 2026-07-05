import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import AdmZip from 'adm-zip';
import { TocNode } from '@/lib/types';

function validateTocRecursive(
  nodes: TocNode[],
  path: string,
  collectedFilenames: string[]
): { valid: boolean; error?: string } {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const currentPath = `${path}[${i}]`;

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

    const type = request.nextUrl.searchParams.get('type');

    if (type === 'package') {
      const formData = await request.formData();
      const manifestStr = formData.get('manifest') as string;
      const thumbnailFile = formData.get('thumbnail') as File | null;

      if (!manifestStr) {
        return NextResponse.json({ error: '매니페스트 데이터가 없습니다.' }, { status: 400 });
      }

      let manifestData: any;
      try {
        manifestData = JSON.parse(manifestStr);
      } catch (err: any) {
        return NextResponse.json({ error: `매니페스트 JSON 파싱 에러: ${err.message}` }, { status: 400 });
      }

      const { 
        title, 
        slug: rawSlug, 
        description, 
        thumbnail: manifestThumbnail, 
        published,
        bundler_protocol_version,
        target_age,
        category
      } = manifestData;
      if (!title) {
        return NextResponse.json({ error: '패키지 매니페스트에 title이 누락되었습니다.' }, { status: 400 });
      }

      const packageSlug = rawSlug || title.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
      const supabaseAdmin = createAdminClient();

      // 썸네일 업로드 처리
      let finalPackageThumbnail = manifestThumbnail || 'icon:book';
      if (thumbnailFile) {
        try {
          const ext = thumbnailFile.name.split('.').pop() || 'png';
          const storagePath = `packages/${packageSlug}/thumbnail.${ext}`;
          const buffer = Buffer.from(await thumbnailFile.arrayBuffer());
          const { error: uploadError } = await supabaseAdmin
            .storage
            .from('courses')
            .upload(storagePath, buffer, {
              contentType: thumbnailFile.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabaseAdmin
            .storage
            .from('courses')
            .getPublicUrl(storagePath);
          
          finalPackageThumbnail = publicUrl;
        } catch (err: any) {
          console.error('[AdminPackageUpload] Package thumbnail storage upload error:', err);
        }
      }

      let packageData: any = null;
      let packageErr: any = null;

      try {
        const res = await supabaseAdmin
          .from('course_packages')
          .upsert({
            slug: packageSlug,
            title,
            description,
            thumbnail: finalPackageThumbnail,
            published: published ?? true,
            sequential_play: manifestData.sequential_play ?? false,
            force_checkpoint: manifestData.force_checkpoint ?? false,
            version: manifestData.version ?? '1.0.0',
            changelog: manifestData.changelog ?? '최초 릴리즈',
            bundler_protocol_version: bundler_protocol_version ?? '1.0.0',
            target_age: target_age ?? '전연령',
            category: category ?? '기타',
            updated_at: new Date().toISOString()
          }, { onConflict: 'slug' })
          .select()
          .single();
        
        packageData = res.data;
        packageErr = res.error;
      } catch (err: any) {
        packageErr = err;
      }

      // Fallbacks
      if (packageErr && (
        packageErr.message?.includes('changelog') || 
        packageErr.message?.includes('version') || 
        packageErr.message?.includes('schema cache')
      )) {
        console.warn('[AdminPackageUpload] DB schema cache lacks version/changelog columns. Retrying without them...');
        const fallbackPayload: any = {
          slug: packageSlug,
          title,
          description,
          thumbnail: finalPackageThumbnail,
          published: published ?? true,
          sequential_play: manifestData.sequential_play ?? false,
          force_checkpoint: manifestData.force_checkpoint ?? false,
          bundler_protocol_version: bundler_protocol_version ?? '1.0.0',
          target_age: target_age ?? '전연령',
          category: category ?? '기타',
          updated_at: new Date().toISOString()
        };
        
        try {
          const resFallback = await supabaseAdmin
            .from('course_packages')
            .upsert(fallbackPayload, { onConflict: 'slug' })
            .select()
            .single();
            
          packageData = resFallback.data;
          packageErr = resFallback.error;
        } catch (fallbackErr: any) {
          packageErr = fallbackErr;
        }
      }

      if (packageErr && (
        packageErr.message?.includes('sequential_play') || 
        packageErr.message?.includes('force_checkpoint') || 
        packageErr.message?.includes('schema cache')
      )) {
        console.warn('[AdminPackageUpload] DB schema cache lacks sequential_play/force_checkpoint columns. Retrying with ultra fallback...');
        const ultraFallbackPayload: any = {
          slug: packageSlug,
          title,
          description,
          thumbnail: finalPackageThumbnail,
          published: published ?? true,
          bundler_protocol_version: bundler_protocol_version ?? '1.0.0',
          target_age: target_age ?? '전연령',
          category: category ?? '기타',
          updated_at: new Date().toISOString()
        };
        
        try {
          const resUltra = await supabaseAdmin
            .from('course_packages')
            .upsert(ultraFallbackPayload, { onConflict: 'slug' })
            .select()
            .single();
            
          packageData = resUltra.data;
          packageErr = resUltra.error;
        } catch (ultraFallbackErr: any) {
          packageErr = ultraFallbackErr;
        }
      }

      if (packageErr) throw packageErr;

      // 매핑 데이터 초기화
      const { error: deleteErr } = await supabaseAdmin
        .from('course_package_items')
        .delete()
        .eq('package_id', packageData.id);

      if (deleteErr) {
        return NextResponse.json({ error: `기존 패키지 강좌 연결 삭제 실패: ${deleteErr.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, packageId: packageData.id, packageSlug });
    } 
    
    if (type === 'course') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const packageId = formData.get('packageId') as string;
      const courseSlug = formData.get('courseSlug') as string;
      const orderIndexStr = formData.get('orderIndex') as string;
      const tagsStr = formData.get('tags') as string;

      if (!file || !packageId || !courseSlug || !orderIndexStr) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
      }

      const orderIndex = parseInt(orderIndexStr, 10);
      let tags: string[] = [];
      try {
        if (tagsStr) tags = JSON.parse(tagsStr);
      } catch {}

      const buffer = Buffer.from(await file.arrayBuffer());
      let childZip: AdmZip;
      try {
        childZip = new AdmZip(buffer);
      } catch (err: any) {
        return NextResponse.json({ error: `하위 강좌 ZIP 파싱 실패: ${err.message}` }, { status: 400 });
      }

      const childEntries = childZip.getEntries();
      let childConfigJson: any = null;
      let hasWiki = false;
      const childFilesToUpload: { path: string; buffer: Buffer; contentType: string }[] = [];
      const actualCardFiles = new Set<string>();

      for (const entry of childEntries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName.replace(/\\/g, '/');
        const entryBuffer = entry.getData();

        if (entryName === 'config.json') {
          try {
            childConfigJson = JSON.parse(entryBuffer.toString('utf8'));
          } catch (err: any) {
            return NextResponse.json({ error: `config.json JSON 파싱 에러: ${err.message}` }, { status: 400 });
          }
        } else if (entryName === 'wiki.md') {
          hasWiki = true;
        }

        if (entryName.startsWith('cards/')) {
          actualCardFiles.add(entryName.substring('cards/'.length));
        }

        let contentType = 'application/octet-stream';
        if (entryName.endsWith('.md') || entryName.endsWith('.mdx')) contentType = 'text/markdown';
        else if (entryName.endsWith('.json')) contentType = 'application/json';
        else if (entryName.endsWith('.png')) contentType = 'image/png';
        else if (entryName.endsWith('.jpg') || entryName.endsWith('.jpeg')) contentType = 'image/jpeg';

        childFilesToUpload.push({
          path: entryName,
          buffer: entryBuffer,
          contentType,
        });
      }

      if (!childConfigJson) {
        return NextResponse.json({ error: 'config.json 파일이 존재하지 않습니다.' }, { status: 400 });
      }
      if (!hasWiki) {
        return NextResponse.json({ error: 'wiki.md 파일이 존재하지 않습니다.' }, { status: 400 });
      }

      // Validate child config.json
      if (!childConfigJson.cards || !Array.isArray(childConfigJson.cards) || childConfigJson.cards.length === 0) {
        return NextResponse.json({ error: 'config.json 내에 cards 배열이 누락되었거나 비어있습니다.' }, { status: 400 });
      }
      if (!childConfigJson.toc || !Array.isArray(childConfigJson.toc)) {
        return NextResponse.json({ error: 'config.json 내에 toc(목차) 필드가 누락되었습니다.' }, { status: 400 });
      }

      const collectedFilenames: string[] = [];
      const validationResult = validateTocRecursive(childConfigJson.toc, `${courseSlug}.toc`, collectedFilenames);
      if (!validationResult.valid) {
        return NextResponse.json({ error: `검증 실패: ${validationResult.error}` }, { status: 400 });
      }

      const cardsSet = new Set(childConfigJson.cards);
      if (cardsSet.size !== childConfigJson.cards.length) {
        return NextResponse.json({ error: 'cards 배열에 중복된 파일 이름이 존재합니다.' }, { status: 400 });
      }

      const collectedSet = new Set(collectedFilenames);
      if (collectedSet.size !== collectedFilenames.length) {
        return NextResponse.json({ error: 'toc 구조 내에 중복된 filename이 존재합니다.' }, { status: 400 });
      }

      if (cardsSet.size !== collectedSet.size) {
        return NextResponse.json({
          error: `cards 개수(${cardsSet.size})와 toc에서 수집된 filename 개수(${collectedSet.size})가 일치하지 않습니다.`
        }, { status: 400 });
      }

      for (const card of childConfigJson.cards) {
        if (!collectedSet.has(card)) {
          return NextResponse.json({
            error: `cards 배열 파일명 '${card}'이(가) toc의 최하단 노드 filename에 정의되어 있지 않습니다.`
          }, { status: 400 });
        }
        if (!actualCardFiles.has(card)) {
          return NextResponse.json({
            error: `cards/ 폴더 내에 config.json에 정의된 '${card}' 파일이 실제 존재하지 않습니다.`
          }, { status: 400 });
        }

        // 동영상 JSON 카드 추가 검증
        if (card.endsWith('.json')) {
          const cardFile = childFilesToUpload.find(f => f.path === `cards/${card}`);
          if (cardFile) {
            try {
              const cardJson = JSON.parse(cardFile.buffer.toString('utf8'));
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

      const supabaseAdmin = createAdminClient();

      // 썸네일 업로드 처리
      let thumbnailUrl = childConfigJson.thumbnail || 'icon:book';
      if (childConfigJson.thumbnail && !childConfigJson.thumbnail.startsWith('http') && !childConfigJson.thumbnail.startsWith('icon:')) {
        const localThumbPath = childConfigJson.thumbnail.replace(/^\.\//, '');
        const thumbFile = childFilesToUpload.find(f => f.path === localThumbPath);
        if (thumbFile) {
          try {
            const ext = localThumbPath.split('.').pop() || 'png';
            const storagePath = `${courseSlug}/thumbnail.${ext}`;
            const { error: uploadError } = await supabaseAdmin
              .storage
              .from('courses')
              .upload(storagePath, thumbFile.buffer, {
                contentType: thumbFile.contentType,
                upsert: true,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseAdmin
              .storage
              .from('courses')
              .getPublicUrl(storagePath);
            
            thumbnailUrl = publicUrl;
          } catch (err: any) {
            console.error(`[CourseUpload] Child thumbnail upload failed for ${courseSlug}:`, err);
          }
        }
      }

      // 강좌 DB 등록/업데이트
      const { data: existingCourse } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('slug', courseSlug)
        .maybeSingle();

      let courseId: string;
      if (existingCourse) {
        courseId = existingCourse.id;
        let { error: updateError } = await supabaseAdmin
          .from('courses')
          .update({
            title: childConfigJson.title || courseSlug,
            description: childConfigJson.description || null,
            thumbnail: thumbnailUrl,
            tags,
            updated_at: new Date().toISOString()
          })
          .eq('slug', courseSlug);

        // Fallback: If tags column is missing in schema cache, retry without tags
        if (updateError && (
          updateError.message?.includes('tags') ||
          updateError.message?.includes('schema cache')
        )) {
          console.warn(`[CourseUpload] DB schema cache lacks tags column for ${courseSlug}. Retrying update without tags...`);
          const { error: retryError } = await supabaseAdmin
            .from('courses')
            .update({
              title: childConfigJson.title || courseSlug,
              description: childConfigJson.description || null,
              thumbnail: thumbnailUrl,
              updated_at: new Date().toISOString()
            })
            .eq('slug', courseSlug);
          updateError = retryError;
        }

        if (updateError) {
          return NextResponse.json({ error: `하위 강좌 ${courseSlug} DB 업데이트 실패: ${updateError.message}` }, { status: 500 });
        }
      } else {
        let { data: insertedCourse, error: insertError } = await supabaseAdmin
          .from('courses')
          .insert({
            slug: courseSlug,
            title: childConfigJson.title || courseSlug,
            description: childConfigJson.description || null,
            thumbnail: thumbnailUrl,
            tags,
            published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        // Fallback: If tags column is missing in schema cache, retry without tags
        if (insertError && (
          insertError.message?.includes('tags') ||
          insertError.message?.includes('schema cache')
        )) {
          console.warn(`[CourseUpload] DB schema cache lacks tags column for ${courseSlug}. Retrying insert without tags...`);
          const retryResult = await supabaseAdmin
            .from('courses')
            .insert({
              slug: courseSlug,
              title: childConfigJson.title || courseSlug,
              description: childConfigJson.description || null,
              thumbnail: thumbnailUrl,
              published: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          insertedCourse = retryResult.data;
          insertError = retryResult.error;
        }

        if (insertError) {
          return NextResponse.json({ error: `하위 강좌 ${courseSlug} DB 등록 실패: ${insertError.message}` }, { status: 500 });
        }
        courseId = insertedCourse!.id;
      }

      // 스토리지 파일 업로드
      const CONCURRENCY_LIMIT = 5;
      const MAX_RETRIES = 3;

      const uploadFileWithRetry = async (file: typeof childFilesToUpload[0], attempt = 1): Promise<void> => {
        const storagePath = `${courseSlug}/${file.path}`;
        try {
          const { error: uploadError } = await supabaseAdmin
            .storage
            .from('courses')
            .upload(storagePath, file.buffer, {
              contentType: file.contentType,
              upsert: true,
            });

          if (uploadError) throw uploadError;
        } catch (error: any) {
          console.error(`Attempt ${attempt} failed to upload ${storagePath}:`, error);
          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            return uploadFileWithRetry(file, attempt + 1);
          }
          throw new Error(`Failed to upload file ${file.path} to storage: ${error.message || error}`);
        }
      };

      const chunks: typeof childFilesToUpload[] = [];
      for (let i = 0; i < childFilesToUpload.length; i += CONCURRENCY_LIMIT) {
        chunks.push(childFilesToUpload.slice(i, i + CONCURRENCY_LIMIT));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => uploadFileWithRetry(file)));
      }

      // 매핑 추가
      const { error: mappingErr } = await supabaseAdmin
        .from('course_package_items')
        .insert({
          package_id: packageId,
          course_id: courseId,
          order_index: orderIndex
        });

      if (mappingErr) {
        return NextResponse.json({ error: `패키지 강좌 연결 실패: ${mappingErr.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, courseId });
    }

    return NextResponse.json({ error: '유효하지 않은 업로드 타입입니다.' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Unified upload API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
