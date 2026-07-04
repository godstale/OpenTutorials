'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, PlayCircle, Award, AlertCircle, Compass, FolderOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface ProgressItem {
  id: string;
  user_id: string;
  course_id: string;
  last_card: number;
  max_card?: number;
  completed: boolean;
  updated_at: string;
  course?: {
    id: string;
    slug: string;
    title: string;
    description: string;
    thumbnail: string;
    published: boolean;
    disabled: boolean;
    course_package_items?: { id?: string; package_id?: string }[];
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
  };
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [progressList, setProgressList] = useState<ProgressItem[]>([]);
  const [packageSubscriptions, setPackageSubscriptions] = useState<PackageSubscriptionItem[]>([]);
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
      } catch (err) {
        console.error('Failed to fetch user progress or packages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter out courses that belong to any package so they don't show up as individual courses
  const activeProgress = progressList.filter(
    p => !p.completed && (!p.course?.course_package_items || p.course.course_package_items.length === 0)
  );
  const completedProgress = progressList.filter(
    p => p.completed && (!p.course?.course_package_items || p.course.course_package_items.length === 0)
  );

  const activePackages = packageSubscriptions.filter(
    sub => sub.total_courses === 0 || sub.completed_courses < sub.total_courses
  );
  const completedPackages = packageSubscriptions.filter(
    sub => sub.total_courses > 0 && sub.completed_courses === sub.total_courses
  );

  const renderCourseGrid = (items: ProgressItem[], emptyMessage: string, isReviewMode = false) => {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
          <BookOpen className="w-12 h-12 text-muted-foreground/50" />
          <div>{emptyMessage}</div>
          <Button onClick={() => router.push('/courses')} variant="outline" size="sm">
            <Compass className="w-4 h-4 mr-2" />
            새로운 강좌 찾아보기
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(progress => {
          const course = progress.course;
          if (!course) return null;
          
          const isDisabled = course.disabled === true;
          const totalCards = 10; // Mock total cards or default
          
          // Use max_card for progress calculation, fallback to last_card if undefined
          const currentCard = progress.max_card ?? progress.last_card ?? 0;
          const percent = Math.min(100, Math.round((currentCard / totalCards) * 100));
          
          return (
            <Card 
              key={progress.id} 
              className={`flex flex-col overflow-hidden transition-colors cursor-pointer ${
                isDisabled ? 'opacity-70 border-destructive/30' : 'hover:border-primary/50'
              }`}
              onClick={() => {
                if (!isDisabled) {
                  router.push(`/courses/${course.slug}`);
                }
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant={progress.completed ? 'default' : 'secondary'} className="mb-2">
                      {progress.completed ? '수강 완료' : '수강 중'}
                    </Badge>
                    {isDisabled && (
                      <Badge variant="destructive" className="mb-2 flex gap-1 items-center">
                        <AlertCircle className="w-3 h-3" />
                        이용 불가
                      </Badge>
                    )}
                  </div>
                  {progress.completed && !isDisabled && <Award className="w-6 h-6 text-yellow-500" />}
                </div>
                <CardTitle className="text-xl line-clamp-1">{course.title}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {isDisabled ? '비활성화된 강좌입니다. 학습을 계속할 수 없습니다.' : course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>진도율 (최대 진행 기준)</span>
                    <span className="text-primary">{percent}%</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{currentCard} / {totalCards} 단계</p>
                </div>
                
                {isDisabled ? (
                  <Button className="w-full mt-4" variant="secondary" disabled>
                    비활성화된 강좌
                  </Button>
                ) : isReviewMode ? (
                  <Button 
                    className="w-full mt-4 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200" 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/learn/${course.slug}?review=true`);
                    }}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    다시 보기
                  </Button>
                ) : (
                  <Button 
                    className="w-full mt-4" 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/learn/${course.slug}`);
                    }}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    이어서 학습하기
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">나의 강좌</h2>
          <p className="text-muted-foreground mt-2">수강 중인 강좌의 진도와 완료 상태를 확인하세요.</p>
        </div>
        <Button onClick={() => router.push('/courses')} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm">
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
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="active" className="font-semibold py-2 rounded-lg">
              수강중인 강좌 ({activePackages.length + activeProgress.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-semibold py-2 rounded-lg">
              완료한 강좌 ({completedPackages.length + completedProgress.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0 space-y-8">
            {/* 1. 수강중 패키지(종합 강좌) 섹션 */}
            {activePackages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">종합 코스</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activePackages.map((sub) => {
                    const pkg = sub.package;
                    if (!pkg) return null;
                    const percent = sub.total_courses > 0 ? Math.round((sub.completed_courses / sub.total_courses) * 100) : 0;
                    
                    return (
                      <Card 
                        key={sub.id} 
                        className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/10 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm flex flex-col justify-between p-5 gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => router.push(`/courses/${pkg.slug}`)}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">{pkg.title}</h4>
                            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950 shrink-0">
                              강좌 패키지
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pkg.description}</p>
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
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/courses/${pkg.slug}`);
                          }}
                        >
                          이어서 패키지 학습하기
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. 수강중 개별 강좌 섹션 */}
            {activeProgress.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">개별 강좌</h3>
                {renderCourseGrid(activeProgress, '현재 수강 중인 개별 강좌가 없습니다.')}
              </div>
            )}

            {activePackages.length === 0 && activeProgress.length === 0 && (
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
            {/* 1. 완료 패키지(종합 강좌) 섹션 */}
            {completedPackages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">완료한 종합 코스</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedPackages.map((sub) => {
                    const pkg = sub.package;
                    if (!pkg) return null;
                    const percent = 100;
                    
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
                                패키지 완료
                              </Badge>
                              <Award className="w-5 h-5 text-yellow-500 shrink-0" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pkg.description}</p>
                        </div>

                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            <span>로드맵 달성도</span>
                            <span>총 {sub.total_courses}개 중 {sub.completed_courses}개 완료 (100%)</span>
                          </div>
                          <Progress value={percent} className="h-2 bg-zinc-100 dark:bg-zinc-800" />
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
              </div>
            )}

            {/* 2. 완료 개별 강좌 섹션 */}
            {completedProgress.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">완료한 개별 강좌</h3>
                {renderCourseGrid(completedProgress, '완료한 개별 강좌가 없습니다.', true)}
              </div>
            )}

            {completedPackages.length === 0 && completedProgress.length === 0 && (
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
