---
description: API Route Handler 및 Local DB, AI Agent 연동 규칙. API 관련 코드 작성 시 적용.
pattern: "**/{app/api,lib/supabase,lib/api}/**/*"
---

# API Conventions

## 1. Local DB API Route Handler
- `/api/local-db` 라우트는 브라우저의 Mock Client 요청을 `db.json`으로 중계합니다.
- 서버 사이드 코드나 API Route Handler에서는 `lib/supabase/server.ts`의 `createClient`를 활용하여 모킹된 Supabase 메서드를 호출합니다.

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('courses').select('*');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
```

## 2. AI Agent API 연동
- 로컬 에이전트 및 AI 튜터 통신은 `/api/agent` 엔드포인트를 거치며, Hermes Agent 또는 외부 AI API와의 연동을 추상화하여 작동합니다.

## 3. 응답 형식 규격
- **성공 응답**: `NextResponse.json({ data: result })`
- **에러 응답**: `NextResponse.json({ error: '메시지' }, { status: 400 })`
