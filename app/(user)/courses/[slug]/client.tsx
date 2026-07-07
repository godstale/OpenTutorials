'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, CheckCircle2, ArrowLeft, ArrowRight, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { Course, UserExternalAgent } from '@/lib/types';
import { CourseIcon } from '@/components/ui/course-icon';

interface ChatLog {
  timestamp: string;
  duration_ms: number;
  input_token_size: number;
  output_token_size: number;
  user_message: string;
  assistant_message: string;
}

function AgentStatsView({ agentId }: { agentId: string }) {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/external-agents/${agentId}/chat`);
        if (res.ok) {
          const data = await res.json();
          setChatLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch chat logs for stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [agentId]);

  const totalLogs = chatLogs.length;
  const totalMs = chatLogs.reduce((acc, log) => acc + (log.duration_ms || 0), 0);
  const avgMs = totalLogs > 0 ? totalMs / totalLogs : 0;
  const totalTokens = chatLogs.reduce((acc, log) => acc + (log.input_token_size || 0) + (log.output_token_size || 0), 0);
  const avgTokens = totalLogs > 0 ? Math.round(totalTokens / totalLogs) : 0;

  const formatTotalDuration = (ms: number) => {
    if (ms <= 0) return '0초';
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) {
      return `${totalSeconds.toFixed(1)}초`;
    }
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      return `${minutes}분 ${seconds}초`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  const formatAvgResponse = (ms: number) => {
    if (ms <= 0) return '0초';
    return `${(ms / 1000).toFixed(1)}초`;
  };

  const stats = {
    totalHours: formatTotalDuration(totalMs),
    avgResponse: formatAvgResponse(avgMs),
    totalTokens: `${totalTokens.toLocaleString()} 토큰`,
    avgTokens: `${avgTokens.toLocaleString()} 토큰`
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">누적 사용 시간</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.totalHours}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">평균 응답 시간</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.avgResponse}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">누적 사용 토큰</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.totalTokens}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">평균 사용 토큰</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.avgTokens}</span>
        )}
      </div>
    </div>
  );
}


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
  agent_id?: string | null;
  version?: string;
  changelog?: string;
  external_agents?: UserExternalAgent[];
  toc?: any[];
  cards?: string[];
  tags?: string[];
  user_progress?: {
    last_card: number;
    max_card?: number;
    completed: boolean;
    updated_at: string;
  } | null;
}

export default function CourseDetailPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  const toggleChapter = (index: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [index]: prev[index] === false ? true : false
    }));
  };

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

  const handleUpdateCourseAgent = async (courseId: string, agentId: string | null) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(`에이전트 지정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to update course agent:', err);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdatePackageAgent = async (agentId: string | null) => {
    if (!courseDetail) return;
    try {
      const res = await fetch(`/api/admin/packages/${courseDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(`전체 에이전트 지정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to update package agent:', err);
      alert('네트워크 오류가 발생했습니다.');
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

  const totalSubcourses = courseDetail.cards?.length || 0;
  const completedSubcourses = courseDetail.user_progress?.completed
    ? totalSubcourses
    : (courseDetail.user_progress?.max_card ?? courseDetail.user_progress?.last_card ?? 0);
  const progressPercent = totalSubcourses > 0 ? Math.min(100, Math.round((completedSubcourses / totalSubcourses) * 100)) : 0;

  const nextCardIndex = completedSubcourses;
  const hasNextCard = nextCardIndex < totalSubcourses;

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
                  {hasNextCard ? (
                    <Button
                      onClick={() => router.push(`/learn/${courseDetail.slug}?card=${nextCardIndex || 1}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      이어서 학습하기
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
            {courseDetail.tags && courseDetail.tags.length > 0 ? (
              courseDetail.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[11px] font-normal px-2 py-0.5">
                  #{tag}
                </Badge>
              ))
            ) : (
              <span className="text-zinc-400">등록된 태그 없음</span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0 self-start">
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

      {/* 에이전트 카드 및 통계 배치 */}
      {courseDetail.user_subscribed && (
        <Card className="border border-indigo-100 dark:border-indigo-950 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 md:px-8">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              학습 AI 튜터 설정 및 통계
            </CardTitle>
            <CardDescription className="text-xs">
              이 강좌 전체에 적용될 AI 튜터 에이전트를 지정하고, 해당 에이전트의 수강 학습 통계를 모니터링합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 md:px-8">
            {/* 에이전트 지정 셀렉트 박스 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-green-100 dark:bg-zinc-900/50 border">
              <div className="space-y-1">
                <span className="text-sm font-semibold block">튜터 에이전트 선택</span>
                <span className="text-xs text-muted-foreground">강좌 내 모든 질문과 토론은 이 에이전트가 전담합니다.</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={courseDetail.agent_id || ''}
                  onChange={(e) => handleUpdatePackageAgent(e.target.value || null)}
                  className="text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 min-w-[200px] focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="">튜터 미지정</option>
                  {courseDetail.external_agents?.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.agent_type === 'llm' ? 'LLM' : '하네스'}{agent.is_ai_tutor ? ' - 기본튜터' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 통계 정보 표시 */}
            {courseDetail.agent_id ? (
              (() => {
                const assignedAgent = courseDetail.external_agents?.find(a => a.id === courseDetail.agent_id);
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs border-b pb-2">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">선택된 에이전트 상세 프로필</span>
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px]">
                        {assignedAgent?.agent_type === 'llm' ? 'LLM 모드' : '하네스 모드'}
                      </Badge>
                    </div>
                    
                    <AgentStatsView agentId={courseDetail.agent_id} />
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6 border border-dashed rounded-lg bg-zinc-50/30">
                <p className="text-sm text-muted-foreground">지정된 튜터 에이전트가 없습니다. 위에 있는 선택창에서 에이전트를 지정해주세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 강좌 버전 및 CHANGE-LOG 정보 */}
      <Card className="border border-indigo-100 dark:border-indigo-950 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <CardHeader className="pt-0 px-6 md:px-8">
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            버전 및 변경 이력
          </CardTitle>
          <CardDescription className="text-zinc-500 text-xs">
            현재 강좌의 릴리즈 버전 정보와 업데이트 세부 내용입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 md:pt-4 pb-0 px-6 md:px-8 space-y-4">
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
      <div className="space-y-6 pt-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          커리큘럼
        </h2>

        {courseDetail.toc && courseDetail.toc.length > 0 ? (
          <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 pl-6 md:pl-8 space-y-8">
            {courseDetail.toc.map((chapter: any, index: number) => {
              // 챕터 내 모든 섹션이 완료되었는지 확인
              const isChapterCompleted = chapter.children && chapter.children.length > 0 && chapter.children.every((section: any) => {
                const cardIndex = courseDetail.cards?.indexOf(section.filename) ?? -1;
                return cardIndex !== -1 && cardIndex < completedSubcourses;
              });

              // 이미 완료된 챕터는 기본적으로 접고(false), 완료되지 않은 챕터는 펼침(true)
              const isExpanded = expandedChapters[index] !== undefined 
                ? expandedChapters[index] 
                : !isChapterCompleted;
              
              return (
                <div key={index} className="relative group space-y-4">
                  {/* Timeline node (Chapter) */}
                  <div className="absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 flex items-center justify-center font-bold text-xs bg-white dark:bg-zinc-900 border-indigo-600 text-indigo-600">
                    {index + 1}
                  </div>

                  <div 
                    className="pl-2 cursor-pointer flex items-center justify-between group/header select-none"
                    onClick={() => toggleChapter(index)}
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        {chapter.title}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover/header:text-indigo-600 transition-colors" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover/header:text-indigo-600 transition-colors" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{chapter.description}</p>
                    </div>
                  </div>

                  {isExpanded && chapter.children && chapter.children.length > 0 && (
                    <div className="space-y-3 pl-2 transition-all duration-200">
                      {chapter.children.map((section: any, sIdx: number) => {
                        const cardIndex = courseDetail.cards?.indexOf(section.filename) ?? -1;
                        const isCompleted = cardIndex !== -1 && cardIndex < completedSubcourses;
                        const isStarted = cardIndex !== -1 && cardIndex === completedSubcourses;
                        const isLocked = courseDetail.sequential_play && cardIndex !== -1 && cardIndex > completedSubcourses;

                        return (
                          <Card 
                            key={sIdx} 
                            className={`border hover:shadow-sm transition-all overflow-hidden bg-white dark:bg-zinc-900 ${
                              isCompleted 
                                ? 'border-green-100 bg-zinc-50 dark:border-green-950/20 dark:bg-zinc-900/50' 
                                : isStarted && !isLocked
                                  ? 'border-indigo-100 dark:border-indigo-950' 
                                  : 'border-zinc-200 dark:border-zinc-800'
                            } ${isLocked ? 'opacity-60 bg-zinc-50/30' : ''}`}
                          >
                            <CardContent className="px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{section.title}</h4>
                                  {isCompleted ? (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 py-0">
                                      완료
                                    </Badge>
                                  ) : isLocked ? (
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-[10px] px-1.5 py-0">
                                      잠금
                                    </Badge>
                                  ) : isStarted ? (
                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 text-[10px] px-1.5 py-0">
                                      학습 중
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-[10px] px-1.5 py-0">
                                      대기 중
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">{section.description}</p>
                              </div>

                              <div className="shrink-0 self-end sm:self-center">
                                {courseDetail.user_subscribed ? (
                                  <Button
                                    variant={isCompleted ? 'outline' : 'default'}
                                    size="sm"
                                    onClick={() => cardIndex !== -1 && router.push(`/learn/${courseDetail.slug}?card=${cardIndex + 1}`)}
                                    disabled={isLocked}
                                    className={isCompleted 
                                      ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs h-8' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8'
                                    }
                                  >
                                    {isCompleted ? '다시 보기' : isStarted ? '이어서 학습' : '학습 시작'}
                                  </Button>
                                ) : (
                                  <Button variant="secondary" size="sm" onClick={handleSubscribe} disabled={registering} className="border border-zinc-200 text-xs h-8">
                                    수강 필요
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg bg-zinc-50/30">
            <p className="text-sm text-muted-foreground">등록된 커리큘럼(TOC)이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
