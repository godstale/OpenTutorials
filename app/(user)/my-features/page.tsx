import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscriptions } from '@/lib/api/hydra-subscriptions';
import SubscriptionCard from './subscription-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

async function MyFeaturesContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const subscriptions = user ? await getUserSubscriptions(user.id) : [];
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">호스팅 관리</h1>
        <p className="text-muted-foreground mt-2">
          현재 {activeCount}개의 HydraAgent 서비스가 활성화되어 있습니다.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          구독 중인 호스팅 서비스가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyFeaturesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <Skeleton className="h-9 w-48 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-4 w-64 mt-2 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Skeleton className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MyFeaturesPage() {
  return (
    <Suspense fallback={<MyFeaturesSkeleton />}>
      <MyFeaturesContent />
    </Suspense>
  );
}
