'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, FileArchive, Layers } from 'lucide-react';

export default function MigrationGuidePage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()} 
          className="border-zinc-300 dark:border-zinc-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            마이그레이션 및 번들 구조 가이드
          </h2>
          <p className="text-muted-foreground mt-2">
            플랫폼에 성공적으로 강좌를 등록하기 위한 통합 번들 ZIP 구조와 필수 정합성 규칙을 설명합니다.
          </p>
        </div>
      </div>

      {/* Manual Instructions (Migration Guide) */}
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-950">
        <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            통합 번들 ZIP 파일 구조 및 마이그레이션 안내
          </CardTitle>
          <CardDescription>
            하위 강좌 및 매니페스트 파일의 올바른 규격 설정 방법
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-6">
          <div className="space-y-3">
            <p className="font-bold text-zinc-950 dark:text-zinc-50 text-base">1. 파일 트리 구조</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              업로드할 ZIP 파일의 루트와 하위 경로는 반드시 아래와 같은 형태로 정해진 파일들을 포함해야 합니다.
            </p>
            <pre className="p-4 bg-zinc-900 text-zinc-200 dark:bg-black rounded-lg text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed border border-zinc-800">
{`[통합 번들 ZIP 파일]
├── package-manifest.json           # 통합 강좌 및 패키지 메타데이터 (필수)
├── thumbnail.png                   # 통합 강좌 대표 썸네일 이미지 (선택, package-manifest.json에 매핑)
└── courses/                         # 하위 강좌 ZIP 디렉토리 (필수)
    ├── marketing-basic-1.zip       # 하위 강좌 1 (slug와 ZIP 파일명이 정확히 일치)
    └── marketing-strategy-2.zip    # 하위 강좌 2 (slug와 ZIP 파일명이 정확히 일치)`}
            </pre>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <p className="font-bold text-zinc-950 dark:text-zinc-50 text-base">2. package-manifest.json 샘플</p>
              <pre className="p-4 bg-zinc-900 text-zinc-200 dark:bg-black rounded-lg text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed border border-zinc-800 max-h-[300px]">
{`{
  "title": "마케팅 에이전트 마스터",
  "slug": "marketing-integrated-course",
  "description": "통합 마케팅 강좌입니다.",
  "thumbnail": "./thumbnail.png",
  "published": true,
  "sequential_play": false,
  "force_checkpoint": false,
  "version": "1.0.0",
  "changelog": "최초 릴리즈",
  "bundler_protocol_version": "1.0.0",
  "target_age": "성인",
  "category": "Marketing",
  "courses": [
    { "slug": "marketing-basic-1" },
    { "slug": "marketing-strategy-2" }
  ]
}`}
              </pre>
            </div>
            
            <div className="space-y-3 flex flex-col">
              <p className="font-bold text-zinc-950 dark:text-zinc-50 text-base">3. 하위 강좌 ZIP 구조 명세</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                각 하위 강좌 ZIP 파일(예: <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">marketing-basic-1.zip</code>) 내부에는 반드시 아래 파일들이 루트에 있어야 합니다.
              </p>
              <pre className="p-4 bg-zinc-900 text-zinc-200 dark:bg-black rounded-lg text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed border border-zinc-800 flex-1">
{`[하위 강좌 ZIP 파일]
├── config.json                     # 하위 강좌 메타 및 목차(TOC) (필수)
├── wiki.md                         # AI 튜터 지식베이스용 문서 (필수)
└── cards/                          # 강의 마크다운 카드 목록 (필수)
    ├── 01_intro.md
    └── 02_practice.md`}
              </pre>
            </div>
          </div>

          <div className="p-5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm space-y-2">
            <p className="font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              🔍 필수 유효성 검증 규칙 (중요):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
              <li>
                <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">package-manifest.json</code>에 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">bundler_protocol_version</code> (예: &quot;1.0.0&quot;), <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">target_age</code>, <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">category</code> 필드가 필수적으로 포함되어야 합니다.
              </li>
              <li>
                <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">config.json</code>의 <code>cards</code> 배열에 있는 모든 파일은 실제로 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">cards/</code> 디렉토리 안에 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">.md</code> 또는 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">.mdx</code>로 존재해야 합니다.
              </li>
              <li>
                TOC 목차(<code>toc</code>) 내 최하단 강의 노드의 <code>filename</code>들은 <code>cards</code> 목록과 1:1로 정확하게 일치해야 합니다.
              </li>
              <li>
                TOC 노드 제목이 파일명과 완전히 같거나, 설명이 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded">&quot;강좌 상세 카드를 확인하세요.&quot;</code>와 같은 기본 설명인 경우 검증이 실패합니다.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
