'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  PlayCircle, 
  Lock, 
  Trash2, 
  ListChecks, 
  FileText,
  Award,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Course, UserProgress, TocNode } from '@/lib/types';
import { CourseIcon } from '@/components/ui/course-icon';

function getLeafNodes(nodes: TocNode[], list: { filename: string; title: string; description: string }[] = []): { filename: string; title: string; description: string }[] {
  for (const node of nodes) {
    if (node.filename) {
      list.push({
        filename: node.filename,
        title: node.title,
        description: node.description,
      });
    }
    if (node.children) {
      getLeafNodes(node.children, list);
    }
  }
  return list;
}

interface MyTocNodeViewProps {
  node: TocNode;
  depth: number;
  filenameToIndexMap: Map<string, number>;
  isLessonUnlocked: (index: number) => boolean;
  router: ReturnType<typeof useRouter>;
  slug: string;
}

function MyTocNodeView({ 
  node, 
  depth, 
  filenameToIndexMap, 
  isLessonUnlocked, 
  router, 
  slug 
}: MyTocNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !!node.filename;

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIndentClass = (d: number) => {
    switch (d) {
      case 0: return '';
      case 1: return 'ml-4 sm:ml-6 border-l pl-4 border-zinc-200 dark:border-zinc-800';
      case 2: return 'ml-8 sm:ml-10 border-l pl-4 border-zinc-200 dark:border-zinc-800';
      default: return 'ml-12 border-l pl-4 border-zinc-200 dark:border-zinc-800';
    }
  };

  if (isLeaf) {
    const idx = filenameToIndexMap.get(node.filename!) ?? 0;
    const unlocked = isLessonUnlocked(idx);

    return (
      <div className={`flex flex-col ${getIndentClass(depth)}`}>
        <div 
          className={`p-3.5 flex justify-between items-center transition-colors rounded-lg border my-1 ${
            unlocked 
              ? 'hover:bg-primary/5 cursor-pointer text-foreground border-zinc-200 dark:border-zinc-800' 
              : 'bg-muted/10 text-muted-foreground select-none border-zinc-100 dark:border-zinc-900'
          }`}
          onClick={() => {
            if (unlocked) {
              router.push(`/learn/${slug}?card=${idx + 1}`);
            }
          }}
        >
          <div className="flex gap-3 items-start flex-1 min-w-0 pr-4">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
              unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="font-semibold text-sm flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                {node.title}
              </h4>
              {node.description && (
                <p className="text-xs text-muted-foreground truncate">{node.description}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 ml-4">
            {unlocked ? (
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 gap-1 h-8 px-2 text-xs">
                <PlayCircle className="w-3.5 h-3.5" /> 이동
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted">
                <Lock className="w-3 h-3" /> 잠김
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'chapter':
        return 'text-base sm:text-lg font-bold text-foreground py-3 border-b border-zinc-100 dark:border-zinc-900';
      case 'section':
        return 'text-sm sm:text-base font-semibold text-foreground/90 py-2.5';
      case 'subsection':
      default:
        return 'text-xs sm:text-sm font-medium text-muted-foreground py-2';
    }
  };

  return (
    <div className={`flex flex-col ${getIndentClass(depth)}`}>
      <div 
        onClick={toggleExpand}
        className={`flex items-start justify-between transition-colors w-full text-left rounded-md ${
          hasChildren ? 'cursor-pointer hover:bg-muted/10' : ''
        } ${getTypeStyle(node.type)}`}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="leading-snug truncate">{node.title}</h4>
            {node.description && (
              <p className="text-xs text-muted-foreground font-normal mt-0.5 leading-normal">
                {node.description}
              </p>
            )}
          </div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1 flex flex-col gap-1">
          {node.children!.map((child, idx) => (
            <MyTocNodeView 
              key={`${child.title}-${idx}`} 
              node={child} 
              depth={depth + 1}
              filenameToIndexMap={filenameToIndexMap}
              isLessonUnlocked={isLessonUnlocked}
              router={router}
              slug={slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MyCourseDetailPageClientProps {
  slug: string;
  course: Course;
  isDummy: boolean;
  initialProgress: UserProgress & { max_card?: number };
}

export default function MyCourseDetailPageClient({ 
  slug, 
  course, 
  isDummy,
  initialProgress 
}: MyCourseDetailPageClientProps) {
  const router = useRouter();
  const [progress] = useState(initialProgress);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    console.log('[MyCourseDetailClient] Mounted with progress:', progress);
  }, [progress]);

  const tocItems = course.toc || [];
  const leafNodes = getLeafNodes(tocItems);
  const totalCards = leafNodes.length || 10;

  const filenameToIndexMap = new Map<string, number>();
  leafNodes.forEach((node, idx) => {
    filenameToIndexMap.set(node.filename, idx);
  });
  
  // currentCard corresponds to progress.max_card or progress.last_card
  const currentCard = progress.max_card ?? progress.last_card ?? 0;
  
  const maxUnlockedIndex = progress.completed
    ? totalCards - 1
    : Math.max(0, (progress.max_card ?? progress.last_card ?? 1) - 1);

  const completedCards = progress.completed
    ? totalCards
    : Math.max(0, (progress.max_card ?? progress.last_card ?? 1) - 1);

  const percent = totalCards > 0 ? Math.min(100, Math.round((completedCards / totalCards) * 100)) : 0;

  // A card is unlocked if its 0-based index <= maxUnlockedIndex
  const isLessonUnlocked = (index: number) => {
    return index <= maxUnlockedIndex;
  };

  const handleCancelSubscription = async () => {
    console.log('[MyCourseDetailClient] Cancelling subscription for course id:', course.id);
    setCancelling(true);
    try {
      const res = await fetch('/api/courses/progress', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: course.id,
        }),
      });

      if (res.ok) {
        console.log('[MyCourseDetailClient] Subscription cancelled successfully.');
        setIsCancelDialogOpen(false);
        router.push('/my-courses');
      } else {
        const errorData = await res.json();
        console.error('[MyCourseDetailClient] Unsubscribe failed:', errorData);
        alert(`구독 취소 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('[MyCourseDetailClient] Error cancelling subscription:', err);
      alert('구독 취소 중 네트워크 오류가 발생했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      <Button 
        variant="ghost" 
        className="w-fit gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/my-courses')}
      >
        <ArrowLeft className="w-4 h-4" /> 나의 강좌 목록으로 돌아가기
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">학습 진행 중</Badge>
              {isDummy && <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-500/5">데모 강좌</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{course.title}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">{course.description}</p>
          </div>

          {/* 진행 상황 및 정보 */}
          <Card className="overflow-hidden border-primary/10">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>학습 진행률</span>
                <span className="text-primary font-bold">{percent}%</span>
              </CardTitle>
              <CardDescription>
                총 {totalCards}개 카드 중 {currentCard}개 카드를 진행했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Progress value={percent} className="h-3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <span className="text-xs text-muted-foreground">현재 진도</span>
                  <p className="text-lg font-semibold text-foreground">Card {currentCard} / {totalCards}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <span className="text-xs text-muted-foreground">상태</span>
                  <p className="text-lg font-semibold text-foreground">
                    {progress.completed ? '수강 완료 🎉' : '학습 진행 중 📖'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 목차 및 이동 가능한 지점 */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" /> 강좌 목차 및 바로 학습하기
              </CardTitle>
              <CardDescription>
                현재 진행 상황까지 잠금 해제된 카드로 즉시 이동할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {tocItems.length === 0 ? (
                <div className="text-center text-muted-foreground">목차가 아직 등록되지 않았습니다.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {tocItems.map((item, idx) => (
                    <MyTocNodeView 
                      key={`${item.title}-${idx}`} 
                      node={item} 
                      depth={0}
                      filenameToIndexMap={filenameToIndexMap}
                      isLessonUnlocked={isLessonUnlocked}
                      router={router}
                      slug={slug}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Panel (Right 1 col) */}
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden border-primary/20 shadow-md">
            <div className="h-44 bg-muted relative flex items-center justify-center">
              <CourseIcon thumbnail={course.thumbnail} className="w-full h-full" iconClassName="w-16 h-16" alt={course.title} />
            </div>

            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 예상 학습 시간
                </span>
                <span className="font-semibold text-foreground">2시간</span>
              </div>
              <div className="flex justify-between items-center text-sm py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> 등록일
                </span>
                <span className="font-semibold text-foreground">
                  {course.created_at ? new Date(course.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-3">
              <Button 
                onClick={() => router.push(`/learn/${slug}?card=${currentCard || 1}`)}
                className="w-full gap-2 h-12 text-md font-semibold"
              >
                <PlayCircle className="w-4 h-4" /> 
                {currentCard > 0 ? '학습 이어서 하기' : '강의 시작하기'}
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setIsCancelDialogOpen(true)}
                className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              >
                <Trash2 className="w-4 h-4" /> 구독 취소하기
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 구독 취소 확인 팝업 모달 */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-6 h-6 shrink-0" /> 강좌 구독 취소
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-foreground/90">
              정말로 이 강좌의 구독을 취소하시겠습니까? 
              <br />
              <strong className="text-destructive font-semibold">구독을 취소하면 학습 진도와 모든 진행 내역이 완전히 삭제되며, 이 작업은 되돌릴 수 없습니다.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={cancelling}>
              유지하기
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription} 
              disabled={cancelling}
              className="gap-1.5"
            >
              {cancelling ? '취소 중...' : '구독 취소 및 삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
