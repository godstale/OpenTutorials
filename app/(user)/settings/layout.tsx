'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bot, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_NAV = [
  // { label: '프로필', href: '/settings/profile', icon: User },
  { label: '에이전트', href: '/settings/agent', icon: Bot },
  { label: '강좌', href: '/settings/course', icon: BookOpen },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground mt-2">계정 및 서비스 설정을 관리하세요.</p>
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
