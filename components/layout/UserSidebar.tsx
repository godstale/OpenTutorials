'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Settings, Bot, ChevronRight, GraduationCap, BookOpen
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

export function UserSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
      <SidebarHeader className="h-16 flex items-center px-4 justify-center border-b">
        <Link href="/" className="font-bold text-lg flex items-center w-full overflow-hidden whitespace-nowrap">
          {isCollapsed ? "O" : "Open Tutorials"}
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
                  tooltip="대시보드"
                >
                  <Link href={ROUTES.DASHBOARD}>
                    <LayoutDashboard className="size-4" />
                    <span>대시보드</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarSeparator className="my-2 mx-2" />

              {/* 강좌 검색 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.COURSES || (pathname ? pathname.startsWith(ROUTES.COURSES + '/') : false)}
                  tooltip="강좌 검색"
                >
                  <Link href={ROUTES.COURSES}>
                    <GraduationCap className="size-4" />
                    <span>강좌 검색</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 나의 강좌 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.MY_COURSES || (pathname ? pathname.startsWith(ROUTES.MY_COURSES + '/') : false)}
                  tooltip="나의 강좌"
                >
                  <Link href={ROUTES.MY_COURSES}>
                    <BookOpen className="size-4" />
                    <span>나의 강좌</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 강좌 관리 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.COURSES_MANAGE || (pathname ? pathname.startsWith(ROUTES.COURSES_MANAGE + '/') : false)}
                  tooltip="강좌 관리"
                >
                  <Link href={ROUTES.COURSES_MANAGE}>
                    <Settings className="size-4" />
                    <span>강좌 관리</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarSeparator className="my-2 mx-2" />

              {/* 에이전트 관리 */}
              <SidebarMenuItem key="/my-agents">
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.MY_AGENTS || isExternalAgentActive}
                  tooltip="에이전트 관리"
                >
                  <Link href={ROUTES.MY_AGENTS}>
                    <Bot className="size-4" />
                    <span>에이전트 관리</span>
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
                  tooltip="설정"
                >
                  <Link href={ROUTES.SETTINGS}>
                    <Settings className="size-4" />
                    <span>설정</span>
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
