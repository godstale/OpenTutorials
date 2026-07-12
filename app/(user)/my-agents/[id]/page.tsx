'use client';

import { useEffect, useState, use, Suspense, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useLanguage } from '@/lib/context/LanguageContext';

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
  const { t, language } = useLanguage();
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
    if (ms <= 0) return language === 'en' ? '0s' : '0초';
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) {
      return language === 'en'
        ? `${totalSeconds.toFixed(1)}s`
        : `${totalSeconds.toFixed(1)}초`;
    }
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      return language === 'en'
        ? `${minutes}m ${seconds}s`
        : `${minutes}분 ${seconds}초`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return language === 'en'
      ? `${hours}h ${minutes}m`
      : `${hours}시간 ${minutes}분`;
  };

  const formatAvgResponse = (ms: number) => {
    if (ms <= 0) return language === 'en' ? '0s' : '0초';
    return language === 'en'
      ? `${(ms / 1000).toFixed(1)}s`
      : `${(ms / 1000).toFixed(1)}초`;
  };

  const stats = {
    totalHours: formatTotalDuration(totalMs),
    avgResponse: formatAvgResponse(avgMs),
    totalTokens: `${totalTokens.toLocaleString()} ${t('agentStatsTokenUnit')}`,
    avgTokens: `${avgTokens.toLocaleString()} ${t('agentStatsTokenUnit')}`
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

  const yearMonthLabel = t('agentStatsYearMonthFmt')
    .replace('{year}', String(viewYear))
    .replace('{month}', String(viewMonth + 1));

  const timeTooltipFormatter = (value: any) => [
    `${parseFloat(value).toFixed(1)}${language === 'en' ? 'm' : '분'}`,
    t('agentStatsTimeTooltip'),
  ];

  const dayLabelFormatter = (day: any) =>
    t('agentStatsDayFmt')
      .replace('{month}', String(viewMonth + 1))
      .replace('{day}', String(day));

  const tokenTooltipFormatter = (value: any) => [
    `${parseInt(value).toLocaleString()} ${t('agentStatsTokenUnit')}`,
    t('agentStatsTokenTooltip'),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">{t('agentDetailStatsTitle')}</CardTitle>
            <CardDescription className="text-xs">
              {t('agentDetailStatsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">{t('agentStatsAccumTime')}</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalHours}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">{t('agentStatsAvgResponse')}</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.avgResponse}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">{t('agentStatsAccumTokens')}</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalTokens}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">{t('agentStatsAvgTokensPerSession')}</span>
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
            <CardTitle className="text-lg font-bold">{t('agentDetailAssignTitle')}</CardTitle>
            <CardDescription className="text-xs">
              {t('agentDetailAssignDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="size-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{coursesCount}</span>
            </div>
            <span className="text-sm font-semibold mt-2">{t('agentDetailAssignedCount')}</span>
            <span className="text-xs text-muted-foreground text-center">
              {coursesCount > 0
                ? t('agentDetailAssignedActive').replace('{count}', String(coursesCount))
                : t('agentDetailAssignedNone')}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold">{t('agentDetailChartTitle')}</CardTitle>
            <CardDescription className="text-xs">{t('agentDetailChartDesc')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={goPrevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[92px] text-center">
              {yearMonthLabel}
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
            <div className="py-12 text-center text-sm text-muted-foreground">{t('agentDetailNoData')}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('agentDetailTimeChart')}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={timeTooltipFormatter}
                      labelFormatter={dayLabelFormatter}
                    />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('agentDetailTokenChart')}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={tokenTooltipFormatter}
                      labelFormatter={dayLabelFormatter}
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
  const { t } = useLanguage();
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
        setError(err instanceof Error ? err.message : t('agentDetailNotFound'));
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
  }, [id, t]);

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
        <p className="text-muted-foreground text-sm font-medium animate-pulse">{t('agentDetailLoadingText')}</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-8 text-center space-y-4 max-w-md mx-auto my-12 shadow-xl backdrop-blur-md">
        <div className="size-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">{t('agentDetailAccessError')}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{error || t('agentDetailNotFound')}</p>
        <Button variant="outline" size="sm" asChild className="mt-2 border-border/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
          <Link href="/my-agents" className="gap-2">
            <ArrowLeft className="size-4" />
            {t('agentDetailBack')}
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
              {t('agentDetailBack')}
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
                    ● {t('agentStatusOnline')}
                  </Badge>
                ) : agent.status === 'error' ? (
                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15 transition-all">
                    ● {t('agentStatusError')}
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/15 transition-all">
                    ● {t('agentStatusOffline')}
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
              {t('agentDetailConnCheck')}
            </Button>
          </div>
        </div>
      </div>

      {isIdleDisconnected && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between text-amber-800 dark:text-amber-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span>{t('agentDetailIdleDisconnected')}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsIdleDisconnected(false)} className="text-amber-800 hover:bg-amber-500/10 dark:text-amber-300 h-8">
            {t('agentDetailClose')}
          </Button>
        </div>
      )}

      {!isIdleDisconnected && agent.status === 'error' && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-500" />
            <span>{t('agentDetailErrorBanner')}</span>
          </div>
        </div>
      )}

      {!isIdleDisconnected && agent.status === 'offline' && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-center justify-between text-sky-800 dark:text-sky-300 text-sm shadow-sm animate-fade-in mb-6">
          <div className="flex items-center gap-2">
            <Bot className="size-4 shrink-0 text-sky-500" />
            <span>{t('agentDetailOfflineBanner')}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
        <TabsList className="w-full sm:max-w-md grid grid-cols-3">
          <TabsTrigger value="statistics">
            {t('agentDetailTabStats')}
          </TabsTrigger>
          <TabsTrigger value="chat">
            {t('agentDetailTabChat')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            {t('agentDetailTabSettings')}
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
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading...</p>
      </div>
    }>
      <AgentPortalContent params={params} />
    </Suspense>
  );
}
