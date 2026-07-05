'use client';

import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserHeader } from '@/components/layout/UserHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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
          "flex-1 w-full min-h-0",
          isLearnPage && "flex flex-col"
        )}>
          <div className={cn(
            "max-w-7xl mx-auto px-10 py-8",
            isLearnPage && "max-w-none p-0 flex-1 flex flex-col min-h-0"
          )}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

