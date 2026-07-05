'use client';

import { useEffect, useState, use, Suspense, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { getExternalAgentById, updateExternalAgent } from '@/lib/api/external-agents';
import type { UserExternalAgent } from '@/lib/types';
import AgentChatTab from '@/components/features/AgentChatTab';
import AgentSettingsTab from '@/components/features/AgentSettingsTab';
import { agentLeaveTimers, cn } from '@/lib/utils';

interface ChatLog {
  timestamp: string;
  duration_ms: number;
  input_token_size: number;
  output_token_size: number;
  user_message: string;
  assistant_message: string;
}

function toDailyBuckets(logs: ChatLog[]): Map<string, { ms: number; tokens: number }> {
  const map = new Map<string, { ms: number; tokens: number }>();
  for (const log of logs) {
    const d = new Date(log.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const bucket = map.get(dateKey) || { ms: 0, tokens: 0 };
    bucket.ms += log.duration_ms || 0;
    bucket.tokens += (log.input_token_size || 0) + (log.output_token_size || 0);
    map.set(dateKey, bucket);
  }
  return map;
}

interface DailySeriesPoint {
  day: number;
  ms: number;
  minutes: number;
  tokens: number;
}

function buildMonthSeries(
  dailyBuckets: Map<string, { ms: number; tokens: number }>,
  year: number,
  month: number
): DailySeriesPoint[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const series: DailySeriesPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const bucket = dailyBuckets.get(dateKey) || { ms: 0, tokens: 0 };
    series.push({
      day,
      ms: bucket.ms,
      minutes: Math.round((bucket.ms / 60000) * 10) / 10,
      tokens: bucket.tokens,
    });
  }
  return series;
}

function AgentStatisticsTab({ agent, coursesCount }: { agent: UserExternalAgent; coursesCount: number }) {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/external-agents/${agent.id}/chat`);
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
  }, [agent.id]);

  const dailyBuckets = toDailyBuckets(chatLogs);
  const totalMs = Array.from(dailyBuckets.values()).reduce((acc, b) => acc + b.ms, 0);
  const totalTokens = Array.from(dailyBuckets.values()).reduce((acc, b) => acc + b.tokens, 0);
  const totalLogs = chatLogs.length;
  const avgMs = totalLogs > 0 ? totalMs / totalLogs : 0;
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

  const monthSeries = buildMonthSeries(dailyBuckets, viewYear, viewMonth);
  const hasDataInMonth = monthSeries.some((d) => d.ms > 0 || d.tokens > 0);
  const isCurrentOrFutureMonth =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">에이전트 사용량 통계</CardTitle>
            <CardDescription className="text-xs">
              현재 에이전트 인스턴스의 누적 및 평균 학습 지원 메트릭을 모니터링합니다. (챗 요청부터 응답까지의 누적 시간 기준)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">누적 사용 시간</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalHours}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">평균 응답 시간</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.avgResponse}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">누적 사용 토큰</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalTokens}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">회당 평균 사용 토큰</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.avgTokens}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">강좌 할당 통계</CardTitle>
            <CardDescription className="text-xs">
              현재 튜터가 전담하여 관리하는 로컬 강좌 개수입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="size-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{coursesCount}</span>
            </div>
            <span className="text-sm font-semibold mt-2">할당 강좌 수</span>
            <span className="text-xs text-muted-foreground text-center">
              {coursesCount > 0
                ? `현재 ${coursesCount}개의 강좌에 학습 튜터로 활성화되어 활동 중입니다.`
                : '현재 이 튜터가 할당된 강좌가 없습니다. 강좌 상세 화면에서 튜터를 지정할 수 있습니다.'}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold">일별 사용 현황</CardTitle>
            <CardDescription className="text-xs">선택한 달의 일별 사용 시간과 토큰 사용량입니다.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={goPrevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[92px] text-center">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={goNextMonth}
              disabled={isCurrentOrFutureMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-zinc-100 dark:bg-zinc-900/40 animate-pulse rounded-lg" />
          ) : !hasDataInMonth ? (
            <div className="py-12 text-center text-sm text-muted-foreground">이 달에는 기록된 대화가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">일별 사용 시간 (분)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) => [`${parseFloat(value).toFixed(1)}분`, '사용 시간']}
                      labelFormatter={(day: any) => `${viewMonth + 1}월 ${day}일`}
                    />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">일별 사용 토큰</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) => [`${parseInt(value).toLocaleString()} 토큰`, '토큰']}
                      labelFormatter={(day: any) => `${viewMonth + 1}월 ${day}일`}
                    />
                    <Bar dataKey="tokens" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



interface PageProps {
  params: Promise<{ id: string }>;
}

function AgentPortalContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<UserExternalAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);
  const [isIdleDisconnected, setIsIdleDisconnected] = useState(false);
  const [assignedCoursesCount, setAssignedCoursesCount] = useState(0);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'statistics';
    return window.localStorage.getItem(`agent-tab-${id}`) || 'statistics';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.localStorage.setItem(`agent-tab-${id}`, value);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 마운트/언마운트 시 에이전트 이탈 타이머 제어 (학습/상세 화면 이탈 시 5분 타이머 연결 종료)
  useEffect(() => {
    if (agentLeaveTimers[id]) {
      clearTimeout(agentLeaveTimers[id]);
      delete agentLeaveTimers[id];
    }

    return () => {
      // 5분 타이머 작동 (300,000ms)
      const timer = setTimeout(async () => {
        try {
          await updateExternalAgent(id, { status: 'offline' });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agents-updated'));
          }
        } catch (e) {
          console.error('Failed to disconnect agent on timeout:', e);
        }
      }, 300000);
      agentLeaveTimers[id] = timer;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function fetchAgentAndUser(silent = false) {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const [
          { data: { user } },
          fetchedAgent,
          { data: packagesData }
        ] = await Promise.all([
          supabase.auth.getUser(),
          getExternalAgentById(id),
          supabase.from('course_packages').select('id, agent_id')
        ]);

        if (!active) return;

        if (!user) {
          setError('인증 정보가 없습니다. 로그인이 필요합니다.');
          return;
        }

        if (fetchedAgent.user_id !== user.id) {
          setError('해당 에이전트에 대한 접근 권한이 없습니다.');
          return;
        }

        setAgent(fetchedAgent);

        const count = (packagesData || []).filter((p: any) => p.agent_id === id).length;
        setAssignedCoursesCount(count);

        // 백그라운드 핑 체크를 해서 연결 상태를 동적으로 확인 및 동기화
        fetch('/api/external-agents/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: fetchedAgent.endpoint, api_key: fetchedAgent.api_key }),
        })
        .then(res => res.json())
        .then(async (data) => {
          const newStatus = data.success ? 'online' : 'offline';
          if (fetchedAgent.status !== newStatus) {
            await updateExternalAgent(id, { status: newStatus });
            if (active && isMountedRef.current) {
              setAgent(prev => prev ? { ...prev, status: newStatus } : null);
              window.dispatchEvent(new CustomEvent('agents-updated'));
            }
          }
        })
        .catch(console.error);

      } catch (err) {
        if (!active) return;
        console.error('Failed to fetch agent:', err);
        setError(err instanceof Error ? err.message : '에이전트 정보를 불러오는데 실패했습니다.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchAgentAndUser();

    const handleAgentsUpdated = () => {
      if (active) {
        fetchAgentAndUser(true);
      }
    };

    window.addEventListener('agents-updated', handleAgentsUpdated);

    return () => {
      active = false;
      window.removeEventListener('agents-updated', handleAgentsUpdated);
    };
  }, [id]);

  const handleRefreshStatus = async () => {
    if (!agent) return;
    setIsRefreshing(true);
    setIsIdleDisconnected(false);
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: agent.endpoint, api_key: agent.api_key }),
      });
      const data = await res.json();
      const newStatus = data.success ? 'online' : 'offline';
      
      if (!isMountedRef.current) return;
      
      await updateExternalAgent(id, { status: newStatus });
      
      if (!isMountedRef.current) return;
      
      setAgent(prev => {
        if (!prev) return null;
        if (prev.status === newStatus) return prev;
        return { ...prev, status: newStatus };
      });
      window.dispatchEvent(new CustomEvent('agents-updated'));
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to refresh status:', err);
      try {
        await updateExternalAgent(id, { status: 'offline' });
      } catch (e) {
        console.error('Failed to update agent status to offline in DB:', e);
      }
      
      if (!isMountedRef.current) return;
      
      setAgent(prev => {
        if (!prev) return null;
        if (prev.status === 'offline') return prev;
        return { ...prev, status: 'offline' };
      });
      window.dispatchEvent(new CustomEvent('agents-updated'));
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Bot className="size-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground text-sm font-medium animate-pulse">에이전트 연결 정보 로드 중...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-8 text-center space-y-4 max-w-md mx-auto my-12 shadow-xl backdrop-blur-md">
        <div className="size-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">접근 오류</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{error || '에이전트를 찾을 수 없습니다.'}</p>
        <Button variant="outline" size="sm" asChild className="mt-2 border-border/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
          <Link href="/my-agents" className="gap-2">
            <ArrowLeft className="size-4" />
            외부 에이전트 목록으로
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Breadcrumb / Back Button */}
      <div className="flex flex-col gap-2">
        <div>
          <Link href="/my-agents">
            <Button variant="ghost" size="sm" className="group text-muted-foreground hover:text-foreground pl-0 -ml-1 transition-all duration-200">
              <ArrowLeft className="size-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              외부 에이전트 목록
            </Button>
          </Link>
        </div>

        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-zinc-900/40 py-4 px-6 rounded-2xl border border-border/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-gradient-to-tr from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner">
              <Bot className="size-7 text-primary animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{agent.name}</h1>
                {agent.status === 'online' ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 transition-all">
                    ● 온라인
                  </Badge>
                ) : agent.status === 'error' ? (
                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15 transition-all">
                    ● 에러
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/15 transition-all">
                    ● 오프라인
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1 hover:text-foreground transition-colors truncate max-w-md" title={agent.endpoint}>
                {agent.endpoint}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant={agent.status === 'online' ? "outline" : "default"} 
              size="sm" 
              onClick={handleRefreshStatus} 
              disabled={isRefreshing}
              className={cn(
                "gap-1.5 active:scale-95 transition-all duration-150 shadow-sm",
                agent.status !== 'online' && "bg-primary text-primary-foreground hover:bg-primary/95"
              )}
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              연결 확인
            </Button>
          </div>
        </div>
      </div>

      {isIdleDisconnected && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between text-amber-800 dark:text-amber-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span>일정 시간 동안 입력이 없어 연결이 자동으로 종료되었습니다. 다시 연결하려면 상단의 <strong>[연결 확인]</strong> 버튼을 클릭하세요.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsIdleDisconnected(false)} className="text-amber-800 hover:bg-amber-500/10 dark:text-amber-300 h-8">
            닫기
          </Button>
        </div>
      )}

      {!isIdleDisconnected && agent.status === 'error' && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-500" />
            <span>에이전트 연결에 실패했습니다. 엔드포인트 URL 및 API Key 설정을 확인하거나 서버 상태를 점검해 주세요.</span>
          </div>
        </div>
      )}

      {!isIdleDisconnected && agent.status === 'offline' && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-center justify-between text-sky-800 dark:text-sky-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <Bot className="size-4 shrink-0 text-sky-500" />
            <span>현재 에이전트와 연결되지 않은 상태입니다. 대화를 시작하고 에이전트 기능을 사용하려면 상단의 <strong>[연결 확인]</strong> 버튼을 클릭하여 연결을 수립해 주세요.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
        <TabsList className="w-full sm:max-w-md grid grid-cols-3">
          <TabsTrigger value="statistics">
            통계
          </TabsTrigger>
          <TabsTrigger value="chat">
            대화 (Chat)
          </TabsTrigger>
          <TabsTrigger value="settings">
            설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentStatisticsTab agent={agent} coursesCount={assignedCoursesCount} />
        </TabsContent>

        <TabsContent value="chat" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentChatTab agent={agent} />
        </TabsContent>

        <TabsContent value="settings" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentSettingsTab agent={agent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AgentPortalPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Bot className="size-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground text-sm font-medium animate-pulse">에이전트 연결 정보 로드 중...</p>
      </div>
    }>
      <AgentPortalContent params={params} />
    </Suspense>
  );
}
