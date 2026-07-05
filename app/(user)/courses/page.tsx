'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Sparkles, Globe, CheckCircle } from 'lucide-react';

export default function CoursesPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setNotified(true);
      setEmail('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] w-full max-w-4xl mx-auto px-4 py-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] bg-emerald-500/10 blur-[80px] rounded-full -z-10 pointer-events-none" />

      <Card className="w-full border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-xl p-8 md:p-12 text-center rounded-2xl">
        <CardContent className="flex flex-col items-center gap-6 p-0">
          
          <div className="relative">
            {/* Glowing Icon Wrapper */}
            <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full animate-pulse" />
            <div className="relative size-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Globe className="size-8 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-center">
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                Coming Soon
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              클라우드 강좌 검색 서비스 오픈 준비 중
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              외부 클라우드 마켓플레이스 서버와 실시간으로 연동하여 전 세계 우수한 AI 튜터 강좌를 다이렉트로 검색하고, 마음에 드는 강좌를 내 로컬 환경에 클릭 한 번으로 다운로드 및 구독할 수 있는 원스톱 서비스가 곧 시작됩니다.
            </p>
          </div>

          {/* Visual Indicator of Progress */}
          <div className="w-full max-w-md bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-2 border border-zinc-200/30">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full w-[85%]" />
          </div>
          <div className="flex justify-between w-full max-w-md text-xs text-muted-foreground px-1 -mt-4">
            <span>기능 설계 및 인터페이스 구축 완료</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">85% 완료</span>
          </div>

          {/* Subscribe Mock Form */}
          <div className="w-full max-w-md space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="size-3 text-amber-500 shrink-0" />
              오픈 시 알림을 받아보고 싶으시다면 이메일을 등록해 주세요.
            </p>
            {notified ? (
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl p-3.5 text-sm font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="size-4 shrink-0" />
                <span>성공적으로 알림 신청이 완료되었습니다!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full">
                <Input 
                  type="email" 
                  required 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-background/50 border-zinc-300 dark:border-zinc-700 rounded-lg focus-visible:ring-indigo-500 h-10 text-sm"
                />
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shrink-0 h-10 px-4 rounded-lg flex items-center gap-1.5 shadow-md">
                  <Bell className="size-3.5" />
                  알림 받기
                </Button>
              </form>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="gap-1.5 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg text-xs">
              <ArrowLeft className="size-3.5" />
              대시보드로 가기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/my-courses')} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs">
              내 학습 강좌 확인
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
