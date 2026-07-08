import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user progress and join with course details including package mappings
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('user_progress')
      .select('*, course:course_packages(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Fetch progress error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Progress API] GET returning progress entries count:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Progress GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course_id, last_card, completed } = body;
    console.log('[Progress API] POST progress update request:', { course_id, last_card, completed, user_id: user.id });

    // Fetch existing progress to compute max_card and completed
    let oldMax = 0;
    let oldCompleted = false;
    try {
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('max_card, last_card, completed')
        .eq('user_id', user.id)
        .eq('course_id', course_id)
        .maybeSingle();

      if (existingProgress) {
        // Fallback to last_card if max_card is not defined
        oldMax = existingProgress.max_card ?? existingProgress.last_card ?? 0;
        oldCompleted = existingProgress.completed ?? false;
      }
    } catch (err) {
      console.warn('[Progress API] Could not fetch existing progress for max_card calculation:', err);
    }

    const newMax = Math.max(oldMax, last_card ?? 0);
    const finalCompleted = completed !== undefined ? completed : oldCompleted;

    let data = null;
    let error = null;

    try {
      // 1. Try upserting with max_card
      const { data: resData, error: resErr } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id,
          last_card: last_card ?? 0,
          max_card: newMax,
          completed: finalCompleted,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,course_id' })
        .select()
        .single();

      data = resData;
      error = resErr;

      // Handle the case where max_card column doesn't exist or is missing in schema cache
      if (resErr && (resErr.message.includes('max_card') || resErr.code === '42703' || resErr.code === 'PGRST204')) {
        console.warn('[Progress API] max_card column missing or cached out in database. Falling back to basic upsert.');
        const { data: fbData, error: fbErr } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            course_id,
            last_card: last_card ?? 0,
            completed: finalCompleted,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' })
          .select()
          .single();
        data = fbData;
        error = fbErr;
      }
    } catch (err: any) {
      console.error('[Progress API] Error during upsert with max_card:', err);
      // Fallback
      const { data: fbData, error: fbErr } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id,
          last_card: last_card ?? 0,
          completed: finalCompleted,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,course_id' })
        .select()
        .single();
      data = fbData;
      error = fbErr;
    }

    if (error) {
      console.error('Upsert progress error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Progress API] POST progress upsert successful for course:', course_id);
    return NextResponse.json({ success: true, progress: data });
  } catch (error: any) {
    console.error('Progress POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await connection();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { course_id } = await request.json();
    if (!course_id) {
      return NextResponse.json({ error: 'Missing course_id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', course_id);

    if (error) {
      console.error('Delete progress error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Progress DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
