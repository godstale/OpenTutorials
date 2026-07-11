'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Search, Plus, BookOpen, User, Mail, Globe, 
  CheckCircle2, Compass, AlertCircle, Loader2, ArrowRight,
  BookOpenCheck, Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { CourseIcon, PREDEFINED_ICONS } from '@/components/ui/course-icon';

interface CoursePackage {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  published: boolean;
  sequential_play: boolean;
  force_checkpoint: boolean;
  version: string;
  created_at: string;
  author_id?: string;
  author_nickname?: string;
  author_email?: string;
  author_homepage?: string;
}

interface Subscription {
  id: string;
  package_id: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CoursePackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'subscribed' | 'unsubscribed' | 'created'>('all');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [dialogSuccess, setDialogSuccess] = useState('');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('icon:book');
  const [newSequential, setNewSequential] = useState(false);
  const [newForceCheckpoint, setNewForceCheckpoint] = useState(false);

  const fetchCoursesAndSubs = async () => {
    try {
      // 1. Fetch published courses
      const resCourses = await fetch('/api/courses');
      if (resCourses.ok) {
        const data = await resCourses.json();
        setCourses(data);
      }

      // 2. Fetch user subscriptions
      const resSubs = await fetch('/api/packages/subscribe');
      if (resSubs.ok) {
        const data = await resSubs.json();
        setSubscriptions(data);
      }

      // 3. Fetch user profile for creator info
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', 'local-user-id')
        .maybeSingle();
      
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to load courses or subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndSubs();

    // Listen to profile updates so creator info refreshes instantly
    const handleProfileUpdate = () => {
      fetchCoursesAndSubs();
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleSubscribe = async (courseId: string) => {
    try {
      const res = await fetch('/api/packages/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: courseId }),
      });
      if (res.ok) {
        await fetchCoursesAndSubs();
      } else {
        const data = await res.json();
        alert(`수강 신청에 실패했습니다: ${data.error}`);
      }
    } catch (err: any) {
      alert(`수강 신청 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError('');
    setDialogSuccess('');

    // Validations
    if (!newTitle.trim()) {
      setDialogError('강좌 제목을 입력하세요.');
      return;
    }
    if (!newSlug.trim()) {
      setDialogError('주소 슬러그를 입력하세요.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(newSlug.trim())) {
      setDialogError('슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.');
      return;
    }
    if (!newDescription.trim()) {
      setDialogError('강좌 요약 설명을 입력하세요.');
      return;
    }

    if (!userProfile?.nickname) {
      setDialogError('강좌를 등록하기 전에 설정 > 프로필에서 닉네임을 먼저 설정해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const newPackageId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'pkg-' + Math.random().toString(36).substring(2, 11);
      
      const defaultToc = [
        {
          type: 'chapter',
          title: 'Chapter 01. 학습 시작하기',
          description: '이 강좌의 기본 소개와 오리엔테이션입니다.',
          children: [
            {
              type: 'section',
              title: 'LESSON 1-1: 환영합니다',
              description: '강좌 수강을 진심으로 환영합니다. 아래 설명 카드를 읽고 AI 튜터와 대화를 시작해보세요.',
              filename: 'welcome.mdx'
            }
          ]
        }
      ];

      // 1. Insert course package into local db
      const { error: insertErr } = await supabase.from('course_packages').insert({
        id: newPackageId,
        slug: newSlug.trim(),
        title: newTitle.trim(),
        description: newDescription.trim(),
        thumbnail: newIcon,
        published: true,
        sequential_play: newSequential,
        force_checkpoint: newForceCheckpoint,
        version: '1.0.0',
        changelog: '최초 등록',
        toc: defaultToc,
        cards: ['welcome.mdx'],
        author_id: 'local-user-id',
        author_nickname: userProfile.nickname,
        author_email: userProfile.email || null,
        author_homepage: userProfile.homepage_url || null,
      });

      if (insertErr) throw insertErr;

      // 2. Upload config.json to storage
      const configData = {
        cards: ['welcome.mdx'],
        toc: defaultToc
      };
      const configBlob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
      await supabase.storage.from('courses').upload(`${newSlug.trim()}/config.json`, configBlob);

      // 3. Upload welcome.mdx to storage
      const welcomeContent = `# 환영합니다!

이 강좌는 **${newTitle.trim()}** 강좌의 첫 번째 카드입니다.
제작자: **${userProfile.nickname}** ${userProfile.email ? `(${userProfile.email})` : ''}

이제 우측의 AI 튜터와 대화하며 즐겁게 공부해보세요!`;
      const welcomeBlob = new Blob([welcomeContent], { type: 'text/markdown' });
      await supabase.storage.from('courses').upload(`${newSlug.trim()}/cards/welcome.mdx`, welcomeBlob);

      setDialogSuccess('강좌가 성공적으로 등록되었습니다!');
      
      // Clear form
      setNewTitle('');
      setNewSlug('');
      setNewDescription('');
      setNewIcon('icon:book');
      setNewSequential(false);
      setNewForceCheckpoint(false);

      // Refresh list
      await fetchCoursesAndSubs();

      // Close dialog after 1.5s
      setTimeout(() => {
        setIsDialogOpen(false);
        setDialogSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create course package:', err);
      setDialogError(err.message || '강좌 등록 중 오류가 발생했습니다. (슬러그 중복 확인 필요)');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubscribed = (courseId: string) => {
    return subscriptions.some(sub => sub.package_id === courseId);
  };

  // Filtering logic
  const filteredCourses = courses.filter((course) => {
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      course.title.toLowerCase().includes(query) ||
      (course.description && course.description.toLowerCase().includes(query)) ||
      (course.author_nickname && course.author_nickname.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // 2. Tab Filter
    const enrolled = isSubscribed(course.id);
    const isMine = course.author_id === 'local-user-id';

    if (selectedTab === 'subscribed') return enrolled;
    if (selectedTab === 'unsubscribed') return !enrolled;
    if (selectedTab === 'created') return isMine;

    return true;
  });

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pt-1 pb-8 relative">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Compass className="size-8 text-green-700 dark:text-green-400" />
            <span>강좌 검색</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            다양한 분야의 AI 튜터 강좌를 찾아 수강신청하고, 직접 새로운 강좌를 등록해 보세요.
          </p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 shadow-sm flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="size-4" />
          <span>직접 강좌 등록</span>
        </Button>
      </div>

      {/* Search & Tabs bar */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="강좌명, 설명, 제작자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {(
            [
              { id: 'all', label: '전체 강좌' },
              { id: 'subscribed', label: '수강 중' },
              { id: 'unsubscribed', label: '미수강' },
              { id: 'created', label: '내가 만든 강좌' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-[2px] ${
                selectedTab === tab.id
                  ? 'border-green-700 text-green-700 dark:border-green-400 dark:text-green-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col h-[320px] animate-pulse bg-muted/20 border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrolled = isSubscribed(course.id);
            const isCreatorMe = course.author_id === 'local-user-id';

            return (
              <Card 
                key={course.id}
                className="group border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md hover:border-green-700/30 dark:hover:border-green-500/30 transition-all duration-300"
              >
                <div>
                  {/* Thumbnail / Icon Container */}
                  <div className="h-40 w-full relative border-b border-zinc-100 dark:border-zinc-800/80 overflow-hidden">
                    <CourseIcon thumbnail={course.thumbnail} className="transition-transform duration-500 group-hover:scale-105" />
                    {enrolled && (
                      <Badge className="absolute top-3 right-3 bg-emerald-600 hover:bg-emerald-600 text-white gap-1 shadow-sm">
                        <CheckCircle2 className="size-3" />
                        수강 중
                      </Badge>
                    )}
                    {isCreatorMe && (
                      <Badge className="absolute top-3 left-3 bg-blue-600 hover:bg-blue-600 text-white gap-1 shadow-sm">
                        내가 만듦
                      </Badge>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {course.description || '상세 정보가 없습니다.'}
                    </p>

                    {/* Author Profile section */}
                    {course.author_nickname && (
                      <div className="flex items-center gap-2 pt-2 text-xs border-t border-zinc-100 dark:border-zinc-800/50 mt-4 text-zinc-500 dark:text-zinc-400">
                        <User className="size-3.5 text-zinc-400" />
                        <span className="font-medium truncate max-w-[120px]">
                          {course.author_nickname}
                        </span>
                        
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {course.author_homepage && (
                            <a
                              href={course.author_homepage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-green-700 dark:hover:text-green-400 p-0.5"
                              title="제작자 홈페이지"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="size-3.5" />
                            </a>
                          )}
                          {course.author_email && (
                            <a
                              href={`mailto:${course.author_email}`}
                              className="text-zinc-400 hover:text-green-700 dark:hover:text-green-400 p-0.5"
                              title="제작자 이메일"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <CardFooter className="p-5 pt-0">
                  {enrolled ? (
                    <Button 
                      className="w-full text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 gap-1.5"
                      onClick={() => router.push(`/courses/${course.slug}`)}
                    >
                      <BookOpenCheck className="size-4" />
                      <span>학습하러 가기</span>
                    </Button>
                  ) : (
                    <Button 
                      className="w-full text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 gap-1.5"
                      onClick={() => handleSubscribe(course.id)}
                    >
                      <span>수강 신청하기</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-4">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">검색 조건에 맞는 강좌가 없습니다.</p>
            <p className="text-xs">검색어를 변경하거나 다른 필터 탭을 선택해 보세요.</p>
          </div>
        </div>
      )}

      {/* Direct Registration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-green-700 dark:text-green-400">
              <Sparkles className="size-5" />
              <span>새 강좌 만들기</span>
            </DialogTitle>
            <DialogDescription>
              본인만의 목차와 카드를 구성할 수 있는 새로운 강좌 패키지를 생성하고 로컬 DB에 등록합니다.
            </DialogDescription>
          </DialogHeader>

          {/* Validation Errors/Success Alert */}
          {dialogError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/50 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{dialogError}</span>
            </div>
          )}
          {dialogSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/50 text-sm">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{dialogSuccess}</span>
            </div>
          )}

          {!userProfile?.nickname ? (
            <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/10 space-y-3">
              <div className="flex gap-2 text-yellow-800 dark:text-yellow-300">
                <AlertCircle className="size-5 shrink-0" />
                <div className="text-sm font-semibold">프로필 설정 필요</div>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                강좌를 생성하기 전에 먼저 설정 화면의 <strong>Profile</strong> 메뉴에서 제작자 닉네임을 설정해야 합니다. 제작자 정보는 강좌 저작권 및 뷰어에 표시됩니다.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50 border-yellow-200"
                onClick={() => {
                  setIsDialogOpen(false);
                  router.push('/settings/profile');
                }}
              >
                프로필 설정하러 가기
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Creator Card */}
              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border text-xs space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300">제작자 프로필 정보 (동기화됨)</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1"><User className="size-3" /> 닉네임: <strong>{userProfile.nickname}</strong></span>
                  {userProfile.email && <span className="flex items-center gap-1"><Mail className="size-3" /> 이메일: {userProfile.email}</span>}
                  {userProfile.homepage_url && <span className="flex items-center gap-1"><Globe className="size-3" /> 웹사이트: {userProfile.homepage_url}</span>}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">※ 정보를 수정하려면 설정 &gt; 프로필 메뉴를 이용하세요.</p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-semibold">강좌 제목 <span className="text-rose-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="예: 현대 미술 감상과 AI 생성 아트 실습"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-sm font-semibold">주소 슬러그 <span className="text-rose-500">*</span></Label>
                <Input
                  id="slug"
                  placeholder="예: modern-art-ai (영문 소문자, 숫자, 하이픈만)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground">이 주소는 강좌 학습 경로(/learn/슬러그)로 사용됩니다. 중복될 수 없습니다.</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold">요약 설명 <span className="text-rose-500">*</span></Label>
                <Textarea
                  id="description"
                  placeholder="강좌에 대한 간략한 요약 설명과 학습 내용을 작성해 주세요."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Icon / Thumbnail Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">대표 아이콘 선택</Label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-900">
                  {PREDEFINED_ICONS.map((item) => {
                    const iconVal = `icon:${item.id}`;
                    const IconComp = item.icon;
                    const isSelected = newIcon === iconVal;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewIcon(iconVal)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                          isSelected 
                            ? 'border-green-700 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950/30 dark:text-green-400 ring-1 ring-green-700/30'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="size-5 shrink-0" />
                        <span className="text-[8px] truncate max-w-full mt-1.5 text-zinc-500">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="sequential" className="text-xs font-semibold">순차 학습 강제</Label>
                    <p className="text-[10px] text-muted-foreground">이전 장을 완료해야 다음 진입 가능</p>
                  </div>
                  <Switch
                    id="sequential"
                    checked={newSequential}
                    onCheckedChange={setNewSequential}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="checkpoint" className="text-xs font-semibold">체크포인트 필수</Label>
                    <p className="text-[10px] text-muted-foreground">튜터 퀴즈를 통과해야 통과</p>
                  </div>
                  <Switch
                    id="checkpoint"
                    checked={newForceCheckpoint}
                    onCheckedChange={setNewForceCheckpoint}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                      등록 중...
                    </>
                  ) : (
                    '강좌 등록하기'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
