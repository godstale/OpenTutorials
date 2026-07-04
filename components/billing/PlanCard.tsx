'use client';

import { SubscriptionPlan, PointPackage } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>무제한에 가까운 사용량 제공</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold mb-2">
          {plan.price.toLocaleString()} 원
          <span className="text-sm font-normal text-muted-foreground"> / {plan.duration === 'monthly' ? '월' : '년'}</span>
        </div>
        <ul className="space-y-2 mt-4 text-sm text-muted-foreground">
          <li>✓ 월 {plan.token_limit.toLocaleString()} 토큰 제공</li>
          <li>✓ 모든 기능 무제한 접근</li>
          <li>✓ 우선 실행 큐 배정</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => alert('결제 연동은 Phase 3에서 구현됩니다.')}>
          구독 시작
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PointCard({ pkg }: { pkg: PointPackage }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{pkg.points.toLocaleString()} P</CardTitle>
        {pkg.bonus_points && (
          <CardDescription className="text-primary font-medium">
            + {pkg.bonus_points.toLocaleString()} P 보너스!
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-2xl font-bold mb-2">
          {pkg.price.toLocaleString()} 원
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={() => alert('결제 연동은 Phase 3에서 구현됩니다.')}>
          충전하기
        </Button>
      </CardFooter>
    </Card>
  );
}
