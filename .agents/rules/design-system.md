---
description: Shadcn UI + Tailwind CSS 디자인 시스템 규칙. UI 컴포넌트 작성 및 스타일링 시 적용.
pattern: "**/*.{tsx,css}"
---

# Design System

상세 디자인 가이드는 프로젝트 루트의 `DESIGN.md` 를 참조하십시오.

## 1. Shadcn UI 컴포넌트 사용 규칙
- 기본 UI는 Shadcn 컴포넌트를 우선적으로 사용합니다 (`components/ui/`).
- Shadcn 원본 코드를 직접 수정하는 대신, 필요한 경우 Wrapper 컴포넌트를 생성하여 커스터마이징합니다.

## 2. 색상 및 테마 규칙
- `app/globals.css` 에 정의된 CSS 변수 기반 테마를 사용합니다.
- 하드코딩된 색상 클래스(예: `text-blue-500`)의 사용을 지양하고 Semantic 색상 클래스(`text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`)를 사용합니다.

## 3. 고정 레이아웃 규격
- **최소 지원 해상도**: 1024px (`min-w-[1024px]`을 루트 레이아웃에 적용)
- **최대 콘텐츠 폭**: `max-w-7xl mx-auto px-6`
- **사이드바 너비**: `w-64` (256px) 고정
- **헤더 높이**: `h-16` (64px) 고정

## 4. 아이콘
- `lucide-react` 아이콘만을 사용합니다.
- 기본 크기: `h-4 w-4` / 강조: `h-5 w-5` / 제목 및 헤더: `h-6 w-6`
