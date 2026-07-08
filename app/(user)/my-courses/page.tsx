'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Award, Compass, FolderOpen, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface ProgressItem {
  id: string;
  course_id: string;
  last_card: number;
  max_card?: number;
  completed: boolean;
  course?: {
    slug: string;
  };
}

interface PackageSubscriptionItem {
  id: string;
  user_id: string;
  package_id: string;
  created_at: string;
  total_courses: number;
  completed_courses: number;
  package?: {
    id: string;
    slug: string;
    title: string;
    description: string;
    thumbnail: string | null;
    agent_id?: string | null;
  };
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [progressList, setProgressList] = useState<ProgressItem[]>([]);
  const [packageSubscriptions, setPackageSubscriptions] = useState<PackageSubscriptionItem[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, packagesRes] = await Promise.all([
          fetch('/api/courses/progress'),
          fetch('/api/packages/subscribe')
        ]);

        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgressList(progressData);
        }

        if (packagesRes.ok) {
          const packagesData = await packagesRes.json();
          setPackageSubscriptions(packagesData);
        }

        const supabase = createClient();
        const { data: agentsData } = await supabase.from('user_external_agents').select('id, name');
        if (agentsData) {
          setAgents(agentsData);
        }
      } catch (err) {
        console.error('Failed to fetch user progress, packages, or agents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getPackageTargetUrl = (packageId: string, defaultSlug: string) => {
    const pkgProgress = progressList.find(p => p.course_id === packageId);
    if (pkgProgress) {
      const currentCard = pkgProgress.max_card ?? pkgProgress.last_card ?? 0;
      return `/learn/${defaultSlug}?card=${currentCard || 1}`;
    }
    return `/courses/${defaultSlug}`;
  };

  const activePackages = packageSubscriptions.filter(
    sub => sub.total_courses === 0 || sub.completed_courses < sub.total_courses
  );
  const completedPackages = packageSubscriptions.filter(
    sub => sub.total_courses > 0 && sub.completed_courses === sub.total_courses
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pt-1 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">나의 강좌</h2>
          <p className="text-muted-foreground mt-2">수강 중인 강좌의 진도와 완료 상태를 확인하세요.</p>
        </div>
        <Button onClick={() => router.push('/courses')} className="text-white shadow-sm">
          <BookOpen className="w-4 h-4 mr-2" />
          새 강좌 찾기
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col overflow-hidden h-[280px] animate-pulse bg-muted/20" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="active">
              수강중인 강좌 ({activePackages.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              완료한 강좌 ({completedPackages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0 space-y-8">
            {activePackages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 패키지 카드 목록 */}
                {activePackages.map((sub) => {
                  const pkg = sub.package;
                  if (!pkg) return null;
                  const percent = sub.total_courses > 0 ? Math.round((sub.completed_courses / sub.total_courses) * 100) : 0;
                  const assignedAgent = agents.find(a => a.id === pkg.agent_id);
                  
                  return (
                    <Card 
                      key={sub.id} 
                      className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/10 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm flex flex-col justify-between p-5 gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => router.push(`/courses/${pkg.slug}`)}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">{pkg.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pkg.description}</p>
                        {assignedAgent && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-green-700 dark:text-green-300">
                            <Bot className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{assignedAgent.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <span>로드맵 달성도</span>
                          <span>총 {sub.total_courses}개 중 {sub.completed_courses}개 완료 ({percent}%)</span>
                        </div>
                        <Progress value={percent} className="h-2 bg-zinc-100 dark:bg-zinc-800" />
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full text-white mt-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetUrl = getPackageTargetUrl(sub.package_id, pkg.slug);
                          router.push(targetUrl);
                        }}
                      >
                        학습 시작하기
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {activePackages.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
                <FolderOpen className="w-12 h-12 text-muted-foreground/50" />
                <div>수강 중인 강좌 또는 패키지가 없습니다.</div>
                <Button onClick={() => router.push('/courses')} variant="outline" size="sm">
                  <Compass className="w-4 h-4 mr-2" />
                  새로운 강좌 찾아보기
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0 space-y-8">
            {completedPackages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 완료 패키지 카드 목록 */}
                {completedPackages.map((sub) => {
                  const pkg = sub.package;
                  if (!pkg) return null;
                  const percent = 100;
                  const assignedAgent = agents.find(a => a.id === pkg.agent_id);
                  
                  return (
                    <Card 
                      key={sub.id} 
                      className="border border-green-100 dark:border-green-950 bg-gradient-to-br from-green-50/10 via-white to-white dark:from-green-950/5 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm flex flex-col justify-between p-5 gap-4 cursor-pointer hover:border-green-600/30 transition-colors"
                      onClick={() => router.push(`/courses/${pkg.slug}`)}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">{pkg.title}</h4>
                          <div className="flex gap-2">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950 shrink-0">
                              수강 완료
                            </Badge>
                            <Award className="w-5 h-5 text-yellow-500 shrink-0" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pkg.description}</p>
                        {assignedAgent && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Bot className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{assignedAgent.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <span>로드맵 달성도</span>
                          <span>총 {sub.total_courses}개 중 {sub.completed_courses}개 완료 (100%)</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>

                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full mt-1.5 border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/courses/${pkg.slug}`);
                        }}
                      >
                        패키지 상세 보기
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {completedPackages.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
                <Award className="w-12 h-12 text-muted-foreground/50" />
                <div>완료한 강좌 또는 패키지가 없습니다.</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
