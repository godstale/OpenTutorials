'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
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

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  sequential_play: boolean;
  force_checkpoint: boolean;
  courses: DetailedCourse[];
  user_subscribed: boolean;
  version?: string;
  changelog?: string;
}

export default function CourseDetailPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchCourseDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setCourseDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch course detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  const handleSubscribe = async () => {
    if (!courseDetail) return;
    setRegistering(true);
    try {
      const res = await fetch('/api/courses/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: courseDetail.id }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(`강좌 신청에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
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

  if (!courseDetail) {
    return (
      <div className="container max-w-5xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">강좌를 찾을 수 없습니다.</h2>
        <Button onClick={() => router.push('/courses')}>전체 강좌 목록으로 이동</Button>
      </div>
    );
  }

  const totalSubcourses = courseDetail.courses.length;
  const completedSubcourses = courseDetail.courses.filter(c => c.user_progress?.completed).length;
  const progressPercent = totalSubcourses > 0 ? Math.round((completedSubcourses / totalSubcourses) * 100) : 0;

  // 순차재생이 활성화된 경우, 이전에 완료되지 않은 하위 강좌가 있는지 확인하여 다음 학습할 강좌를 필터링
  const getNextLearnableSubcourse = () => {
    if (courseDetail.sequential_play) {
      // 순차재생 시: 완료되지 않은 첫 번째 코스만 진행 가능
      return courseDetail.courses.find(c => !c.user_progress?.completed);
    }
    // 일반 재생 시: 완료되지 않은 첫 코스 혹은 가장 최근에 진행 중인 코스
    return courseDetail.courses.find(c => !c.user_progress?.completed) || courseDetail.courses[0];
  };

  const nextCourse = getNextLearnableSubcourse();

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/courses')} className="gap-1 text-zinc-500 hover:text-zinc-950">
          <ArrowLeft className="w-4 h-4" />
          전체 목록으로 돌아가기
        </Button>
      </div>

      {/* Course Header Card */}
      <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/20 via-white to-white dark:from-indigo-950/10 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm">
        <CardContent className="pt-0 pb-0 px-6 md:px-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-full md:w-64 h-44 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
            <CourseIcon thumbnail={courseDetail.thumbnail} className="w-full h-full" iconClassName="w-16 h-16" alt={courseDetail.title} />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  AI 강좌
                </Badge>
                {courseDetail.user_subscribed && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                    수강 중
                  </Badge>
                )}
                {courseDetail.sequential_play && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600 dark:text-amber-400">
                    순차재생 필수
                  </Badge>
                )}
                {courseDetail.force_checkpoint && (
                  <Badge variant="outline" className="text-rose-600 border-rose-600 dark:text-rose-400">
                    체크포인트 강제
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">{courseDetail.title}</h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm md:text-base leading-relaxed">
                {courseDetail.description || '이 강좌에 대한 설명이 없습니다.'}
              </p>
            </div>

            {courseDetail.user_subscribed ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>강좌 학습 진행 현황</span>
                  <span>총 {totalSubcourses}개 중 {completedSubcourses}개 완료 ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 bg-zinc-100 dark:bg-zinc-800" />
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  {nextCourse ? (
                    <Button
                      onClick={() => router.push(`/learn/${nextCourse.slug}?package=${courseDetail.slug}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      이어서 학습하기 ({nextCourse.title})
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 pointer-events-none gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      강좌 내 모든 학습 완료!
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
                  {registering ? '신청 중...' : '강좌 신청하기'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-3 pb-0 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">태그:</span>
            {Array.from(new Set(courseDetail.courses.flatMap(c => c.tags || []))).length > 0 ? (
              Array.from(new Set(courseDetail.courses.flatMap(c => c.tags || []))).map(tag => (
                <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[11px] font-normal px-2 py-0.5">
                  #{tag}
                </Badge>
              ))
            ) : (
              <span className="text-zinc-400">등록된 태그 없음</span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>순차학습: <strong className={courseDetail.sequential_play ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-400"}>{courseDetail.sequential_play ? "필수" : "선택"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>체크포인트 강제: <strong className={courseDetail.force_checkpoint ? "text-rose-600 dark:text-rose-400" : "text-zinc-600 dark:text-zinc-400"}>{courseDetail.force_checkpoint ? "강제" : "건너뛰기 가능"}</strong></span>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* 강좌 버전 및 CHANGE-LOG 정보 */}
      <Card className="border border-indigo-100 dark:border-indigo-950 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <CardHeader className="pt-0 pb-4 px-6 md:px-8">
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            버전 및 변경 이력
          </CardTitle>
          <CardDescription className="text-zinc-500 text-xs">
            현재 강좌의 릴리즈 버전 정보와 업데이트 세부 내용입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 md:pt-8 pb-0 px-6 md:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">현재 버전:</span>
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono hover:bg-indigo-100 border-none">
              v{courseDetail.version || '1.0.0'}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">변경 사항 (Change Log)</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {courseDetail.changelog || '최초 등록되었습니다.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum Timeline */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          커리큘럼 ({totalSubcourses}개 파트)
        </h2>

        <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 pl-6 md:pl-8 space-y-8">
          {courseDetail.courses.map((subcourse, index) => {
            const isCompleted = subcourse.user_progress?.completed ?? false;
            const isStarted = !!subcourse.user_progress;
            const totalCards = 10;
            const currentCard = subcourse.user_progress?.max_card ?? subcourse.user_progress?.last_card ?? 0;
            const progressVal = Math.min(100, Math.round((currentCard / totalCards) * 100));

            // 순차재생 여부에 따라 특정 파트의 잠금 여부 계산
            // 순차재생(sequential_play)이 활성화되어 있고, 첫 단계를 제외한 이전 단계들이 완료되지 않은 경우 잠금 처리함
            const isLocked = courseDetail.sequential_play && index > 0 && 
              !courseDetail.courses.slice(0, index).every(c => c.user_progress?.completed);

            const nextCourseIndex = nextCourse 
              ? courseDetail.courses.findIndex(c => c.id === nextCourse.id) 
              : courseDetail.courses.length;

            return (
              <div key={subcourse.id} className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 flex items-center justify-center font-bold text-xs bg-white dark:bg-zinc-900 transition-colors ${
                  isCompleted 
                    ? 'border-green-500 text-green-500' 
                    : isStarted && !isLocked
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-zinc-300 text-zinc-400 dark:border-zinc-700'
                }`}>
                  {index + 1}
                </div>

                <Card className={`border hover:shadow-sm transition-all overflow-hidden ${
                  isCompleted 
                    ? 'border-green-100 bg-green-50/10 dark:border-green-950/20 dark:bg-green-950/5' 
                    : isStarted && !isLocked
                      ? 'border-indigo-100 dark:border-indigo-950' 
                      : 'border-zinc-200 dark:border-zinc-800'
                } ${isLocked ? 'opacity-60 bg-zinc-50/30' : ''}`}>
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">{subcourse.title}</h3>
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            파트 완료
                          </Badge>
                        ) : isLocked ? (
                          <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-xs">
                            잠금 (이전 파트 미완료)
                          </Badge>
                        ) : (nextCourse && nextCourse.id === subcourse.id) ? (
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 text-xs">
                            학습 중 ({progressVal}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-xs">
                            대기 중
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{subcourse.description || '이 파트에 대한 설명이 없습니다.'}</p>
                      
                      {isStarted && !isCompleted && !isLocked && (
                        <div className="space-y-1 max-w-xs pt-1">
                          <Progress value={progressVal} className="h-1.5" />
                          <span className="text-[10px] text-zinc-400">{currentCard} / {totalCards} 단계 완료</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 self-end md:self-center">
                      {courseDetail.user_subscribed ? (
                        (!courseDetail.sequential_play || index <= nextCourseIndex) ? (
                          <Button
                            variant={isCompleted ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => router.push(`/learn/${subcourse.slug}?package=${courseDetail.slug}${isCompleted ? '&review=true' : ''}`)}
                            className={isCompleted 
                              ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-50' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }
                          >
                            {isCompleted ? '다시 보기' : isStarted ? '이어서 학습' : '파트 학습 시작'}
                          </Button>
                        ) : null
                      ) : (
                        <Button variant="secondary" size="sm" onClick={handleSubscribe} disabled={registering || isLocked} className="border border-zinc-200">
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
