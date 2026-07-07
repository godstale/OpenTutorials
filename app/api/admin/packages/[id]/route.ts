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

    // 1. Fetch package detail to get the slug for storage cleanup
    const { data: pkg, error: fetchPkgError } = await supabaseAdmin
      .from('course_packages')
      .select('slug')
      .eq('id', id)
      .maybeSingle();

    if (fetchPkgError) {
      console.error('Fetch package error before delete:', fetchPkgError);
    }

    const slug = pkg?.slug;

    // 2. Delete package itself
    const { error } = await supabaseAdmin
      .from('course_packages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete package error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Clean up files in Supabase Storage for the package slug
    if (slug) {
      try {
        const { data: files, error: listError } = await supabaseAdmin
          .storage
          .from('courses')
          .list(slug);

        if (listError) {
          console.error(`Failed to list storage files for slug ${slug}:`, listError);
        } else if (files && files.length > 0) {
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

    // 4. 패키지 수강 구독, 진행 기록을 함께 정리한다.
    const { error: subsDelError } = await supabaseAdmin
      .from('user_package_subscriptions')
      .delete()
      .eq('package_id', id);
    if (subsDelError) {
      console.error('Failed to delete user_package_subscriptions:', subsDelError);
    }

    const { error: progressDelError } = await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('course_id', id); // user_progress.course_id now maps directly to package_id
    if (progressDelError) {
      console.error('Failed to delete user_progress:', progressDelError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Package API DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
