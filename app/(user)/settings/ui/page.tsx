'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Sparkles, Palette, Type } from 'lucide-react';

export default function SettingsUiPage() {
  const [font, setFont] = useState<string>('default');

  useEffect(() => {
    const savedFont = localStorage.getItem('font-preference') || 'default';
    setFont(savedFont);
  }, []);

  const handleFontChange = (value: string) => {
    setFont(value);
    localStorage.setItem('font-preference', value);
    if (value === 'noto') {
      document.documentElement.classList.add('font-noto-sans-active');
    } else {
      document.documentElement.classList.remove('font-noto-sans-active');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Palette className="size-5" />
            <CardTitle className="text-xl">UI 설정</CardTitle>
          </div>
          <CardDescription>
            애플리케이션 인터페이스의 테마 및 글꼴(폰트) 설정을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Type className="size-4 text-zinc-500" />
              <span>글꼴 선택</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Font Option */}
              <div
                onClick={() => handleFontChange('default')}
                className={`flex flex-col items-start justify-between rounded-xl border-2 p-5 bg-popover hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all duration-200 ${
                  font === 'default'
                    ? 'border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">기본 글꼴 (Default)</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'default'
                        ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {font === 'default' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    시스템 기본 Geist 및 샌스세리프 폰트를 사용하여 모던하고 깔끔한 느낌을 줍니다.
                  </p>
                  <div className="mt-4 border rounded p-2.5 bg-zinc-50 dark:bg-zinc-900 text-center font-sans text-xs select-none">
                    가나다라마바사 abcdefg 12345 (Default)
                  </div>
                </div>
              </div>

              {/* Noto Sans KR Option */}
              <div
                onClick={() => handleFontChange('noto')}
                className={`flex flex-col items-start justify-between rounded-xl border-2 p-5 bg-popover hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all duration-200 ${
                  font === 'noto'
                    ? 'border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">노토 산스 (Noto Sans KR)</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'noto'
                        ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {font === 'noto' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-noto-sans-demo">
                    구글의 Noto Sans 한글 글꼴을 우선적으로 적용하여 가독성을 높이고 부드러운 인상을 줍니다.
                  </p>
                  <div className="mt-4 border rounded p-2.5 bg-zinc-50 dark:bg-zinc-900 text-center font-noto-sans-demo text-xs select-none">
                    가나다라마바사 abcdefg 12345 (Noto Sans)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 폰트 변화 예시 프레이즈 */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <CardHeader className="py-4">
          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-xs font-semibold">글꼴 미리보기 예시</span>
          </div>
        </CardHeader>
        <CardContent className="text-sm border-t p-6 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-b-lg">
          <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
            "인공지능 튜터와 함께하는 새로운 로컬 학습의 경험. Open Tutorials 플랫폼은 오프라인 환경에서도 강력한 학습 콘텐츠와 지능형 에이전트 연동을 통해 지속 가능한 교육 인프라를 제공합니다."
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
