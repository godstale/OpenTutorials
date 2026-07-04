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
      .from('courses')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update course error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, course: data });
  } catch (error: any) {
    console.error('Course API PATCH error:', error);
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
      // Check if there are active user progress records for this course
      const { count, error: countError } = await supabaseAdmin
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id);

      if (countError) {
        console.error('Check user progress error:', countError);
      } else if (count && count > 0) {
        return NextResponse.json(
          { error: 'subscribers_exist', subscriberCount: count },
          { status: 409 }
        );
      }
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete course error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Course API DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
