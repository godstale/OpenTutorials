'use client';

import { useLanguage } from '@/lib/context/LanguageContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { Bot, Coins, Award, BookOpen, User, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CourseIcon } from '@/components/ui/course-icon';
import { ROUTES } from '@/lib/constants/routes';

interface DashboardClientProps {
  externalAgentsCount: number;
  onlineCount: number;
  thisMonthTokens: number;
  totalActiveCoursesCount: number;
  completedCoursesCount: number;
  unifiedLearningItems: any[];
  externalAgents: any[];
}

export default function DashboardClient({
  externalAgentsCount,
  onlineCount,
  thisMonthTokens,
  totalActiveCoursesCount,
  completedCoursesCount,
  unifiedLearningItems,
  externalAgents,
}: DashboardClientProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground mt-2">{t('dashboardSubtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <CardTitle className="text-lg">{t('manageAgents')}</CardTitle>
            </div>
            <CardDescription>
              {t('manageAgentsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <div className="text-sm text-muted-foreground">
              {t('registeredAgents')}
              <span className="font-semibold text-foreground">
                {externalAgentsCount}
              </span>{' '}
              ({t('online')}: <span className="font-semibold text-emerald-500">{onlineCount}</span>)
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" asChild>
                <Link href={ROUTES.MY_AGENTS}>{t('manageAgents')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-background border-blue-500/20 flex flex-col justify-between h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-blue-500" />
              <CardTitle className="text-lg">{t('aiCourse')}</CardTitle>
            </div>
            <CardDescription>{t('aiCourseDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
            <div className="text-sm text-muted-foreground">{t('searchCoursesDesc')}</div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" asChild>
                <Link href={ROUTES.COURSES}>{t('searchCourses')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('activeAgents')}
          value={`${onlineCount} / ${externalAgentsCount}`}
          icon={Bot}
          description={t('activeAgentsDesc')}
        />
        <StatCard
          title={t('tokenUsageThisMonth')}
          value={`${thisMonthTokens.toLocaleString()} ${t('tokens')}`}
          icon={Coins}
          description={t('tokenUsageThisMonthDesc')}
        />
        <StatCard
          title={t('enrolledCourses')}
          value={`${totalActiveCoursesCount}`}
          icon={BookOpen}
          description={t('enrolledCoursesDesc')}
        />
        <StatCard
          title={t('completedCourses')}
          value={`${completedCoursesCount}`}
          icon={Award}
          description={t('completedCoursesDesc')}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">{t('coursesInProgress')}</h2>
          <Link href={ROUTES.MY_COURSES}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              {t('goToMyCourses')} <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {unifiedLearningItems.slice(0, 3).map((item) => {
            const isCourse = item.type === 'course';
            const percentValue = item.percent;
            const assignedAgent = externalAgents?.find((a: any) => a.id === item.agentId);

            return (
              <Card
                key={item.id}
                className="overflow-hidden flex flex-col hover:border-primary/50 transition-all duration-300 bg-white py-0 pb-0"
              >
                <Link
                  href={isCourse ? `/courses/${item.slug}` : `/packages/${item.slug}`}
                  className="flex-1 flex flex-col hover:opacity-95 transition-opacity"
                >
                  <div className="h-32 relative overflow-hidden shrink-0">
                    <CourseIcon thumbnail={item.thumbnail} className="w-full h-full" iconClassName="w-10 h-10" alt={item.title} />
                    <div className="absolute top-2.5 right-2.5">
                      <Badge
                        variant={isCourse ? 'secondary' : 'default'}
                        className={isCourse ? 'bg-white backdrop-blur-sm text-xs' : 'bg-indigo-600 text-white text-xs'}
                      >
                        {isCourse ? t('inProgress') : t('coursePackage')}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4 pt-1 space-y-3 flex flex-col justify-end">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {item.authorNickname && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{item.authorNickname}</span>
                        </div>
                      )}
                      {assignedAgent && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-300">
                          <Bot className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{assignedAgent.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>{isCourse ? t('learningProgress') : t('packageAchievement')}</span>
                        <span className="text-primary">{percentValue}%</span>
                      </div>
                      <Progress value={percentValue} className="h-1.5" />
                    </div>
                  </CardContent>
                </Link>
                <CardFooter className="pt-3 pb-3 border-t bg-muted/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isCourse ? (
                      `${item.currentCard} / ${item.totalCards} ${t('unitStep')}`
                    ) : (
                      `${item.completedCourses} / ${item.totalCourses} ${t('completed')}`
                    )}
                  </span>
                  <Button size="sm" asChild className="h-8">
                    <Link href={isCourse ? `/learn/${item.slug}` : `/packages/${item.slug}`}>
                      {isCourse ? t('continueLearning') : t('packageLearning')}
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
            <p>{t('noCoursesInProgress')}</p>
            <Link href={ROUTES.COURSES}>
              <Button variant="outline" className="mt-4 text-xs">
                {t('browseAllCourses')}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
