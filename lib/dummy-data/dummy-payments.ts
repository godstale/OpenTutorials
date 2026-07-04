import type { PaymentRecord, SubscriptionPlan, PointPackage } from '@/lib/types';

// TODO: Replace with API calls
export const dummyPayments: PaymentRecord[] = [
  { id: 'pay-001', user_id: 'user-002', user_email: 'alice@example.com', type: 'point_charge', amount: 10000, points: 10000, status: 'completed', created_at: '2026-06-10T14:23:00Z' },
  { id: 'pay-002', user_id: 'user-003', user_email: 'bob@example.com', type: 'subscription', amount: 29900, status: 'completed', created_at: '2026-06-09T11:05:00Z' },
  { id: 'pay-003', user_id: 'user-004', user_email: 'charlie@example.com', type: 'point_charge', amount: 50000, points: 52000, status: 'completed', created_at: '2026-06-08T16:47:00Z' },
  { id: 'pay-004', user_id: 'user-002', user_email: 'alice@example.com', type: 'subscription', amount: 29900, status: 'refunded', created_at: '2026-06-01T09:12:00Z' },
];

export const dummySubscriptionPlans: SubscriptionPlan[] = [
  { id: 'plan-monthly', name: '월간 구독', duration: 'monthly', price: 29900, token_limit: 1000000 },
  { id: 'plan-yearly', name: '연간 구독', duration: 'yearly', price: 299000, token_limit: 15000000 },
];

export const dummyPointPackages: PointPackage[] = [
  { id: 'pkg-001', points: 5000, price: 5000 },
  { id: 'pkg-002', points: 10000, price: 10000 },
  { id: 'pkg-003', points: 30000, price: 30000, bonus_points: 1500 },
  { id: 'pkg-004', points: 100000, price: 100000, bonus_points: 10000 },
];
