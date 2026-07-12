import { Suspense } from 'react';
import { Bot, Coins, BookOpen, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserSubscriptions } from '@/lib/api/hydra-subscriptions';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import fs from 'fs';
import path from 'path';
import DashboardClient from './client';

async function DashboardContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminSupabase = createAdminClient();
  const [subscriptions, { data: externalAgents }, { data: userProgress }, { data: packageSubs }] = user
    ? await Promise.all([
        getUserSubscriptions(user.id),
        supabase.from('user_external_agents').select('id, name, status'),
        adminSupabase.from('user_progress').select('*, course:course_packages(*)').eq('user_id', user.id),
        adminSupabase.from('user_package_subscriptions').select('*, package:course_packages(*)').eq('user_id', user.id)
      ])
    : [[], { data: [] }, { data: [] }, { data: [] }];
  
  // 이번 달 토큰 사용량 계산 (실제 사용량 데이터)
  let thisMonthTokens = 0;
  try {
    const chatLogDir = path.join(process.cwd(), 'public', 'agent-chats');
    if (fs.existsSync(chatLogDir)) {
      const files = fs.readdirSync(chatLogDir);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(chatLogDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const logs = JSON.parse(content);
            if (Array.isArray(logs)) {
              for (const log of logs) {
                if (log.timestamp) {
                  const logDate = new Date(log.timestamp);
                  if (logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth) {
                    thisMonthTokens += (log.input_token_size || 0) + (log.output_token_size || 0);
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Failed to read or parse chat log file: ${file}`, e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to calculate this month tokens:', e);
  }

  const externalAgentsCount = externalAgents?.length ?? 0;
  const onlineCount = externalAgents?.filter((a: { status: string }) => a.status === 'online').length ?? 0;
  
  // Filter out completed courses. In this local platform, each progress entry represents a course/package.
  const activeProgress = (userProgress || []).filter(
    (p: any) => !p.completed
  );
  
  // Calculate total active courses count: individual active courses currently in progress
  const totalActiveCoursesCount = activeProgress.length;
  
  const completedCoursesCount = userProgress?.filter((p: { completed: boolean }) => p.completed).length ?? 0;
  
  // Create unified learning items: active individual courses
  const unifiedLearningItems: any[] = activeProgress.map((p: any) => {
    const totalCards = p.course?.cards?.length || 10;
    const completedCards = p.completed
      ? totalCards
      : Math.max(0, (p.max_card ?? p.last_card ?? 1) - 1);
    const progressPercent = totalCards > 0 ? Math.min(100, Math.round((completedCards / totalCards) * 100)) : 0;

    return {
      id: `course-${p.id}`,
      type: 'course' as const,
      slug: p.course?.slug || '',
      title: p.course?.title || '',
      description: p.course?.description || '',
      thumbnail: p.course?.thumbnail || null,
      currentCard: p.max_card ?? p.last_card ?? 0,
      totalCards,
      percent: progressPercent,
      updatedAt: p.updated_at,
      agentId: p.course?.agent_id || null,
      authorNickname: p.course?.author_nickname || null
    };
  });

  // Sort by updatedAt (descending)
  unifiedLearningItems.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <DashboardClient
      externalAgentsCount={externalAgentsCount}
      onlineCount={onlineCount}
      thisMonthTokens={thisMonthTokens}
      totalActiveCoursesCount={totalActiveCoursesCount}
      completedCoursesCount={completedCoursesCount}
      unifiedLearningItems={unifiedLearningItems}
      externalAgents={externalAgents || []}
    />
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
