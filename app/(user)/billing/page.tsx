import { Suspense } from 'react';
import Link from 'next/link';
import { dummyPointPackages } from '@/lib/dummy-data';
import { PointCard } from '@/components/billing/PlanCard';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscriptions } from '@/lib/api/hydra-subscriptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Server, Coins, Bot } from 'lucide-react';
import { SERVICE_TYPE_LABELS } from '@/lib/dummy-data';
import { Skeleton } from '@/components/ui/skeleton';

async function BillingContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const subscriptions = user ? await getUserSubscriptions(user.id) : [];

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const totalHostingCost = activeSubscriptions.reduce((sum, s) => sum + s.service.hosting_fee_monthly, 0);

  const estimatedTokenCostThisMonth = 12400;
  const totalEstimated = totalHostingCost + estimatedTokenCostThisMonth;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">결제 및 요금제</h1>
        <p className="text-muted-foreground mt-2">호스팅 비용과 토큰 사용 비용을 확인하고 관리하세요.</p>
      </div>

      {/* 이번 달 예상 청구 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">이번 달 예상 청구</h2>
        <Card className="max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Server className="size-4" /> 호스팅 비용
              </span>
              <span className="font-medium">₩{totalHostingCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Coins className="size-4" /> 토큰 사용 비용 (예상)
              </span>
              <span className="font-medium">₩{estimatedTokenCostThisMonth.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold text-base">
              <span>합계</span>
              <span className="text-primary text-xl">₩{totalEstimated.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">* 결제 연동은 Phase 3에서 구현됩니다.</p>
          </CardContent>
        </Card>
      </section>

      {/* 구독 중인 호스팅 서비스 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">구독 중인 호스팅 서비스</h2>
        {activeSubscriptions.length === 0 ? (
          <p className="text-muted-foreground">구독 중인 서비스가 없습니다.</p>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {activeSubscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{sub.service.name}</CardTitle>
                    <Badge variant="secondary">{SERVICE_TYPE_LABELS[sub.service.service_type]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bot className="size-4" /> {sub.service.profiles.length}개 프로파일
                    </span>
                    <span>₩{sub.service.token_cost_per_1k}/1K 토큰</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-medium">
                      월 호스팅: <span className="text-primary">₩{sub.service.hosting_fee_monthly.toLocaleString()}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 text-xs"
                      asChild
                    >
                      <Link href="/my-features">구독 취소</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 토큰 충전 */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">토큰 충전</h2>
        <p className="text-muted-foreground text-sm mb-6">
          토큰은 AI 에이전트의 LLM 사용 비용으로 차감됩니다.
          서비스별 토큰 단가에 따라 실제 사용량이 계산됩니다.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dummyPointPackages.map((pkg) => (
            <PointCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      <div>
        <Skeleton className="h-9 w-48 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-4 w-96 mt-2 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* 이번 달 예상 청구 skeleton */}
      <section>
        <Skeleton className="h-7 w-48 mb-6 bg-zinc-200 dark:bg-zinc-800" />
        <Card className="max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-3 w-48 bg-zinc-200 dark:bg-zinc-800" />
          </CardContent>
        </Card>
      </section>

      {/* 구독 중인 호스팅 서비스 skeleton */}
      <section>
        <Skeleton className="h-7 w-60 mb-6 bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-4 max-w-2xl">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 토큰 충전 skeleton */}
      <section>
        <Skeleton className="h-7 w-24 mb-2 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-4 w-2/3 mb-6 bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <Skeleton className="h-10 w-full mt-4 bg-zinc-200 dark:bg-zinc-800" />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}
