import { Suspense } from 'react';
import { connection } from 'next/server';
import LearnPageClient from './client';
import { dummyCourses } from '@/lib/dummy-data';
import { createAdminClient } from '@/lib/supabase/admin';
import { serialize } from 'next-mdx-remote/serialize';

import { createClient } from '@/lib/supabase/server';
import { TocNode } from '@/lib/types';

function findTocNodeByFilename(nodes: TocNode[], filename: string): TocNode | null {
  for (const node of nodes) {
    if (node.filename === filename) {
      return node;
    }
    if (node.children && Array.isArray(node.children)) {
      const found = findTocNodeByFilename(node.children, filename);
      if (found) return found;
    }
  }
  return null;
}

async function LearnPageContent({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ card?: string; package?: string }>;
}) {
  await connection();
  const { slug: rawSlug } = await params;
  const { card, package: packageSlugRaw } = await searchParams;
  const slug = decodeURIComponent(rawSlug);
  const packageSlug = packageSlugRaw ? decodeURIComponent(packageSlugRaw) : null;
  const cardIndex = card ? Math.max(0, parseInt(card, 10) - 1) : 0;
  console.log('[LearnServer] Initializing learning page for course slug:', slug, 'initial card:', cardIndex, 'package slug:', packageSlug);

  // 1. Fetch course using admin client to bypass RLS (allows admin preview of unpublished courses too)
  const supabase = createAdminClient();
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  let course = null;
  let userProgress = null;
  let isUpdated = false;
  let coursePackage = null;

  if (packageSlug) {
    try {
      const { data: pkgData } = await supabase
        .from('course_packages')
        .select('*')
        .eq('slug', packageSlug)
        .maybeSingle();
      if (pkgData) {
        coursePackage = pkgData;
        console.log('[LearnServer] Loaded course package settings:', {
          sequential_play: coursePackage.sequential_play,
          force_checkpoint: coursePackage.force_checkpoint
        });
      }
    } catch (err) {
      console.error('[LearnServer] Error loading course package setting:', err);
    }
  }
  
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.warn('[LearnServer] Supabase DB fetch warning (checking dummy fallback):', error.message || error);
    } else {
      course = data;
      console.log('[LearnServer] Successfully loaded course from DB:', course.title);

      if (user) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .single();

        if (progressData) {
          userProgress = progressData;
          if (course.updated_at && progressData.updated_at) {
            isUpdated = new Date(course.updated_at) > new Date(progressData.updated_at);
            console.log('[LearnServer] Update status check:', {
              courseUpdated: course.updated_at,
              progressUpdated: progressData.updated_at,
              isUpdated
            });
          }
        }
      }
    }
  } catch (dbErr) {
    console.error('[LearnServer] DB error fetching course slug:', slug, dbErr);
  }

  if (!course) {
    console.log('[LearnServer] Course not found in database. Checking local fallback dummyCourses for slug:', slug);
    // Fallback to dummyCourses for local/static courses
    const dummy = dummyCourses.find((c) => c.slug === slug);
    if (!dummy) {
      console.error('[LearnServer] Course NOT found in both database and dummyCourses for slug:', slug);
      return <div className="p-8 text-center text-muted-foreground">강좌를 찾을 수 없습니다. 입력하신 강좌 슬러그가 올바른지 확인해주세요.</div>;
    }

    console.log('[LearnServer] Found dummy fallback course:', dummy.title);
    // For dummy courses, return a default mock card content
    return (
      <LearnPageClient
        slug={slug}
        course={dummy}
        cards={[{
          title: dummy.title,
          content: dummy.description || "",
        }]}
        initialCardIndex={cardIndex}
        isUpdated={false}
      />
    );
  }

  if (course.disabled) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4 text-center max-w-md mx-auto min-h-[400px]">
        <h2 className="text-2xl font-bold text-destructive">비활성화된 강좌입니다.</h2>
        <p className="text-muted-foreground">이 강좌는 비활성화되어 학습을 계속할 수 없습니다. 관리자에게 문의해 주세요.</p>
      </div>
    );
  }

  let configJson: { 
    cards?: string[]; 
    toc?: TocNode[]; 
    checkpoints?: Array<{ afterCard: string; prompt: string }>;
  } | null = null;
  console.log('[LearnServer] Attempting to load config.json from Supabase Storage for:', slug);
  try {
    const { data: fileData, error: storageErr } = await supabase.storage
      .from('courses')
      .download(`${slug}/config.json`);

    if (storageErr) {
      console.warn('[LearnServer] Storage warning downloading config.json (may be empty or not found):', storageErr);
    }

    if (fileData) {
      const text = await fileData.text();
      configJson = JSON.parse(text);
      console.log('[LearnServer] config.json successfully loaded. Cards list:', configJson?.cards);
    }
  } catch (err) {
    console.error('[LearnServer] Critical error loading config.json:', err);
  }

  const cardFiles: string[] = configJson?.cards || [];
  const cards = [];

  // 3. Download and serialize each MDX card file defined in config.json
  console.log('[LearnServer] Processing MDX cards. Total cards expected:', cardFiles.length);
  for (let i = 0; i < cardFiles.length; i++) {
    const filename = cardFiles[i];
    console.log(`[LearnServer] Downloading card ${i + 1}/${cardFiles.length}: ${filename}`);
    try {
      const storagePath = filename.startsWith('cards/') ? `${slug}/${filename}` : `${slug}/cards/${filename}`;
      const { data: cardData, error: cardDlErr } = await supabase.storage
        .from('courses')
        .download(storagePath);

      if (cardDlErr) {
        console.error(`[LearnServer] Failed to download card file ${filename}:`, cardDlErr);
        continue;
      }

      if (cardData) {
        const text = await cardData.text();
        
        let cardTitle = filename.replace(/\.(mdx?|json)$/, '');
        if (configJson && Array.isArray(configJson.toc)) {
          const tocItem = findTocNodeByFilename(configJson.toc, filename);
          if (tocItem && tocItem.title) {
            cardTitle = tocItem.title;
          }
        }

        if (filename.endsWith('.json')) {
          console.log(`[LearnServer] Parsing JSON for card: ${filename}`);
          try {
            const parsedJson = JSON.parse(text);
            cards.push({
              filename,
              title: cardTitle,
              type: 'video' as const,
              videoInfo: parsedJson.video_info || null,
              content: text,
            });
            console.log(`[LearnServer] Card ${filename} successfully parsed as video.`);
          } catch (err: any) {
            console.error(`[LearnServer] JSON parse failed for card ${filename}:`, err);
            const errText = `### 동영상 강좌 에러\n동영상 카드 파일 \`${filename}\`을(를) 파싱하는 중 오류가 발생했습니다.\n\`\`\`\n${err.message}\n\`\`\``;
            const mdxSource = await serialize(errText);
            cards.push({
              filename,
              title: cardTitle,
              mdxSource,
              content: text,
            });
          }
        } else {
          console.log(`[LearnServer] Serializing MDX for card: ${filename}`);
          const mdxSource = await serialize(text);
          cards.push({
            filename,
            title: cardTitle,
            mdxSource,
            content: text,
          });
          console.log(`[LearnServer] Card ${filename} successfully serialized.`);
        }
      }
    } catch (err) {
      console.error(`[LearnServer] Exception occurred processing card ${filename}:`, err);
    }
  }

  // Fallback if no cards were loaded
  if (cards.length === 0) {
    console.warn('[LearnServer] No cards downloaded or compiled. Providing default setup card.');
    const fallbackText = `### ${course.title}\n이 강좌는 준비 중이거나 콘텐츠가 없습니다.`;
    const mdxSource = await serialize(fallbackText);
    cards.push({
      title: "준비 중",
      mdxSource,
    });
  }

  console.log('[LearnServer] Completed preparing learn page. Cards count:', cards.length);

  return (
    <LearnPageClient
      slug={slug}
      course={course}
      cards={cards}
      initialCardIndex={cardIndex}
      isUpdated={isUpdated}
      userProgress={userProgress}
      checkpoints={configJson?.checkpoints || []}
      coursePackage={coursePackage}
    />
  );
}

export default function LearnPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ card?: string; package?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">강좌를 불러오는 중...</div>}>
      <LearnPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

