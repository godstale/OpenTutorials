'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, BookOpen, User, Mail, Globe, 
  CheckCircle2, Loader2, ArrowRight,
  BookOpenCheck, Info, ExternalLink, Github
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CourseIcon } from '@/components/ui/course-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/lib/context/LanguageContext';

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
  toc?: any[];
  license?: string;
  license_file?: string;
}

interface Subscription {
  id: string;
  package_id: string;
}

const LICENSE_MAP: Record<string, { ko: string; en: string }> = {
  'CC-BY-4.0': { ko: 'CC BY 4.0 (저작자 표시)', en: 'CC BY 4.0 (Attribution)' },
  'CC-BY-SA-4.0': { ko: 'CC BY-SA 4.0 (저작자표시-동일조건변경허락)', en: 'CC BY-SA 4.0 (Attribution-ShareAlike)' },
  'CC-BY-NC-4.0': { ko: 'CC BY-NC 4.0 (저작자표시-비영리)', en: 'CC BY-NC 4.0 (Attribution-NonCommercial)' },
  'CC-BY-NC-SA-4.0': { ko: 'CC BY-NC-SA 4.0 (저작자표시-비영리-동일조건변경허락)', en: 'CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)' },
  'CC-BY-ND-4.0': { ko: 'CC BY-ND 4.0 (저작자표시-변경금지)', en: 'CC BY-ND 4.0 (Attribution-NoDerivatives)' },
  'CC-BY-NC-ND-4.0': { ko: 'CC BY-NC-ND 4.0 (저작자표시-비영리-변경금지)', en: 'CC BY-NC-ND 4.0 (Attribution-NonCommercial-NoDerivatives)' },
  'CC0-1.0': { ko: 'CC0 1.0 (퍼블릭 도메인)', en: 'CC0 1.0 (Public Domain Dedication)' },
  'all-rights-reserved': { ko: '모든 권리 보유 (All Rights Reserved)', en: 'All Rights Reserved' },
  'custom': { ko: '커스텀 라이선스 (Custom)', en: 'Custom License' }
};

const isVersionNewer = (local: string, online: string) => {
  if (!local || !online) return false;
  const parseVersion = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const localParts = parseVersion(local);
  const onlineParts = parseVersion(online);
  for (let i = 0; i < Math.max(localParts.length, onlineParts.length); i++) {
    const l = localParts[i] || 0;
    const o = onlineParts[i] || 0;
    if (o > l) return true;
    if (l > o) return false;
  }
  return false;
};

