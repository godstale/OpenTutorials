'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, BookOpen, Trash2, Edit, Eye, MoreVertical, 
  FolderHeart, Calendar, Loader2, FileJson, UploadCloud, AlertCircle
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
  }[];
}

export default function AdminCoursesPage() {
  const router = useRouter();
  
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
          if (!window.confirm('매니페스트의 slug가 다릅니다. slug가 다를 경우 기존 강좌가 수정되지 않고 새로운 강좌가 등록됩니다. 계속하시겠습니까?')) {
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
    if (!window.confirm(`선택한 ${ids.length}개의 등록 오류 강좌 및 해당 스토리지 파일을 영구 삭제하시겠습니까?`)) return;

    setCleaningOrphans(true);
    try {
      const res = await fetch('/api/admin/courses/check-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: ids })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`성공적으로 ${data.cleanedCount}개의 등록 오류 강좌 리소스를 정리했습니다.`);
        fetchOrphans();
        fetchCourses();
      } else {
        alert(`정리 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to clean orphans:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
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

  // Fetch Courses
  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/packages');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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
        alert(`상태 변경에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to toggle published state:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const deleteCourse = async (course: PackageItem, force = false) => {
    if (!force && !window.confirm(`"${course.title}" 강좌를 삭제하시겠습니까?`)) return;
    
    setIsDeleting(true);
    setDeleteMessage(`"${course.title}" 강좌 삭제 중...`);
    
    try {
      const res = await fetch(`/api/admin/packages/${course.id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== course.id));
        alert('삭제가 완료되었습니다.');
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.error === 'subscribers_exist') {
          // Temporarily disable overlay to show confirm dialog
          setIsDeleting(false);
          const proceed = window.confirm(
            `"${course.title}" 강좌를 수강 중인 사용자(${data.subscriberCount}명)가 존재합니다. 강좌를 삭제하면 이 사용자들의 강좌 진행 정보가 완전히 삭제됩니다. 그래도 삭제하시겠습니까?`
          );
          if (proceed) {
            await deleteCourse(course, true);
            return;
          }
        } else {
          alert(`삭제에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
        }
      } else {
        const data = await res.json();
        alert(`삭제에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
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
                <h3 className="text-xl font-bold tracking-tight">강좌 삭제 중</h3>
                <p className="text-sm text-slate-400">{deleteMessage}</p>
                <p className="text-xs text-slate-500">완료 시까지 브라우저 화면을 종료하거나 이동하지 마세요.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">강좌 관리</h2>
          <p className="text-muted-foreground mt-2">
            통합 패키지 매니페스트 기반의 강좌 및 하위 콘텐츠 목록을 관리합니다.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setShowOrphansModal(true)}
            className="gap-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            등록 오류 검사
          </Button>
          <Button 
            onClick={() => router.push('/courses/manage/upload')} 
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            새 강좌 등록
          </Button>
        </div>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold">전체 강좌 ({courses.length})</CardTitle>
          <CardDescription>플랫폼에 서비스 중인 전체 강좌 목록입니다.</CardDescription>
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
                등록된 강좌가 없습니다.
              </div>
            ) : (
              courses.map((course) => (
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
                        <Badge variant="outline" className="text-xs text-zinc-500 font-mono">
                          {course.slug}
                        </Badge>
                        <Badge variant={course.published ? 'default' : 'secondary'} className={course.published ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>
                          {course.published ? '공개됨' : '비공개'}
                        </Badge>
                        {course.sequential_play && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 dark:text-amber-400">
                            순차재생
                          </Badge>
                        )}
                        {course.force_checkpoint && (
                          <Badge variant="outline" className="text-rose-600 border-rose-600 dark:text-rose-400">
                            체크포인트 강제
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{course.description || '설명이 없습니다.'}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>하위 강좌 {course.courses?.length || 0}개</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(course.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center mt-4 lg:mt-0 w-full lg:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (course.courses && course.courses.length > 0) {
                          router.push(`/learn/${course.courses[0].slug}?preview=true&package=${course.slug}`);
                        } else {
                          alert('이 강좌에 포함된 하위 챕터가 없습니다.');
                        }
                      }}
                      className="gap-1.5 border-zinc-300 w-full lg:w-auto text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      미리보기
                    </Button>
                    {!course.published && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => togglePublishedCourse(course)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full lg:w-auto text-xs"
                      >
                        공개 전환
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCourse(course)}
                      className="gap-1.5 w-full lg:w-auto text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>
              ))
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
              강좌 매니페스트 수정
            </DialogTitle>
            <DialogDescription>
              새로운 매니페스트 파일(.json, .zip)을 업로드하거나 하단의 JSON 데이터를 직접 수정하여 강좌를 업데이트합니다.
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
                  매니페스트 (.zip 또는 .json) 드롭/클릭
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
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">💡 매니페스트 업데이트 가이드</p>
                <p>
                  1. 업로드하는 파일의 <code>slug</code> 값이 기존 강좌와 동일해야 정보가 업데이트됩니다.<br />
                  2. <code>sequential_play</code>(순차재생)와 <code>force_checkpoint</code>(체크포인트 강제) 설정을 수정할 수 있습니다.<br />
                  3. <code>courses</code> 배열 내의 하위 강좌 정보들을 직접 정의하여 검색 키워드 및 구조를 설정할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col min-h-[220px]">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground font-semibold">매니페스트 JSON 데이터</Label>
                {packageZipFile && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setPackageZipFile(null)} 
                    className="h-6 p-0 text-xs text-indigo-600"
                  >
                    직접 JSON 텍스트 수정으로 전환
                  </Button>
                )}
              </div>
              <Textarea
                value={packageZipFile ? `ZIP 번들 파일이 등록되었습니다: ${packageZipFile.name}\n(ZIP 내부의 package-manifest.json과 썸네일 이미지를 사용합니다.)` : manifestText}
                onChange={(e) => setManifestText(e.target.value)}
                disabled={!!packageZipFile}
                placeholder="매니페스트 JSON..."
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
              취소
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
                  업데이트 중...
                </>
              ) : (
                '강좌 업데이트 완료'
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
              강좌 등록 오류 검사 및 정리
            </DialogTitle>
            <DialogDescription>
              강좌 파일(ZIP)은 정상 업로드되었으나, 최종 매니페스트(JSON) 등록 실패 등으로 인해 어떤 패키지에도 할당되지 않은 '등록 오류 강좌'들을 스토리지와 DB에서 영구 정리합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-4 min-h-[250px] pr-1">
            {loadingOrphans ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span>등록 오류 강좌 검사 중...</span>
              </div>
            ) : orphans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-zinc-950 dark:text-zinc-50 mb-1">검출된 등록 오류가 없습니다</h4>
                <p className="text-xs text-muted-foreground">모든 강좌가 패키지에 정상적으로 연결되어 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold px-1">
                  <span>검출된 등록 오류 강좌 ({orphans.length}개)</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedOrphanIds(orphans.map(o => o.id))}
                      className="text-indigo-600 hover:underline"
                    >
                      전체 선택
                    </button>
                    <span>|</span>
                    <button 
                      onClick={() => setSelectedOrphanIds([])}
                      className="text-zinc-500 hover:underline"
                    >
                      선택 해제
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
                              업로드일자: {new Date(item.created_at).toLocaleString()}
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
              닫기
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
                    정리 중...
                  </>
                ) : (
                  `선택한 강좌 정리 (${selectedOrphanIds.length}개)`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
