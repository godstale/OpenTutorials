'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  UploadCloud, FileArchive, ArrowLeft, Loader2, AlertCircle, 
  Github, ExternalLink, CheckCircle2, XCircle, Info, FileJson, 
  Layers
} from 'lucide-react';
import JSZip from 'jszip';

interface TocNode {
  type: string;
  title: string;
  description: string;
  filename?: string;
  children?: TocNode[];
}

interface ValidationStep {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  error?: string;
}

const INITIAL_STEPS: ValidationStep[] = [
  { id: 'manifest-exist', label: 'package-manifest.json 존재 여부 및 형식 검증', status: 'idle' },
  { id: 'manifest-fields', label: '패키지 메타데이터 필수 필드 검증', status: 'idle' },
  { id: 'package-structure', label: '필수 파일 검사 (config.json, wiki.md)', status: 'idle' },
  { id: 'package-config-toc', label: '목차(TOC) 및 강의 카드(Cards) 일치성 검사', status: 'idle' },
];

function validateTocRecursive(
  nodes: TocNode[],
  path: string,
  collectedFilenames: string[]
): { valid: boolean; error?: string } {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const currentPath = `${path}[${i}]`;

    if (!node.type || !['chapter', 'section', 'subsection'].includes(node.type)) {
      return {
        valid: false,
        error: `${currentPath} 항목에 유효하지 않거나 누락된 type이 있습니다. ('chapter', 'section', 'subsection' 중 하나여야 합니다.)`,
      };
    }

    if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
      return {
        valid: false,
        error: `${currentPath} 항목에 title이 누락되었습니다.`,
      };
    }
    if (!node.description || typeof node.description !== 'string' || !node.description.trim()) {
      return {
        valid: false,
        error: `${currentPath} 항목에 description이 누락되었습니다.`,
      };
    }

    const cleanFilename = node.filename ? node.filename.replace(/\.mdx?$/, '') : '';
    if (node.title.trim() === cleanFilename) {
      return {
        valid: false,
        error: `${currentPath} 항목의 제목이 파일명('${cleanFilename}')과 동일합니다. 사용자가 읽기 좋은 적절한 한글 제목으로 수정해주세요.`,
      };
    }

    if (node.description.trim() === '강좌 상세 카드를 확인하세요.') {
      return {
        valid: false,
        error: `${currentPath} 항목의 요약 설명이 기본값('강좌 상세 카드를 확인하세요.')으로 방치되어 있습니다. 적절한 설명을 작성해주세요.`,
      };
    }

    if (node.filename) {
      collectedFilenames.push(node.filename);
    }

    if (node.children) {
      if (!Array.isArray(node.children)) {
        return {
          valid: false,
          error: `${currentPath} 항목의 children이 배열이 아닙니다.`,
        };
      }
      const childResult = validateTocRecursive(node.children, `${currentPath}.children`, collectedFilenames);
      if (!childResult.valid) {
        return { valid: false, error: childResult.error };
      }
    }
  }
  return { valid: true };
}

