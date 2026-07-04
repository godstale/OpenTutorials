'use client';

import { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AITutorProgressOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function AITutorProgressOverlay({ isOpen }: AITutorProgressOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('에이전트 서버에 연결 중...');

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStatusText('에이전트 서버에 연결 중...');
      return;
    }

    // Dynamic progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 20) {
          setStatusText('에이전트 서버 연결 테스트 중...');
          return prev + Math.random() * 5 + 2;
        } else if (prev < 45) {
          setStatusText('AI 튜터 페르소나 및 지침 패키지 구성 중...');
          return prev + Math.random() * 4 + 1.5;
        } else if (prev < 75) {
          setStatusText('에이전트에 지침 파일(soul.md) 전송 및 주입 중...');
          return prev + Math.random() * 3 + 1;
        } else if (prev < 92) {
          setStatusText('에이전트 응답 확인 및 지침 적용(SUCCESS) 대기 중...');
          return prev + Math.random() * 1.5 + 0.5;
        } else if (prev < 98) {
          setStatusText('최종 연동 상태 검증 중...');
          return prev + 0.2;
        }
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/75 backdrop-blur-xl flex items-center justify-center transition-all duration-300">
      {/* Decorative ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 rounded-full blur-3xl opacity-70 pointer-events-none" />

      <div className="relative bg-card/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl max-w-md w-full mx-4 p-8 overflow-hidden flex flex-col items-center text-center">
        {/* Top subtle visual strip */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

        {/* Floating Bot Icon with Ripple Effect */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-md animate-pulse" />
          <div className="relative size-16 bg-gradient-to-tr from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 rounded-full flex items-center justify-center shadow-lg border border-violet-400/20">
            <Bot className="size-8 text-white animate-bounce" style={{ animationDuration: '2.5s' }} />
          </div>
          {/* External loader spinner spinning around the bot icon */}
          <div className="absolute -inset-1.5 border border-dashed border-violet-500/40 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Text Area */}
        <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
          AI 튜터 연동 및 지침 설정 중
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          외부 에이전트에 AI 튜터 지침을 업데이트하고 있습니다. 이 작업은 최대 15초가 소요될 수 있습니다.
        </p>

        {/* Progress Bar Container */}
        <div className="w-full space-y-3 mb-4">
          <Progress value={progress} className="h-2 bg-muted/40" />
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground px-0.5">
            <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <Loader2 className="size-3 animate-spin shrink-0" />
              {statusText}
            </span>
            <span className="font-mono text-foreground/80">{Math.min(100, Math.round(progress))}%</span>
          </div>
        </div>

        {/* Detail tip */}
        <div className="text-[11px] text-muted-foreground/60 mt-2 bg-muted/30 border border-border/20 rounded-lg p-2.5 w-full">
          💡 에이전트의 <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">soul.md</code>가 설정되면, 강좌 학습 화면에서 실시간 튜터링 및 학습 자료 자동 동기화 기능이 활성화됩니다.
        </div>
      </div>
    </div>
  );
}
