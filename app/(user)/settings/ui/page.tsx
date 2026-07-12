'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Palette, Type, RotateCcw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/context/LanguageContext';

export default function SettingsUiPage() {
  const [font, setFont] = useState<string>('default');
  const { language, setLanguage, t } = useLanguage();

  const handleResetWidths = () => {
    localStorage.removeItem('open-tutorials-toc-width');
    localStorage.removeItem('open-tutorials-tutor-width');
    alert(t('resetLayoutAlert'));
  };

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

  const handleLanguageChange = (value: 'ko' | 'en') => {
    setLanguage(value);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Palette className="size-5" />
            <CardTitle className="text-xl">{t('uiSettings')}</CardTitle>
          </div>
          <CardDescription>
            {t('uiSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Globe className="size-4 text-zinc-500" />
              <span>{t('languageSelect')}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Korean Option */}
              <div
                onClick={() => handleLanguageChange('ko')}
                className={`flex flex-col items-start justify-between rounded-xl border-2 p-5 bg-popover hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all duration-200 ${
                  language === 'ko'
                    ? 'border-green-700 dark:border-green-300 ring-1 ring-green-700/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">{t('korean')}</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      language === 'ko'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {language === 'ko' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {t('koreanDesc')}
                  </p>
                </div>
              </div>

              {/* English Option */}
              <div
                onClick={() => handleLanguageChange('en')}
                className={`flex flex-col items-start justify-between rounded-xl border-2 p-5 bg-popover hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all duration-200 ${
                  language === 'en'
                    ? 'border-green-700 dark:border-green-300 ring-1 ring-green-700/30'
                    : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">{t('english')}</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      language === 'en'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {language === 'en' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {t('englishDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Font Selection */}
          <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Type className="size-4 text-zinc-500" />
              <span>{t('fontSelect')}</span>
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
                    <span className="font-semibold text-sm">{t('defaultFont')}</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'default'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {font === 'default' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('defaultFontDesc')}
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
                    <span className="font-semibold text-sm">{t('notoSans')}</span>
                    <div className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                      font === 'noto'
                        ? 'border-green-700 bg-green-700 dark:border-green-300 dark:bg-green-300 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}>
                      {font === 'noto' && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-noto-sans-demo">
                    {t('notoSansDesc')}
                  </p>
                  <div className="mt-4 border rounded p-2.5 bg-zinc-50 dark:bg-zinc-900 text-center font-noto-sans-demo text-xs select-none">
                    가나다라마바사 abcdefg 12345 (Noto Sans)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout Width Reset Section */}
          <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <RotateCcw className="size-4 text-zinc-500" />
              <span>{t('resetLayout')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('resetLayoutDesc')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWidths}
              className="mt-2 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200"
            >
              {t('resetLayoutBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
