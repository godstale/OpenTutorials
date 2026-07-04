---
description: Supabase, API Route Handler, Agent Worker 연동 패턴. API 관련 코드 작성 시 적용.
pattern: "**/{api,lib/supabase}/**/*"
---

# API Conventions

## 1. Supabase 클라이언트

### Server Side (Server Component, Route Handler, Server Action)
```typescript
import { createClient } from '@/lib/supabase/server';

// Route Handler 예시
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

### Client Side (Client Component)
```typescript
import { createClient } from '@/lib/supabase/client';

// useEffect 또는 이벤트 핸들러에서
const supabase = createClient();
```

## 2. 인증 체크 패턴

```typescript
// Server Component 내 현재 사용자 가져오기
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) redirect('/auth/login');
```

## 3. Admin 권한 체크

```typescript
// lib/utils/auth.ts
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  return adminEmails.includes(email);
}
```

## 4. Supabase 쿼리 패턴

```typescript
// 목록 조회
const { data, error } = await supabase
  .from('features')
  .select('*')
  .order('purchase_count', { ascending: false });

// 단건 조회
const { data, error } = await supabase
  .from('features')
  .select('*')
  .eq('id', id)
  .single();

// 에러 처리는 항상
if (error) throw new Error(error.message);
```

## 5. Route Handler 응답 형식

```typescript
// 성공
return NextResponse.json({ data: result });

// 에러
return NextResponse.json({ error: '메시지' }, { status: 400 });

// 인증 필요
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

## 6. Agent Worker API (Phase 2)

Agent Worker와의 통신은 `lib/api/agent-worker.ts` 를 통해 추상화:

```typescript
// lib/api/agent-worker.ts
const AGENT_WORKER_URL = process.env.AGENT_WORKER_URL;
const AGENT_WORKER_API_KEY = process.env.AGENT_WORKER_API_KEY;

export async function triggerFeature(featureId: string, params: Record<string, unknown>) {
  const res = await fetch(`${AGENT_WORKER_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AGENT_WORKER_API_KEY ?? '',
    },
    body: JSON.stringify({ feature_id: featureId, parameters: params }),
  });
  if (!res.ok) throw new Error(`Agent Worker error: ${res.status}`);
  return res.json();
}
```

## 7. SSE 클라이언트 패턴 (Phase 2)

```typescript
// Client Component에서 SSE 구독
'use client';
import { useEffect, useState } from 'react';

export function useAgentSSE(taskId: string) {
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    const source = new EventSource(`/api/sse?task_id=${taskId}`);
    source.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.status);
      if (data.status === 'completed' || data.status === 'failed') {
        source.close();
      }
    };
    return () => source.close();
  }, [taskId]);

  return status;
}
```

## 8. 데이터베이스 테이블 명명

- 테이블: `snake_case` 복수형 (예: `features`, `user_subscriptions`, `ai_worker_instances`)
- 컬럼: `snake_case` (예: `created_at`, `purchase_count`, `action_type`)
- FK: `<table_singular>_id` (예: `user_id`, `feature_id`)
