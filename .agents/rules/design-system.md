---
description: Shadcn UI + Tailwind CSS 디자인 시스템 규칙. UI 컴포넌트 작성 및 스타일링 시 적용.
pattern: "**/*.{tsx,css}"
---

# Design System

> 상세 디자인 가이드는 프로젝트 루트의 `DESIGN.md` 를 참조하세요.

## 1. Shadcn UI 컴포넌트

- 기본 UI는 Shadcn 컴포넌트 우선 사용 (`components/ui/` 에 위치).
- 새 Shadcn 컴포넌트 추가: `pnpm dlx shadcn@latest add <component>`
- Shadcn 컴포넌트를 직접 수정하지 않음. Wrapper 컴포넌트 생성으로 커스터마이징.

```typescript
// Bad: Shadcn 컴포넌트 직접 수정
// components/ui/button.tsx 파일 수정 X

// Good: Wrapper 컴포넌트 생성
// components/features/FeatureActionButton.tsx
import { Button } from '@/components/ui/button';
export function FeatureActionButton({ ... }) {
  return <Button variant="default" size="sm" className="..."> ... </Button>
}
```

## 2. 색상 & 테마

- CSS 변수 기반 테마 사용 (`app/globals.css` 에 정의).
- 하드코딩된 색상 클래스 사용 금지 (`text-blue-500` X).
- Semantic 색상 클래스 사용: `text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`.

```typescript
// Bad
<p className="text-gray-500">설명 텍스트</p>

// Good
<p className="text-muted-foreground">설명 텍스트</p>
```

## 3. 레이아웃

- 최소 지원 폭: 1024px. `min-w-[1024px]` 을 루트 레이아웃에 설정.
- 최대 콘텐츠 폭: `max-w-7xl mx-auto px-6`.
- 사이드바 폭: `w-64` (256px) 고정.
- 헤더 높이: `h-16` (64px) 고정.

## 4. 카드 컴포넌트

기능 카드 등 카드 형태의 UI는 Shadcn `Card` 컴포넌트 사용:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
```

## 5. 간격 규칙

- 섹션 간격: `gap-6` 또는 `space-y-6`
- 카드 내부 패딩: `p-4` 또는 `p-6`
- 아이콘 + 텍스트 간격: `gap-2`

## 6. 아이콘

- `lucide-react` 라이브러리만 사용.
- 아이콘 크기: `h-4 w-4` (기본), `h-5 w-5` (강조), `h-6 w-6` (헤더/제목)

```typescript
import { LayoutDashboard, Search, Settings } from 'lucide-react';
```

## 7. 다크 모드

- `next-themes` 로 구현. `ThemeProvider` 가 이미 `app/layout.tsx` 에 포함.
- CSS 변수가 자동으로 다크 모드 지원. 별도 `dark:` 클래스 최소화.

## 8. 모달/팝업

- Shadcn `Dialog` 컴포넌트 사용.
- 기능 상세 팝업 등 큰 모달: `max-w-2xl`.

## 9. 폼

- Shadcn `Form` + `react-hook-form` + `zod` 조합 사용 (Phase 1부터).
- Label + Input 쌍은 `FormField` 로 감쌈.
