---
title: "PennyPress: 강좌 Learn 페이지 '강좌를 찾을 수 없습니다.' 버그 완전 해결기 — RLS·캐시·URL 인코딩 3중 버그"
date: "2026-06-27"
tags: ["bugfix", "nextjs16", "supabase", "rls", "vercel-cache", "url-encoding", "ppr", "debugging"]
---

# PennyPress: 강좌 Learn 페이지 '강좌를 찾을 수 없습니다.' 버그 완전 해결기

> **한 줄 요약**: 증상은 동일했지만 원인이 3개 겹쳐 있었다.  
> Supabase RLS + Next.js 16 `cacheComponents` 무한 캐시 + 비-ASCII URL 파라미터 미디코딩.  
> 각 원인을 하나씩 벗겨 나가는 데 총 8개 PR, 수 시간이 소요됐다.

---

## 1. 증상

배포 URL(`https://pennypress-one.vercel.app`)에서 두 가지 버그가 동시에 보고됨:

**버그 A — 어드민 강좌 미리보기**  
`/admin/courses` → 미리보기 버튼 클릭  
→ `/learn/아두이노로-배우는-사물-인터넷-—-chapter-01-02`  
→ "강좌를 찾을 수 없습니다." 표시

**버그 B — 사용자 강좌 목록 → 상세 페이지**  
`/courses` (강좌 목록) → 수강하기 버튼  
→ `/learn/아두이노로-배우는-사물-인터넷-—-chapter-01-02`  
→ 동일하게 "강좌를 찾을 수 없습니다." 표시

Supabase DB에는 해당 강좌가 `published: true`로 정상 존재하는 것이 확인됨.

---

## 2. 초기 코드 파악

### 2.1 관련 파일 구조

```
app/(user)/
  learn/[slug]/
    page.tsx        ← 서버 컴포넌트 (Supabase 쿼리)
    client.tsx      ← 클라이언트 컴포넌트 (UI 렌더링)
  courses/
    page.tsx        ← 강좌 목록 (API 호출)
    [slug]/
      page.tsx      ← 강좌 상세 서버 컴포넌트
      client.tsx    ← 강좌 상세 클라이언트 컴포넌트

app/api/
  courses/route.ts  ← 공개 강좌 목록 API
  admin/courses/    ← 어드민 강좌 관리 API
```

### 2.2 초기 코드의 문제점 (수정 전)

`learn/[slug]/page.tsx`의 초기 코드:
```typescript
// 수정 전 — 문제 있는 코드
const supabase = await createClient(); // anon key + 쿠키 세션
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('slug', slug)
  .single();
```

`app/api/courses/route.ts`의 초기 코드:
```typescript
// 수정 전 — 문제 있는 코드
const supabase = await createClient(); // anon key
const { data: courses, error } = await supabase
  .from('courses')
  .select('*')
  .eq('published', true);
```

### 2.3 Supabase 미들웨어 구조 이해

프로젝트의 미들웨어 파일이 `middleware.ts`가 아닌 `proxy.ts`임을 확인:
- 비인증 사용자 → `/auth/login` 리다이렉트
- 인증 사용자라도 `createClient()`는 anon key + 쿠키 세션 기반 → RLS 적용 받음

---

## 3. 원인 1: Supabase RLS 정책 불완전

### 3.1 발견

마이그레이션 파일 `supabase/migrations/20260626_courses.sql` 확인:

```sql
-- 문제가 된 정책
CREATE POLICY "Anyone can read published courses"
  ON courses FOR SELECT TO authenticated  -- ← anon이 빠짐!
  USING (published = true);
```

`TO authenticated`만 허용하고 `TO anon`이 없어서, 인증된 사용자라도  
`createClient()`(anon key 사용)로 쿼리하면 RLS에 걸려 0 rows 반환.

### 3.2 수정: createAdminClient() 전환

