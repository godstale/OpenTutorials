const WORKER_URL = process.env.AGENT_WORKER_URL;
const WORKER_KEY = process.env.AGENT_WORKER_API_KEY;

interface RunProfileTaskParams {
  subscription_id: string;
  profile_id: string;
  user_memory: string;
  llm_model: string;
  cron_expression?: string;
}

export async function runProfileTask(params: RunProfileTaskParams): Promise<{ task_id: string }> {
  if (!WORKER_URL) throw new Error('AGENT_WORKER_URL is not configured');
  const res = await fetch(`${WORKER_URL}/tasks/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': WORKER_KEY ?? '' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getTaskStatus(taskId: string) {
  if (!WORKER_URL) throw new Error('AGENT_WORKER_URL is not configured');
  const res = await fetch(`${WORKER_URL}/tasks/${taskId}/status`, {
    headers: { 'X-API-Key': WORKER_KEY ?? '' },
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.json();
}

export async function getWorkerHealth() {
  if (!WORKER_URL) return { status: 'error', active_tasks: 0 };
  try {
    const res = await fetch(`${WORKER_URL}/health`, {
      headers: { 'X-API-Key': WORKER_KEY ?? '' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { status: 'error', active_tasks: 0 };
    return res.json();
  } catch {
    return { status: 'error', active_tasks: 0 };
  }
}
