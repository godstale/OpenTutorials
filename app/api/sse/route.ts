import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskStatus } from '@/lib/api/agent-worker';

export async function GET(request: Request) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');
  if (!taskId) return new Response('task_id required', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let attempts = 0;
      const poll = async () => {
        if (attempts++ >= 120) { send({ status: 'timeout' }); controller.close(); return; }
        try {
          const status = await getTaskStatus(taskId);
          send(status);
          if (status.status === 'completed' || status.status === 'failed') { controller.close(); return; }
          setTimeout(poll, 1000);
        } catch {
          send({ status: 'error', error: 'Failed to get task status' });
          controller.close();
        }
      };
      poll();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
