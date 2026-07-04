import { redirect } from 'next/navigation';

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/courses/${slug}`);
}
