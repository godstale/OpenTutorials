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
import { useLanguage } from '@/lib/context/LanguageContext';

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

const getStepLabel = (id: string, isEnglish: boolean) => {
  switch (id) {
    case 'manifest-exist':
      return isEnglish ? 'Verify package-manifest.json existence & format' : 'package-manifest.json 존재 여부 및 형식 검증';
    case 'manifest-fields':
      return isEnglish ? 'Verify package metadata required fields' : '패키지 메타데이터 필수 필드 검증';
    case 'package-structure':
      return isEnglish ? 'Verify required files (config.json, wiki.md)' : '필수 파일 검사 (config.json, wiki.md)';
    case 'package-config-toc':
      return isEnglish ? 'Verify TOC and course cards consistency' : '목차(TOC) 및 강의 카드(Cards) 일치성 검사';
    case 'child-zips':
      return isEnglish ? 'Verify subcourse ZIP files mapping' : '하위 강좌 ZIP 파일 매핑 검사';
    case 'child-structure':
      return isEnglish ? 'Verify subcourse required files (config.json, wiki.md)' : '하위 강좌 내부 필수 파일 검사 (config.json, wiki.md)';
    case 'child-config-toc':
      return isEnglish ? 'Verify subcourse TOC and cards consistency' : '하위 강좌 목차(TOC) 및 강의 카드(Cards) 일치성 검사';
    default:
      return id;
  }
};

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
  const { t, language } = useLanguage();
  const isEnglish = language === 'en';

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
    author?: {
      nickname: string;
      email?: string | null;
      website?: string | null;
    } | null;
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
      setValidationError(isEnglish ? 'Only integrated bundle files with ZIP extension can be added.' : 'ZIP 확장자의 통합 번들 파일만 추가할 수 있습니다.');
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
    setValidationSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle' })));
    
    const updateStep = (stepsList: ValidationStep[], id: string, status: 'running' | 'success' | 'failed', error?: string) => {
      const nextSteps = stepsList.map(s => s.id === id ? { ...s, status, error } : s);
      setValidationSteps(nextSteps);
      return nextSteps;
    };

    try {
      const zip = new JSZip();
      let currentSteps = [...INITIAL_STEPS];
      
      // Step 1: manifest-exist
      currentSteps = updateStep(currentSteps, 'manifest-exist', 'running');
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
      currentSteps = updateStep(currentSteps, 'manifest-exist', 'success');

      // Step 2: manifest-fields
      currentSteps = updateStep(currentSteps, 'manifest-fields', 'running');
      if (!manifest.title || typeof manifest.title !== 'string' || !manifest.title.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 title 필드가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.bundler_protocol_version || typeof manifest.bundler_protocol_version !== 'string' || !manifest.bundler_protocol_version.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 bundler_protocol_version (프로토콜 버전) 필드가 누락되었거나 유효하지 않습니다.' };
      }
      const targetAgeRegex = /^(all|\d+|\d+-\d+|\d+\+)$/;
      if (!manifest.target_age || typeof manifest.target_age !== 'string' || !targetAgeRegex.test(manifest.target_age.trim())) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json의 target_age (대상 연령대) 필드가 누락되었거나 규격(all, 10+, 8-13 등)에 맞지 않습니다.' };
      }
      if (!manifest.category || typeof manifest.category !== 'string' || !manifest.category.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 category (카테고리) 필드가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.author || typeof manifest.author !== 'object') {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json에 author (작성자 정보) 객체가 누락되었거나 유효하지 않습니다.' };
      }
      if (!manifest.author.nickname || typeof manifest.author.nickname !== 'string' || !manifest.author.nickname.trim()) {
        throw { stepId: 'manifest-fields', message: 'package-manifest.json의 author.nickname 필드가 누락되었거나 유효하지 않습니다.' };
      }

      if (manifest.license) {
        const allowedLicenses = [
          'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0',
          'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0', 'CC0-1.0', 'all-rights-reserved', 'custom'
        ];
        if (!allowedLicenses.includes(manifest.license)) {
          throw { stepId: 'manifest-fields', message: 'package-manifest.json의 license 값이 올바르지 않습니다.' };
        }
      }
      if (manifest.license === 'custom' && (!manifest.license_file || typeof manifest.license_file !== 'string' || !manifest.license_file.trim())) {
        throw { stepId: 'manifest-fields', message: 'license가 custom일 때 license_file 필드는 필수입니다.' };
      }
      if (manifest.license_file) {
        const licenseFile = contents.file(manifest.license_file);
        if (!licenseFile) {
          throw { stepId: 'manifest-fields', message: `package-manifest.json에 지정된 라이선스 파일 '${manifest.license_file}'이(가) ZIP 루트에 존재하지 않습니다.` };
        }
      }

      const isPackage = Array.isArray(manifest.courses) && manifest.courses.length > 0;
      
      setManifestInfo({
        title: manifest.title,
        slug: manifest.slug || '',
        coursesCount: isPackage ? manifest.courses.length : 0,
        courses: isPackage ? manifest.courses.map((c: any) => c.title || c.slug || '이름 없음') : [],
        bundlerProtocolVersion: manifest.bundler_protocol_version,
        targetAge: manifest.target_age,
        category: manifest.category,
        author: {
          nickname: manifest.author.nickname,
          email: manifest.author.email || null,
          website: manifest.author.website || null,
        },
      });
      currentSteps = updateStep(currentSteps, 'manifest-fields', 'success');

      if (isPackage) {
        // --- 패키지 검증 흐름 ---
        const packageSteps: ValidationStep[] = [
          { id: 'manifest-exist', label: 'package-manifest.json 존재 여부 및 형식 검증', status: 'success' },
          { id: 'manifest-fields', label: '패키지 메타데이터 필수 필드 검증', status: 'success' },
          { id: 'child-zips', label: '하위 강좌 ZIP 파일 매핑 검사', status: 'idle' },
          { id: 'child-structure', label: '하위 강좌 내부 필수 파일 검사 (config.json, wiki.md)', status: 'idle' },
          { id: 'child-config-toc', label: '하위 강좌 목차(TOC) 및 강의 카드(Cards) 일치성 검사', status: 'idle' },
        ];
        currentSteps = [...packageSteps];
        setValidationSteps(currentSteps);

        // Step 3: child-zips
        currentSteps = updateStep(currentSteps, 'child-zips', 'running');
        for (const c of manifest.courses) {
          const childSlug = c.slug;
          if (!childSlug) {
            throw { stepId: 'child-zips', message: 'courses 배열 내의 코스에 slug 필드가 없습니다.' };
          }
          const childZipFile = contents.file(`courses/${childSlug}.zip`);
          if (!childZipFile) {
            throw { stepId: 'child-zips', message: `courses/ 디렉토리 내에 하위 강좌 파일 'courses/${childSlug}.zip'이(가) 존재하지 않습니다.` };
          }
        }
        currentSteps = updateStep(currentSteps, 'child-zips', 'success');

        // Step 4: child-structure
        currentSteps = updateStep(currentSteps, 'child-structure', 'running');
        const parsedChildCourses: { slug: string; zipContents: JSZip }[] = [];
        for (const c of manifest.courses) {
          const childSlug = c.slug;
          const childZipFile = contents.file(`courses/${childSlug}.zip`)!;
          let childZipData: Blob;
          try {
            childZipData = await childZipFile.async('blob');
          } catch (e: any) {
            throw { stepId: 'child-structure', message: `하위 강좌 'courses/${childSlug}.zip' 데이터를 읽지 못했습니다: ${e.message}` };
          }
          const childZip = new JSZip();
          let childContents: JSZip;
          try {
            childContents = await childZip.loadAsync(childZipData);
          } catch (e: any) {
            throw { stepId: 'child-structure', message: `하위 강좌 'courses/${childSlug}.zip' 파일을 ZIP으로 파싱하지 못했습니다: ${e.message}` };
          }
          if (!childContents.file('config.json')) {
            throw { stepId: 'child-structure', message: `하위 강좌 'courses/${childSlug}.zip'의 루트에 config.json 파일이 누락되었습니다.` };
          }
          if (!childContents.file('wiki.md')) {
            throw { stepId: 'child-structure', message: `하위 강좌 'courses/${childSlug}.zip'의 루트에 wiki.md 파일이 누락되었습니다.` };
          }
          parsedChildCourses.push({ slug: childSlug, zipContents: childContents });
        }
        currentSteps = updateStep(currentSteps, 'child-structure', 'success');

        // Step 5: child-config-toc
        currentSteps = updateStep(currentSteps, 'child-config-toc', 'running');
        for (const p of parsedChildCourses) {
          const childSlug = p.slug;
          const childContents = p.zipContents;
          const configFile = childContents.file('config.json')!;
          const configText = await configFile.async('text');
          let configJson: any;
          try {
            configJson = JSON.parse(configText);
          } catch (e: any) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 config.json JSON 파싱 오류: ${e.message}` };
          }

          if (!configJson.cards || !Array.isArray(configJson.cards) || configJson.cards.length === 0) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 config.json 내에 cards 배열이 누락되었거나 비어있습니다.` };
          }
          if (!configJson.toc || !Array.isArray(configJson.toc)) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 config.json 내에 toc(목차) 트리 배열이 없습니다.` };
          }

          const collectedFilenames: string[] = [];
          const tocValidation = validateTocRecursive(configJson.toc, `${childSlug}.toc`, collectedFilenames);
          if (!tocValidation.valid) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}' 목차 구조 검증 오류: ${tocValidation.error}` };
          }

          const cardsSet = new Set<string>(configJson.cards);
          if (cardsSet.size !== configJson.cards.length) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}' config.json의 cards에 중복된 파일명이 존재합니다.` };
          }

          const collectedSet = new Set(collectedFilenames);
          if (collectedSet.size !== collectedFilenames.length) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 TOC 내에 중복된 filename이 존재합니다.` };
          }

          if (cardsSet.size !== collectedSet.size) {
            throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 cards 개수(${cardsSet.size})와 toc의 filename 개수(${collectedSet.size})가 일치하지 않습니다.` };
          }

          const actualCardFiles = new Set<string>();
          childContents.forEach((relativePath, fileEntry) => {
            if (relativePath.startsWith('cards/') && !fileEntry.dir) {
              actualCardFiles.add(relativePath.substring('cards/'.length));
            }
          });

          for (const card of configJson.cards) {
            if (!collectedSet.has(card)) {
              throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 cards 배열에 있는 '${card}' 파일이 toc에 정의되어 있지 않습니다.` };
            }
            if (!actualCardFiles.has(card)) {
              throw { stepId: 'child-config-toc', message: `하위 강좌 '${childSlug}'의 cards/ 폴더 내에 '${card}' 파일이 실재하지 않습니다.` };
            }
          }
        }
        currentSteps = updateStep(currentSteps, 'child-config-toc', 'success');

      } else {
        // --- 단일 강좌 검증 흐름 ---
        // Step 3: package-structure
        currentSteps = updateStep(currentSteps, 'package-structure', 'running');
        if (!contents.file('config.json')) {
          throw { stepId: 'package-structure', message: '루트 경로에 config.json 파일이 누락되었습니다.' };
        }
        if (!contents.file('wiki.md')) {
          throw { stepId: 'package-structure', message: '루트 경로에 wiki.md 파일이 누락되었습니다.' };
        }
        currentSteps = updateStep(currentSteps, 'package-structure', 'success');

        // Step 4: package-config-toc
        currentSteps = updateStep(currentSteps, 'package-config-toc', 'running');
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
        currentSteps = updateStep(currentSteps, 'package-config-toc', 'success');
      }

      setIsValidated(true);
    } catch (err: any) {
      console.error('Validation failed:', {
        message: err?.message,
        stepId: err?.stepId,
        stack: err?.stack,
        raw: err
      });
      if (err.stepId) {
        updateStep(validationSteps, err.stepId, 'failed', err.message);
        const failedIdx = validationSteps.findIndex(s => s.id === err.stepId);
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
    setCurrentStep(isEnglish ? 'Registering integrated package data...' : '통합 패키지 데이터 등록 중...');

    try {
      setProgressPercent(30);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/packages/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = isEnglish ? 'An error occurred while registering the package.' : '패키지 등록 중 오류가 발생했습니다.';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      const packageId = result.packageId;
      setProgressPercent(70);
      setCurrentStep(isEnglish ? 'Processing auto-enrollment...' : '자동 수강 신청 처리 중...');

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
      setCurrentStep(isEnglish ? 'All course packages have been successfully registered!' : '모든 강좌 패키지가 성공적으로 등록되었습니다!');
      
      setTimeout(() => {
        setIsProcessing(false);
        router.push('/courses/manage');
      }, 1500);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('[AdminCoursesUpload] Error during upload:', error);
      setProcessError(error.message || (isEnglish ? 'An error occurred during registration.' : '등록 중 에러가 발생했습니다.'));
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
                <h3 className="text-xl font-bold tracking-tight">
                  {isEnglish ? 'Registering integrated bundle...' : '통합 번들 등록 중'}
                </h3>
                <p className="text-sm text-slate-400">
                  {isEnglish ? 'Do not close the browser window until completion to prevent data corruption.' : '데이터가 손상되지 않도록 완료 시까지 브라우저 창을 닫지 마세요.'}
                </p>
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
              {isEnglish ? 'Upload Course Bundle File' : '강좌 번들 파일 업로드'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isEnglish ? 'Batch validates and registers the manifest and course files inside the ZIP file.' : 'ZIP 파일안의 매니페스트와 강좌 파일들을 일괄 검증 및 등록합니다.'}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open('/courses/manage/upload/guide', '_blank')}
          className="border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Info className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
          {isEnglish ? 'Structure & Migration Guide' : '구조 및 마이그레이션 가이드'}
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
                {isEnglish ? 'Upload Integrated ZIP Bundle' : '통합 번들 ZIP 업로드'}
              </CardTitle>
              <CardDescription>
                {isEnglish ? (
                  <>Drag and drop a single ZIP file (.zip) containing <code>package-manifest.json</code> and <code>courses/</code> folder.</>
                ) : (
                  <><code>package-manifest.json</code>과 <code>courses/</code> 폴더가 포함된 단일 ZIP 파일(.zip)을 드래그 앤 드롭하세요.</>
                )}
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
                    {isEnglish ? 'Drop the integrated ZIP bundle file here' : '통합 ZIP 번들 파일을 이곳에 드롭하세요'}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isEnglish ? 'Or click to select a file from file explorer.' : '또는 파일 탐색기에서 파일을 선택하려면 클릭하세요.'}
                  </p>
                  <Button variant="secondary" size="sm" className="pointer-events-none text-xs">
                    {isEnglish ? 'Browse File' : '파일 찾아보기'}
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
                          {isEnglish ? `File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : `파일 크기: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReset}
                      className="text-xs text-zinc-600 border-zinc-300 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {isEnglish ? 'Select Another File' : '다른 파일 선택'}
                    </Button>
                  </div>

                  {manifestInfo && (
                    <div className="border-t pt-4 space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">
                        {isEnglish ? '[Manifest Info Analysis Result]' : '[매니페스트 정보 분석 결과]'}
                      </Label>
                      <div className="text-xs space-y-1 bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <div className="flex gap-2">
                          <span className="font-semibold text-zinc-500 shrink-0">
                            {isEnglish ? 'Package Name:' : '통합 패키지명:'}
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{manifestInfo.title}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-zinc-500 shrink-0">
                            {isEnglish ? 'Package Slug:' : '패키지 슬러그:'}
                          </span>
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">{manifestInfo.slug}</span>
                        </div>
                        {manifestInfo.bundlerProtocolVersion && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">
                              {isEnglish ? 'Protocol Version:' : '프로토콜 버전:'}
                            </span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">{manifestInfo.bundlerProtocolVersion}</span>
                          </div>
                        )}
                        {manifestInfo.targetAge && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">
                              {isEnglish ? 'Target Age:' : '대상 연령대:'}
                            </span>
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {isEnglish ? (
                                manifestInfo.targetAge === 'all' ? 'All Ages' : `${manifestInfo.targetAge} years`
                              ) : (
                                manifestInfo.targetAge === 'all' ? '전연령' : `${manifestInfo.targetAge}세`
                              )}
                            </span>
                          </div>
                        )}
                        {manifestInfo.category && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-zinc-500 shrink-0">
                              {isEnglish ? 'Category:' : '카테고리:'}
                            </span>
                            <span className="text-zinc-700 dark:text-zinc-300">{manifestInfo.category}</span>
                          </div>
                        )}
                        {manifestInfo.author && (
                          <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                            <div className="flex gap-2">
                              <span className="font-semibold text-zinc-500 shrink-0">
                                {isEnglish ? 'Author:' : '작성자:'}
                              </span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{manifestInfo.author.nickname}</span>
                            </div>
                            {manifestInfo.author.email && (
                              <div className="flex gap-2">
                                <span className="font-semibold text-zinc-500 shrink-0">
                                  {isEnglish ? 'Email:' : '이메일:'}
                                </span>
                                <span className="text-zinc-700 dark:text-zinc-300">{manifestInfo.author.email}</span>
                              </div>
                            )}
                            {manifestInfo.author.website && (
                              <div className="flex gap-2">
                                <span className="font-semibold text-zinc-500 shrink-0">
                                  {isEnglish ? 'Homepage:' : '홈페이지:'}
                                </span>
                                <a href={manifestInfo.author.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                  {manifestInfo.author.website}
                                </a>
                              </div>
                            )}
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
                    {isEnglish ? 'Course Bundle Auto-Generator (Open Tutorials Bundler)' : '강좌 번들 자동 생성기 (Open Tutorials Bundler)'}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isEnglish ? (
                      'Using the AI Agent, you can easily automate ZIP packaging that meets the bundle specifications. Download templates and build scripts from the official GitHub repository below to build your course.'
                    ) : (
                      'AI Agent 를 사용하면 번들 규격에 맞는 ZIP 파일 패키징을 손쉽게 자동화할 수 있습니다. 아래 공식 GitHub 리포지토리에서 템플릿과 빌드 스크립트를 다운로드하여 강좌를 제작하세요.'
                    )}
                  </p>
                  <div className="pt-1.5 flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://github.com/godstale/OpenTutorials-Bundler', '_blank')}
                      className="text-xs h-8 border-emerald-200 hover:bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-950 dark:hover:bg-emerald-950/20"
                    >
                      {isEnglish ? 'Go to GitHub Repository' : 'GitHub 리포지토리 바로가기'}
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
                {isEnglish ? 'Bundle Pre-validation' : '번들 사전 유효성 검증'}
              </CardTitle>
              <CardDescription>
                {isEnglish ? 'Instantly validates package integrity in the browser before submitting the integrated bundle.' : '통합 번들을 제출하기 전 브라우저단에서 패키지 정합성을 즉시 검증합니다.'}
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
                          {getStepLabel(step.id, isEnglish)}
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
                  {isEnglish ? 'Analyzing file structure inside bundle...' : '번들 내부 파일 구조 분석 중...'}
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
                  <span className="font-bold leading-relaxed">
                    {isEnglish ? 'Pre-validation successful! Ready to register to the server.' : '사전 검증 성공! 서버에 등록할 준비가 되었습니다.'}
                  </span>
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
          {isEnglish ? 'Cancel' : '취소'}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isProcessing || !isValidated || !selectedFile}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm px-6"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEnglish ? 'Uploading...' : '업로드 진행 중...'}
            </>
          ) : (
            isEnglish ? 'Register Course' : '강좌 등록'
          )}
        </Button>
      </div>

    </div>
  );
}

export default function UploadPage() {
  const { t, language } = useLanguage();
  const isEnglish = language === 'en';
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-center">{isEnglish ? 'Loading...' : '로딩 중...'}</div>}>
      <UploadForm />
    </Suspense>
  );
}
