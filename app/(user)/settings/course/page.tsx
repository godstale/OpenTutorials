'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function SettingsCoursePage() {
  const [bypassCheckpoint, setBypassCheckpoint] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('open-tutorials-bypass-checkpoint') === 'true';
    setBypassCheckpoint(saved);
  }, []);

  const handleToggle = (checked: boolean) => {
    setBypassCheckpoint(checked);
    localStorage.setItem('open-tutorials-bypass-checkpoint', checked ? 'true' : 'false');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <ShieldAlert className="size-5" />
            <CardTitle className="text-xl">강좌 학습 설정</CardTitle>
          </div>
          <CardDescription>
            강좌 학습 진행 방식 및 제한 사항을 구성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            <div className="space-y-1">
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 block">체크포인트 강제 건너뛰기</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                활성화 시, 강좌에 설정된 모든 체크포인트 QnA 단계에서 잠금을 강제로 우회하고 다음 학습 카드로 진행할 수 있습니다. 
                (체크포인트 통과 여부에 관계없이 바로 통과 가능)
              </p>
            </div>
            
            {/* Custom Tailwind Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={bypassCheckpoint}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 rounded-full peer dark:bg-zinc-800 peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-zinc-100 peer-checked:bg-green-700 dark:peer-checked:bg-green-300"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>학습 환경 설정</CardTitle>
          <CardDescription>강좌 재생 속도, 자막, 화질 등 학습 환경을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
