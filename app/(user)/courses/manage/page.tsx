'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, BookOpen, Trash2, Eye, 
  FolderHeart, Calendar, Loader2, FileJson, UploadCloud, AlertCircle, User
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CourseIcon } from '@/components/ui/course-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/context/LanguageContext';


import { getExternalAgents } from '@/lib/api/external-agents';
import type { UserExternalAgent } from '@/lib/types';

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

interface PackageItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  sequential_play?: boolean;
  force_checkpoint?: boolean;
  created_at: string;
  courses: {
    id: string;
    title: string;
    slug: string;
    agent_id?: string | null;
  }[];
  cards?: string[];
  agent_id?: string | null;
  author_nickname?: string | null;
  author_email?: string | null;
  author_homepage?: string | null;
  source?: string | null;
  changelog?: string | null;
  version?: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  // Courses (통합 패키지) states
  const [courses, setCourses] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Deleting process state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // Edit manifest state
  const [editingCourse, setEditingCourse] = useState<PackageItem | null>(null);
  const [manifestText, setManifestText] = useState('');
  const [packageZipFile, setPackageZipFile] = useState<File | null>(null);
  const [manifestDragOver, setManifestDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const manifestInputRef = useRef<HTMLInputElement>(null);

  // Orphaned courses states
  const [showOrphansModal, setShowOrphansModal] = useState(false);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [loadingOrphans, setLoadingOrphans] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [selectedOrphanIds, setSelectedOrphanIds] = useState<string[]>([]);

  // Online/Update states
  const [onlineCourses, setOnlineCourses] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingCourseTitle, setUpdatingCourseTitle] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');



  // Set manifest template when editingCourse changes
  useEffect(() => {
    if (editingCourse) {
      const template = {
        title: editingCourse.title,
        slug: editingCourse.slug,
        description: editingCourse.description || '',
        thumbnail: editingCourse.thumbnail || 'icon:book',
        published: editingCourse.published,
        sequential_play: editingCourse.sequential_play ?? false,
        force_checkpoint: editingCourse.force_checkpoint ?? false,
        courses: editingCourse.courses?.map(c => c.slug) || []
      };
      setManifestText(JSON.stringify(template, null, 2));
      setPackageZipFile(null);
      setProcessError('');
    }
  }, [editingCourse]);

  const handleManifestDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setManifestDragOver(true);
    } else if (e.type === 'dragleave') {
      setManifestDragOver(false);
    }
  };

  const processManifestFile = (file: File) => {
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          JSON.parse(text); // validation
          setManifestText(text);
          setPackageZipFile(null);
          setProcessError('');
        } catch (err: any) {
          setProcessError('올바르지 않은 JSON 파일 형식입니다: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
      setPackageZipFile(file);
      setProcessError('');
    } else {
      setProcessError('지원이 안 되는 파일 유형입니다. .json 또는 .zip 파일을 업로드해주세요.');
    }
  };

  const handleManifestDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setManifestDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processManifestFile(e.dataTransfer.files[0]);
    }
  };

  const handleManifestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processManifestFile(e.target.files[0]);
    }
  };

  const handleUpdateManifestSubmit = async () => {
    setIsProcessing(true);
    setProcessError('');
    try {
      let res;
      if (packageZipFile) {
        const formData = new FormData();
        formData.append('file', packageZipFile);
        res = await fetch('/api/admin/packages/upload', {
          method: 'POST',
          body: formData,
        });
      } else {
        let parsed;
        try {
          parsed = JSON.parse(manifestText);
        } catch (err: any) {
          throw new Error('JSON 문법 오류가 있습니다: ' + err.message);
        }

        if (parsed.slug !== editingCourse?.slug) {
          if (!window.confirm(language === 'en' ? 'The manifest slug is different. If the slug is different, the existing course will not be updated and a new course will be registered instead. Do you want to continue?' : '매니페스트의 slug가 다릅니다. slug가 다를 경우 기존 강좌가 수정되지 않고 새로운 강좌가 등록됩니다. 계속하시겠습니까?')) {
            setIsProcessing(false);
            return;
          }
        }

        res = await fetch('/api/admin/packages/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '강좌 매니페스트 업데이트에 실패했습니다.');
      }

      setEditingCourse(null);
      fetchCourses();
    } catch (err: any) {
      console.error(err);
      setProcessError(err.message || '업데이트 도중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch Orphaned Courses
  const fetchOrphans = async () => {
    setLoadingOrphans(true);
    try {
      const res = await fetch('/api/admin/courses/check-orphans');
      const data = await res.json();
      if (res.ok && Array.isArray(data.orphanedCourses)) {
        setOrphans(data.orphanedCourses);
        // Reset selection
        setSelectedOrphanIds([]);
      }
    } catch (err) {
      console.error('Failed to fetch orphaned courses:', err);
    } finally {
      setLoadingOrphans(false);
    }
  };

  // Clean Selected Orphans
  const cleanOrphans = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(language === 'en' ? `Are you sure you want to permanently delete the selected ${ids.length} registration error courses and their storage files?` : `선택한 ${ids.length}개의 등록 오류 강좌 및 해당 스토리지 파일을 영구 삭제하시겠습니까?`)) return;

    setCleaningOrphans(true);
    try {
      const res = await fetch('/api/admin/courses/check-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: ids })
      });
      const data = await res.json();
      if (res.ok) {
        alert(language === 'en' ? `Successfully cleaned up ${data.cleanedCount} registration error course resources.` : `성공적으로 ${data.cleanedCount}개의 등록 오류 강좌 리소스를 정리했습니다.`);
        fetchOrphans();
        fetchCourses();
      } else {
        alert(language === 'en' ? `Cleanup failed: ${data.error || 'Unknown error'}` : `정리 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to clean orphans:', err);
      alert(language === 'en' ? 'An error occurred while communicating with the server.' : '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setCleaningOrphans(false);
    }
  };

  // Trigger fetch when modal opens
  useEffect(() => {
    if (showOrphansModal) {
      fetchOrphans();
    }
  }, [showOrphansModal]);

  const [agents, setAgents] = useState<UserExternalAgent[]>([]);

  // Fetch Courses
  const fetchCourses = async () => {
    try {
      const [res, agentsData] = await Promise.all([
        fetch('/api/admin/packages'),
        getExternalAgents().catch(() => [])
      ]);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCourses(data);
      }
      setAgents(agentsData);
    } catch (err) {
      console.error('Failed to fetch courses or agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineCourses = async () => {
    let list: any[] = [];
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/courses.json?t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : (data?.courses || []);
      } else {
        list = OFFLINE_FALLBACK_COURSES;
      }
    } catch (err) {
      console.warn('Failed to fetch online courses:', err);
      list = OFFLINE_FALLBACK_COURSES;
    }
    
    // Ensure default courses are in the list if not present
    for (const def of OFFLINE_FALLBACK_COURSES) {
      if (!list.some((c: any) => c.slug === def.slug)) {
        list.push(def);
      }
    }
    setOnlineCourses(list);
  };

  useEffect(() => {
    fetchCourses();
    fetchOnlineCourses();
  }, []);

  const handleUpdateCourse = async (course: PackageItem, onlineInfo: any) => {
    const confirmUpdate = window.confirm(
      `"${course.title}" 강좌를 최신 버전(v${onlineInfo.version})으로 업데이트하시겠습니까?\n기존 학습 진도율은 보존되지만, 강좌 콘텐츠가 변경될 수 있습니다.`
    );
    if (!confirmUpdate) return;

    setIsUpdating(true);
    setUpdatingCourseTitle(course.title);
    setUpdateStatus('로컬 패키지 확인 중...');
    try {
      let isImportedLocally = false;

      // 1. 먼저 로컬 파일시스템에 해당 강좌 폴더가 있는지 감지하고 바로 등록(임포트) 시도
      try {
        const importRes = await fetch('/api/admin/packages/import-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: onlineInfo.slug,
            title: onlineInfo.title,
            description: onlineInfo.description,
            version: onlineInfo.version,
            author: onlineInfo.author,
            category: onlineInfo.category,
            tags: onlineInfo.tags,
            target_age: onlineInfo.target_age,
            thumbnail: onlineInfo.thumbnail,
            bundler_protocol_version: onlineInfo.bundler_protocol_version
          })
        });

        if (importRes.ok) {
          isImportedLocally = true;
          console.log(`Successfully updated course package '${onlineInfo.slug}' from local folder.`);
        }
      } catch (importErr) {
        console.warn('Local import update attempt failed, falling back to download:', importErr);
      }

      // 2. 로컬에 폴더가 없어서 임포트에 실패한 경우 원격 ZIP 다운로드 진행
      if (!isImportedLocally) {
        setUpdateStatus('강좌 ZIP 파일 다운로드 중...');
        let downloadUrl = onlineInfo.downloadUrl;
        if (downloadUrl && !downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
          downloadUrl = `https://raw.githubusercontent.com/godstale/OpenTutorials-Browser/main/${downloadUrl}`;
        }
        const downloadRes = await fetch(downloadUrl);
        if (!downloadRes.ok) throw new Error('강좌 ZIP 파일을 다운로드하지 못했습니다.');
        const zipBlob = await downloadRes.blob();
        
        // 3. FormData에 담기
        setUpdateStatus('로컬 데이터베이스 업데이트 중...');
        const file = new File([zipBlob], `${onlineInfo.slug}.zip`, { type: 'application/zip' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'GITHUB');
        
        // 4. 로컬 업로드 API 호출 (덮어쓰기 형태로 등록)
        const uploadRes = await fetch('/api/admin/packages/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          let errMsg = '로컬 DB 업데이트에 실패했습니다.';
          try {
            const errData = await uploadRes.json();
            errMsg = errData.error || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }
      }

      setUpdateStatus('완료!');
      alert('업데이트가 성공적으로 완료되었습니다.');
      await fetchCourses();
    } catch (err: any) {
      console.error(err);
      alert(`업데이트 실패: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsUpdating(false);
      setUpdatingCourseTitle('');
      setUpdateStatus('');
    }
  };



  const getAssignedAgentsForPackage = (pkg: PackageItem) => {
    const totalCourses = pkg.cards?.length || 0;
    if (totalCourses === 0) return language === 'en' ? 'No sub-courses' : '하위 강좌 없음';
    
    if (pkg.agent_id) {
      const found = agents.find(a => a.id === pkg.agent_id);
      if (found) {
        return found.name;
      }
    }
    
    const defaultAgent = agents.find(a => a.is_ai_tutor);
    return defaultAgent ? `${defaultAgent.name} (${language === 'en' ? 'Default' : '기본값'})` : (language === 'en' ? 'No Agent' : '에이전트 없음');
  };

  const renderCourseCard = (course: PackageItem) => {
    const assignedAgentInfo = getAssignedAgentsForPackage(course);
    const hasErrorAgent = assignedAgentInfo.includes('에이전트 없음');

    const onlineInfo = onlineCourses.find((c: any) => c.slug === course.slug);
    const hasUpdate = onlineInfo ? isVersionNewer(course.version || '1.0.0', onlineInfo.version) : false;

    return (
      <div key={course.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all p-5 rounded-xl flex flex-col lg:flex-row gap-6 justify-between lg:items-center">
        <div className="flex gap-4 items-start w-full">
          <div className="w-24 h-16 rounded-md overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
            <CourseIcon thumbnail={course.thumbnail} className="w-full h-full" iconClassName="w-8 h-8" alt={course.title} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 
                className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer transition-colors"
                onClick={() => router.push(`/courses/${course.slug}`)}
              >
                {course.title}
              </h3>
              <Badge variant={course.published ? 'default' : 'secondary'} className={course.published ? 'bg-green-700 text-white' : ''}>
                {course.slug}
              </Badge>
              <Badge variant="outline" className="text-zinc-600 border-zinc-200 bg-zinc-50/50 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/20">
                v{course.version || '1.0.0'}
              </Badge>
              {(() => {
                const sourceText = course.source || (course.changelog === '로컬 복원 등록' ? 'GITHUB' : '파일');
                const isGithub = sourceText === 'GITHUB';
                return (
                  <Badge 
                    variant="outline" 
                    className={isGithub 
                      ? "text-purple-600 border-purple-200 bg-purple-50/50 dark:text-purple-400 dark:border-purple-900 dark:bg-purple-950/20" 
                      : "text-zinc-600 border-zinc-200 bg-zinc-50/50 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/20"
                    }
                  >
                    {language === 'en' ? 'Source: ' : '출처: '}{sourceText === '파일' && language === 'en' ? 'File' : sourceText}
                  </Badge>
                );
              })()}
              {course.sequential_play && (
                <Badge variant="outline" className="text-amber-600 border-amber-600 dark:text-amber-400">
                  {language === 'en' ? 'Sequential' : '순차재생'}
                </Badge>
              )}
              {course.force_checkpoint && (
                <Badge variant="outline" className="text-rose-600 border-rose-600 dark:text-rose-400">
                  {language === 'en' ? 'Checkpoint' : '체크포인트 강제'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{course.description || t('noIntroduction')}</p>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 mt-2">
              {course.author_nickname && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{course.author_nickname}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{language === 'en' ? `Sub-courses ${course.cards?.length || 0}` : `하위 강좌 ${course.cards?.length || 0}개`}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(course.created_at).toLocaleDateString()}</span>
              </div>
              {/* 할당된 에이전트 표시 */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">{language === 'en' ? 'Assigned Agent:' : '할당된 에이전트:'}</span>
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  hasErrorAgent 
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50' 
                    : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border border-green-100/50'
                }`}>
                  {assignedAgentInfo}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 self-end lg:self-center mt-4 lg:mt-0 w-full lg:w-52">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (course.cards && course.cards.length > 0) {
                  router.push(`/learn/${course.slug}?card=1&preview=true`);
                } else {
                  alert(language === 'en' ? 'No sub-chapters included in this course.' : '이 강좌에 포함된 하위 챕터가 없습니다.');
                }
              }}
              className="gap-1.5 border-zinc-300 flex-1 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              {language === 'en' ? 'Preview' : '미리보기'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteCourse(course)}
              className="gap-1.5 flex-1 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'en' ? 'Delete' : '삭제'}
            </Button>
          </div>

          {(hasUpdate && onlineInfo || !course.published) && (
            <div className="flex gap-2 w-full">
              {hasUpdate && onlineInfo && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleUpdateCourse(course, onlineInfo)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold flex-1 text-xs gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {t('btnUpdate')}
                </Button>
              )}
              {!course.published && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => togglePublishedCourse(course)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1 text-xs"
                >
                  {language === 'en' ? 'Publish' : '공개 전환'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const togglePublishedCourse = async (course: PackageItem) => {
    const nextPublished = !course.published;
    try {
      const res = await fetch(`/api/admin/packages/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: nextPublished }),
      });
      if (res.ok) {
        setCourses(courses.map(c => c.id === course.id ? { ...c, published: nextPublished } : c));
      } else {
        const data = await res.json();
        alert(language === 'en' ? `Failed to change status: ${data.error || 'Unknown error'}` : `상태 변경에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to toggle published state:', err);
      alert(language === 'en' ? 'An error occurred while communicating with the server.' : '서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const deleteCourse = async (course: PackageItem, force = false) => {
    if (!force && !window.confirm(language === 'en' ? `Are you sure you want to delete the course "${course.title}"?` : `"${course.title}" 강좌를 삭제하시겠습니까?`)) return;
    
    setIsDeleting(true);
    setDeleteMessage(language === 'en' ? `Deleting course "${course.title}"...` : `"${course.title}" 강좌 삭제 중...`);
    
    try {
      const res = await fetch(`/api/admin/packages/${course.id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== course.id));
        alert(language === 'en' ? 'Deletion completed.' : '삭제가 완료되었습니다.');
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.error === 'subscribers_exist') {
          // Temporarily disable overlay to show confirm dialog
          setIsDeleting(false);
          const proceed = window.confirm(
            language === 'en' 
              ? `There are users (${data.subscriberCount}) currently taking the course "${course.title}". If you delete this course, their progress information will be completely lost. Do you still want to delete it?`
              : `"${course.title}" 강좌를 수강 중인 사용자(${data.subscriberCount}명)가 존재합니다. 강좌를 삭제하면 이 사용자들의 강좌 진행 정보가 완전히 삭제됩니다. 그래도 삭제하시겠습니까?`
          );
          if (proceed) {
            await deleteCourse(course, true);
            return;
          }
        } else {
          alert(language === 'en' ? `Failed to delete: ${data.error || 'Unknown error'}` : `삭제에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
        }
      } else {
        const data = await res.json();
        alert(language === 'en' ? `Failed to delete: ${data.error || 'Unknown error'}` : `삭제에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert(language === 'en' ? 'An error occurred while communicating with the server.' : '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      {/* Blocking overlay when deleting */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center text-white select-none">
          <Card className="w-full max-w-md border-none bg-slate-950/90 text-slate-100 shadow-2xl p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
              <div className="space-y-2 w-full">
                <h3 className="text-xl font-bold tracking-tight">{t('lblDeleting')}</h3>
                <p className="text-sm text-slate-400">{deleteMessage}</p>
                <p className="text-xs text-slate-500">{t('lblDoNotClose')}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Blocking overlay when updating */}
      {isUpdating && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center text-white select-none">
          <Card className="w-full max-w-md border-none bg-slate-950/90 text-slate-100 shadow-2xl p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <div className="space-y-2 w-full">
                <h3 className="text-xl font-bold tracking-tight">{t('lblUpdating')}</h3>
                <p className="text-sm text-slate-400">"{updatingCourseTitle}" {language === 'en' ? 'updating...' : '업데이트 중...'}</p>
                <p className="text-xs text-amber-400 font-semibold">{updateStatus}</p>
                <p className="text-xs text-slate-500">{t('lblDoNotClose')}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('manageCourses')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('courseManageDesc')}
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setShowOrphansModal(true)}
            className="gap-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            {t('btnCheckErrors')}
          </Button>
          <Button 
            onClick={() => router.push('/courses/manage/upload')} 
            className="gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            {t('btnUploadCourse')}
          </Button>
        </div>
      </div>

      {/* 등록된 강좌 목록 섹션 */}
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{language === 'en' ? `Course Bundle Files (${courses.length})` : `강좌 번들 파일 목록 (${courses.length})`}</CardTitle>
          <CardDescription>{language === 'en' ? 'List of courses registered using course bundle (ZIP) files.' : '강좌 번들(ZIP) 파일을 이용해 등록된 강좌 목록입니다.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row gap-6 items-center animate-pulse">
                  <Skeleton className="w-24 h-16 rounded-md bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800" />
                      <Skeleton className="h-5 w-12 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <Skeleton className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Skeleton className="h-9 w-16 bg-zinc-200 dark:bg-zinc-800" />
                    <Skeleton className="h-9 w-20 bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))
            ) : courses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FolderHeart className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                {language === 'en' ? 'No courses registered.' : '등록된 강좌가 없습니다.'}
              </div>
            ) : (
              courses.map(renderCourseCard)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Manifest Modal */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => { if (!open) setEditingCourse(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-600" />
              {language === 'en' ? 'Edit Course Manifest' : '강좌 매니페스트 수정'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Upload a new manifest file (.json, .zip) or directly edit the JSON data below to update the course.' : '새로운 매니페스트 파일(.json, .zip)을 업로드하거나 하단의 JSON 데이터를 직접 수정하여 강좌를 업데이트합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onDragEnter={handleManifestDrag}
                onDragOver={handleManifestDrag}
                onDragLeave={handleManifestDrag}
                onDrop={handleManifestDrop}
                onClick={() => manifestInputRef.current?.click()}
                className={`
                  border border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[100px]
                  ${manifestDragOver ? 'border-indigo-600 bg-indigo-50/10' : 'border-zinc-200 hover:border-indigo-500/50 hover:bg-zinc-50/50 dark:border-zinc-800'}
                `}
              >
                <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs font-semibold block text-zinc-700 dark:text-zinc-300">
                  {language === 'en' ? 'Drop manifest (.zip or .json) / Click' : '매니페스트 (.zip 또는 .json) 드롭/클릭'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block truncate max-w-[240px]">
                  {packageZipFile ? packageZipFile.name : 'package-manifest.json / package-bundle.zip'}
                </span>
                <input 
                  type="file" 
                  ref={manifestInputRef} 
                  onChange={handleManifestFileChange} 
                  accept=".json,.zip" 
                  className="hidden" 
                />
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border text-[11px] text-muted-foreground flex flex-col justify-center leading-relaxed">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">💡 {language === 'en' ? 'Manifest Update Guide' : '매니페스트 업데이트 가이드'}</p>
                <p>
                  {language === 'en' ? (
                    <>
                      1. The <code>slug</code> value of the uploaded file must match the existing course to update it.<br />
                      2. You can modify the <code>sequential_play</code> and <code>force_checkpoint</code> settings.<br />
                      3. Define sub-courses inside the <code>courses</code> array to set structure and keywords.
                    </>
                  ) : (
                    <>
                      1. 업로드하는 파일의 <code>slug</code> 값이 기존 강좌와 동일해야 정보가 업데이트됩니다.<br />
                      2. <code>sequential_play</code>(순차재생)와 <code>force_checkpoint</code>(체크포인트 강제) 설정을 수정할 수 있습니다.<br />
                      3. <code>courses</code> 배열 내의 하위 강좌 정보들을 직접 정의하여 검색 키워드 및 구조를 설정할 수 있습니다.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col min-h-[220px]">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground font-semibold">{language === 'en' ? 'Manifest JSON Data' : '매니페스트 JSON 데이터'}</Label>
                {packageZipFile && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setPackageZipFile(null)} 
                    className="h-6 p-0 text-xs text-indigo-600"
                  >
                    {language === 'en' ? 'Switch to direct JSON text editing' : '직접 JSON 텍스트 수정으로 전환'}
                  </Button>
                )}
              </div>
              <Textarea
                value={packageZipFile ? (language === 'en' ? `ZIP bundle registered: ${packageZipFile.name}\n(Will use package-manifest.json and thumbnail inside ZIP)` : `ZIP 번들 파일이 등록되었습니다: ${packageZipFile.name}\n(ZIP 내부의 package-manifest.json과 썸네일 이미지를 사용합니다.)`) : manifestText}
                onChange={(e) => setManifestText(e.target.value)}
                disabled={!!packageZipFile}
                placeholder={language === 'en' ? 'Manifest JSON...' : '매니페스트 JSON...'}
                className="flex-1 font-mono text-xs border-zinc-200 dark:border-zinc-800 resize-none"
              />
            </div>

            {processError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg p-3 flex gap-2 items-center shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{processError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-2 gap-2 shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setEditingCourse(null)} 
              disabled={isProcessing}
              size="sm"
            >
              {language === 'en' ? 'Cancel' : '취소'}
            </Button>
            <Button 
              onClick={handleUpdateManifestSubmit} 
              disabled={isProcessing || (!manifestText && !packageZipFile)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'en' ? 'Updating...' : '업데이트 중...'}
                </>
              ) : (
                language === 'en' ? 'Update Course Complete' : '강좌 업데이트 완료'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orphaned Courses (Cleanup) Modal */}
      <Dialog open={showOrphansModal} onOpenChange={(open) => { if (!open) setShowOrphansModal(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {t('lblOrphanCheck')}
            </DialogTitle>
            <DialogDescription>
              {t('lblOrphanDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-4 min-h-[250px] pr-1">
            {loadingOrphans ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span>{language === 'en' ? 'Checking for registration errors...' : '등록 오류 강좌 검사 중...'}</span>
              </div>
            ) : orphans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 mb-1">{t('lblNoOrphans')}</h4>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'All courses are normally connected to packages.' : '모든 강좌가 패키지에 정상적으로 연결되어 있습니다.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold px-1">
                  <span>{language === 'en' ? `Detected Registration Errors (${orphans.length})` : `검출된 등록 오류 강좌 (${orphans.length}개)`}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedOrphanIds(orphans.map(o => o.id))}
                      className="text-indigo-600 hover:underline"
                    >
                      {language === 'en' ? 'Select All' : '전체 선택'}
                    </button>
                    <span>|</span>
                    <button 
                      onClick={() => setSelectedOrphanIds([])}
                      className="text-zinc-500 hover:underline"
                    >
                      {language === 'en' ? 'Deselect All' : '선택 해제'}
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg divide-y dark:divide-zinc-800 max-h-[350px] overflow-y-auto">
                  {orphans.map((item) => {
                    const isChecked = selectedOrphanIds.includes(item.id);
                    return (
                      <div key={item.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/35 transition-colors gap-4">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrphanIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedOrphanIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="w-12 h-8 rounded overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                            <CourseIcon thumbnail={item.thumbnail} className="w-full h-full" iconClassName="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{item.title}</span>
                              <Badge variant="outline" className="text-[10px] font-mono leading-none py-0.5 px-1 bg-zinc-50 dark:bg-zinc-900">
                                {item.slug}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {language === 'en' ? 'Upload Date: ' : '업로드일자: '}{new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => cleanOrphans([item.id])} 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                          disabled={cleaningOrphans}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowOrphansModal(false)}
              disabled={cleaningOrphans}
              size="sm"
            >
              {language === 'en' ? 'Close' : '닫기'}
            </Button>
            {orphans.length > 0 && (
              <Button 
                onClick={() => cleanOrphans(selectedOrphanIds)}
                disabled={selectedOrphanIds.length === 0 || cleaningOrphans}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                size="sm"
              >
                {cleaningOrphans ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Cleaning...' : '정리 중...'}
                  </>
                ) : (
                  language === 'en' ? `Clean Selected (${selectedOrphanIds.length})` : `선택한 강좌 정리 (${selectedOrphanIds.length}개)`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
