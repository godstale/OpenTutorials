export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/auth/login',
  SIGN_UP: '/auth/sign-up',
  SIGN_UP_SUCCESS: '/auth/sign-up-success',
  // User Portal
  DASHBOARD: '/dashboard',
  COURSES: '/courses',
  COURSES_MANAGE: '/courses/manage',
  MY_COURSES: '/my-courses',
  MY_AGENTS: '/my-agents',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_AGENT: '/settings/agent',
  SETTINGS_COURSE: '/settings/course',
} as const;

export const SIDEBAR_ITEMS = [
  { label: '대시보드', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: '강좌 검색', href: ROUTES.COURSES, icon: 'GraduationCap' },
  { label: '나의 강좌', href: ROUTES.MY_COURSES, icon: 'BookOpen' },
  { label: '강좌 관리', href: ROUTES.COURSES_MANAGE, icon: 'GraduationCap' },
  { label: '설정', href: ROUTES.SETTINGS, icon: 'Settings' },
] as const;

