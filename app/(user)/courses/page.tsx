'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, BookOpen, Star, Clock, PlusCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { CoursePackage } from '@/lib/types';
import { CourseIcon } from '@/components/ui/course-icon';

export default function CoursesPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMsg, setDialogMsg] = useState({ title: '', desc: '' });
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCourses(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const handleRegisterCourse = async (pkg: CoursePackage) => {
    setRegisteringId(pkg.id);
    try {
      const res = await fetch('/api/courses/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkg.id }),
      });

      if (res.ok) {
        setDialogMsg({
          title: '강좌 등록 성공',
          desc: `"${pkg.title}" 강좌가 등록되었습니다. 나의 강좌 페이지에서 학습을 시작하세요.`
        });
        setIsDialogOpen(true);
      } else {
        const errorData = await res.json();
        alert(`강좌 등록 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('[CoursesPage] Error registering course:', err);
      alert('강좌 등록 중 네트워크 오류가 발생했습니다.');
    } finally {
      setRegisteringId(null);
    }
  };

  // 통합 패키지(manifest)와 하위 강좌들의 타이틀, 설명, 태그 리스트를 소스로 검색
  const filteredCourses = courses.filter(pkg => {
    const q = query.toLowerCase().trim();
    if (!q) return true;

    // 1. 강좌 자체의 제목, 설명 검색
    const matchPkg = pkg.title.toLowerCase().includes(q) || (pkg.description || '').toLowerCase().includes(q);
    if (matchPkg) return true;

    // 2. 하위 강좌들 정보 검색 (타이틀, 설명, 태그)
    if (pkg.courses && Array.isArray(pkg.courses)) {
      return pkg.courses.some(c => {
        const matchTitleDesc = c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
        if (matchTitleDesc) return true;

        if (c.tags) {
          if (Array.isArray(c.tags)) {
            return c.tags.some(tag => tag.toLowerCase().includes(q));
          } else if (typeof c.tags === 'string') {
            return (c.tags as string).toLowerCase().includes(q);
          }
        }
        return false;
      });
    }
    return false;
  });

  return (
    <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-zinc-900 dark:text-zinc-50 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">강좌 검색</h1>
        <p className="text-base text-muted-foreground">당신의 성장을 도울 다양한 AI 실무 강좌들을 만나보세요.</p>
      </div>

      <div className="relative max-w-2xl mx-auto w-full mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            className="pl-12 pr-4 h-14 text-lg rounded-full bg-background/50 border-primary/20 focus-visible:ring-primary shadow-sm"
            placeholder="강좌명, 학습 내용, 태그 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4 justify-center flex-wrap">
          {['AI 에이전트', '프롬프트 엔지니어링', '자동화', '마케팅', '기초'].map(tag => (
            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors text-xs py-1 px-3 rounded-full" onClick={() => setQuery(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* 강좌 목록 그리드 */}
      <section className="space-y-6">
        <div className="flex flex-col gap-1.5 border-l-4 border-indigo-600 pl-4">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            전체 강좌
          </h2>
          <p className="text-sm text-muted-foreground">목적에 맞추어 원하는 강좌를 자유롭게 신청하여 학습해 보세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden flex flex-col animate-pulse h-80 bg-muted/20" />
            ))
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              일치하는 강좌가 없습니다.
            </div>
          ) : (
            filteredCourses.map(pkg => (
              <Card 
                key={pkg.id} 
                className="overflow-hidden hover:shadow-lg hover:border-indigo-500/40 transition-all duration-300 group cursor-pointer flex flex-col border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/50 py-0" 
                onClick={() => router.push(`/courses/${pkg.slug}`)}
              >
                <div className="h-44 relative overflow-hidden bg-muted flex items-center justify-center">
                  <CourseIcon thumbnail={pkg.thumbnail} className="w-full h-full group-hover:scale-105 transition-transform duration-500" iconClassName="w-12 h-12" alt={pkg.title} />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-yellow-400" /> AI 강좌
                    </Badge>
                  </div>
                </div>
                <CardHeader className="flex-1 pb-2">
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-zinc-900 dark:text-zinc-50">{pkg.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1.5 text-xs">{pkg.description}</CardDescription>
                </CardHeader>
                <CardFooter className="border-t bg-zinc-50/50 dark:bg-zinc-900/20 pt-4 pb-4 flex justify-between items-center">
                  <div className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    하위 강좌 {pkg.courses?.length || 0}개
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    disabled={registeringId === pkg.id}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleRegisterCourse(pkg); 
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
                  >
                    {registeringId === pkg.id ? '신청 중...' : '강좌 신청'}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* 등록 성공 안내 팝업 모달 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" /> {dialogMsg.title}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {dialogMsg.desc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-between gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
              닫기
            </Button>
            <Button onClick={() => {
              setIsDialogOpen(false);
              router.push('/my-courses');
            }} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              나의 강좌로 이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

