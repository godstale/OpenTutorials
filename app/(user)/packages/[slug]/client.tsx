'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, Award, Compass, FolderOpen, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Course } from '@/lib/types';
import { CourseIcon } from '@/components/ui/course-icon';

interface DetailedCourse extends Course {
  order_index: number;
  user_progress?: {
    last_card: number;
    max_card?: number;
    completed: boolean;
    updated_at: string;
  } | null;
}

interface PackageDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  courses: DetailedCourse[];
  user_subscribed: boolean;
}

export default function PackageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchPackageDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/packages/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setPkg(data);
      }
    } catch (err) {
      console.error('Failed to fetch package detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPackageDetail();
  }, [fetchPackageDetail]);

  const handleSubscribe = async () => {
    if (!pkg) return;
    setRegistering(true);
    try {
      const res = await fetch('/api/packages/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkg.id }),
      });
      if (res.ok) {
        await fetchPackageDetail();
      } else {
        const errorData = await res.json();
        alert(`수강 신청에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="space-y-4">
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="container max-w-5xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">패키지를 찾을 수 없습니다.</h2>
        <Button onClick={() => router.push('/courses')}>강좌 목록으로 이동</Button>
      </div>
    );
  }

  // Calculate package progress status
  const totalCourses = pkg.courses.length;
  const completedCourses = pkg.courses.filter(c => c.user_progress?.completed).length;
  const progressPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  // Find the next active course (the first uncompleted course)
  const nextCourse = pkg.courses.find(c => !c.user_progress?.completed);

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/courses')} className="gap-1 text-zinc-500 hover:text-zinc-950">
          <ArrowLeft className="w-4 h-4" />
          전체 목록으로 돌아가기
        </Button>
      </div>

      {/* Package Header Card */}
      <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/20 via-white to-white dark:from-indigo-950/10 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-full md:w-64 h-44 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
            <CourseIcon thumbnail={pkg.thumbnail} className="w-full h-full" iconClassName="w-16 h-16" alt={pkg.title} />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  종합 로드맵
                </Badge>
                {pkg.user_subscribed && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                    수강 중
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">{pkg.title}</h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm md:text-base leading-relaxed">
                {pkg.description || '이 패키지에 대한 설명이 없습니다.'}
              </p>
            </div>

            {pkg.user_subscribed ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>패키지 진행 현황</span>
                  <span>총 {totalCourses}개 중 {completedCourses}개 강좌 완료 ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 bg-zinc-100 dark:bg-zinc-800" />
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  {nextCourse ? (
                    <Button
                      onClick={() => router.push(`/learn/${nextCourse.slug}?package=${pkg.slug}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      이어서 학습하기 ({nextCourse.title})
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 pointer-events-none gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      패키지 내 모든 강좌 완료!
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-4">
                <Button
                  onClick={handleSubscribe}
                  disabled={registering}
                  className="w-full md:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
                >
                  {registering ? '수강 신청 중...' : '종합 로드맵 수강 신청'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Roadmap Timeline */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          로드맵 커리큘럼 ({totalCourses}개 챕터)
        </h2>

        <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 pl-6 md:pl-8 space-y-8">
          {pkg.courses.map((course, index) => {
            const isCompleted = course.user_progress?.completed ?? false;
            const isStarted = !!course.user_progress;
            const totalCards = course.cards?.length || 10;
            const completedCards = course.user_progress
              ? (course.user_progress.completed
                  ? totalCards
                  : Math.max(0, (course.user_progress.max_card ?? course.user_progress.last_card ?? 1) - 1))
              : 0;
            const progressVal = Math.min(100, Math.round((completedCards / totalCards) * 100));

            return (
              <div key={course.id} className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 flex items-center justify-center font-bold text-xs bg-white dark:bg-zinc-900 transition-colors ${
                  isCompleted 
                    ? 'border-green-500 text-green-500' 
                    : isStarted 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-zinc-300 text-zinc-400 dark:border-zinc-700'
                }`}>
                  {index + 1}
                </div>

                <Card className={`border hover:shadow-sm transition-all overflow-hidden ${
                  isCompleted 
                    ? 'border-green-100 bg-green-50/10 dark:border-green-950/20 dark:bg-green-950/5' 
                    : isStarted 
                      ? 'border-indigo-100 dark:border-indigo-950' 
                      : 'border-zinc-200 dark:border-zinc-800'
                }`}>
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">{course.title}</h3>
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            학습 완료
                          </Badge>
                        ) : isStarted ? (
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 text-xs">
                            학습 중 ({progressVal}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-xs">
                            학습 전
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{course.description || '이 챕터에 대한 설명이 없습니다.'}</p>
                      
                      {isStarted && !isCompleted && (
                        <div className="space-y-1 max-w-xs pt-1">
                          <Progress value={progressVal} className="h-1.5" />
                          <span className="text-[10px] text-zinc-400">{completedCards} / {totalCards} 단계 완료</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 self-end md:self-center">
                      {pkg.user_subscribed ? (
                        <Button
                          variant={isCompleted ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => router.push(`/learn/${course.slug}?package=${pkg.slug}${isCompleted ? '&review=true' : ''}`)}
                          className={isCompleted 
                            ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-50' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }
                        >
                          {isCompleted ? '다시 보기' : isStarted ? '이어서 학습' : '학습 시작'}
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={handleSubscribe} disabled={registering} className="border border-zinc-200">
                          수강 필요
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
