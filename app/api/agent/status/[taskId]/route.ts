import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { getTaskStatus } from '@/lib/api/agent-worker';

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  await connection();
  const { taskId } = await params;
  try {
    const status = await getTaskStatus(taskId);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
