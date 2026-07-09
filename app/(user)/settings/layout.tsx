'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bot, BookOpen, Palette, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SETTINGS_NAV = [
  // { label: '프로필', href: '/settings/profile', icon: User },
  { label: '에이전트', href: '/settings/agent', icon: Bot },
  { label: '강좌', href: '/settings/course', icon: BookOpen },
  { label: 'UI', href: '/settings/ui', icon: Palette },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleResetAll = () => {
    const ok = window.confirm('모든 설정(에이전트 토큰, 폰트, 화면 너비, 우회 여부 등)이 기본값으로 초기화됩니다. 진행하시겠습니까?');
    if (ok) {
      localStorage.removeItem('font-preference');
      localStorage.removeItem('open-tutorials-toc-width');
      localStorage.removeItem('open-tutorials-tutor-width');
      localStorage.removeItem('open-tutorials-agent-max-tokens');
      localStorage.removeItem('open-tutorials-agent-compression-threshold');
      localStorage.removeItem('open-tutorials-bypass-checkpoint');
      
      // Remove font class just in case
      document.documentElement.classList.remove('font-noto-sans-active');
      
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설정</h1>
          <p className="text-muted-foreground mt-2">서비스 설정을 관리하세요.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetAll}
          className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 border-zinc-200 dark:border-zinc-800"
        >
          <RotateCcw className="size-4" />
          <span>전체 리셋</span>
        </Button>
      </div>

      <div className="flex gap-8 items-start">
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {SETTINGS_NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
