---
description: TypeScript/React/Next.js 코딩 컨벤션. 코드 작성 시 항상 적용.
pattern: "**/*.{ts,tsx}"
---

# Coding Standards

## 1. TypeScript
- `any` 사용을 금지하며, 추론이 안 될 경우 `unknown`을 적용하고 타입 가드를 이용합니다.
- 공유 타입은 `lib/types/` 에 선언합니다.
- 인터페이스(`interface`) 작성을 우선하며, 필요한 경우에만 `type`을 사용합니다.
- 서버 액션 및 API 핸들러의 함수 반환 타입을 명시적으로 작성합니다.

## 2. React 컴포넌트
- 함수형 컴포넌트를 사용하고, `React.FC` 타입은 사용하지 않습니다.
- Props 타입은 파일 상단에 `interface XxxProps`로 선언합니다.
- 이벤트 핸들러 명명 규칙: `handle + Event` (예: `handleSubmit`, `handleClick`).

## 3. 파일/폴더 명명
- 컴포넌트: `PascalCase.tsx`
- 유틸리티/훅: `kebab-case.ts`
- 라우트 파일: `page.tsx`, `layout.tsx`, `route.ts` 등 Next.js의 고유 규칙 준수.

## 4. Import 순서
1. React / Next.js 관련 패키지
2. 외부 라이브러리 (clsx 등)
3. 내부 절대 경로 (`@/components`, `@/lib` 등)
4. 상대 경로 (`./FeatureCard` 등)
