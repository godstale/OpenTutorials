'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings2, Clock, AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentDashboardTabProps {
  agentId: string;
  hasDashboardUrl: boolean;
}

interface CronJob {
  id?: string;
  name?: string;
  schedule?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export default function AgentDashboardTab({ agentId, hasDashboardUrl }: AgentDashboardTabProps) {
  // Config state
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [configText, setConfigText] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveConfigResult, setSaveConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cron state
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [isLoadingCron, setIsLoadingCron] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!hasDashboardUrl) return;
    setIsLoadingConfig(true);
    setConfigError(null);
    setSaveConfigResult(null);
    try {
      const res = await fetch(`/api/external-agents/${agentId}/dashboard/api/config`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConfig(data);
      setConfigText(JSON.stringify(data, null, 2));
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Config 조회 실패');
    } finally {
      setIsLoadingConfig(false);
    }
  }, [agentId, hasDashboardUrl]);

  const fetchCronJobs = useCallback(async () => {
    if (!hasDashboardUrl) return;
    setIsLoadingCron(true);
    setCronError(null);
    try {
      const res = await fetch(`/api/external-agents/${agentId}/dashboard/api/cron/jobs`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // API may return array directly or wrapped in a property
      const jobs = Array.isArray(data) ? data : (data.jobs ?? data.data ?? []);
      setCronJobs(jobs);
    } catch (err) {
      setCronError(err instanceof Error ? err.message : 'Cron 목록 조회 실패');
    } finally {
      setIsLoadingCron(false);
    }
  }, [agentId, hasDashboardUrl]);

  useEffect(() => {
    if (hasDashboardUrl) {
      fetchConfig();
      fetchCronJobs();
    }
  }, [hasDashboardUrl, fetchConfig, fetchCronJobs]);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setSaveConfigResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(configText);
      } catch {
        setSaveConfigResult({ success: false, message: 'JSON 형식이 올바르지 않습니다.' });
        setIsSavingConfig(false);
        return;
      }

      const res = await fetch(`/api/external-agents/${agentId}/dashboard/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSaveConfigResult({ success: true, message: 'Config가 저장되었습니다.' });
      // Refresh config after save
      await fetchConfig();
    } catch (err) {
      setSaveConfigResult({
        success: false,
        message: err instanceof Error ? err.message : 'Config 저장 실패',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Extract model info from config
  const activeModel: string | null = config
    ? typeof config.model === 'string'
      ? config.model
      : typeof config.llm_model === 'string'
        ? config.llm_model
        : null
    : null;

  if (!hasDashboardUrl) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md p-12 text-center space-y-4 shadow-md">
        <Settings2 className="size-10 mx-auto text-zinc-300 dark:text-zinc-600" />
        <h3 className="text-base font-semibold text-foreground">Dashboard API URL을 먼저 설정하세요</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          에이전트 설정 탭에서 Dashboard API URL(예: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">http://myserver:9120</code>)을 입력하고 저장한 뒤 이 탭을 사용하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Card */}
      <Card className="border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-4 px-6">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              에이전트 Config
            </CardTitle>
            <CardDescription className="text-xs">원격 에이전트의 Config를 조회하고 편집합니다. (GET / PUT /api/config)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeModel && (
              <Badge variant="secondary" className="font-mono text-xs">
                모델: {String(activeModel)}
              </Badge>
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={fetchConfig}
              disabled={isLoadingConfig}
              className="size-8 rounded-lg active:scale-95 transition-all"
              title="Config 새로고침"
            >
              <RefreshCw className={`size-3.5 ${isLoadingConfig ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingConfig ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground animate-pulse">Config 조회 중...</span>
            </div>
          ) : configError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-center">
              <p className="text-xs text-destructive font-semibold flex items-center justify-center gap-1.5">
                <AlertTriangle className="size-4" />
                조회 실패
              </p>
              <p className="text-[11px] text-muted-foreground">{configError}</p>
              <Button size="sm" variant="outline" onClick={fetchConfig} className="mt-1 h-7 text-xs">
                다시 시도
              </Button>
            </div>
          ) : (
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              className="w-full min-h-[280px] font-mono text-xs rounded-lg border border-border/60 bg-zinc-50 dark:bg-zinc-900 p-4 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              spellCheck={false}
              placeholder="Config 데이터가 여기에 표시됩니다."
            />
          )}

          {saveConfigResult && (
            <p className={`mt-3 text-xs font-medium ${saveConfigResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {saveConfigResult.message}
            </p>
          )}
        </CardContent>

        {!isLoadingConfig && !configError && (
          <CardFooter className="border-t border-border/60 bg-zinc-50/30 dark:bg-zinc-900/30 p-4 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="gap-1.5 shadow active:scale-95 transition-all"
            >
              <Save className="size-4" />
              {isSavingConfig ? '저장 중...' : 'Config 저장'}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Cron Jobs Card */}
      <Card className="border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-4 px-6">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              Cron 작업 목록
            </CardTitle>
            <CardDescription className="text-xs">등록된 크론 스케줄 목록입니다. (GET /api/cron/jobs)</CardDescription>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={fetchCronJobs}
            disabled={isLoadingCron}
            className="size-8 rounded-lg active:scale-95 transition-all"
            title="Cron 목록 새로고침"
          >
            <RefreshCw className={`size-3.5 ${isLoadingCron ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingCron ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground animate-pulse">Cron 목록 조회 중...</span>
            </div>
          ) : cronError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-center">
              <p className="text-xs text-destructive font-semibold flex items-center justify-center gap-1.5">
                <AlertTriangle className="size-4" />
                조회 실패
              </p>
              <p className="text-[11px] text-muted-foreground">{cronError}</p>
              <Button size="sm" variant="outline" onClick={fetchCronJobs} className="mt-1 h-7 text-xs">
                다시 시도
              </Button>
            </div>
          ) : cronJobs.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="size-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs text-muted-foreground">등록된 Cron 작업이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4">이름</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4">스케줄</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-2">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {cronJobs.map((job, idx) => (
                    <tr key={job.id ?? idx}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">
                        {String(job.name ?? job.id ?? `Job ${idx + 1}`)}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {String(job.schedule ?? '-')}
                      </td>
                      <td className="py-2.5">
                        {job.enabled !== undefined ? (
                          <Badge
                            variant={job.enabled ? 'default' : 'secondary'}
                            className={`text-[10px] px-2 py-0.5 ${job.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}`}
                          >
                            {job.enabled ? '활성' : '비활성'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