export default function CoursesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<CoursePackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);


  // Online course states
  const [onlineCourses, setOnlineCourses] = useState<any[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const useOfflineFallback = () => {
    setOnlineCourses([
      {
        title: "아두이노 IoT 프로젝트 마스터 클래스",
        slug: "iot-communication",
        description: "USB·블루투스·WiFi·이더넷·RF 등 다양한 통신 기술을 활용해 실제 IoT 장치를 직접 만들어보는 아두이노 실전 프로젝트 강좌 패키지입니다.",
        version: "1.0.1",
        category: "Programming",
        target_age: "all",
        bundler_protocol_version: "1.1.3",
        downloadUrl: "https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses/iot-communication/iot-communication.zip",
        thumbnail: "icon:cpu",
        license: "CC-BY-NC-4.0",
        license_file: "LICENSE",
        author: {
          nickname: "Kailash",
          email: "godstale@hotmail.com",
          website: "https://hardcopyworld.com"
        }
      },
      {
        title: "신경망과 LLM 개론",
        slug: "neutral-network-and-llm",
        description: "3Blue1Brown의 시각적인 설명 영상을 바탕으로, 인공 신경망의 기본 원리부터 트랜스포머 기반의 대규모 언어 모델(LLM) 핵심 메커니즘까지 마스터하는 입문 강좌입니다.",
        version: "1.0.0",
        category: "Programming",
        target_age: "all",
        bundler_protocol_version: "1.1.3",
        downloadUrl: "https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses/neutral-network-and-llm/neutral-network-and-llm.zip",
        thumbnail: "icon:brain",
        license: "CC-BY-NC-4.0",
        license_file: "LICENSE",
        author: {
          nickname: "3Blue1Brown",
          email: null,
          website: null
        },
        tags: [
          "신경망",
          "LLM",
          "딥러닝",
          "트랜스포머",
          "인공지능"
        ]
      }
    ]);
  };

  const ensureRequiredCourses = (list: any[]) => {
    const defaultCourses = [
      {
        title: "신경망과 LLM 개론",
        slug: "neutral-network-and-llm",
        description: "3Blue1Brown의 시각적인 설명 영상을 바탕으로, 인공 신경망의 기본 원리부터 트랜스포머 기반의 대규모 언어 모델(LLM) 핵심 메커니즘까지 마스터하는 입문 강좌입니다.",
        version: "1.0.0",
        category: "Programming",
        target_age: "all",
        bundler_protocol_version: "1.1.3",
        downloadUrl: "https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses/neutral-network-and-llm/neutral-network-and-llm.zip",
        thumbnail: "icon:brain",
        license: "CC-BY-NC-4.0",
        license_file: "LICENSE",
        author: {
          nickname: "3Blue1Brown",
          email: null,
          website: null
        },
        tags: [
          "신경망",
          "LLM",
          "딥러닝",
          "트랜스포머",
          "인공지능"
        ]
      }
    ];

    const result = [...list];
    for (const def of defaultCourses) {
      if (!result.some(c => c.slug === def.slug)) {
        result.push(def);
      }
    }
    return result;
  };

  const fetchOnlineCourses = async () => {
    setOnlineLoading(true);
    setOnlineError('');
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses.json?t=${Date.now()}`,
        {
          cache: 'no-store'
        }
      );
      if (!res.ok) {
        console.warn('온라인 강좌 목록을 가져오지 못했습니다. 상태 코드:', res.status);
        useOfflineFallback();
        return;
      }
      const data = await res.json();
      let coursesList = [];
      if (Array.isArray(data)) {
        coursesList = data;
      } else if (data && Array.isArray(data.courses)) {
        coursesList = data.courses;
      } else {
        coursesList = [];
      }
      setOnlineCourses(ensureRequiredCourses(coursesList));
    } catch (err: any) {
      console.warn('온라인 강좌 목록을 가져오는 중 오류가 발생했습니다 (오프라인 모드 전환):', err.message || err);
      useOfflineFallback();
    } finally {
      setOnlineLoading(false);
    }
  };

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
    } catch (err) {
      console.error('Failed to load courses or subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndSubs();
    fetchOnlineCourses();
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

  const handleDownloadCourse = async (onlineCourse: any) => {
    setDownloadingSlug(onlineCourse.slug);
    setDownloadStatus('로컬 패키지 확인 및 등록 중...');
    try {
      let packageId = '';
      let isImportedLocally = false;

      // 1. 먼저 로컬 파일시스템에 해당 강좌 폴더가 있는지 감지하고 바로 등록(임포트) 시도
      try {
        const importRes = await fetch('/api/admin/packages/import-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: onlineCourse.slug,
            title: onlineCourse.title,
            description: onlineCourse.description,
            version: onlineCourse.version,
            author: onlineCourse.author,
            category: onlineCourse.category,
            tags: onlineCourse.tags,
            target_age: onlineCourse.target_age,
            thumbnail: onlineCourse.thumbnail,
            bundler_protocol_version: onlineCourse.bundler_protocol_version
          })
        });

        if (importRes.ok) {
          const result = await importRes.json();
          packageId = result.packageId;
          isImportedLocally = true;
          console.log(`Successfully registered course package '${onlineCourse.slug}' from local folder.`);
        }
      } catch (importErr) {
        console.warn('Local import attempt failed, falling back to download:', importErr);
      }

      // 2. 로컬에 폴더가 없어서 임포트에 실패한 경우 원격 ZIP 다운로드 진행
      if (!isImportedLocally) {
        setDownloadStatus('강좌 ZIP 파일 다운로드 중...');
        let downloadUrl = onlineCourse.downloadUrl;
        if (downloadUrl && !downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/${downloadUrl}`;
        }
        const downloadRes = await fetch(downloadUrl);
        if (!downloadRes.ok) throw new Error('강좌 ZIP 파일을 다운로드하지 못했습니다.');
        const zipBlob = await downloadRes.blob();
        
        // 3. FormData에 담기
        setDownloadStatus('로컬 데이터베이스에 등록 중...');
        const file = new File([zipBlob], `${onlineCourse.slug}.zip`, { type: 'application/zip' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'GITHUB');
        
        // 4. 로컬 업로드 API 호출
        const uploadRes = await fetch('/api/admin/packages/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          let errMsg = '로컬 DB 등록에 실패했습니다.';
          try {
            const errData = await uploadRes.json();
            errMsg = errData.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        
        const result = await uploadRes.json();
        packageId = result.packageId;
      }
      
      // 5. 자동 수강신청 처리
      setDownloadStatus('수강 신청 등록 중...');
      const subscribeRes = await fetch('/api/packages/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });
      
      if (!subscribeRes.ok) {
        console.error('Auto-subscribe failed:', await subscribeRes.text());
      }
      
      setDownloadStatus(language === 'en' ? 'Installation complete!' : '설치 완료!');
      alert(language === 'en' ? `Course '${onlineCourse.title}' download and enrollment completed!` : `'${onlineCourse.title}' 강좌 다운로드 및 수강 신청이 완료되었습니다!`);
      
      // 데이터 갱신
      await fetchCoursesAndSubs();
    } catch (err: any) {
      console.error(err);
      alert(language === 'en' ? `An error occurred while installing the course: ${err.message}` : `강좌 설치 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setDownloadingSlug(null);
      setDownloadStatus('');
    }
  };

  const isSubscribed = (courseId: string) => {
    return subscriptions.some(sub => sub.package_id === courseId);
  };

  const filteredOnlineCourses = onlineCourses.filter((course) => {
    const query = searchQuery.toLowerCase().trim();
    const authorName = typeof course.author === 'string'
      ? course.author
      : course.author?.nickname || '';
    return (
      course.title.toLowerCase().includes(query) ||
      (course.description && course.description.toLowerCase().includes(query)) ||
      authorName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pt-1 pb-8 relative">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('searchCourses')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('searchCoursesDesc2')}
          </p>
        </div>
      </div>

      {/* Info Message Box */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/20 dark:bg-indigo-950/5 flex items-start gap-3 w-full">
        <Github className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-indigo-950 dark:text-indigo-50">
            {t('infoRegisterCourse')}
          </h4>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
            {t('infoRegisterCourseDesc')}<br />
            <a
              href="https://github.com/godstale/OpenTutorials-Browser"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              <span>{t('visitGithub')}</span>
              <ExternalLink className="size-3" />
            </a>
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {onlineLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col h-[320px] animate-pulse bg-muted/20 border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">

          {filteredOnlineCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOnlineCourses.map((course) => {
                const localCourse = courses.find(c => c.slug === course.slug);
                const enrolled = localCourse ? isSubscribed(localCourse.id) : false;
                const isDownloading = downloadingSlug === course.slug;
                const hasUpdate = enrolled && localCourse && isVersionNewer(localCourse.version || '1.0.0', course.version || '1.0.0');

                return (
                  <Card key={course.slug} className="overflow-hidden flex flex-col hover:border-primary/50 transition-all duration-300 bg-white py-0 pb-0">
                    <div 
                      className="flex-1 flex flex-col hover:opacity-95 transition-opacity cursor-pointer"
                      onClick={() => {
                        setSelectedCourse(course);
                        setIsDetailOpen(true);
                      }}
                    >
                      {/* Thumbnail / Icon Container */}
                      <div className="h-32 relative overflow-hidden shrink-0">
                        <CourseIcon thumbnail={course.thumbnail || 'icon:book'} className="w-full h-full" iconClassName="w-10 h-10" alt={course.title} />
                        <div className="absolute top-2.5 left-2.5 flex flex-row gap-1.5 items-center">
                          {enrolled && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1 shadow-sm">
                              <CheckCircle2 className="size-3" />
                              {t('statusEnrolled')}
                            </Badge>
                          )}
                          {hasUpdate && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1 shadow-sm">
                              {t('updateAvailable')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardHeader className="pb-0 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base line-clamp-1">{course.title}</CardTitle>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            v{course.version}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-1 text-xs">{course.description || t('noIntroduction')}</CardDescription>
                        {course.author && (
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                            <div className="flex items-center gap-1 font-medium">
                              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {typeof course.author === 'string' ? course.author : course.author.nickname}
                              </span>
                            </div>
                            {typeof course.author !== 'string' && (course.author.website || course.author.email) && (
                              <div className="flex items-center gap-1 shrink-0 border-l pl-2 border-zinc-200 dark:border-zinc-800">
                                {course.author.website && (
                                  <a
                                    href={course.author.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-green-700 dark:hover:text-green-400 p-0.5"
                                    title="제작자 홈페이지"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Globe className="size-3.5" />
                                  </a>
                                )}
                                {course.author.email && (
                                  <a
                                    href={`mailto:${course.author.email}`}
                                    className="text-zinc-400 hover:text-green-700 dark:hover:text-green-400 p-0.5"
                                    title="제작자 이메일"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="size-3.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                    </div>

                    {/* Footer Action */}
                    <CardFooter className="pt-3 pb-3 border-t bg-muted/10 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {enrolled ? t('statusLearning') : localCourse ? t('statusWaitEnroll') : t('statusNewCourse')}
                      </span>
                      {enrolled ? (
                        <Button 
                          size="sm"
                          className="h-8 text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 gap-1.5"
                          onClick={() => router.push(`/courses/${course.slug}`)}
                        >
                          <BookOpenCheck className="size-3.5" />
                          <span>{t('btnLearn')}</span>
                        </Button>
                      ) : localCourse ? (
                        <Button 
                          size="sm"
                          className="h-8 text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 gap-1.5"
                          onClick={() => handleSubscribe(localCourse.id)}
                        >
                          <span>{t('btnEnroll')}</span>
                          <ArrowRight className="size-3.5" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          className="h-8 text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 gap-1.5"
                          onClick={() => handleDownloadCourse(course)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin mr-1" />
                              <span>{downloadStatus || t('btnDownloading')}</span>
                            </>
                          ) : (
                            <>
                              <span>{t('btnDownload')}</span>
                              <ArrowRight className="size-3.5" />
                            </>
                          )}
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
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">검색 조건에 맞는 온라인 강좌가 없습니다.</p>
                <p className="text-xs">검색어를 변경하여 다시 시도해 보세요.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {selectedCourse && (
            <>
              {/* Top Banner / Icon Container */}
              <div className="h-44 w-full relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="absolute inset-0 bg-grid-white/10" />
                <CourseIcon
                  thumbnail={selectedCourse.thumbnail || 'icon:book'}
                  className="w-full h-full bg-transparent dark:bg-transparent"
                  iconClassName="w-16 h-16 text-indigo-600 dark:text-indigo-400"
                  alt={selectedCourse.title}
                />
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  {(() => {
                    const localCourse = courses.find(c => c.slug === selectedCourse.slug);
                    const enrolled = localCourse ? isSubscribed(localCourse.id) : false;
                    const hasUpdate = enrolled && localCourse && isVersionNewer(localCourse.version || '1.0.0', selectedCourse.version || '1.0.0');
                    if (enrolled) {
                      return (
                        <div className="flex gap-1.5">
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1 shadow-md">
                            <CheckCircle2 className="size-3" />
                            {t('statusEnrolled')}
                          </Badge>
                          {hasUpdate && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1 shadow-md">
                              {t('updateAvailable')}
                            </Badge>
                          )}
                        </div>
                      );
                    }
                    if (localCourse) {
                      return (
                        <Badge variant="secondary" className="text-xs shadow-sm">
                          {t('statusWaitEnroll')}
                        </Badge>
                      );
                    }
                    return (
                      <Badge variant="outline" className="bg-white/85 dark:bg-zinc-900/85 text-xs shadow-sm">
                        {t('statusNewCourse')}
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedCourse.category && (
                      <Badge className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 border-none text-[10px] font-semibold uppercase tracking-wider">
                        {selectedCourse.category}
                      </Badge>
                    )}
                    {selectedCourse.target_age && (
                      <Badge variant="outline" className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {language === 'en' ? (
                          selectedCourse.target_age === 'all' ? 'All Ages' : `${selectedCourse.target_age} years old`
                        ) : (
                          selectedCourse.target_age === 'all' ? '전연령' : `${selectedCourse.target_age}세`
                        )}
                      </Badge>
                    )}
                    {(() => {
                      const localCourse = courses.find(c => c.slug === selectedCourse.slug);
                      const hasUpdate = localCourse && isVersionNewer(localCourse.version || '1.0.0', selectedCourse.version || '1.0.0');
                      if (hasUpdate) {
                        return (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold ml-auto">
                            {language === 'en' ? `Update available: v${localCourse.version} → v${selectedCourse.version}` : `v${localCourse.version} → v${selectedCourse.version} 업데이트 가능`}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-auto">
                          {language === 'en' ? `Version v${selectedCourse.version}` : `버전 v${selectedCourse.version}`}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {selectedCourse.title}
                  </h3>
                  
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                    {selectedCourse.description || t('noIntroduction')}
                  </p>
                </div>

                {/* Author Info */}
                {selectedCourse.author && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/80">
                    <h4 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5">
                      {language === 'en' ? 'Author Info' : '제작자 정보'}
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-sm">
                          {(typeof selectedCourse.author === 'string' ? selectedCourse.author : selectedCourse.author.nickname).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {typeof selectedCourse.author === 'string' ? selectedCourse.author : selectedCourse.author.nickname}
                          </p>
                          {typeof selectedCourse.author !== 'string' && selectedCourse.author.email && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {selectedCourse.author.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {typeof selectedCourse.author !== 'string' && (selectedCourse.author.website || selectedCourse.author.email) && (
                        <div className="flex items-center gap-1.5">
                          {selectedCourse.author.website && (
                            <a
                              href={selectedCourse.author.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                              title={t('authorHomepage')}
                            >
                              <Globe className="size-4" />
                            </a>
                          )}
                          {selectedCourse.author.email && (
                            <a
                              href={`mailto:${selectedCourse.author.email}`}
                              className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                              title={t('authorEmail')}
                            >
                              <Mail className="size-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Course TOC (Table of Contents) */}
                {(() => {
                  const localCourse = courses.find(c => c.slug === selectedCourse.slug);
                  const toc = selectedCourse.toc || localCourse?.toc;

                  return toc && toc.length > 0 ? (
                    <div className="space-y-3 border-t pt-4 border-zinc-100 dark:border-zinc-800">
                      <h4 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-indigo-500" />
                        {t('courseCurriculum')}
                      </h4>
                      <div className="border border-zinc-100 dark:border-zinc-800/80 rounded-lg p-2 bg-zinc-50/30 dark:bg-zinc-900/10">
                        <Accordion type="single" collapsible className="w-full">
                          {toc.map((chapter: any, idx: number) => (
                            <AccordionItem value={`chapter-${idx}`} key={idx} className="border-zinc-100 dark:border-zinc-800">
                              <AccordionTrigger className="hover:no-underline py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[9px] uppercase">
                                    Chapter {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-left line-clamp-1">{chapter.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-2 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                                {chapter.description && (
                                  <p className="bg-white dark:bg-zinc-900/50 p-2 rounded text-[11px] text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/50 leading-relaxed">
                                    {chapter.description}
                                  </p>
                                )}
                                {chapter.children && chapter.children.length > 0 && (
                                  <ul className="space-y-1.5 pl-1">
                                    {chapter.children.map((section: any, sIdx: number) => (
                                      <li key={sIdx} className="flex flex-col gap-0.5 border-l-2 border-zinc-200 dark:border-zinc-800 pl-3.5 py-0.5">
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200 text-[11px] line-clamp-1">
                                          {section.title}
                                        </span>
                                        {section.description && (
                                          <span className="text-[10px] text-zinc-500 dark:text-zinc-500 line-clamp-1">
                                            {section.description}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t pt-4 border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                      <h4 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-zinc-400" />
                        {t('courseCurriculum')}
                      </h4>
                      <p className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 text-center text-zinc-400 dark:text-zinc-500 text-[11px]">
                        {language === 'en' ? 'This course is not installed locally. Download it to view the detailed table of contents.' : '로컬에 설치되지 않은 강좌입니다. 강좌를 다운로드하면 상세 목차를 확인하실 수 있습니다.'}
                      </p>
                    </div>
                  );
                })()}

                {/* Additional Settings */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="font-medium text-zinc-400 dark:text-zinc-500">
                      {language === 'en' ? 'Sequence Rule' : '순차 수강 규정'}
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {selectedCourse.sequential_play ? (
                        language === 'en' ? 'Sequential required' : '순차 진행 필요'
                      ) : (
                        language === 'en' ? 'Free exploration' : '자유로운 탐색'
                      )}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-medium text-zinc-400 dark:text-zinc-500">
                      {language === 'en' ? 'Checkpoint Rule' : '체크포인트 규칙'}
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {selectedCourse.force_checkpoint ? (
                        language === 'en' ? 'Checkpoint required' : '체크포인트 필수'
                      ) : (
                        language === 'en' ? 'Self-guided/Recommended' : '자율 권장'
                      )}
                    </p>
                  </div>
                  {selectedCourse.bundler_protocol_version && (
                    <div className="space-y-1.5 col-span-2 border-t pt-3 border-zinc-100 dark:border-zinc-800">
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">{t('bundlerVersion')}</span>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {selectedCourse.bundler_protocol_version}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5 col-span-2 border-t pt-3 border-zinc-100 dark:border-zinc-800">
                    <span className="font-medium text-zinc-400 dark:text-zinc-500">{t('courseLicense')}</span>
                    <p className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                      {(() => {
                        const licenseKey = selectedCourse.license || 'CC-BY-NC-4.0';
                        const licenseInfo = LICENSE_MAP[licenseKey] || { ko: licenseKey, en: licenseKey };
                        const licenseText = language === 'en' ? licenseInfo.en : licenseInfo.ko;
                        return (
                          <>
                            <span>{licenseText}</span>
                            {selectedCourse.license_file && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-normal">
                                ({selectedCourse.license_file})
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  {selectedCourse.tags && selectedCourse.tags.length > 0 && (
                    <div className="col-span-2 space-y-2 border-t pt-3 border-zinc-100 dark:border-zinc-800">
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">
                        {language === 'en' ? 'Tags' : '태그'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCourse.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailOpen(false)}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                >
                  {language === 'en' ? 'Close' : '닫기'}
                </Button>

                {(() => {
                  const localCourse = courses.find(c => c.slug === selectedCourse.slug);
                  const enrolled = localCourse ? isSubscribed(localCourse.id) : false;
                  const isDownloading = downloadingSlug === selectedCourse.slug;

                  if (enrolled) {
                    return (
                      <Button 
                        className="text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 gap-1.5"
                        onClick={() => {
                          setIsDetailOpen(false);
                          router.push(`/courses/${selectedCourse.slug}`);
                        }}
                      >
                        <BookOpenCheck className="size-4" />
                        <span>{t('startLearning')}</span>
                      </Button>
                    );
                  }
                  if (localCourse) {
                    return (
                      <Button 
                        className="text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 gap-1.5"
                        onClick={async () => {
                          await handleSubscribe(localCourse.id);
                        }}
                      >
                        <span>{language === 'en' ? 'Enroll' : '수강 신청하기'}</span>
                        <ArrowRight className="size-4" />
                      </Button>
                    );
                  }
                  return (
                    <Button 
                      className="text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 gap-1.5"
                      onClick={async () => {
                        await handleDownloadCourse(selectedCourse);
                      }}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-1" />
                          <span>{downloadStatus || '다운 중...'}</span>
                        </>
                      ) : (
                        <>
                          <span>강좌 다운로드</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full -z-10 pointer-events-none !mt-0" />
    </div>
  );
}
