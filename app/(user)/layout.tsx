'use client';

import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserHeader } from '@/components/layout/UserHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Bot } from 'lucide-react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLearnPage = pathname?.includes('/learn/');

  return (
    <SidebarProvider
      className="bg-muted/20"
      style={{"--sidebar-width": "16rem"} as React.CSSProperties}
    >
      <Suspense fallback={<div className="w-64 border-r border-border bg-white dark:bg-zinc-950" />}>
        <UserSidebar />
      </Suspense>
      <SidebarInset className={cn(
        "flex flex-col",
        isLearnPage && "h-svh overflow-hidden"
      )}>
        <Suspense fallback={<header className="h-16 border-b border-border bg-white" />}>
          <UserHeader />
        </Suspense>
        <main className={cn(
          "flex-1 w-full min-h-0 flex flex-col",
          isLearnPage && "flex flex-col"
        )}>
          <div className={cn(
            "max-w-7xl mx-auto px-10 py-8 flex-1 flex flex-col justify-between w-full",
            isLearnPage && "max-w-none mx-0 p-0 flex-1 flex flex-col min-h-0"
          )}>
            {isLearnPage ? (
              children
            ) : (
              <>
                <div className="flex-1">
                  {children}
                </div>
                <footer className="mt-32 border-t border-zinc-300/50 dark:border-zinc-800/50 pt-8 pb-3 text-center text-sm text-muted-foreground w-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                      <Bot className="size-6 text-primary" />
                      <span>Open Tutorials</span>
                    </div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      https://github.com/godstale/OpenTutorials
                    </p>
                  </div>
                </footer>
              </>
            )}
          </div>
        </main>
        {!isLearnPage && <ScrollToTop />}
      </SidebarInset>
    </SidebarProvider>
  );
}

