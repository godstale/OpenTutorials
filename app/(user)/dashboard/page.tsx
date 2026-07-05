import { Suspense } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Bot, Coins, Server, Zap, ArrowRight, GraduationCap, Award, BookOpen } from 'lucide-react';
import { dummyHydraStats } from '@/lib/dummy-data';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserSubscriptions } from '@/lib/api/hydra-subscriptions';
import { ROUTES } from '@/lib/constants/routes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SERVICE_TYPE_LABELS } from '@/lib/dummy-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CourseIcon } from '@/components/ui/course-icon';

async function DashboardContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminSupabase = createAdminClient();
  const [subscriptions, { data: externalAgents }, { data: userProgress }, { data: packageSubs }] = user
    ? await Promise.all([
        getUserSubscriptions(user.id),
        supabase.from('user_external_agents').select('id, status'),
        adminSupabase.from('user_progress').select('*, course:courses(*, course_package_items(package_id))').eq('user_id', user.id),
        adminSupabase.from('user_package_subscriptions').select('*, package:course_packages(*, items:course_package_items(course_id))').eq('user_id', user.id)
      ])
    : [[], { data: [] }, { data: [] }, { data: [] }];
  
  const externalAgentsCount = externalAgents?.length ?? 0;
  const onlineCount = externalAgents?.filter((a: { status: string }) => a.status === 'online').length ?? 0;
  
  // Filter out courses that belong to any package so they don't show up as individual courses
  const activeProgress = (userProgress || []).filter(
    (p: any) => !p.completed && (!p.course?.course_package_items || p.course.course_package_items.length === 0)
  );
  
  const activePackagesCount = packageSubs?.length ?? 0;
  
  // Calculate total active courses count: individual active courses + subscribed packages
  const totalActiveCoursesCount = activeProgress.length + activePackagesCount;
  
  const completedCoursesCount = userProgress?.filter((p: { completed: boolean }) => p.completed).length ?? 0;

  // Create progress map to check completed courses
  const progressMap = new Map((userProgress || []).map((p: any) => [p.course_id, p.completed]));

  // Create unified learning items: active individual courses + subscribed packages
  const unifiedLearningItems = [
    ...activeProgress.map((p: any) => ({
      id: `course-${p.id}`,
      type: 'course' as const,
      slug: p.course.slug,
      title: p.course.title,
      description: p.course.description || '',
      thumbnail: p.course.thumbnail,
      currentCard: p.max_card ?? p.last_card ?? 0,
      totalCards: 10,
      updatedAt: p.updated_at
    })),
    ...(packageSubs || []).map((sub: any) => {
      const pkg = sub.package;
      const items = pkg?.items || [];
      const totalCourses = items.length;
      const completedCourses = items.filter((item: any) => progressMap.get(item.course_id) === true).length;
      const percent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
      return {
        id: `package-${sub.id}`,
        type: 'package' as const,
        slug: pkg.slug,
        title: pkg.title,
        description: pkg.description || '',
        thumbnail: pkg.thumbnail,
        completedCourses: completedCourses,
        totalCourses: totalCourses,
        percent,
        updatedAt: sub.created_at
      };
    })
  ];

  // Sort by updatedAt (descending)
  unifiedLearningItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground mt-2">페니프레스 사용 현황을 한 눈에 확인하세요.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <CardTitle className="text-lg">에이전트 관리</CardTitle>
            </div>
            <CardDescription>
              사용자가 직접 외부 서버(PC, 클라우드 등)에 호스팅 중인 Hermes Agent를 등록하고 제어할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <div className="text-sm text-muted-foreground">
              현재 등록된 에이전트: <span className="font-semibold text-foreground">{externalAgentsCount}개</span> (온라인: <span className="font-semibold text-emerald-500">{onlineCount}개</span>)
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" asChild>
                <Link href={ROUTES.MY_AGENTS}>관리 페이지 이동</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`${ROUTES.MY_AGENTS}?add=true`}>신규 에이전트 등록</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-background border-blue-500/20 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-blue-500" />
              <CardTitle className="text-lg">AI 강좌</CardTitle>
            </div>
            <CardDescription>
              AI 튜터를 이용한 인터랙티브 강좌와 함께 실습하며 에이전트 빌딩 기술을 체계적으로 마스터하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <div className="text-sm text-muted-foreground">
              다양한 강좌를 통해 나만의 에이전트를 구축해보세요.
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" asChild>
                <Link href={ROUTES.MY_COURSES}>나의 강좌</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={ROUTES.COURSES}>전체 강좌 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="활성 에이전트"
          value={`${onlineCount} / ${externalAgentsCount}개`}
          icon={Bot}
          description="온라인 / 전체 에이전트 수"
        />
        <StatCard
          title="이번 달 토큰 사용량"
          value={`₩${dummyHydraStats.total_token_cost_this_month.toLocaleString()}`}
          icon={Coins}
          description="토큰 사용 비용 기준"
        />
        <StatCard
          title="수강중인 과목"
          value={`${totalActiveCoursesCount}개`}
          icon={BookOpen}
          description="수강 중인 개별 강좌 + 패키지 수"
        />
        <StatCard
          title="완료한 강좌"
          value={`${completedCoursesCount}개`}
          icon={Award}
          description="모든 단계를 수료한 강좌"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">학습 중인 강좌</h2>
          <Link href={ROUTES.MY_COURSES}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              나의 강좌 바로가기 <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {unifiedLearningItems.slice(0, 3).map((item) => {
            const isCourse = item.type === 'course';
            const coursePercent = isCourse ? Math.min(100, Math.round((item.currentCard! / item.totalCards!) * 100)) : 0;
            const percentValue = isCourse ? coursePercent : item.percent!;

            return (
              <Card key={item.id} className="overflow-hidden flex flex-col hover:border-primary/50 transition-all duration-300 py-0 pb-0">
                <Link href={isCourse ? `/my-courses/${item.slug}` : `/packages/${item.slug}`} className="flex-1 flex flex-col hover:opacity-95 transition-opacity">
                  <div className="h-32 relative overflow-hidden shrink-0">
                    <CourseIcon thumbnail={item.thumbnail} className="w-full h-full" iconClassName="w-10 h-10" alt={item.title} />
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant={isCourse ? 'secondary' : 'default'} className={isCourse ? 'bg-background/80 backdrop-blur-sm text-xs' : 'bg-indigo-600 text-white text-xs'}>
                        {isCourse ? '진행 중' : '강좌 패키지'}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4 pt-1 space-y-3 flex flex-col justify-end">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>{isCourse ? '학습 진도율' : '패키지 달성도'}</span>
                        <span className="text-primary">{percentValue}%</span>
                      </div>
                      <Progress value={percentValue} className="h-1.5" />
                    </div>
                  </CardContent>
                </Link>
                <CardFooter className="pt-3 pb-3 border-t bg-muted/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isCourse ? `${item.currentCard} / ${item.totalCards} 단계` : `총 ${item.totalCourses}개 중 ${item.completedCourses}개 완료`}
                  </span>
                  <Button size="sm" asChild className="h-8">
                    <Link href={isCourse ? `/learn/${item.slug}` : `/packages/${item.slug}`}>
                      {isCourse ? '이어서 학습' : '패키지 학습'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        {unifiedLearningItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p>현재 학습 중인 강좌가 없습니다.</p>
            <Link href={ROUTES.COURSES}>
              <Button variant="outline" className="mt-4 text-xs">전체 강좌 둘러보기</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <Skeleton className="h-9 w-48 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-4 w-96 mt-2 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* External agent card skeleton */}
        <Card className="border-border/50 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-4 w-3/4 mt-2 bg-zinc-200 dark:bg-zinc-800" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <Skeleton className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </CardContent>
        </Card>

        {/* AI courses card skeleton */}
        <Card className="border-border/50 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-4 w-2/3 mt-2 bg-zinc-200 dark:bg-zinc-800" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <Skeleton className="h-4 w-60 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="size-4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800" />
          </Card>
        ))}
      </div>

      {/* Subscribed services layout skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-3 space-y-2">
                <Skeleton className="h-4 w-full bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="size-4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-muted/10 flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
