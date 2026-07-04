import { Suspense } from 'react';
import CourseDetailPageClient from './client';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="container max-w-5xl mx-auto py-8 text-center text-muted-foreground animate-pulse">강좌 정보를 불러오는 중...</div>}>
      <CourseDetailPageClient slug={slug} />
    </Suspense>
  );
}
