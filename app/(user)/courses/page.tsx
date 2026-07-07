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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] bg-emerald-500/10 blur-[80px] rounded-full -z-10 pointer-events-none" />

      <Card className="w-full border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-xl p-8 md:p-12 text-center rounded-2xl">
        <CardContent className="flex flex-col items-center gap-6 p-0">
          
          <div className="relative">
            {/* Glowing Icon Wrapper */}
            <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full animate-pulse" />
            <div className="relative size-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Globe className="size-8 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <div className="pb-7 space-y-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex justify-center">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                Coming Soon
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-700 via-teal-700 to-emerald-700 bg-clip-text text-transparent dark:from-green-300 dark:to-teal-300">
              강좌 검색 기능 준비 중
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              외부 서버와 연동하여 AI 튜터 강좌를 검색하고, 마음에 드는 강좌를 다운로드 및 등록 할 수 있는 서비스가 곧 시작됩니다.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="gap-1.5 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg text-xs">
              <ArrowLeft className="size-3.5" />
              대시보드로 가기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/my-courses')} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-xs">
              내 학습 강좌 확인
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
