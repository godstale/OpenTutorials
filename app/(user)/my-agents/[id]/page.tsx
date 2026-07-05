'use client';

import { useEffect, useState, use, Suspense, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { getExternalAgentById, updateExternalAgent } from '@/lib/api/external-agents';
import type { UserExternalAgent } from '@/lib/types';
import AgentChatTab from '@/components/features/AgentChatTab';
import AgentSettingsTab from '@/components/features/AgentSettingsTab';
import { agentLeaveTimers, cn } from '@/lib/utils';

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

    async function fetchAgentAndUser() {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const [
          { data: { user } },
          fetchedAgent
        ] = await Promise.all([
          supabase.auth.getUser(),
          getExternalAgentById(id)
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

    return () => {
      active = false;
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
            {agent.web_ui_url && (
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="gap-1.5 border-border/80 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-95 transition-all duration-150"
              >
                <a href={agent.web_ui_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  새 창 열기
                </a>
              </Button>
            )}
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
      <Tabs defaultValue="chat" className="w-full space-y-4">
        <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 text-muted-foreground w-full sm:max-w-md border border-border/40 shadow-sm">
          <TabsTrigger
            value="chat"
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            대화 (Chat)
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            설정
          </TabsTrigger>
        </TabsList>

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
