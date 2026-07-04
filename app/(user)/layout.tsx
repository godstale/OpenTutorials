import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserHeader } from '@/components/layout/UserHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import React from 'react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      className="bg-muted/20"
      style={{"--sidebar-width": "16rem"} as React.CSSProperties}
    >
      <Suspense fallback={<div className="w-64 border-r border-border bg-white dark:bg-zinc-950" />}>
        <UserSidebar />
      </Suspense>
      <SidebarInset className="has-[.no-layout-padding]:h-svh has-[.no-layout-padding]:overflow-hidden flex flex-col">
        <Suspense fallback={<header className="h-16 border-b border-border bg-white" />}>
          <UserHeader />
        </Suspense>
        <main className="flex-1 w-full min-h-0 has-[.no-layout-padding]:flex has-[.no-layout-padding]:flex-col">
          <div className="max-w-7xl mx-auto px-10 py-8 has-[.no-layout-padding]:max-w-none has-[.no-layout-padding]:p-0 has-[.no-layout-padding]:flex-1 has-[.no-layout-padding]:flex has-[.no-layout-padding]:flex-col has-[.no-layout-padding]:min-h-0">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
