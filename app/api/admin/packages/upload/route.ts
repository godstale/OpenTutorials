import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient, getOrAssignTutorAgentId } from '@/lib/supabase/admin';
import AdmZip from 'adm-zip';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    let manifestData: any = null;
    let thumbnailFileBuffer: Buffer | null = null;
    let thumbnailContentType = '';
    let thumbnailExt = '';

    const contentTypeHeader = request.headers.get('content-type') || '';
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      let manifestContent = '';
      let thumbnailEntry: any = null;

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName.replace(/\\/g, '/');

        if (entryName === 'package-manifest.json') {
          manifestContent = entry.getData().toString('utf8');
        } else if (
          entryName.toLowerCase().startsWith('thumbnail.') || 
          entryName === 'thumbnail.png' || 
          entryName === 'thumbnail.jpg' || 
          entryName === 'thumbnail.jpeg'
        ) {
          thumbnailEntry = entry;
        }
      }

      if (!manifestContent) {
        return NextResponse.json({ error: 'ZIP 파일 내에 package-manifest.json 파일이 존재하지 않습니다.' }, { status: 400 });
      }

      try {
        manifestData = JSON.parse(manifestContent);
      } catch (err: any) {
        return NextResponse.json({ error: 'package-manifest.json JSON 문법 에러: ' + err.message }, { status: 400 });
      }

      // 만약 썸네일 엔트리를 찾지 못했으나 manifest에 thumbnail 경로가 로컬 파일명으로 적혀 있다면 그것을 찾음
      if (!thumbnailEntry && manifestData.thumbnail && !manifestData.thumbnail.startsWith('http')) {
        const localPath = manifestData.thumbnail.replace(/^\.\//, '');
        thumbnailEntry = zipEntries.find(e => e.entryName.replace(/\\/g, '/') === localPath);
      }

      if (thumbnailEntry) {
        thumbnailFileBuffer = thumbnailEntry.getData();
        thumbnailExt = thumbnailEntry.entryName.split('.').pop() || 'png';
        if (thumbnailExt === 'jpg') thumbnailExt = 'jpeg';
        thumbnailContentType = `image/${thumbnailExt}`;
      }
    } else {
      manifestData = await request.json();
    }

    const { title, slug: rawSlug, description, thumbnail: manifestThumbnail, published, courses } = manifestData;

    if (!title || !courses || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: '필수 필드가 누락되었거나 courses 배열이 비어있습니다.' }, { status: 400 });
    }

    const slug = rawSlug || title.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const supabaseAdmin = createAdminClient();

    // 1. 하위 강좌 정보 가공 및 데이터베이스 동기화
    const courseItems = courses.map((c: any) => {
      if (typeof c === 'string') {
        return { slug: c, title: c, description: '', tags: [] };
      }
      return {
        slug: c.slug,
        title: c.title || c.slug,
        description: c.description || '',
        tags: c.tags || []
      };
    });

    for (const item of courseItems) {
      const { data: existing } = await supabaseAdmin
        .from('courses')
        .select('id, agent_id')
        .eq('slug', item.slug)
        .maybeSingle();

      const tutorAgentId = await getOrAssignTutorAgentId('local-user-id', existing?.agent_id);

      if (existing) {
        let { error: updateError } = await supabaseAdmin
          .from('courses')
          .update({
            title: item.title,
            description: item.description || null,
            tags: item.tags,
            agent_id: tutorAgentId,
            updated_at: new Date().toISOString()
          })
          .eq('slug', item.slug);

        // Fallback: If tags column is missing in schema cache, retry without tags
        if (updateError && (
          updateError.message?.includes('tags') ||
          updateError.message?.includes('schema cache')
        )) {
          console.warn(`[PackageUpload] DB schema cache lacks tags column for ${item.slug}. Retrying update without tags...`);
          const { error: retryError } = await supabaseAdmin
            .from('courses')
            .update({
              title: item.title,
              description: item.description || null,
              agent_id: tutorAgentId,
              updated_at: new Date().toISOString()
            })
            .eq('slug', item.slug);
          updateError = retryError;
        }

        if (updateError) {
          throw updateError;
        }
      } else {
        let { error: insertError } = await supabaseAdmin
          .from('courses')
          .insert({
            slug: item.slug,
            title: item.title,
            description: item.description || null,
            tags: item.tags,
            agent_id: tutorAgentId,
            published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Fallback: If tags column is missing in schema cache, retry without tags
        if (insertError && (
          insertError.message?.includes('tags') ||
          insertError.message?.includes('schema cache')
        )) {
          console.warn(`[PackageUpload] DB schema cache lacks tags column for ${item.slug}. Retrying insert without tags...`);
          const { error: retryError } = await supabaseAdmin
            .from('courses')
            .insert({
              slug: item.slug,
              title: item.title,
              description: item.description || null,
              agent_id: tutorAgentId,
              published: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          insertError = retryError;
        }

        if (insertError) {
          throw insertError;
        }
      }
    }

    // 하위 강좌 ID 맵 구성
    const { data: dbCourses, error: coursesErr } = await supabaseAdmin
      .from('courses')
      .select('id, slug')
      .in('slug', courseItems.map((c: any) => c.slug));

    if (coursesErr || !dbCourses || dbCourses.length !== courseItems.length) {
      return NextResponse.json({ error: '매니페스트에 기재된 일부 하위 강좌 정보를 처리할 수 없습니다.' }, { status: 400 });
    }

    const courseMap = new Map(dbCourses.map((c: any) => [c.slug, c.id]));

    let finalThumbnail = manifestThumbnail || 'icon:book';

    // 만약 썸네일 버퍼가 있다면 스토리지에 업로드
    if (thumbnailFileBuffer) {
      try {
        const storagePath = `packages/${slug}/thumbnail.${thumbnailExt}`;
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('courses')
          .upload(storagePath, thumbnailFileBuffer, {
            contentType: thumbnailContentType,
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin
          .storage
          .from('courses')
          .getPublicUrl(storagePath);
        
        finalThumbnail = publicUrl;
      } catch (err: any) {
        console.error('[AdminPackageUpload] Thumbnail storage upload error:', err);
      }
    }

    // 2. 패키지 정보 업서트 (순차재생 sequential_play, 체크포인트 force_checkpoint 필드 추가)
    let packageData: any = null;
    let packageErr: any = null;

    try {
      const res = await supabaseAdmin
        .from('course_packages')
        .upsert({
          slug,
          title,
          description,
          thumbnail: finalThumbnail,
          published: published ?? true,
          sequential_play: manifestData.sequential_play ?? false,
          force_checkpoint: manifestData.force_checkpoint ?? false,
          version: manifestData.version ?? '1.0.0',
          changelog: manifestData.changelog ?? '최초 릴리즈',
          updated_at: new Date().toISOString()
        }, { onConflict: 'slug' })
        .select()
        .single();
      
      packageData = res.data;
      packageErr = res.error;
    } catch (err: any) {
      packageErr = err;
    }

    // 1차 폴백: version / changelog 컬럼이 없는 경우
    if (packageErr && (
      packageErr.message?.includes('changelog') || 
      packageErr.message?.includes('version') || 
      packageErr.message?.includes('schema cache')
    )) {
      console.warn('[AdminPackageUpload] DB schema cache lacks version/changelog columns. Retrying without them...');
      const fallbackPayload: any = {
        slug,
        title,
        description,
        thumbnail: finalThumbnail,
        published: published ?? true,
        sequential_play: manifestData.sequential_play ?? false,
        force_checkpoint: manifestData.force_checkpoint ?? false,
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

    // 2차 폴백: sequential_play / force_checkpoint 컬럼도 없는 경우 (또는 1차 폴백 후에도 계속 에러인 경우)
    if (packageErr && (
      packageErr.message?.includes('sequential_play') || 
      packageErr.message?.includes('force_checkpoint') || 
      packageErr.message?.includes('schema cache')
    )) {
      console.warn('[AdminPackageUpload] DB schema cache lacks sequential_play/force_checkpoint columns. Retrying with ultra fallback...');
      const ultraFallbackPayload: any = {
        slug,
        title,
        description,
        thumbnail: finalThumbnail,
        published: published ?? true,
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

    // 3. 기존 패키지 매핑 아이템 제거 및 재인서트
    await supabaseAdmin.from('course_package_items').delete().eq('package_id', packageData.id);

    const itemsToInsert = courseItems.map((item: any, index: number) => ({
      package_id: packageData.id,
      course_id: courseMap.get(item.slug),
      order_index: index + 1
    }));

    const { error: itemsErr } = await supabaseAdmin.from('course_package_items').insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    return NextResponse.json({ success: true, package: packageData }, { status: 201 });
  } catch (err: any) {
    console.error('[AdminPackageUpload] API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
