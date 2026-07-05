'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bot, Plus, Server, Calendar, MessageSquare, Trash2, 
  RefreshCw, Loader2, XCircle, AlertTriangle, MoreVertical 
} from 'lucide-react';
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
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';
import { createClient } from '@/lib/supabase/client';


function MyAgentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [agents, setAgents] = useState<UserExternalAgent[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<UserExternalAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  const loadAgents = useCallback(async (triggerSidebarRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExternalAgents();
      setAgents(data);

      const supabase = createClient();
      const { data: coursesData } = await supabase.from('courses').select('id, title, agent_id');
      setCourses(coursesData || []);

      if (triggerSidebarRefresh && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('agents-updated'));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '에이전트 목록을 불러오는데 실패했습니다.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetDefaultTutor = async (agentId: string, currentVal: boolean) => {
    try {
      await updateExternalAgent(agentId, { is_ai_tutor: !currentVal });
      await loadAgents(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '기본 튜터 설정에 실패했습니다.';
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
      const errMsg = err instanceof Error ? err.message : '에이전트 삭제에 실패했습니다.';
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
        body: JSON.stringify({ endpoint: agent.endpoint, api_key: agent.api_key }),
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

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">에이전트 관리</h1>
          <p className="text-muted-foreground mt-2">
            AI 튜터로 사용될 에이전트를 관리합니다.
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
            상태 동기화
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="size-4" />
            신규 에이전트 등록
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
          <h3 className="font-semibold text-destructive">오류가 발생했습니다</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadAgents(false)}>다시 시도</Button>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-zinc-50/50 dark:bg-zinc-900/10 p-20 text-center space-y-4">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Bot className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">등록된 외부 에이전트가 없습니다</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              자신의 로컬 서버나 Tencent Cloud 등 외부 클라우드에 구동 중인 Hermes Agent를 연결해 보세요.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="size-4" />
            첫 에이전트 등록하기
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
                      {agent.agent_type === 'llm' ? 'LLM' : '하네스'}
                    </Badge>
                    {agent.is_ai_tutor && (
                      <Badge variant="default" className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold">
                        기본 튜터
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
                      온라인
                    </Badge>
                  ) : agent.status === 'error' ? (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 px-2.5">
                      에러
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 px-2.5">
                      오프라인
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
                        {agent.is_ai_tutor ? '기본 튜터 해제' : '기본 튜터로 설정'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setAgentToDelete(agent)}>
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs border-b border-border/50 pb-3">
                  <div>
                    <span className="text-muted-foreground">타입:</span>{' '}
                    <span className="font-medium">{agent.agent_type === 'llm' ? 'LLM' : '하네스'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">환경:</span>{' '}
                    <span className="font-medium">{agent.env_type === 'cloud' ? '클라우드' : '로컬'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">프로그램:</span>{' '}
                    <span className="font-medium capitalize">{agent.agent_program || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">모델:</span>{' '}
                    <span className="font-medium truncate block max-w-full" title={agent.selected_model}>{agent.selected_model || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">할당된 강좌 ({courses.filter(c => c.agent_id === agent.id).length}개):</span>
                  {courses.filter(c => c.agent_id === agent.id).length > 0 ? (
                    <ul className="text-xs space-y-1 max-h-24 overflow-y-auto pr-1">
                      {courses.filter(c => c.agent_id === agent.id).map(c => (
                        <li key={c.id} className="text-muted-foreground truncate list-disc list-inside">
                          {c.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">할당된 강좌 없음</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                  <Calendar className="size-3 shrink-0" />
                  <span>등록일: {new Date(agent.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button asChild size="sm" className="flex-1 gap-1.5" variant="default">
                  <Link href={`/my-agents/${agent.id}`}>
                    <MessageSquare className="size-3.5" />
                    대화하기
                  </Link>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1 gap-1.5"
                  onClick={() => setAgentToDelete(agent)}
                >
                  <Trash2 className="size-3.5" />
                  삭제
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
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
              외부 에이전트 삭제
            </DialogTitle>
            <DialogDescription className="pt-2">
              정말로 <span className="font-semibold text-foreground">&quot;{agentToDelete?.name}&quot;</span> 에이전트를 삭제하시겠습니까? 
              등록 정보를 삭제해도 실제 실행 중인 외부 서버의 에이전트는 종료되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="ghost" onClick={() => setAgentToDelete(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              에이전트 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
