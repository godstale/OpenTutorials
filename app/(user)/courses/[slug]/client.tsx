'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, CheckCircle2, ArrowLeft, ArrowRight, Bot, ChevronDown, ChevronRight, RotateCcw, User, ArrowUpCircle, Loader2 } from 'lucide-react';
import { Course, UserExternalAgent } from '@/lib/types';
import { CourseIcon } from '@/components/ui/course-icon';
import { useLanguage } from '@/lib/context/LanguageContext';

interface ChatLog {
  timestamp: string;
  duration_ms: number;
  input_token_size: number;
  output_token_size: number;
  user_message: string;
  assistant_message: string;
}

function AgentStatsView({ agentId }: { agentId: string }) {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/external-agents/${agentId}/chat`);
        if (res.ok) {
          const data = await res.json();
          setChatLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch chat logs for stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [agentId]);

  const totalLogs = chatLogs.length;
  const totalMs = chatLogs.reduce((acc, log) => acc + (log.duration_ms || 0), 0);
  const avgMs = totalLogs > 0 ? totalMs / totalLogs : 0;
  const totalTokens = chatLogs.reduce((acc, log) => acc + (log.input_token_size || 0) + (log.output_token_size || 0), 0);
  const avgTokens = totalLogs > 0 ? Math.round(totalTokens / totalLogs) : 0;

  const formatTotalDuration = (ms: number) => {
    if (ms <= 0) return language === 'en' ? '0s' : '0초';
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) {
      return `${totalSeconds.toFixed(1)}${language === 'en' ? 's' : '초'}`;
    }
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      return `${minutes}${language === 'en' ? 'm ' : '분 '}${seconds}${language === 'en' ? 's' : '초'}`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}${language === 'en' ? 'h ' : '시간 '}${minutes}${language === 'en' ? 'm' : '분'}`;
  };

  const formatAvgResponse = (ms: number) => {
    if (ms <= 0) return language === 'en' ? '0s' : '0초';
    return `${(ms / 1000).toFixed(1)}${language === 'en' ? 's' : '초'}`;
  };

  const stats = {
    totalHours: formatTotalDuration(totalMs),
    avgResponse: formatAvgResponse(avgMs),
    totalTokens: `${totalTokens.toLocaleString()}${language === 'en' ? ' tokens' : ' 토큰'}`,
    avgTokens: `${avgTokens.toLocaleString()}${language === 'en' ? ' tokens' : ' 토큰'}`
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">{t('lblUsageTime')}</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.totalHours}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">{t('lblAvgResponse')}</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.avgResponse}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">{t('lblUsageTokens')}</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.totalTokens}</span>
        )}
      </div>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border">
        <span className="text-[10px] text-muted-foreground block uppercase font-bold">{t('lblAvgTokens')}</span>
        {isLoading ? (
          <span className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1 mx-auto block" />
        ) : (
          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 block">{stats.avgTokens}</span>
        )}
      </div>
    </div>
  );
}


interface DetailedCourse extends Course {
  order_index: number;
  user_progress?: {
    last_card: number;
    max_card?: number;
    completed: boolean;
    updated_at: string;
  } | null;
}

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  sequential_play: boolean;
  force_checkpoint: boolean;
  courses: DetailedCourse[];
  user_subscribed: boolean;
  agent_id?: string | null;
  version?: string;
  changelog?: string;
  external_agents?: UserExternalAgent[];
  toc?: any[];
  cards?: string[];
  tags?: string[];
  author_nickname?: string | null;
  license?: string;
  license_file?: string;
  license_file_exists?: boolean;
  user_progress?: {
    last_card: number;
    max_card?: number;
    completed: boolean;
    updated_at: string;
  } | null;
}

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

const OFFLINE_FALLBACK_COURSES = [
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
    },
    tags: [
      "아두이노",
      "IoT",
      "블루투스",
      "WiFi",
      "이더넷",
      "RF통신"
    ]
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
];

const CC_LICENSE_URLS: Record<string, string> = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC-BY-NC-SA-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'CC-BY-ND-4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
  'CC-BY-NC-ND-4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/'
};

