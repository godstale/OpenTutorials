---
description: Next.js App Router 아키텍처 패턴. 라우트/컴포넌트 구조 설계 시 적용.
pattern: "app/**/*"
---

# Architecture — Next.js App Router

## 1. Route Group 구조

```
app/
  (user)/       # 사용자 포털 — pennypress.com
  (admin)/      # 관리자 포털 — admin.pennypress.com (Admin 역할 필요)
  auth/         # Supabase 인증 콜백 (공개 접근 가능)
  api/          # Route Handlers
```

- `(user)` 와 `(admin)` 은 각자 별도의 `layout.tsx` 를 가짐.
- Route Group은 URL 경로에 포함되지 않음: `(user)/dashboard/page.tsx` → `/dashboard`

## 2. Server vs Client Component

**기본값: Server Component**
```typescript
// page.tsx, layout.tsx — Server Component (기본)
// 데이터 패치, DB 조회, 민감 환경변수 접근
```

**Client Component 필요 조건:**
- 이벤트 핸들러 (onClick, onChange 등)
- useState, useEffect 등 React hooks
- 브라우저 API 접근

```typescript
'use client'; // 파일 최상단에만 추가

// 클라이언트 전용: 인터랙티브 컴포넌트
```

**규칙:** `'use client'` 범위를 최대한 좁게. 트리 하단의 Leaf 컴포넌트에만 적용.

## 3. 데이터 패칭 패턴

### Phase 1 (더미 데이터)
```typescript
// page.tsx (Server Component)
import { dummyFeatures } from '@/lib/dummy-data/dummy-features';

export default async function FeaturesPage() {
  const features = dummyFeatures; // TODO: Replace with DB query
  return <FeatureList features={features} />;
}
```

### Phase 2+ (실제 DB)
```typescript
// page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export default async function FeaturesPage() {
  const supabase = await createClient();
  const { data: features } = await supabase.from('features').select('*');
  return <FeatureList features={features ?? []} />;
}
```

## 4. 미들웨어 (middleware.ts)

루트의 `middleware.ts` 가 처리하는 것:
1. Supabase 세션 갱신 (모든 요청)
2. 비로그인 사용자 → `/auth/login` 리다이렉트 (보호된 라우트)
3. Admin 아닌 사용자 → `/dashboard` 리다이렉트 (admin 라우트)

```typescript
// Protected routes 패턴
const protectedPaths = ['/dashboard', '/features', '/my-features', '/billing', '/settings'];
const adminPaths = ['/admin'];
```

## 5. 레이아웃 계층

```
app/
  layout.tsx                    # 루트: HTML, ThemeProvider, 전역 폰트
    (user)/
      layout.tsx                # 사용자 포털: Header + Sidebar + Main
        dashboard/page.tsx
        features/page.tsx
    (admin)/
      layout.tsx                # Admin 포털: Admin Header + Admin Sidebar + Main
        dashboard/page.tsx
```

## 6. API Route Handlers

```typescript
// app/api/features/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('features').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

## 7. SSE (Phase 2)

```typescript
// app/api/sse/route.ts — Server-Sent Events
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      // ... event emission logic
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
}
```

## 8. 환경변수

| 변수 | 용도 | 위치 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (공개) | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (공개) | `.env.local` |
| `ADMIN_EMAILS` | Admin 이메일 목록 (콤마 구분) | `.env.local` |
| `AGENT_WORKER_URL` | Hermes Agent 서버 URL (Phase 2) | `.env.local` |
| `AGENT_WORKER_API_KEY` | Agent Worker API 키 (Phase 2) | `.env.local` |
