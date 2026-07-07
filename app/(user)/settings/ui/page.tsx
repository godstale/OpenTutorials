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
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
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
                    ? 'border-green-700 dark:border-green-300 ring-1 ring-green-700/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">기본 글꼴 (Default)</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'default'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
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
                    ? 'border-green-700 dark:border-green-300 ring-1 ring-green-700/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">노토 산스 (Noto Sans KR)</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'noto'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
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
    </div>
  );
}
