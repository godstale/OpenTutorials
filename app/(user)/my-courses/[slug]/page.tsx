import { Suspense } from 'react';
import { connection } from 'next/server';
import MyCourseDetailPageClient from './client';
import { dummyCourses } from '@/lib/dummy-data';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function MyCourseDetailPageContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  console.log('[MyCourseDetailServer] Fetching user course details for slug:', slug);

  const adminSupabase = createAdminClient();
  const userSupabase = await createClient();

  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-xl font-semibold text-destructive">로그인이 필요합니다.</p>
      </div>
    );
  }

  let course = null;
  let isDummy = false;
  let userProgress = null;

  try {
    const { data, error } = await adminSupabase
      .from('course_packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.warn('[MyCourseDetailServer] Database course query returned error. Checking dummy courses:', error.message);
    } else {
      course = data;
      console.log('[MyCourseDetailServer] Found course in database:', course.title);
    }
  } catch (err) {
    console.error('[MyCourseDetailServer] DB connection error:', err);
  }

  if (!course) {
    // Fallback to dummyCourses
    const dummy = dummyCourses.find((c) => c.slug === slug);
    if (!dummy) {
      console.error('[MyCourseDetailServer] Course not found in both DB and Dummy data for slug:', slug);
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-xl font-semibold text-destructive">강좌를 찾을 수 없습니다.</p>
          <p className="text-muted-foreground text-sm">입력하신 주소({slug})가 올바른지 확인해주세요.</p>
        </div>
      );
    }
    course = JSON.parse(JSON.stringify(dummy));
    isDummy = true;
    console.log('[MyCourseDetailServer] Fallback to dummy course data:', course.title);
  } else {
    // Fetch toc from config.json if not dummy
    try {
      const { data: fileData, error: storageErr } = await adminSupabase.storage
        .from('courses')
        .download(`${slug}/config.json`);
      
      if (!storageErr && fileData) {
        const text = await fileData.text();
        const configJson = JSON.parse(text);
        if (configJson.toc) {
          course.toc = configJson.toc;
        } else if (configJson.cards) {
          course.toc = configJson.cards.map((filename: string) => ({
            filename,
            title: filename.replace('.mdx', '').replace('.md', ''),
            description: '강좌 상세 카드를 확인하세요.'
          }));
        }
      }
    } catch (err) {
      console.error('[MyCourseDetailServer] Failed to load config.json for toc:', err);
    }
  }

  // Load progress
  if (!isDummy) {
    try {
      const { data: progressData, error: progressErr } = await adminSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();
      
      if (!progressErr) {
        userProgress = progressData;
      }
    } catch (err) {
      console.error('[MyCourseDetailServer] Failed to fetch progress:', err);
    }
  }

  // Fallback progress if none in DB (especially for dummy courses)
  if (!userProgress) {
    userProgress = {
      id: 'dummy-progress',
      user_id: user.id,
      course_id: course.id,
      last_card: 0,
      max_card: 0,
      completed: false,
      updated_at: new Date().toISOString()
    };
  }

  return (
    <MyCourseDetailPageClient 
      slug={slug} 
      course={course} 
      isDummy={isDummy}
      initialProgress={userProgress}
    />
  );
}

export default function MyCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">강좌 정보를 불러오는 중...</div>}>
      <MyCourseDetailPageContent params={params} />
    </Suspense>
  );
}
