'use client';

import { useState } from 'react';
import { ExternalLink, Info, LayoutGrid, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserExternalAgent } from '@/lib/types';
import { updateExternalAgent } from '@/lib/api/external-agents';

interface AgentKanbanTabProps {
  agent: UserExternalAgent;
}

export default function AgentKanbanTab({ agent }: AgentKanbanTabProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const isLocal = agent.endpoint.includes('localhost') || agent.endpoint.includes('127.0.0.1');

  const handleAutoLinkLocal = async () => {
    setIsUpdating(true);
    try {
      await updateExternalAgent(agent.id, { web_ui_url: 'http://localhost:9118' });
      window.location.reload();
    } catch (err) {
      alert('대시보드 주소 자동 등록에 실패했습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!agent.web_ui_url) {
    return (
      <Card className="border border-dashed border-border/80 bg-zinc-50/30 dark:bg-zinc-950/20 py-12 px-6 text-center rounded-2xl shadow-sm">
        <CardContent className="space-y-6 max-w-lg mx-auto">
          <div className="size-16 bg-muted/60 dark:bg-zinc-900/60 text-muted-foreground rounded-full flex items-center justify-center mx-auto shadow-inner">
            <LayoutGrid className="size-8 text-primary/80" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-lg font-bold">등록된 외부 웹 UI가 없습니다</CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {isLocal ? (
                "이 에이전트는 로컬 WSL2 환경에서 구동되고 있습니다. 아래 버튼을 클릭하여 기본 로컬 대시보드(http://localhost:9118) 주소를 즉시 연동해 보세요."
              ) : (
                "Hermes Agent에서 제공하는 칸반보드 또는 별도의 Open WebUI 등을 연결하려면, 설정 탭에서 웹 UI 주소를 등록해 주세요."
              )}
            </CardDescription>
          </div>

          {isLocal && (
            <div className="space-y-4">
              <Button 
                onClick={handleAutoLinkLocal} 
                disabled={isUpdating}
                className="gap-1.5 active:scale-95 transition-all shadow-md bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
              >
                {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <LayoutGrid className="size-4" />}
                로컬 대시보드 자동 연동 (http://localhost:9118)
              </Button>
              
              <div className="text-left text-xs text-muted-foreground bg-zinc-100 dark:bg-zinc-900/60 p-4 rounded-xl border border-border/60 space-y-2 max-w-sm mx-auto shadow-inner leading-relaxed">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  💡 WSL 로컬 대시보드 구동 방법
                </p>
                <p>WSL 터미널에서 에이전트를 구동하면 게이트웨이(8642)와 대시보드(9118)가 동시에 실행됩니다.</p>
                <code className="block bg-zinc-950 text-zinc-300 p-2.5 rounded font-mono text-[10px] break-all border border-zinc-800 shadow-sm">
                  bash hermes-agent/start.sh
                </code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner / Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 shadow-sm text-sm">
        <div className="flex gap-2.5 items-start">
          <Info className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">웹 UI 화면 임베드 안내</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              웹 UI가 회색 화면으로 노출되거나 로드되지 않는 경우, 외부 서버의 보안 정책(X-Frame-Options) 때문일 수 있습니다.
              이 경우 아래 [새 창에서 열기] 버튼을 통해 독립된 탭으로 바로 접속해 보세요.
            </p>
          </div>
        </div>
        <Button 
          asChild 
          size="sm" 
          variant="outline" 
          className="md:shrink-0 gap-1.5 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
        >
          <a href={agent.web_ui_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            새 창에서 열기
          </a>
        </Button>
      </div>

      {/* Frame Container */}
      <div className="relative w-full h-[650px] rounded-2xl border border-border/70 overflow-hidden bg-zinc-950 shadow-md">
        {iframeLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 space-y-3 z-10">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm font-medium animate-pulse">외부 웹 UI 연결 중...</p>
          </div>
        )}
        <iframe
          src={agent.web_ui_url}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={() => setIframeLoading(false)}
          title={`${agent.name} Web UI`}
        />
      </div>
    </div>
  );
}
