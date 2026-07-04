import type { AIWorkerInstance } from '@/lib/types';

// TODO: Replace with API call to /api/admin/workers
export const dummyWorkers: AIWorkerInstance[] = [
  {
    id: 'worker-001',
    name: 'Hermes Worker #1',
    endpoint: 'http://localhost:8001',
    status: 'running',
    profile_count: 5,
    active_tasks: 3,
    created_at: '2026-05-01T09:00:00Z',
    last_heartbeat: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'worker-002',
    name: 'Hermes Worker #2',
    endpoint: 'http://localhost:8002',
    status: 'stopped',
    profile_count: 5,
    active_tasks: 0,
    created_at: '2026-05-15T09:00:00Z',
    last_heartbeat: new Date(Date.now() - 3600000).toISOString(),
  },
];
