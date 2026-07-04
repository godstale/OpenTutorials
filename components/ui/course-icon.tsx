import React from 'react';
import { 
  Bot, Brain, Cpu, Terminal, Sparkles, Workflow, Zap, Code2, 
  Megaphone, Palette, Database, Cloud, Lock, Globe, Smartphone, 
  LineChart, GitBranch, MessageSquare, Layers, Gamepad2, Scale, 
  GraduationCap, BookOpen,
  Coins, History, Compass, Music, Paintbrush, ClipboardList,
  Landmark, Users, Film, FlaskConical, Dumbbell, Plane
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const PREDEFINED_ICONS = [
  // Technology & Science
  { id: 'bot', label: 'AI 에이전트', icon: Bot },
  { id: 'brain', label: '인공지능 / LLM', icon: Brain },
  { id: 'cpu', label: '시스템 / 하드웨어', icon: Cpu },
  { id: 'terminal', label: '프롬프트 / 터미널', icon: Terminal },
  { id: 'sparkles', label: '생성형 AI / 아트', icon: Sparkles },
  { id: 'workflow', label: '자동화 / 워크플로우', icon: Workflow },
  { id: 'zap', label: '실시간 / 트리거', icon: Zap },
  { id: 'code', label: '소프트웨어 개발', icon: Code2 },
  { id: 'database', label: '데이터베이스 / SQL', icon: Database },
  { id: 'cloud', label: '클라우드 / DevOps', icon: Cloud },
  { id: 'lock', label: '보안 / 해킹', icon: Lock },
  { id: 'globe', label: '웹 기술 / 네트워크', icon: Globe },
  { id: 'smartphone', label: '모바일 앱 개발', icon: Smartphone },
  { id: 'git', label: '버전 관리 / Git', icon: GitBranch },
  { id: 'message-square', label: '챗봇 / 메시징', icon: MessageSquare },
  { id: 'layers', label: '시스템 아키텍처', icon: Layers },
  { id: 'gamepad', label: '게임 개발', icon: Gamepad2 },
  { id: 'science', label: '과학 / 탐구', icon: FlaskConical },

  // General & Business & Humanities
  { id: 'stock', label: '주식 / 금융', icon: Coins },
  { id: 'line-chart', label: '비즈니스 / 성장 분석', icon: LineChart },
  { id: 'plan', label: '기획 / 전략', icon: ClipboardList },
  { id: 'history', label: '역사 / 인문학', icon: History },
  { id: 'culture', label: '문화 / 교양', icon: Compass },
  { id: 'music', label: '음악 / 음향', icon: Music },
  { id: 'art', label: '미술 / 회화', icon: Paintbrush },
  { id: 'politics', label: '정치 / 행정', icon: Landmark },
  { id: 'society', label: '사회 / 시사', icon: Users },
  { id: 'movie', label: '영화 / 영상', icon: Film },
  { id: 'health', label: '건강 / 스포츠', icon: Dumbbell },
  { id: 'travel', label: '여행 / 레저', icon: Plane },
  { id: 'scale', label: '법률 / AI 윤리', icon: Scale },
  { id: 'graduation-cap', label: '학업 / 이론', icon: GraduationCap },
  { id: 'book', label: '일반 / 기초 (Default)', icon: BookOpen }
];

export function getIconComponent(iconId: string) {
  const cleanId = iconId.replace(/^icon:/, '');
  const found = PREDEFINED_ICONS.find((item) => item.id === cleanId);
  return found ? found.icon : BookOpen;
}

interface CourseIconProps {
  thumbnail: string | null | undefined;
  className?: string;
  iconClassName?: string;
  alt?: string;
}

export function CourseIcon({ thumbnail, className, iconClassName, alt }: CourseIconProps) {
  if (thumbnail && thumbnail.startsWith('icon:')) {
    const IconComp = getIconComponent(thumbnail);
    return (
      <div className={cn("flex items-center justify-center bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 w-full h-full", className)}>
        <IconComp className={cn("w-12 h-12", iconClassName)} />
      </div>
    );
  }

  if (thumbnail && (thumbnail.startsWith('http') || thumbnail.startsWith('/') || thumbnail.startsWith('data:'))) {
    return (
      <img 
        src={thumbnail} 
        alt={alt || "Thumbnail"} 
        className={cn("w-full h-full object-cover", className)}
      />
    );
  }

  // Fallback to Default Icon (BookOpen)
  return (
    <div className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 w-full h-full", className)}>
      <BookOpen className={cn("w-12 h-12", iconClassName)} />
    </div>
  );
}