`lib/supabase/admin.ts`에 이미 존재하는 `createAdminClient()`:
```typescript
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials are not configured');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

service_role_key를 사용하므로 RLS를 완전히 우회함.

세 파일을 모두 수정:
- `app/(user)/learn/[slug]/page.tsx`: `createAdminClient()` + published 필터 없음 (어드민 미리보기 포함)
- `app/(user)/courses/[slug]/page.tsx`: `createAdminClient()` + `.eq('published', true)`
- `app/api/courses/route.ts`: `createAdminClient()` + `.eq('published', true)`

### 3.3 RLS 마이그레이션 파일 작성

`supabase/migrations/20260628_courses_rls_fix.sql`:
```sql
DROP POLICY IF EXISTS "Anyone can read published courses" ON courses;
CREATE POLICY "Anyone can read published courses"
  ON courses FOR SELECT TO anon, authenticated  -- anon 추가
  USING (published = true);

DROP POLICY IF EXISTS "Admins can read all courses" ON courses;
CREATE POLICY "Admins can read all courses"
  ON courses FOR SELECT TO service_role
  USING (true);

-- course_cards, course_wiki도 anon 허용으로 수정
DROP POLICY IF EXISTS "Anyone can read course cards" ON course_cards;
CREATE POLICY "Anyone can read course cards"
  ON course_cards FOR SELECT TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read course wiki" ON course_wiki;
CREATE POLICY "Anyone can read course wiki"
  ON course_wiki FOR SELECT TO anon, authenticated;
```

### 3.4 supabase db push 오류들

**오류 1**: `CREATE POLICY "Public Access" already exists`  
원인: `20260627_courses_storage.sql`에서 스토리지 정책이 이미 수동 적용됨.  
수정: 해당 마이그레이션 파일에 `DROP POLICY IF EXISTS` 추가 (idempotent하게).

**오류 2**: `duplicate key value violates unique constraint "schema_migrations_pkey"` (version `20260627`)  
원인: `20260627_courses_storage.sql`과 새로 만든 `20260627_courses_rls_fix.sql`이 같은 타임스탬프 prefix를 가짐.  
수정: 새 파일을 `20260628_courses_rls_fix.sql`로 이름 변경.

### 3.5 결과 확인

DB push 성공 후 배포 (PR #22). 하지만 페이지는 **여전히 "강좌를 찾을 수 없습니다."** 표시.  
→ 추가 원인 존재 확인.

---

## 4. 원인 2: Vercel CDN + cacheComponents 무한 캐시

### 4.1 발견

응답 헤더 분석:
```
x-vercel-cache: HIT
x-nextjs-stale-time: 300
x-nextjs-prerender: 1
```

- `x-vercel-cache: HIT`: Vercel Edge CDN이 캐시에서 응답을 서비스 중
- `x-nextjs-stale-time: 300`: 300초(5분) stale-while-revalidate 캐시
- `x-nextjs-prerender: 1`: Next.js PPR(Partial Prerender) 페이지

RLS 수정 전에 "강좌를 찾을 수 없습니다."가 캐시됐고, 코드가 수정된 후에도 CDN이 캐시된 오류 응답을 계속 서비스 중.

### 4.2 next.config.ts 확인

```typescript
// 문제가 된 설정
const nextConfig: NextConfig = {
  cacheComponents: true,  // ← Next.js 16 컴포넌트 캐시 전역 활성화
  allowedDevOrigins: ['192.168.0.51', 'localhost'],
};
```

Next.js 16에서 `cacheComponents: true`는 서버 컴포넌트 렌더 결과를 캐시에 저장함.  
- 최초 렌더 "not found" → 캐시에 저장
- 코드 수정 후 재배포해도 캐시된 "not found"를 계속 서비스
- SWR 재검증이 실행되더라도 캐시된 결과를 반환하는 무한 루프

### 4.3 시도한 수정들 (모두 실패)

**시도 A: `connection()` 추가 (PR #23)**
```typescript
import { connection } from 'next/server';

async function LearnPageContent({ params }) {
  await connection(); // 동적 렌더링 강제 시도
  ...
}
```
결과: `x-vercel-cache: HIT` 지속. `connection()`은 동적 렌더링을 마킹하지만  
CDN 응답 캐시를 방지하지 못함.

**시도 B: `export const dynamic = 'force-dynamic'`**
```typescript
export const dynamic = 'force-dynamic';
```
빌드 오류:
```
Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`.
Please remove it.
```
`cacheComponents: true`와 `force-dynamic`은 Next.js 16에서 호환 불가.

