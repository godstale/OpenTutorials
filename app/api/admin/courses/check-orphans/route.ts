import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const supabaseAdmin = createAdminClient();

    // 1. Fetch all courses
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, thumbnail, created_at')
      .order('created_at', { ascending: false });

    if (coursesError) {
      throw coursesError;
    }

    // 2. Fetch all course_id from package items
    const { data: packageItems, error: itemsError } = await supabaseAdmin
      .from('course_package_items')
      .select('course_id');

    if (itemsError) {
      throw itemsError;
    }

    const mappedCourseIds = new Set(packageItems?.map((item: any) => item.course_id).filter(Boolean));

    // 3. Filter courses not mapped to any package (orphans)
    const orphanedCourses = courses?.filter((c: any) => !mappedCourseIds.has(c.id)) || [];

    return NextResponse.json({ orphanedCourses });
  } catch (error: any) {
    console.error('[CheckOrphansAPI] GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const supabaseAdmin = createAdminClient();
    const body = await request.json().catch(() => ({}));
    let courseIds: string[] = body.courseIds || [];

    // If no specific course IDs provided, fetch all orphans
    if (courseIds.length === 0) {
      const { data: courses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id');

      if (coursesError) throw coursesError;

      const { data: packageItems, error: itemsError } = await supabaseAdmin
        .from('course_package_items')
        .select('course_id');

      if (itemsError) throw itemsError;

      const mappedCourseIds = new Set(packageItems?.map((item: any) => item.course_id).filter(Boolean));
      courseIds = courses?.filter((c: any) => !mappedCourseIds.has(c.id)).map((c: any) => c.id) || [];
    }

    if (courseIds.length === 0) {
      return NextResponse.json({ success: true, cleanedCount: 0 });
    }

    // Fetch details of courses to be deleted (specifically need slug for storage cleanup)
    const { data: coursesToDelete, error: fetchDelError } = await supabaseAdmin
      .from('courses')
      .select('id, slug')
      .in('id', courseIds);

    if (fetchDelError) throw fetchDelError;

    let cleanedCount = 0;

    for (const course of coursesToDelete || []) {
      // 1. Storage files cleanup
      try {
        const { data: files, error: listError } = await supabaseAdmin
          .storage
          .from('courses')
          .list(course.slug);

        if (listError) {
          console.error(`[CleanOrphansAPI] Failed to list files for slug ${course.slug}:`, listError);
        } else if (files && files.length > 0) {
          const filesToRemove = files.map((f: any) => `${course.slug}/${f.name}`);
          const { error: removeError } = await supabaseAdmin
            .storage
            .from('courses')
            .remove(filesToRemove);

          if (removeError) {
            console.error(`[CleanOrphansAPI] Failed to remove storage files for ${course.slug}:`, removeError);
          }
        }
      } catch (storageErr) {
        console.error(`[CleanOrphansAPI] Storage cleanup error for ${course.slug}:`, storageErr);
      }

      // 2. DB delete
      const { error: dbDelError } = await supabaseAdmin
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (dbDelError) {
        console.error(`[CleanOrphansAPI] DB delete error for course ${course.id}:`, dbDelError);
      } else {
        cleanedCount++;
      }
    }

    return NextResponse.json({ success: true, cleanedCount });
  } catch (error: any) {
    console.error('[CheckOrphansAPI] POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
