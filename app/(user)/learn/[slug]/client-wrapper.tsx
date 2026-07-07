'use client';

import dynamic from 'next/dynamic';
import { Course, CoursePackage } from '@/lib/types';

const LearnPageClient = dynamic(() => import('./client'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse">강좌를 불러오는 중...</div>
});

interface ClientWrapperProps {
  slug: string;
  course: Course;
  cards: any[];
  initialCardIndex?: number;
  isUpdated?: boolean;
  userProgress?: any;
  checkpoints?: any[];
  coursePackage?: CoursePackage | null;
}

export default function LearnPageClientWrapper(props: ClientWrapperProps) {
  return <LearnPageClient {...props} />;
}