function UploadForm() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Pre-validation states
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>(INITIAL_STEPS);
  const [validationLoading, setValidationLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [manifestInfo, setManifestInfo] = useState<{
    title: string;
    slug: string;
    coursesCount: number;
    courses: string[];
    bundlerProtocolVersion?: string;
    targetAge?: string;
    category?: string;
  } | null>(null);

  // Global processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [processError, setProcessError] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Prevention of navigation when uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  // Handle drag & drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragOver(true);
    } else if (e.type === 'dragleave') {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setValidationError('ZIP 확장자의 통합 번들 파일만 추가할 수 있습니다.');
      setSelectedFile(null);
      setIsValidated(false);
      setManifestInfo(null);
      setValidationSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle' })));
      return;
    }
    
    setSelectedFile(file);
    setValidationError('');
    setIsValidated(false);
    setManifestInfo(null);
    setValidationSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle' })));
    
    runPreValidation(file);
  };

  const runPreValidation = async (file: File) => {
    setValidationLoading(true);
    
    const updateStep = (id: string, status: 'running' | 'success' | 'failed', error?: string) => {
      setValidationSteps(prev => prev.map(s => s.id === id ? { ...s, status, error } : s));
    };

    try {
      const zip = new JSZip();
      
      // Step 1: manifest-exist
      updateStep('manifest-exist', 'running');
      let contents: JSZip;
      try {
        contents = await zip.loadAsync(file);
      } catch (e: any) {
        throw { stepId: 'manifest-exist', message: `ZIP 파일을 읽는 중 오류가 발생했습니다: ${e.message}` };
      }

      const manifestFile = contents.file('package-manifest.json');
      if (!manifestFile) {
        throw { stepId: 'manifest-exist', message: '루트 경로에 package-manifest.json 파일이 존재하지 않습니다.' };
      }
      
      let manifestText = '';
      try {
        manifestText = await manifestFile.async('text');
      } catch (e: any) {
        throw { stepId: 'manifest-exist', message: `package-manifest.json을 읽는 중 오류가 발생했습니다: ${e.message}` };
      }

      let manifest: any;
      try {
        manifest = JSON.parse(manifestText);
      } catch (e: any) {
        throw { stepId: 'manifest-exist', message: `package-manifest.json의 JSON 형식이 올바르지 않습니다: ${e.message}` };
      }
      updateStep('manifest-exist', 'success');

      // Step 2: manifest-fields
      updateStep('manifest-fields', 'running');
      if (!manifest.title || typeof manifest.title !== 'string' || !manifest.title.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 title 필드가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.bundler_protocol_version || typeof manifest.bundler_protocol_version !== 'string' || !manifest.bundler_protocol_version.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 bundler_protocol_version (프로토콜 버전) 필드가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.target_age || typeof manifest.target_age !== 'string' || !manifest.target_age.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 target_age (대상 연령대) 필드가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.category || typeof manifest.category !== 'string' || !manifest.category.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 category (카테고리) 필드가 누락되었거나 유효하지 않습니다.' };
      }
      
      setManifestInfo({
        title: manifest.title,
        slug: manifest.slug || '',
        coursesCount: 0,
        courses: [],
        bundlerProtocolVersion: manifest.bundler_protocol_version,
        targetAge: manifest.target_age,
        category: manifest.category,
      });
      updateStep('manifest-fields', 'success');

      // Step 3: package-structure
      updateStep('package-structure', 'running');
      if (!contents.file('config.json')) {
        throw { stepId: 'package-structure', message: '루트 경로에 config.json 파일이 누락되었습니다.' };
      }
      if (!contents.file('wiki.md')) {
        throw { stepId: 'package-structure', message: '루트 경로에 wiki.md 파일이 누락되었습니다.' };
      }
      updateStep('package-structure', 'success');

      // Step 4: package-config-toc
      updateStep('package-config-toc', 'running');
      const configFile = contents.file('config.json')!;
      const configText = await configFile.async('text');
      let configJson: any;
      try {
        configJson = JSON.parse(configText);
      } catch (e: any) {
        throw { stepId: 'package-config-toc', message: `config.json JSON 파싱 오류: ${e.message}` };
      }

      if (!configJson.cards || !Array.isArray(configJson.cards) || configJson.cards.length === 0) {
        throw { stepId: 'package-config-toc', message: 'config.json 내에 cards(강의 카드) 배열이 누락되었거나 비어있습니다.' };
      }
      if (!configJson.toc || !Array.isArray(configJson.toc)) {
        throw { stepId: 'package-config-toc', message: 'config.json 내에 toc(목차) 트리 배열이 없습니다.' };
      }

      // Validate TOC recursively
      const collectedFilenames: string[] = [];
      const tocValidation = validateTocRecursive(configJson.toc, 'toc', collectedFilenames);
      if (!tocValidation.valid) {
        throw { stepId: 'package-config-toc', message: `목차 구조 검증 오류: ${tocValidation.error}` };
      }

      const cardsSet = new Set<string>(configJson.cards);
      if (cardsSet.size !== configJson.cards.length) {
        throw { stepId: 'package-config-toc', message: 'config.json의 cards에 중복된 파일명이 존재합니다.' };
      }

      const collectedSet = new Set(collectedFilenames);
      if (collectedSet.size !== collectedFilenames.length) {
        throw { stepId: 'package-config-toc', message: 'TOC 내에 중복된 filename이 존재합니다.' };
      }

      if (cardsSet.size !== collectedSet.size) {
        throw { stepId: 'package-config-toc', message: `cards 개수(${cardsSet.size})와 toc의 최하단 노드 filename 개수(${collectedSet.size})가 일치하지 않습니다.` };
      }

      // Check if MDX cards actually exist in zip file
      const actualCardFiles = new Set<string>();
      contents.forEach((relativePath, fileEntry) => {
        if (relativePath.startsWith('cards/') && !fileEntry.dir) {
          actualCardFiles.add(relativePath.substring('cards/'.length));
        }
      });

      for (const card of configJson.cards) {
        if (!collectedSet.has(card)) {
          throw { stepId: 'package-config-toc', message: `cards 배열에 있는 '${card}' 파일이 toc에 정의되어 있지 않습니다.` };
        }
        if (!actualCardFiles.has(card)) {
          throw { stepId: 'package-config-toc', message: `cards/ 폴더 내에 '${card}' 파일이 실재하지 않습니다.` };
        }
      }
      updateStep('package-config-toc', 'success');

      setIsValidated(true);
    } catch (err: any) {
      console.error('Validation failed:', err);
      if (err.stepId) {
        updateStep(err.stepId, 'failed', err.message);
        const failedIdx = INITIAL_STEPS.findIndex(s => s.id === err.stepId);
        setValidationSteps(prev => prev.map((s, idx) => idx > failedIdx ? { ...s, status: 'idle' as const } : s));
      } else {
        setValidationError(err.message || '검증 수행 도중 예외가 발생했습니다.');
      }
      setIsValidated(false);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsValidated(false);
    setManifestInfo(null);
    setValidationError('');
    setValidationSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle' })));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !isValidated) return;

    setIsProcessing(true);
    setProcessError('');
    setProgressPercent(0);
    setCurrentStep('통합 패키지 데이터 등록 중...');

    try {
      setProgressPercent(30);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/packages/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = '패키지 등록 중 오류가 발생했습니다.';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      const packageId = result.packageId;
      setProgressPercent(70);
      setCurrentStep('자동 수강 신청 처리 중...');

      // 자동 수강 처리
      try {
        const subscribeRes = await fetch('/api/courses/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package_id: packageId }),
        });
        if (!subscribeRes.ok) {
          console.error('[AdminCoursesUpload] Auto-subscribe failed:', await subscribeRes.text());
        }
      } catch (subscribeErr) {
        console.error('[AdminCoursesUpload] Auto-subscribe request error:', subscribeErr);
      }

      setProgressPercent(100);
      setCurrentStep('모든 강좌 패키지가 성공적으로 등록되었습니다!');
      
      setTimeout(() => {
        setIsProcessing(false);
        router.push('/courses/manage');
      }, 1500);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('[AdminCoursesUpload] Error during upload:', error);
      setProcessError(error.message || '등록 중 에러가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-16">
      
      {/* Processing overlay modal */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center text-white select-none">
          <Card className="w-full max-w-md border-none bg-slate-950/90 text-slate-100 shadow-2xl p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <div className="space-y-2 w-full">
                <h3 className="text-xl font-bold tracking-tight">통합 번들 등록 중</h3>
                <p className="text-sm text-slate-400">데이터가 손상되지 않도록 완료 시까지 브라우저 창을 닫지 마세요.</p>
              </div>
              
              <div className="w-full space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span className="truncate max-w-[250px]">{currentStep}</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 bg-slate-800" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/courses/manage')} className="border-zinc-300">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              강좌 번들 파일 업로드
            </h2>
            <p className="text-muted-foreground mt-2">
              ZIP 파일안의 매니페스트와 강좌 파일들을 일괄 검증 및 등록합니다.
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open('/courses/manage/upload/guide', '_blank')}
          className="border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Info className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
          구조 및 마이그레이션 가이드
          <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-muted-foreground" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Columns: Upload Panel & Helper card */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Single Upload Area */}
          <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 shadow-sm flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                통합 번들 ZIP 업로드
              </CardTitle>
              <CardDescription>
                <code>package-manifest.json</code>과 <code>courses/</code> 폴더가 포함된 단일 ZIP 파일(.zip)을 드래그 앤 드롭하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] transition-all
                    ${dragOver 
                      ? 'border-emerald-500 bg-emerald-50/20 dark:border-emerald-400 dark:bg-emerald-950/10' 
                      : 'border-zinc-200 hover:border-emerald-500/50 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:border-zinc-700'}
                  `}
                >
                  <UploadCloud className="w-14 h-14 text-zinc-400 mb-4 animate-pulse" />
                  <h4 className="font-semibold text-sm mb-1.5 text-zinc-800 dark:text-zinc-200">
                    통합 ZIP 번들 파일을 이곳에 드롭하세요
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">또는 파일 탐색기에서 파일을 선택하려면 클릭하세요.</p>
                  <Button variant="secondary" size="sm" className="pointer-events-none text-xs">
                    파일 찾아보기
                  </Button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".zip" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="border rounded-xl p-6 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="p-3 bg-emerald-600/10 text-emerald-600 rounded-lg dark:text-emerald-400 shrink-0">
                        <FileArchive className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate max-w-[320px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          파일 크기: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReset}
                      className="text-xs text-zinc-600 border-zinc-300 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      다른 파일 선택
                    </Button>
                  </div>

                  {manifestInfo && (
                    <div className="border-t pt-4 space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">
                        [매니페스트 정보 분석 결과]
                      </Label>
                      <div className="text-xs space-y-1 bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="flex gap-2">
                          <span className="font-semibold text-zinc-500 shrink-0">통합 패키지명:</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{manifestInfo.title}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-zinc-500 shrink-0">패키지 슬러그:</span>
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">{manifestInfo.slug}</span>
                        </div>
                        {manifestInfo.bundlerProtocolVersion && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">프로토콜 버전:</span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">{manifestInfo.bundlerProtocolVersion}</span>
                          </div>
                        )}
                        {manifestInfo.targetAge && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">대상 연령대:</span>
                            <span className="text-zinc-700 dark:text-zinc-300">{manifestInfo.targetAge}</span>
                          </div>
                        )}
                        {manifestInfo.category && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">카테고리:</span>
                            <span className="text-zinc-700 dark:text-zinc-300">{manifestInfo.category}</span>
                          </div>
                        )}
                        {/* Courses list removed since subcourses concept is deprecated */}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Generator AI Agent Helper Card */}
          <Card className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-r from-emerald-50/40 via-white to-background dark:from-emerald-950/10 dark:via-zinc-900 dark:to-background overflow-hidden relative shadow-sm">
            <div className="absolute right-3 top-3 opacity-5 pointer-events-none">
              <Github className="w-24 h-24" />
            </div>
            <CardContent className="p-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0 dark:text-emerald-400">
                  <Github className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                    강좌 번들 자동 생성기 (Open Tutorials Bundler)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI Agent 를 사용하면 번들 규격에 맞는 ZIP 파일 패키징을 손쉽게 자동화할 수 있습니다. 
                    아래 공식 GitHub 리포지토리에서 템플릿과 빌드 스크립트를 다운로드하여 강좌를 제작하세요.
                  </p>
                  <div className="pt-1.5 flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://github.com/godstale/OpenTutorials-Bundler', '_blank')}
                      className="text-xs h-8 border-emerald-200 hover:bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-950 dark:hover:bg-emerald-950/20"
                    >
                      GitHub 리포지토리 바로가기
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pre-validation Steps Checklist */}
        <div className="flex flex-col">
          <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 shadow-sm flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                번들 사전 유효성 검증
              </CardTitle>
              <CardDescription>
                통합 번들을 제출하기 전 브라우저단에서 패키지 정합성을 즉시 검증합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6">
              
              <div className="space-y-3 flex-1">
                {validationSteps.map((step) => {
                  const isIdle = step.status === 'idle';
                  const isRunning = step.status === 'running';
                  const isSuccess = step.status === 'success';
                  const isFailed = step.status === 'failed';

                  return (
                    <div 
                      key={step.id} 
                      className={`
                        p-3 rounded-lg border text-xs flex gap-3 transition-colors
                        ${isSuccess ? 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-950' : ''}
                        ${isFailed ? 'bg-rose-50/40 border-rose-100 dark:bg-rose-950/5 dark:border-rose-950' : ''}
                        ${isRunning ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-950 animate-pulse' : ''}
                        ${isIdle ? 'bg-zinc-50/50 border-zinc-100 dark:bg-zinc-900/10 dark:border-zinc-900' : ''}
                      `}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {isFailed && <XCircle className="w-4 h-4 text-rose-500" />}
                        {isRunning && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
                        {isIdle && <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />}
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className={`font-semibold ${isFailed ? 'text-rose-950 dark:text-rose-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {step.label}
                        </p>
                        {step.error && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium leading-relaxed font-mono whitespace-pre-wrap bg-rose-50/80 dark:bg-rose-950/20 p-2 rounded border border-rose-100 dark:border-rose-950/40 mt-1">
                            {step.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {validationLoading && (
                <div className="text-center py-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  번들 내부 파일 구조 분석 중...
                </div>
              )}

              {validationError && (
                <div className="p-3.5 rounded-lg bg-rose-50/50 border border-rose-100 dark:bg-rose-950/10 dark:border-rose-950 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{validationError}</span>
                </div>
              )}

              {isValidated && (
                <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-950 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span className="font-bold leading-relaxed">사전 검증 성공! 서버에 등록할 준비가 되었습니다.</span>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>

      {processError && (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive shadow-sm">
          <CardContent className="py-4 flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{processError}</span>
          </CardContent>
        </Card>
      )}

      {/* Upload Actions */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.push('/courses/manage')} 
          disabled={isProcessing}
          className="border-zinc-300"
        >
          취소
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isProcessing || !isValidated || !selectedFile}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm px-6"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              업로드 진행 중...
            </>
          ) : (
            '강좌 등록'
          )}
        </Button>
      </div>

    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-center">로딩 중...</div>}>
      <UploadForm />
    </Suspense>
  );
}
