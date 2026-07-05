import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('course_packages')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update package error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, package: data });
  } catch (error: any) {
    console.error('Package API PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const supabaseAdmin = createAdminClient();

    if (!force) {
      // Check if there are active user package subscription records for this package
      const { count, error: countError } = await supabaseAdmin
        .from('user_package_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', id);

      if (countError) {
        console.error('Check user package subscriptions error:', countError);
      } else if (count && count > 0) {
        return NextResponse.json(
          { error: 'subscribers_exist', subscriberCount: count },
          { status: 409 }
        );
      }
    }

    // 1. Fetch associated courses and their slugs
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('course_package_items')
      .select('course_id, courses(slug)')
      .eq('package_id', id);

    if (itemsError) {
      console.error('Fetch package items error:', itemsError);
    }

    const courseIds = items ? items.map((item: any) => item.course_id).filter(Boolean) as string[] : [];
    const courseSlugs = items ? items.map((item: any) => (item.courses as any)?.slug).filter(Boolean) as string[] : [];

    // 2. Delete package itself
    const { error } = await supabaseAdmin
      .from('course_packages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete package error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Delete associated courses from DB
    if (courseIds.length > 0) {
      const { error: coursesDelError } = await supabaseAdmin
        .from('courses')
        .delete()
        .in('id', courseIds);

      if (coursesDelError) {
        console.error('Failed to delete associated courses from database:', coursesDelError);
      }

      // 4. Clean up files in Supabase Storage for each course slug
      for (const slug of courseSlugs) {
        try {
          const { data: files, error: listError } = await supabaseAdmin
            .storage
            .from('courses')
            .list(slug);

          if (listError) {
            console.error(`Failed to list storage files for slug ${slug}:`, listError);
            continue;
          }

          if (files && files.length > 0) {
            const filesToRemove = files.map((f: any) => `${slug}/${f.name}`);
            const { error: removeError } = await supabaseAdmin
              .storage
              .from('courses')
              .remove(filesToRemove);

            if (removeError) {
              console.error(`Failed to remove storage files for slug ${slug}:`, removeError);
            } else {
              console.log(`Successfully cleaned up storage for slug ${slug}`);
            }
          }
        } catch (storageErr) {
          console.error(`Error deleting storage folder for slug ${slug}:`, storageErr);
        }
      }
    }

    // 5. 패키지-강좌 매핑, 수강 구독, 진행 기록을 함께 정리한다.
    //    (안내 문구는 이미 "진행 정보가 완전히 삭제됩니다"라고 안내하고 있었으나
    //     실제로는 정리되지 않던 버그를 수정한다.)
    const { error: itemsDelError } = await supabaseAdmin
      .from('course_package_items')
      .delete()
      .eq('package_id', id);
    if (itemsDelError) {
      console.error('Failed to delete course_package_items:', itemsDelError);
    }

    const { error: subsDelError } = await supabaseAdmin
      .from('user_package_subscriptions')
      .delete()
      .eq('package_id', id);
    if (subsDelError) {
      console.error('Failed to delete user_package_subscriptions:', subsDelError);
    }

    if (courseIds.length > 0) {
      const { error: progressDelError } = await supabaseAdmin
        .from('user_progress')
        .delete()
        .in('course_id', courseIds);
      if (progressDelError) {
        console.error('Failed to delete user_progress:', progressDelError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Package API DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
