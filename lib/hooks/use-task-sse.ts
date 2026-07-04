'use client';
import { useEffect, useState } from 'react';

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'error';
interface TaskState { status: TaskStatus; result?: unknown; error?: string; }

export function useTaskSSE(taskId: string | null) {
  const [state, setState] = useState<TaskState>({ status: 'pending' });
  useEffect(() => {
    if (!taskId) return;
    const source = new EventSource(`/api/sse?task_id=${taskId}`);
    source.onmessage = (e) => {
      const data = JSON.parse(e.data) as TaskState;
      setState(data);
      if (['completed', 'failed', 'timeout'].includes(data.status)) source.close();
    };
    source.onerror = () => { setState({ status: 'error', error: 'Connection lost' }); source.close(); };
    return () => source.close();
  }, [taskId]);
  return state;
}
