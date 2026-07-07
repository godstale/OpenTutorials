'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ROUTES } from '@/lib/constants/routes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLearnLayout } from '@/lib/context/LearnLayoutContext';
import { Button } from '@/components/ui/button';
import { Columns3, Columns2, Layout } from 'lucide-react';

export function UserHeader() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const isLearnPage = pathname?.includes('/learn/');
  const { layout, setLayout } = useLearnLayout();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: any) => {
      const data = res?.data;
      if (data?.user) {
        setUser(data.user);
      }
    });
  }, []);

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-6 justify-between">
      <div className="flex items-center gap-4">
        {isLearnPage ? (
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border text-xs">
            <Button
              variant={layout === '3-layout' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('3-layout')}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium transition-all duration-200"
            >
              <Columns3 className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">3단 보기</span>
            </Button>
            <Button
              variant={layout === 'content-tutor' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('content-tutor')}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium transition-all duration-200"
            >
              <Columns2 className="h-4 w-4 text-muted-foreground rotate-180" />
              <span className="hidden sm:inline">본문 + 튜터</span>
            </Button>
            <Button
              variant={layout === 'toc-content' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('toc-content')}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium transition-all duration-200"
            >
              <Columns2 className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">목차 + 본문</span>
            </Button>
            <Button
              variant={layout === 'content-only' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('content-only')}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium transition-all duration-200"
            >
              <Layout className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">본문만</span>
            </Button>
          </div>
        ) : (
          <SidebarTrigger className="-ml-2" />
        )}
      </div>
      <div className="flex items-center gap-4">
        <Link href={ROUTES.SETTINGS}>
          <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initial}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

