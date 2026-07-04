---
description: TypeScript/React/Next.js 코딩 컨벤션. 코드 작성 시 항상 적용.
pattern: "**/*.{ts,tsx}"
---

# Coding Standards

## 1. TypeScript

- `any` 사용 금지. 모르면 `unknown` 사용 후 타입 가드 적용.
- 공유 타입은 `lib/types/` 에 정의. 컴포넌트 로컬 타입은 해당 파일 상단에 정의.
- `interface` 우선, union type이 필요할 때만 `type` 사용.
- 함수 반환 타입을 명시적으로 선언 (특히 Server Actions, API handlers).

## 2. React 컴포넌트

- 함수형 컴포넌트만 사용. `React.FC` 타입 사용하지 않음.
- Props 타입은 컴포넌트 파일 상단에 `interface XxxProps` 로 선언.
- `'use client'` 는 꼭 필요한 컴포넌트에만. 기본은 Server Component.
- 이벤트 핸들러 함수명: `handle + Event` (예: `handleSubmit`, `handleClick`).

```typescript
// Good
interface FeatureCardProps {
  feature: Feature;
  onSelect: (id: string) => void;
}

export function FeatureCard({ feature, onSelect }: FeatureCardProps) { ... }
```

## 3. 파일/폴더 명명

- 컴포넌트 파일: `PascalCase.tsx` (예: `FeatureCard.tsx`)
- 유틸리티/훅: `kebab-case.ts` (예: `use-features.ts`)
- Next.js 라우트 파일: `page.tsx`, `layout.tsx`, `route.ts` (Next.js 규칙 따름)
- 상수/타입 파일: `kebab-case.ts`

## 4. Import 순서

```typescript
// 1. React / Next.js
import { Suspense } from 'react';
import Link from 'next/link';
// 2. 외부 라이브러리
import { clsx } from 'clsx';
// 3. 내부 절대 경로 (@/)
import { cn } from '@/lib/utils';
import type { Feature } from '@/lib/types';
// 4. 상대 경로
import { FeatureCard } from './FeatureCard';
```

## 5. 에러 처리

- Server Actions: `try/catch` 후 `{ error: string } | { data: T }` 형태로 반환.
- Client: `toast` 또는 에러 state로 사용자에게 표시.
- console.error는 서버 사이드에서만. 클라이언트는 사용자 피드백으로 대체.

## 6. 더미 데이터 (Phase 1)

- `lib/dummy-data/` 에 위치. 파일명: `dummy-features.ts`, `dummy-users.ts` 등.
- 실제 API 타입과 동일한 인터페이스 사용. 주석으로 `// TODO: Replace with API call` 표시.

```typescript
// lib/dummy-data/dummy-features.ts
import type { Feature } from '@/lib/types';

// TODO: Replace with API call to /api/features
export const dummyFeatures: Feature[] = [ ... ];
```

## 7. 주석

- 코드가 명확하면 주석 불필요.
- WHY가 불명확한 경우만 짧게 추가. WHAT을 설명하는 주석은 작성하지 않음.
