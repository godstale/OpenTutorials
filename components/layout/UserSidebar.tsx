'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Settings, Bot, ChevronRight, BookOpen, Wrench, Search
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { getExternalAgents } from '@/lib/api/external-agents';
import { UserExternalAgent } from '@/lib/types';
import { ROUTES } from '@/lib/constants/routes';
import { useLanguage } from '@/lib/context/LanguageContext';

export function UserSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { t, language } = useLanguage();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [agents, setAgents] = useState<UserExternalAgent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch agents on mount or when pathname changes under specific conditions
  useEffect(() => {
    let active = true;
    const shouldFetch = !hasFetchedRef.current || 
                        (pathname ? pathname.startsWith('/my-agents') : false) || 
                        pathname === '/dashboard';

    if (shouldFetch) {
      async function loadAgents() {
        try {
          const data = await getExternalAgents();
          if (active) {
            setAgents(data);
            hasFetchedRef.current = true;
          }
        } catch (error) {
          console.error("Failed to load external agents in sidebar:", error);
        }
      }
      loadAgents();
    }

    return () => {
      active = false;
    };
  }, [pathname]);

  // Listen for custom event to sync sidebar when agents are mutated (added/deleted)
  useEffect(() => {
    let active = true;
    const handleRefresh = () => {
      async function loadAgents() {
        try {
          const data = await getExternalAgents();
          if (active) {
            setAgents(data);
            hasFetchedRef.current = true;
          }
        } catch (error) {
          console.error("Failed to load external agents in sidebar on event:", error);
        }
      }
      loadAgents();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('agents-updated', handleRefresh);
    }
    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('agents-updated', handleRefresh);
      }
    };
  }, []);

  // Handle auto-expansion when on details route (/my-agents/[id])
  const isExternalAgentActive = pathname ? pathname.startsWith('/my-agents/') : false;
  const activeAgentId = isExternalAgentActive && pathname ? pathname.split('/my-agents/')[1] : null;

  useEffect(() => {
    if (activeAgentId && activeAgentId !== '') {
      setIsOpen(true);
    }
  }, [activeAgentId]);

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className={cn("h-16 flex flex-row items-center border-b transition-all duration-200", isCollapsed ? "px-2 justify-center" : "px-4 justify-start")}>
        <Link href="/" className={cn("font-bold text-sm flex items-center gap-2 w-full overflow-hidden whitespace-nowrap", isCollapsed ? "justify-center" : "justify-start")}>
          <Bot className="size-5 text-primary flex-shrink-0" />
          {mounted && isCollapsed ? null : <span>Open Tutorials</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-8">
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 대시보드 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.DASHBOARD || (pathname ? pathname.startsWith(ROUTES.DASHBOARD + '/') : false)}
                  tooltip={t('dashboard')}
                >
                  <Link href={ROUTES.DASHBOARD}>
                    <LayoutDashboard className="size-4" />
                    <span>{t('dashboard')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarSeparator className="my-2 mx-2" />

              {/* 강좌 검색 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.COURSES || (pathname ? (pathname.startsWith(ROUTES.COURSES + '/') && !pathname.startsWith(ROUTES.COURSES_MANAGE)) : false)}
                  tooltip={t('searchCourses')}
                >
                  <Link href={ROUTES.COURSES}>
                    <Search className="size-4" />
                    <span>{t('searchCourses')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 나의 강좌 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.MY_COURSES || (pathname ? pathname.startsWith(ROUTES.MY_COURSES + '/') : false)}
                  tooltip={t('myCourses')}
                >
                  <Link href={ROUTES.MY_COURSES}>
                    <BookOpen className="size-4" />
                    <span>{t('myCourses')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 강좌 관리 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.COURSES_MANAGE || (pathname ? pathname.startsWith(ROUTES.COURSES_MANAGE + '/') : false)}
                  tooltip={t('manageCourses')}
                >
                  <Link href={ROUTES.COURSES_MANAGE}>
                    <Wrench className="size-4" />
                    <span>{t('manageCourses')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarSeparator className="my-2 mx-2" />

              {/* 에이전트 관리 */}
              <SidebarMenuItem key="/my-agents">
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.MY_AGENTS || isExternalAgentActive}
                  tooltip={t('manageAgents')}
                >
                  <Link href={ROUTES.MY_AGENTS}>
                    <Bot className="size-4" />
                    <span>{t('manageAgents')}</span>
                  </Link>
                </SidebarMenuButton>

                {/* Toggle button: only when expanded and has agents */}
                {!isCollapsed && agents.length > 0 && (
                  <SidebarMenuAction showOnHover={false} onClick={() => setIsOpen(!isOpen)}>
                    <ChevronRight className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")} />
                  </SidebarMenuAction>
                )}

                {/* Sub-menu rendering: only when expanded, open and has agents */}
                {!isCollapsed && isOpen && agents.length > 0 && (
                  <SidebarMenuSub>
                    {agents.map((agent) => {
                      const isAgentActive = pathname === `/my-agents/${agent.id}`;
                      return (
                        <SidebarMenuSubItem key={agent.id}>
                          <SidebarMenuSubButton asChild isActive={isAgentActive}>
                            <Link href={`/my-agents/${agent.id}`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{agent.name}</span>
                                <span className={cn(
                                  "size-1.5 rounded-full flex-shrink-0 transition-all duration-300",
                                  agent.status === 'online' ? "bg-emerald-500" :
                                  agent.status === 'error' ? "bg-rose-500" : "bg-zinc-400"
                                )} />
                              </div>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              <SidebarSeparator className="my-2 mx-2" />

              {/* 설정 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.SETTINGS || (pathname ? pathname.startsWith(ROUTES.SETTINGS + '/') : false)}
                  tooltip={t('settings')}
                >
                  <Link href={ROUTES.SETTINGS}>
                    <Settings className="size-4" />
                    <span>{t('settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