export default function CourseDetailPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  // Update states
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [onlineCourseInfo, setOnlineCourseInfo] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  const toggleChapter = (index: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [index]: prev[index] === false ? true : false
    }));
  };

  const fetchCourseDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setCourseDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch course detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  useEffect(() => {
    if (!courseDetail) return;
    const localVersion = courseDetail.version || '1.0.0';
    async function checkUpdate() {
      let coursesList: any[] = [];
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses.json?t=${Date.now()}`,
          {
            cache: 'no-store'
          }
        );
        if (res.ok) {
          const data = await res.json();
          coursesList = Array.isArray(data) ? data : (data?.courses || []);
        } else {
          console.warn('Failed to fetch online courses list, using offline fallback');
          coursesList = OFFLINE_FALLBACK_COURSES;
        }
      } catch (err: any) {
        console.warn('Failed to check course update (offline or network error):', err.message || err);
        coursesList = OFFLINE_FALLBACK_COURSES;
      }

      // Ensure default courses are in the list if not present
      for (const def of OFFLINE_FALLBACK_COURSES) {
        if (!coursesList.some((c: any) => c.slug === def.slug)) {
          coursesList.push(def);
        }
      }

      const onlineInfo = coursesList.find((c: any) => c.slug === slug);
      if (onlineInfo) {
        setOnlineCourseInfo(onlineInfo);
        const onlineVer = onlineInfo.version || '1.0.0';
        if (isVersionNewer(localVersion, onlineVer)) {
          setUpdateAvailable(true);
        }
      }
    }
    checkUpdate();
  }, [courseDetail, slug]);

  const handleSubscribe = async () => {
    if (!courseDetail) return;
    setRegistering(true);
    try {
      const res = await fetch('/api/courses/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: courseDetail.id }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(`강좌 신청에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateCourseAgent = async (courseId: string, agentId: string | null) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(`에이전트 지정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to update course agent:', err);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdatePackageAgent = async (agentId: string | null) => {
    if (!courseDetail) return;
    try {
      const res = await fetch(`/api/admin/packages/${courseDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(language === 'en' ? `Failed to assign agent: ${errorData.error || 'Unknown error'}` : `전체 에이전트 지정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to update package agent:', err);
      alert(language === 'en' ? 'A network error occurred.' : '네트워크 오류가 발생했습니다.');
    }
  };

  const handleResetProgress = async () => {
    if (!courseDetail) return;
    const confirmReset = window.confirm(language === 'en' ? 'Are you sure you want to reset your learning progress for this course? You will start learning from the beginning.' : '정말로 이 강좌의 학습 진도를 리셋하시겠습니까? 처음부터 다시 학습하게 됩니다.');
    if (!confirmReset) return;

    try {
      const res = await fetch('/api/courses/progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseDetail.id })
      });

      if (res.ok) {
        alert(language === 'en' ? 'Learning progress reset successfully.' : '학습 진도가 성공적으로 리셋되었습니다.');
        await fetchCourseDetail();
      } else {
        const errorData = await res.json();
        alert(language === 'en' ? `Failed to reset progress: ${errorData.error || 'Unknown error'}` : `진도 리셋에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to reset progress:', err);
      alert(language === 'en' ? 'A network error occurred.' : '네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdateCourse = async () => {
    if (!onlineCourseInfo || !courseDetail) return;
    const confirmUpdate = window.confirm(language === 'en' ? `Are you sure you want to update the course to the latest version (v${onlineCourseInfo.version})?\nYour learning progress will be preserved, but course content might change.` : `강좌를 최신 버전(v${onlineCourseInfo.version})으로 업데이트하시겠습니까?\n기존 학습 진도율은 보존되지만, 강좌 콘텐츠가 변경될 수 있습니다.`);
    if (!confirmUpdate) return;

    setUpdating(true);
    setUpdateStatus(language === 'en' ? 'Checking local package...' : '로컬 패키지 확인 중...');
    try {
      let isImportedLocally = false;

      // 1. 먼저 로컬 파일시스템에 해당 강좌 폴더가 있는지 감지하고 바로 등록(임포트) 시도
      try {
        const importRes = await fetch('/api/admin/packages/import-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: onlineCourseInfo.slug,
            title: onlineCourseInfo.title,
            description: onlineCourseInfo.description,
            version: onlineCourseInfo.version,
            author: onlineCourseInfo.author,
            category: onlineCourseInfo.category,
            tags: onlineCourseInfo.tags,
            target_age: onlineCourseInfo.target_age,
            thumbnail: onlineCourseInfo.thumbnail,
            bundler_protocol_version: onlineCourseInfo.bundler_protocol_version
          })
        });

        if (importRes.ok) {
          isImportedLocally = true;
          console.log(`Successfully updated course package '${onlineCourseInfo.slug}' from local folder.`);
        }
      } catch (importErr) {
        console.warn('Local import update attempt failed, falling back to download:', importErr);
      }

      // 2. 로컬에 폴더가 없어서 임포트에 실패한 경우 원격 ZIP 다운로드 진행
      if (!isImportedLocally) {
        setUpdateStatus(language === 'en' ? 'Downloading course ZIP file...' : '강좌 ZIP 파일 다운로드 중...');
        let downloadUrl = onlineCourseInfo.downloadUrl;
        if (downloadUrl && !downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/${downloadUrl}`;
        }
        const downloadRes = await fetch(downloadUrl);
        if (!downloadRes.ok) throw new Error(language === 'en' ? 'Failed to download course ZIP file.' : '강좌 ZIP 파일을 다운로드하지 못했습니다.');
        const zipBlob = await downloadRes.blob();
        
        // 3. FormData에 담기
        setUpdateStatus(language === 'en' ? 'Updating local database...' : '로컬 데이터베이스 업데이트 중...');
        const file = new File([zipBlob], `${onlineCourseInfo.slug}.zip`, { type: 'application/zip' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'GITHUB');
        
        // 4. 로컬 업로드 API 호출 (덮어쓰기 형태로 등록)
        const uploadRes = await fetch('/api/admin/packages/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          let errMsg = language === 'en' ? 'Failed to update local database.' : '로컬 DB 업데이트에 실패했습니다.';
          try {
            const errData = await uploadRes.json();
            errMsg = errData.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
      }
      
      setUpdateStatus(language === 'en' ? 'Update complete!' : '업데이트 완료!');
      alert(language === 'en' ? `Course '${onlineCourseInfo.title}' updated successfully to v${onlineCourseInfo.version}!` : `'${onlineCourseInfo.title}' 강좌가 v${onlineCourseInfo.version}(으)로 성공적으로 업데이트되었습니다!`);
      setUpdateAvailable(false);
      
      // 데이터 갱신
      await fetchCourseDetail();
    } catch (err: any) {
      console.error(err);
      alert(language === 'en' ? `An error occurred while updating the course: ${err.message}` : `강좌 업데이트 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setUpdating(false);
      setUpdateStatus('');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="space-y-4">
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!courseDetail) {
    return (
      <div className="container max-w-5xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('lblNoCourseFound')}</h2>
        <Button onClick={() => router.push('/courses')}>{language === 'en' ? 'Go to Course List' : '전체 강좌 목록으로 이동'}</Button>
      </div>
    );
  }

  const totalSubcourses = courseDetail.cards?.length || 0;
  const completedSubcourses = courseDetail.user_progress
    ? (courseDetail.user_progress.completed
        ? totalSubcourses
        : Math.max(0, (courseDetail.user_progress.max_card ?? courseDetail.user_progress.last_card ?? 1) - 1))
    : 0;
  const progressPercent = totalSubcourses > 0 ? Math.min(100, Math.round((completedSubcourses / totalSubcourses) * 100)) : 0;

  const nextCardIndex = completedSubcourses;
  const hasNextCard = nextCardIndex < totalSubcourses;

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/courses')} className="gap-1 text-zinc-500 hover:text-zinc-950">
          <ArrowLeft className="w-4 h-4" />
          {language === 'en' ? 'Back to list' : '전체 목록으로 돌아가기'}
        </Button>
      </div>

      {/* Course Header Card */}
      <Card className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-emerald-50/20 via-white to-white dark:from-emerald-950/10 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm">
        <CardContent className="pt-0 pb-0 px-6 md:px-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-full md:w-64 h-44 rounded-lg overflow-hidden shrink-0 border border-zinc-200">
            <CourseIcon thumbnail={courseDetail.thumbnail} className="w-full h-full" iconClassName="w-16 h-16" alt={courseDetail.title} />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-700 hover:bg-green-700 text-white font-semibold">
                  {t('aiCourse')}
                </Badge>
                {courseDetail.user_subscribed && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                    {t('statusEnrolled')}
                  </Badge>
                )}
                {courseDetail.sequential_play && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600 dark:text-amber-400">
                    {language === 'en' ? 'Sequential Req.' : '순차재생 필수'}
                  </Badge>
                )}
                {courseDetail.force_checkpoint && (
                  <Badge variant="outline" className="text-rose-600 border-rose-600 dark:text-rose-400">
                    {language === 'en' ? 'Checkpoint Req.' : '체크포인트 강제'}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">{courseDetail.title}</h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm md:text-base leading-relaxed">
                {courseDetail.description || t('noIntroduction')}
              </p>
            </div>

            {courseDetail.user_subscribed ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>{t('learningStatus')}</span>
                  <span>
                    {language === 'en' ? (
                      `Completed ${completedSubcourses} of ${totalSubcourses} (${progressPercent}%)`
                    ) : (
                      `총 ${totalSubcourses}개 중 ${completedSubcourses}개 완료 (${progressPercent}%)`
                    )}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2.5 bg-zinc-100 dark:bg-zinc-800" />
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  {hasNextCard ? (
                    <Button
                      onClick={() => router.push(`/learn/${courseDetail.slug}?card=${nextCardIndex + 1}`)}
                      className="bg-green-700 hover:bg-green-700 text-white flex-1 gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      {t('btnContinue')}
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 pointer-events-none gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {language === 'en' ? 'All lessons completed!' : '강좌 내 모든 학습 완료!'}
                    </Button>
                  )}
                  <Button
                    onClick={handleResetProgress}
                    variant="destructive"
                    className="gap-2 shrink-0 shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {language === 'en' ? 'Reset Progress' : '학습 진도율 리셋'}
                  </Button>
                  {updateAvailable && (
                    <Button
                      onClick={handleUpdateCourse}
                      disabled={updating}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0 shadow-sm"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{updateStatus || (language === 'en' ? 'Updating...' : '업데이트 중...')}</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>{language === 'en' ? `Update v${onlineCourseInfo?.version}` : `v${onlineCourseInfo?.version} 업데이트`}</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-4">
                <Button
                  onClick={handleSubscribe}
                  disabled={registering}
                  className="w-full md:w-auto px-8 bg-green-700 hover:bg-green-700 text-white font-semibold gap-2"
                >
                  {registering ? (language === 'en' ? 'Enrolling...' : '신청 중...') : t('btnEnroll')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-3 pb-0 px-6 md:px-8 flex flex-col gap-3 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/50">
          {/* 저자 / 순차학습 / 체크포인트 강제 행 */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 w-full">
            {courseDetail.author_nickname && (
              <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>{language === 'en' ? 'Author: ' : '저자: '}{courseDetail.author_nickname}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>{language === 'en' ? 'Sequential: ' : '순차학습: '}<strong className={courseDetail.sequential_play ? "text-green-700 dark:text-green-300 font-semibold" : "text-zinc-600 dark:text-zinc-400 font-medium"}>{courseDetail.sequential_play ? (language === 'en' ? "Required" : "필수") : (language === 'en' ? "Optional" : "선택")}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>{language === 'en' ? 'Checkpoint: ' : '체크포인트 강제: '}<strong className={courseDetail.force_checkpoint ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-zinc-600 dark:text-zinc-400 font-medium"}>{courseDetail.force_checkpoint ? (language === 'en' ? "Required" : "강제") : (language === 'en' ? "Skip Allowed" : "건너뛰기 가능")}</strong></span>
            </div>
          </div>
          {/* 태그 정보 행 */}
          <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-zinc-100 dark:border-zinc-800/50 pt-2 w-full">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{language === 'en' ? 'Tags:' : '태그:'}</span>
            {courseDetail.tags && courseDetail.tags.length > 0 ? (
              courseDetail.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-850 dark:text-zinc-400 text-[11px] font-normal px-2 py-0.5">
                  #{tag}
                </Badge>
              ))
            ) : (
              <span className="text-zinc-400">{language === 'en' ? 'No tags registered' : '등록된 태그 없음'}</span>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* 에이전트 카드 및 통계 배치 */}
      {courseDetail.user_subscribed && (
        <Card className="border border-emerald-100 dark:border-emerald-950 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 md:px-8">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-green-700 dark:text-green-300" />
              {language === 'en' ? 'AI Tutor Settings & Stats' : '학습 AI 튜터 설정 및 통계'}
            </CardTitle>
            <CardDescription className="text-xs">
              {language === 'en' ? 'Assign an AI tutor agent for this course and monitor its stats.' : '이 강좌 전체에 적용될 AI 튜터 에이전트를 지정하고, 해당 에이전트의 수강 학습 통계를 모니터링합니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 md:px-8">
            {/* 에이전트 지정 셀렉트 박스 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-green-100 dark:bg-zinc-900/50 border">
              <div className="space-y-1">
                <span className="text-sm font-semibold block">{t('lblSelectAgent')}</span>
                <span className="text-xs text-muted-foreground">{t('lblAgentDesc2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={courseDetail.agent_id || ''}
                  onChange={(e) => handleUpdatePackageAgent(e.target.value || null)}
                  className="text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 min-w-[200px] focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="">{language === 'en' ? 'No Tutor Assigned' : '튜터 미지정'}</option>
                  {courseDetail.external_agents?.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.agent_type === 'llm' ? 'LLM' : '하네스'}{agent.is_ai_tutor ? (language === 'en' ? ' - Default' : ' - 기본튜터') : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 통계 정보 표시 */}
            {courseDetail.agent_id ? (
              (() => {
                const assignedAgent = courseDetail.external_agents?.find(a => a.id === courseDetail.agent_id);
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs border-b pb-2">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{language === 'en' ? 'Selected Agent Profile' : '선택된 에이전트 상세 프로필'}</span>
                      <Badge className="bg-green-700 hover:bg-green-700 text-white text-[10px]">
                        {assignedAgent?.agent_type === 'llm' ? 'LLM' : '하네스'}
                      </Badge>
                    </div>
                    
                    <AgentStatsView agentId={courseDetail.agent_id} />
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6 border border-dashed rounded-lg bg-zinc-50/30">
                <p className="text-sm text-muted-foreground">{language === 'en' ? 'No tutor agent assigned. Please select one from the dropdown above.' : '지정된 튜터 에이전트가 없습니다. 위에 있는 선택창에서 에이전트를 지정해주세요.'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* Curriculum Timeline */}
      <div className="space-y-6 pt-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-700" />
          {t('courseCurriculum')}
        </h2>

        {courseDetail.toc && courseDetail.toc.length > 0 ? (
          <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 pl-6 md:pl-8 space-y-8">
            {courseDetail.toc.map((chapter: any, index: number) => {
              // 챕터 내 모든 섹션이 완료되었는지 확인
              const isChapterCompleted = chapter.children && chapter.children.length > 0 && chapter.children.every((section: any) => {
                const cardIndex = courseDetail.cards?.indexOf(section.filename) ?? -1;
                return cardIndex !== -1 && cardIndex < completedSubcourses;
              });

              // 이미 완료된 챕터는 기본적으로 접고(false), 완료되지 않은 챕터는 펼침(true)
              const isExpanded = expandedChapters[index] !== undefined 
                ? expandedChapters[index] 
                : !isChapterCompleted;
              
              return (
                <div key={index} className="relative group space-y-4">
                  {/* Timeline node (Chapter) */}
                  <div className="absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 flex items-center justify-center font-bold text-xs bg-white dark:bg-zinc-900 border-green-700 text-green-700">
                    {index + 1}
                  </div>

                  <div 
                    className="pl-2 cursor-pointer flex items-center justify-between group/header select-none"
                    onClick={() => toggleChapter(index)}
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        {chapter.title}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover/header:text-green-700 transition-colors" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover/header:text-green-700 transition-colors" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{chapter.description}</p>
                    </div>
                  </div>

                  {isExpanded && chapter.children && chapter.children.length > 0 && (
                    <div className="space-y-3 pl-2 transition-all duration-200">
                      {chapter.children.map((section: any, sIdx: number) => {
                        const cardIndex = courseDetail.cards?.indexOf(section.filename) ?? -1;
                        const isCompleted = cardIndex !== -1 && cardIndex < completedSubcourses;
                        const isStarted = cardIndex !== -1 && cardIndex === completedSubcourses;
                        const isLocked = courseDetail.sequential_play && cardIndex !== -1 && cardIndex > completedSubcourses;

                        return (
                          <Card 
                            key={sIdx} 
                            className={`border hover:shadow-sm transition-all overflow-hidden bg-white dark:bg-zinc-900 ${
                              isCompleted 
                                ? 'border-green-100 bg-zinc-50 dark:border-green-950/20 dark:bg-zinc-900/50' 
                                : isStarted && !isLocked
                                  ? 'border-emerald-100 dark:border-emerald-950' 
                                  : 'border-zinc-200 dark:border-zinc-800'
                            } ${isLocked ? 'opacity-60 bg-zinc-50/30' : ''}`}
                          >
                            <CardContent className="px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{section.title}</h4>
                                  {isCompleted ? (
                                    <Badge variant="default" className="bg-zinc-400 text-white text-[10px] px-1.5 py-0">
                                      {language === 'en' ? 'Completed' : '완료'}
                                    </Badge>
                                  ) : isLocked ? (
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-[10px] px-1.5 py-0">
                                      {language === 'en' ? 'Locked' : '잠금'}
                                    </Badge>
                                  ) : isStarted ? (
                                    <Badge variant="secondary" className="bg-green-700 text-white text-[10px] px-1.5 py-0">
                                      {t('statusLearning')}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-200 text-[10px] px-1.5 py-0">
                                      {language === 'en' ? 'Pending' : '대기 중'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">{section.description}</p>
                              </div>

                              <div className="shrink-0 self-end sm:self-center">
                                {courseDetail.user_subscribed ? (
                                  <Button
                                    variant={isCompleted ? 'outline' : 'default'}
                                    size="sm"
                                    onClick={() => cardIndex !== -1 && router.push(`/learn/${courseDetail.slug}?card=${cardIndex + 1}`)}
                                    disabled={isLocked}
                                    className={isCompleted 
                                      ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs h-8' 
                                      : 'bg-green-700 hover:bg-green-700 text-white text-xs h-8'
                                    }
                                  >
                                    {isCompleted ? (
                                      language === 'en' ? 'Review' : '다시 보기'
                                    ) : isStarted ? (
                                      t('continueLearning')
                                    ) : (
                                      language === 'en' ? 'Start Learn' : '학습 시작'
                                    )}
                                  </Button>
                                ) : (
                                  <Button variant="secondary" size="sm" onClick={handleSubscribe} disabled={registering} className="border border-zinc-200 text-xs h-8">
                                    {language === 'en' ? 'Enroll Required' : '수강 필요'}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg bg-zinc-50/30">
            <p className="text-sm text-muted-foreground">{language === 'en' ? 'No curriculum (TOC) registered.' : '등록된 커리큘럼(TOC)이 없습니다.'}</p>
          </div>
        )}
      </div>

      {/* 강좌 버전 및 CHANGE-LOG 정보 */}
      <Card className="border border-emerald-100 dark:border-emerald-950 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <CardHeader className="pt-0 px-6 md:px-8">
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-700" />
            {language === 'en' ? 'Version & Changelog' : '버전 및 변경 이력'}
          </CardTitle>
          <CardDescription className="text-zinc-500 text-xs">
            {language === 'en' ? 'The release version and update details of the current course.' : '현재 강좌의 릴리즈 버전 정보와 업데이트 세부 내용입니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 md:pt-4 pb-0 px-6 md:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{language === 'en' ? 'Current Version:' : '현재 버전:'}</span>
            <Badge className="bg-green-700 text-white dark:bg-green-950 dark:text-green-300 font-mono border-none">
              v{courseDetail.version || '1.0.0'}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">{language === 'en' ? 'Changelog' : '변경 사항 (Change Log)'}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {courseDetail.changelog || (language === 'en' ? 'Initial registration.' : '최초 등록되었습니다.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 라이선스 정보 카드 */}
      <Card className="border border-emerald-100 dark:border-emerald-950 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <CardHeader className="pt-0 px-6 md:px-8">
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center font-bold text-base text-green-700">©</span>
            {language === 'en' ? 'License Information' : '라이선스 정보'}
          </CardTitle>
          <CardDescription className="text-zinc-500 text-xs">
            {language === 'en' ? 'License terms and resource attribution for this course.' : '이 강좌에 적용된 라이선스 약관 및 제3자 리소스 정보입니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 md:pt-4 pb-0 px-6 md:px-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{language === 'en' ? 'Applicable License:' : '적용 라이선스:'}</span>
            <Badge className="bg-zinc-100 text-zinc-800 dark:bg-zinc-850 dark:text-zinc-300 font-mono border-none text-xs px-2.5 py-1">
              {courseDetail.license || 'CC-BY-NC-4.0'}
            </Badge>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              {language === 'en' ? 'License Terms Description' : '라이선스 조건 설명'}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {(() => {
                const lic = courseDetail.license || 'CC-BY-NC-4.0';
                switch (lic) {
                  case 'CC-BY-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution 4.0: You are free to share and adapt the material for any purpose, even commercially, as long as you give appropriate credit.'
                      : '크리에이티브 커먼즈 저작자표시 4.0: 적절한 출처를 표시하는 한, 상업적 이용 및 변경, 재배포가 자유롭게 허용됩니다.';
                  case 'CC-BY-SA-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution-ShareAlike 4.0: You can share and adapt, but must distribute your contributions under the same license.'
                      : '크리에이티브 커먼즈 저작자표시-동일조건변경허락 4.0: 출처 표시가 필요하며, 2차 저작물 역시 동일한 라이선스로 배포해야 합니다.';
                  case 'CC-BY-NC-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution-NonCommercial 4.0: You may share and adapt for non-commercial purposes only.'
                      : '크리에이티브 커먼즈 저작자표시-비영리 4.0: 저작자 표시가 필요하며, 비영리 목적으로만 사용이 허용됩니다.';
                  case 'CC-BY-NC-SA-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0: You may share and adapt for non-commercial purposes under the same license.'
                      : '크리에이티브 커먼즈 저작자표시-비영리-동일조건변경허락 4.0: 비영리 목적으로만 사용 가능하며, 동일 라이선스로 2차 배포해야 합니다.';
                  case 'CC-BY-ND-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution-NoDerivatives 4.0: You may share the material, but cannot distribute modified versions.'
                      : '크리에이티브 커먼즈 저작자표시-변경금지 4.0: 원본 그대로 공유하는 것만 가능하며, 가공 및 변경된 2차 저작물의 배포는 불가능합니다.';
                  case 'CC-BY-NC-ND-4.0':
                    return language === 'en'
                      ? 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0: The most restrictive CC license, allowing only non-commercial sharing of the original.'
                      : '크리에이티브 커먼즈 저작자표시-비영리-변경금지 4.0: 비영리 목적으로 원본 그대로 공유하는 것만 허용되는 가장 제한적인 CC 라이선스입니다.';
                  case 'CC0-1.0':
                    return language === 'en'
                      ? 'CC0 1.0 Universal: Public domain dedication. The creator has waived all copyright claims.'
                      : 'CC0 1.0 퍼블릭 도메인: 저작권자가 모든 권리를 포기하여 누구나 제한 없이 자유롭게 활용할 수 있는 퍼블릭 도메인 저작물입니다.';
                  case 'custom':
                    return language === 'en'
                      ? 'Custom License: The course creator has provided a custom license file. Please review the LICENSE file for details.'
                      : '커스텀 라이선스: 제작자가 정의한 개별 라이선스 조건이 적용됩니다. 상세 내용은 첨부된 라이선스 파일을 참조해 주세요.';
                  case 'all-rights-reserved':
                  default:
                    return language === 'en'
                      ? 'All Rights Reserved: Reproduction, distribution, or modification of this course content is strictly prohibited.'
                      : '모든 권리 보유: 이 강좌 콘텐츠의 무단 복제, 배포 및 변경이 엄격히 금지됩니다.';
                }
              })()}
            </p>

            {courseDetail.license_file && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-zinc-500">
                  {language === 'en' ? 'License Document: ' : '라이선스 문서: '}
                  <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-green-700 dark:text-green-300 font-mono">
                    {courseDetail.license_file}
                  </code>
                </span>
                {(() => {
                  const lic = courseDetail.license || 'CC-BY-NC-4.0';
                  const isCcLicense = CC_LICENSE_URLS[lic];
                  const licenseHref = courseDetail.license_file_exists
                    ? `/courses/${courseDetail.slug}/${courseDetail.license_file}`
                    : (isCcLicense 
                      ? (language === 'en' ? CC_LICENSE_URLS[lic] : `${CC_LICENSE_URLS[lic]}deed.ko`)
                      : `/courses/${courseDetail.slug}/${courseDetail.license_file}`);
                  return (
                    <a
                      href={licenseHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold underline"
                    >
                      {language === 'en' ? 'View Document' : '문서 보기'}
                    </a>
                  );
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
