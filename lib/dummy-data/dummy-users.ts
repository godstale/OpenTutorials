import type { AdminUser } from '@/lib/types';

// TODO: Replace with API call to /api/admin/users
export const dummyAdminUsers: AdminUser[] = [
  { id: 'user-002', email: 'alice@example.com', nickname: 'Alice', points: 8500, subscription_status: 'active', subscription_expires_at: '2026-07-09', is_admin: false, total_spent: 39900, feature_count: 3, created_at: '2026-04-15T10:00:00Z' },
  { id: 'user-003', email: 'bob@example.com', nickname: 'Bob', points: 2100, subscription_status: 'active', subscription_expires_at: '2026-07-09', is_admin: false, total_spent: 29900, feature_count: 1, created_at: '2026-05-02T14:30:00Z' },
  { id: 'user-004', email: 'charlie@example.com', nickname: 'Charlie', points: 52000, subscription_status: 'none', is_admin: false, total_spent: 50000, feature_count: 5, created_at: '2026-05-20T09:15:00Z' },
  { id: 'user-005', email: 'david@example.com', nickname: 'David', points: 0, subscription_status: 'expired', is_admin: false, total_spent: 5000, feature_count: 0, created_at: '2026-06-01T11:00:00Z' },
];