**시도 C: `"use no cache"` 지시어**
```typescript
'use no cache';

import { Suspense } from 'react';
...
```
결과: 빌드는 성공하지만 페이지가 여전히 `◐ (Partial Prerender)` 상태.  
`"use no cache"`가 `Suspense` 경계와 함께 사용될 때 PPR을 막지 못함.

### 4.4 최종 수정: `cacheComponents: true` 제거 (PR #25)

```typescript
// next.config.ts 수정 후
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.51', 'localhost'],
};
```

빌드 결과 변화:
```
Before:  ◐ /learn/[slug]   (Partial Prerender — 캐시됨)
After:   ƒ /learn/[slug]   (Dynamic — 매 요청 서버 렌더링)
```

이제 CDN 캐시 없이 매 요청마다 서버에서 새로 렌더링.  
하지만 배포 후에도 **여전히 "강좌를 찾을 수 없습니다."** 표시.  
→ 세 번째 원인 존재 확인.

---

## 5. 진단 API로 DB 쿼리 자체 검증

페이지가 여전히 에러를 보임에 따라, DB 쿼리가 실제로 작동하는지 독립적으로 검증하기 위해 임시 API 엔드포인트 작성 (PR #24):

`app/api/debug-course/route.ts`:
```typescript
export async function GET(request: NextRequest) {
  await connection();
  const slug = request.nextUrl.searchParams.get('slug') || '';

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, slug, published')
    .eq('slug', slug)
    .single();

  const { data: allData } = await supabase.from('courses').select('slug');
  const allSlugs = (allData || []).map((r: any) => r.slug);

  return NextResponse.json({
    adminClientOk: true,
    requestedSlug: slug,
    queryResult: data,
    queryError: error,
    allSlugs,
    exactMatch: allSlugs.includes(slug),
  });
}
```

브라우저에서 직접 호출:
```javascript
const slug = '아두이노로-배우는-사물-인터넷-—-chapter-01-02';
await fetch(`/api/debug-course?slug=${encodeURIComponent(slug)}`);
```

결과:
```json
{
  "adminClientOk": true,
  "requestedSlug": "아두이노로-배우는-사물-인터넷-—-chapter-01-02",
  "queryResult": {
    "id": "6ac528fd-b744-4969-bfc2-4342ad438cbb",
    "title": "아두이노로 배우는 사물 인터넷 — Chapter 01-02",
    "slug": "아두이노로-배우는-사물-인터넷-—-chapter-01-02",
    "published": true
  },
  "queryError": null,
  "exactMatch": true
}
```

**결론**: `createAdminClient()`는 정상 작동하고, 동일한 slug로 쿼리하면 강좌가 정상 반환됨.  
즉, 서버 컴포넌트가 받는 `slug` 값이 DB의 slug와 다른 것임을 의미.

---

## 6. 루트 원인 3: Next.js 16 비-ASCII URL 파라미터 미디코딩

### 6.1 의심 및 진단

서버 컴포넌트(`learn/[slug]/page.tsx`)에서 `params.slug`로 받는 값이 실제로 무엇인지 확인하기 위해 에러 메시지에 직접 출력 (PR #26):

```tsx
// 임시 디버그 출력 추가
if (!dummy) {
  return (
    <div>
      강좌를 찾을 수 없습니다.
      [DEBUG slug="{slug}" len={slug.length}]
    </div>
  );
}
```

### 6.2 결정적 증거 발견

배포 후 페이지에 표시된 메시지:
```
강좌를 찾을 수 없습니다. [DEBUG slug="%EC%95%84%EB%91%90%EC%9D%B4%EB%85%B8%EB%A1%9C-%EB%B0%B0%EC%9A%B0%EB%8A%94-%EC%82%AC%EB%AC%BC-%EC%9D%B8%ED%84%B0%EB%84%B7-%E2%80%94-chapter-01-02" len=144]
```

- `params.slug` 값: URL 인코딩된 문자열 (`%EC%95%84...`)
- 길이: **144자** (URL 인코딩 형태)
- DB에 저장된 slug: `아두이노로-배우는-사물-인터넷-—-chapter-01-02` (길이 **≈30자**, 디코딩 유니코드)

### 6.3 원인 분석

URL `/learn/%EC%95%84%EB%91%90%EC%9D%B4%EB%85%B8%EB%A1%9C-...` 에서:

- **기대 동작** (Next.js 14 이전): `await params` → URL-decoded `아두이노로-배우는-...`
- **실제 동작** (Next.js 16.2.9): `await params` → raw URL-encoded `%EC%95%84%EB%91%90...`

Next.js 16에서 한국어·em-dash(`—`, U+2014) 등 비-ASCII 문자가 포함된 동적 경로 파라미터가 `await params`를 통해 **URL 디코딩 없이** 그대로 전달되는 동작 변화가 존재함.

슬러그 코드포인트 비교:
```
URL 내 파라미터:  %EC%95%84%EB%91%90...%E2%80%94-chapter-01-02  (len=144)
DB 저장 slug:     아(U+C544)두(U+B450)이(U+C774)...—(U+2014)-chapter-01-02  (len≈30)
```

`.eq('slug', slug)` 비교 시 `%EC%95%84...` ≠ `아두이노로...` → 0 rows 반환 → "not found"

### 6.4 수정 (PR #27)

`app/(user)/learn/[slug]/page.tsx`:
```typescript
// 수정 전
const { slug } = await params;

// 수정 후
const { slug: rawSlug } = await params;
const slug = decodeURIComponent(rawSlug);
```

`app/(user)/courses/[slug]/page.tsx` 동일하게 적용.

### 6.5 최종 확인

배포 후 브라우저에서 확인:
- `/learn/아두이노로-배우는-사물-인터넷-—-chapter-01-02` → 강좌 제목 및 AI 튜터 정상 표시
- 어드민 미리보기 버튼 → 동일 URL → 정상 동작
- `/courses` → 수강하기 버튼 → 정상 이동

---

## 7. 전체 수정 목록

| 파일 | 변경 내용 | 이유 |
|------|-----------|------|
| `app/(user)/learn/[slug]/page.tsx` | `createAdminClient()` + `connection()` + `decodeURIComponent(rawSlug)` | RLS 우회 + 동적 렌더링 + URL 디코딩 |
| `app/(user)/courses/[slug]/page.tsx` | 동일 + `.eq('published', true)` 유지 | 동일 |
| `app/api/courses/route.ts` | `createAdminClient()` + `connection()` | RLS 우회 + 캐시 방지 |
| `supabase/migrations/20260628_courses_rls_fix.sql` | RLS 정책 `TO anon, authenticated` 수정 | 공개 강좌 접근 허용 |
| `supabase/migrations/20260627_courses_storage.sql` | `DROP POLICY IF EXISTS` 추가 (idempotent) | db push 재실행 가능하게 |
| `next.config.ts` | `cacheComponents: true` 제거 | 컴포넌트 캐시 비활성화 |

---

## 8. PR 히스토리

| PR | 제목 | 결과 |
|----|------|------|
| #22 | `createAdminClient()` + RLS 마이그레이션 | DB 쿼리 수정. 캐시 문제로 여전히 오류 |
| #23 | `connection()` 추가 | CDN 캐시 미방지. 실패 |
| #24 | 임시 디버그 API `/api/debug-course` | DB 쿼리 독립 검증 — 쿼리 자체는 정상 확인 |
| #25 | `cacheComponents: true` 제거 | `ƒ Dynamic` 전환. 캐시 해결. 그러나 여전히 오류 |
| #26 | 임시 디버그: 에러 메시지에 slug 값 출력 | `len=144` 발견 → URL 인코딩 문제 특정 |
| #27 | `decodeURIComponent(rawSlug)` 적용 | **루트 원인 수정. 최종 해결** |
| #28 | 임시 디버그 API 제거 | 정리 |

---

## 9. 핵심 학습 사항

### 9.1 Next.js 16 비-ASCII 경로 파라미터는 URL 디코딩이 안 됨

Next.js 16(최소 16.2.9)에서 `await params`가 반환하는 동적 경로 파라미터 값이  
**비-ASCII 문자(한국어, em-dash 등)의 경우 URL 인코딩 상태(`%EC%95%84...`)로 반환**됨.

대응 방법:
```typescript
// 비-ASCII 문자가 URL에 포함될 수 있는 모든 동적 경로에 필수 적용
const { slug: rawSlug } = await params;
const slug = decodeURIComponent(rawSlug);
```

### 9.2 `cacheComponents: true`는 DB를 사용하는 페이지에 위험

`cacheComponents: true`는 서버 컴포넌트 렌더 결과를 캐시에 저장함.  
최초 렌더 결과(에러 포함)가 캐시에 올라가면, 코드가 수정되어 재배포돼도 캐시된 에러 응답이 계속 서비스될 수 있음.

- `force-dynamic`과 호환 불가 (빌드 오류 발생)
- `"use no cache"`가 `Suspense`와 함께 사용 시 효과 없음
- **실시간 DB 데이터를 사용하는 페이지에는 사용 금지**

### 9.3 `force-dynamic` vs `cacheComponents` 충돌

```
Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`.
```

`cacheComponents: true`가 전역으로 활성화된 상태에서 특정 페이지만 `force-dynamic`으로 지정하면 빌드 실패. `cacheComponents` 자체를 제거해야 해결 가능.

### 9.4 CDN cache HIT 디버그 방법

응답 헤더에 `x-vercel-cache: HIT`가 표시되면:
1. 코드 변경 후 재배포해도 캐시된 구 응답이 서비스될 수 있음
2. `x-nextjs-stale-time: N`에 명시된 초가 지나야 SWR 재검증 발생
3. 하지만 SWR 재검증 결과가 여전히 동일한 에러라면 캐시 갱신도 에러

최우선 진단: 에러가 코드 문제인지 캐시 문제인지 분리하기 위해  
**독립적인 API 엔드포인트**를 임시로 만들어 동일한 쿼리를 실행해 볼 것.

### 9.5 서버 컴포넌트 변수 직접 출력 디버그 기법

서버 컴포넌트에서 Vercel 함수 로그를 확인할 수 없을 때:
```tsx
// 에러 메시지에 변수 값을 직접 포함시켜 브라우저에서 확인
return (
  <div>
    에러 발생 [DEBUG: var="{variable}" len={variable.length}]
  </div>
);
```
이 방법으로 `params.slug` 값이 URL 인코딩 상태임을 직접 확인.

---

## 10. 아키텍처 관련 참고

### createClient() vs createAdminClient()

| | `createClient()` | `createAdminClient()` |
|-|------------------|-----------------------|
| 키 | ANON_KEY | SERVICE_ROLE_KEY |
| RLS | 적용됨 | 우회됨 |
| 쿠키 필요 | 필요 (`await createClient()`) | 불필요 (동기 함수) |
| 사용처 | 사용자 인증/권한 기반 접근 | 서버 내부 관리 작업 |

강좌 상세/학습 페이지처럼 **서버 컴포넌트에서 DB에 직접 접근하는 경우**:
- 사용자 데이터(구독 등)는 `createClient()` 사용 (권한 검증 필요)
- 공개 콘텐츠(강좌 내용)는 `createAdminClient()` 사용 (RLS 우회로 안정성 확보)

### PPR(Partial Prerender) 이해

```
◐ (Partial Prerender)
├── Static Shell: 레이아웃·사이드바 등 → CDN 캐시
└── Dynamic Content: Suspense 내부 → 서버 렌더링 (또는 컴포넌트 캐시)

ƒ (Dynamic)
└── 전체 페이지 → 매 요청마다 서버 렌더링 (CDN 캐시 없음)
```

`cacheComponents: true` 설정 시 PPR의 Dynamic Content도 컴포넌트 캐시에 저장 가능.  
이 캐시가 잘못된 결과를 저장하면 새 배포 후에도 오류가 지속될 수 있음.
