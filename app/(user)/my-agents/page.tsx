'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bot, Plus, Server, Calendar, MessageSquare, Trash2, 
  RefreshCw, Loader2, XCircle, AlertTriangle, MoreVertical,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import AddAgentModal from '@/components/features/AddAgentModal';
import { getExternalAgents, deleteExternalAgent, updateExternalAgent } from '@/lib/api/external-agents';
import type { UserExternalAgent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/context/LanguageContext';


interface ChatLog {
  timestamp: string;
  duration_ms: number;
  input_token_size: number;
  output_token_size: number;
  user_message: string;
  assistant_message: string;
}

function MyAgentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  
  const [agents, setAgents] = useState<UserExternalAgent[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<UserExternalAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const loadAgents = useCallback(async (triggerSidebarRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExternalAgents();
      setAgents(data);

      const supabase = createClient();
      const { data: packagesData } = await supabase.from('course_packages').select('id, title, agent_id');
      
      const uniqueCombined = (packagesData || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        agent_id: p.agent_id
      }));

      setCourses(uniqueCombined);

      if (triggerSidebarRefresh && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('agents-updated'));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('agentErrorTitle');
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleSetDefaultTutor = async (agentId: string, currentVal: boolean) => {
    try {
      await updateExternalAgent(agentId, { is_ai_tutor: !currentVal });
      await loadAgents(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('agentErrorTitle');
      alert(errMsg);
    }
  };

  useEffect(() => {
    loadAgents(false);
  }, [loadAgents]);

  useEffect(() => {
    if (agents.length > 0 && !hasInitialSynced && !isLoading) {
      setHasInitialSynced(true);
      handleSyncAll();
    }
  }, [agents, hasInitialSynced, isLoading]);

  useEffect(() => {
    if (agents.length === 0) {
      setChatLogs([]);
      setIsStatsLoading(false);
      return;
    }

    let active = true;
    setIsStatsLoading(true);

    async function fetchAllStats() {
      try {
        const logsPromises = agents.map(async (agent) => {
          try {
            const res = await fetch(`/api/external-agents/${agent.id}/chat`);
            if (res.ok) {
              const data = await res.json();
              return data as ChatLog[];
            }
          } catch (err) {
            console.error(`Failed to fetch chat logs for agent ${agent.id}:`, err);
          }
          return [];
        });

        const allLogsArray = await Promise.all(logsPromises);
        if (!active) return;
        
        const flattenedLogs = allLogsArray.flat();
        setChatLogs(flattenedLogs);
      } catch (err) {
        console.error('Failed to fetch aggregated chat logs:', err);
      } finally {
        if (active) {
          setIsStatsLoading(false);
        }
      }
    }

    fetchAllStats();

    return () => {
      active = false;
    };
  }, [agents]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('add');
      const queryString = params.toString();
      router.replace(`/my-agents${queryString ? `?${queryString}` : ''}`);
    }
  }, [searchParams, router]);

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExternalAgent(agentToDelete.id);
      setAgentToDelete(null);
      await loadAgents(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('agentErrorTitle');
      alert(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const syncAgentStatus = async (agent: UserExternalAgent) => {
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint: agent.endpoint, 
          api_key: agent.api_key,
          agent_program: agent.agent_program,
          agent_type: agent.agent_type 
        }),
      });
      const data = await res.json();
      const newStatus = data.success ? 'online' : 'offline';
      if (agent.status !== newStatus) {
        await updateExternalAgent(agent.id, { status: newStatus });
      }
    } catch {
      if (agent.status !== 'offline') {
        await updateExternalAgent(agent.id, { status: 'offline' });
      }
    }
  };

  const handleSyncAll = async () => {
    if (agents.length === 0) return;
    setIsSyncing(true);
    try {
      await Promise.allSettled(agents.map(syncAgentStatus));
      const updatedData = await getExternalAgents();
      setAgents(updatedData);
    } catch (err) {
      console.error('상태 갱신 실패:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper: format assigned courses label
  const formatAssignedCourses = (count: number) => {
    if (language === 'en') {
      return `${t('agentAssignedCourses')} (${count})`;
    }
    return `${t('agentAssignedCourses')} (${count}${t('agentAssignedCoursesUnit')})`;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('agentMgmtTitle')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('agentMgmtSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncAll} 
            disabled={isSyncing || isLoading || agents.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('agentSyncAll')}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="size-4" />
            {t('agentRegisterNew')}
          </Button>
        </div>
      </div>

      {/* Main Grid / Contents */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2">
                <div className="h-9 bg-muted rounded flex-1" />
                <div className="h-9 bg-muted rounded flex-1" />
                <div className="h-9 bg-muted rounded w-9" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-destructive">{t('agentErrorTitle')}</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadAgents(false)}>{t('agentRetry')}</Button>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-zinc-50/50 dark:bg-zinc-900/10 p-20 text-center space-y-4">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Bot className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{t('agentEmptyTitle')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {t('agentEmptyDesc')}
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="size-4" />
            {t('agentRegisterFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="group border border-border bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => router.push(`/my-agents/${agent.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1 pr-4 min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full">
                      {agent.agent_type === 'llm' ? t('agentTypeLlm') : t('agentTypeHarness')}
                    </Badge>
                    {agent.is_ai_tutor && (
                      <Badge variant="default" className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold">
                        {t('agentDefaultTutor')}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold truncate" title={agent.name}>
                    {agent.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <Server className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate text-xs font-mono" title={agent.endpoint}>{agent.endpoint}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {agent.status === 'online' ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-2.5">
                      {t('agentStatusOnline')}
                    </Badge>
                  ) : agent.status === 'error' ? (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 px-2.5">
                      {t('agentStatusError')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 px-2.5">
                      {t('agentStatusOffline')}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSetDefaultTutor(agent.id, !!agent.is_ai_tutor)}>
                        {agent.is_ai_tutor ? t('agentUnsetDefaultTutor') : t('agentSetDefaultTutor')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setAgentToDelete(agent)}>
                        {t('agentDelete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs border-b border-border/50 pb-3">
                  <div>
                    <span className="text-muted-foreground">{t('agentTypeLabel')}</span>{' '}
                    <span className="font-medium">{agent.agent_type === 'llm' ? t('agentTypeLlm') : t('agentTypeHarness')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('agentEnvLabel')}</span>{' '}
                    <span className="font-medium">{agent.env_type === 'cloud' ? t('agentEnvCloud') : t('agentEnvLocal')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('agentProgramLabel')}</span>{' '}
                    <span className="font-medium capitalize">{agent.agent_program || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('agentModelLabel')}</span>{' '}
                    <span className="font-medium truncate block max-w-full" title={agent.selected_model}>{agent.selected_model || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">{formatAssignedCourses(courses.filter(c => c.agent_id === agent.id).length)}:</span>
                  {courses.filter(c => c.agent_id === agent.id).length > 0 ? (
                    <ul className="text-xs space-y-1 max-h-24 overflow-y-auto pr-1">
                      {courses.filter(c => c.agent_id === agent.id).map(c => (
                        <li key={c.id} className="text-muted-foreground truncate list-disc list-inside">
                          {c.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">{t('agentNoAssignedCourses')}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                  <Calendar className="size-3 shrink-0" />
                  <span>{t('agentRegisteredAt')} {new Date(agent.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button asChild size="sm" className="flex-1 gap-1.5" variant="default">
                  <Link href={`/my-agents/${agent.id}`}>
                    <MessageSquare className="size-3.5" />
                    {t('agentChat')}
                  </Link>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1 gap-1.5"
                  onClick={() => setAgentToDelete(agent)}
                >
                  <Trash2 className="size-3.5" />
                  {t('agentDelete')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {agents.length > 0 && (
        <OverallStatistics
          chatLogs={chatLogs}
          isLoading={isStatsLoading}
          agentsCount={agents.length}
          onlineAgentsCount={agents.filter((a) => a.status === 'online').length}
          assignedCoursesCount={courses.filter((c) => c.agent_id).length}
        />
      )}

      {/* Add Modal */}
      <AddAgentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => loadAgents(true)} 
      />



      {/* Delete Confirmation Dialog */}
      <Dialog open={!!agentToDelete} onOpenChange={(open) => !open && setAgentToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="size-5" />
              {t('agentDeleteTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('agentDeleteDesc').replace('{name}', agentToDelete?.name ?? '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="ghost" onClick={() => setAgentToDelete(null)}>
              {t('agentDeleteCancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('agentDeleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DailySeriesPoint {
  day: number;
  ms: number;
  minutes: number;
  tokens: number;
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

interface OverallStatisticsProps {
  chatLogs: ChatLog[];
  isLoading: boolean;
  agentsCount: number;
  onlineAgentsCount: number;
  assignedCoursesCount: number;
}

function OverallStatistics({
  chatLogs,
  isLoading,
  agentsCount,
  onlineAgentsCount,
  assignedCoursesCount,
}: OverallStatisticsProps) {
  const { t, language } = useLanguage();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

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
    <div className="flex flex-col gap-6 pt-8 border-t border-border/60">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{t('agentStatsTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('agentStatsSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">{t('agentStatsSummaryTitle')}</CardTitle>
            <CardDescription className="text-xs">
              {t('agentStatsSummaryDesc')}
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
            <CardTitle className="text-lg font-bold">{t('agentStatsAssignTitle')}</CardTitle>
            <CardDescription className="text-xs">
              {t('agentStatsAssignDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 gap-2">
            <div className="size-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{assignedCoursesCount}</span>
            </div>
            <span className="text-sm font-semibold mt-1">{t('agentStatsAssignedCount')}</span>
            <span className="text-xs text-muted-foreground text-center px-2">
              {assignedCoursesCount > 0
                ? t('agentStatsAssignedActive').replace('{count}', String(assignedCoursesCount))
                : t('agentStatsAssignedNone')}
            </span>
            <div className="mt-4 pt-3 border-t border-border w-full flex justify-between text-xs text-muted-foreground">
              <span>{t('agentStatsTotalAgents')} <strong className="text-foreground">{agentsCount}{language === 'ko' ? '개' : ''}</strong></span>
              <span>{t('agentStatsOnline')} <strong className="text-emerald-500">{onlineAgentsCount}{language === 'ko' ? '개' : ''}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold">{t('agentStatsChartTitle')}</CardTitle>
            <CardDescription className="text-xs">{t('agentStatsChartDesc')}</CardDescription>
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
            <div className="py-12 text-center text-sm text-muted-foreground">{t('agentStatsNoData')}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('agentStatsTimeChart')}</p>
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
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('agentStatsTokenChart')}</p>
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

export default function MyAgentsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          <div className="h-10 bg-muted rounded w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <CardHeader className="space-y-2">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent className="h-12" />
              <CardFooter className="pt-4 border-t gap-2">
                <div className="h-9 bg-muted rounded flex-1" />
                <div className="h-9 bg-muted rounded flex-1" />
                <div className="h-9 bg-muted rounded w-9" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    }>
      <MyAgentsContent />
    </Suspense>
  );
}
