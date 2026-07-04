# Next.js 15/16 Cache Issues — cacheComponents, force-dynamic, 비-ASCII URL 파라미터

## 개요

Next.js 15/16 환경에서 `cacheComponents: true` 설정과 관련된 여러 문제들이 PennyPress에서 실제로 발생함. 이 문서는 해당 문제들의 원인, 증상, 해결법을 정리한다.

---

## 1. `force-dynamic`과 `cacheComponents` 충돌

**증상 (빌드 오류)**:
```
Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`.
Please remove it.
```

**원인**: `next.config.ts`에 `cacheComponents: true`가 설정된 경우, 라우트 세그먼트에서 `export const dynamic = 'force-dynamic'`을 사용할 수 없음. 두 설정이 서로 상충함.

**해결법**:
- 옵션 A: `cacheComponents: true` 제거 (권장 — DB 사용 페이지라면)
- 옵션 B: `force-dynamic` 제거 후 `connection()` 또는 `"use cache"` 계열 지시어로 제어

---

## 2. `cacheComponents: true`의 무한 캐시 위험

**증상**: 코드를 수정하고 재배포해도 이전 렌더 결과(오류 포함)가 계속 표시됨.

**원인**: `cacheComponents: true`는 서버 컴포넌트의 렌더 결과를 캐시에 저장. DB 쿼리가 실패해 "에러" 결과가 캐시에 올라가면, 코드가 수정되어 쿼리가 성공해도 캐시된 에러 결과를 계속 서비스.

응답 헤더로 확인:
```
x-vercel-cache: HIT
x-nextjs-stale-time: 300
x-nextjs-prerender: 1
```

**실패한 해결 시도**:
- `connection()` 추가: 동적 렌더링 마킹은 되지만 CDN 캐시 방지 불가
- `"use no cache"` 지시어: Suspense와 함께 사용 시 효과 없음 (PPR 상태 유지)
- `force-dynamic`: `cacheComponents`와 호환 불가 (빌드 오류)

**올바른 해결법**: `cacheComponents: true` 자체를 제거.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // cacheComponents: true,  ← 제거
  allowedDevOrigins: ['192.168.0.51', 'localhost'],
};
```

빌드 결과:
```
Before: ◐ /learn/[slug]   (Partial Prerender — 캐시됨)
After:  ƒ /learn/[slug]   (Dynamic — 매 요청 서버 렌더링)
```

**적용 기준**: 실시간 DB 데이터를 사용하는 페이지에는 `cacheComponents` 사용 금지.

---

## 3. Next.js 16 비-ASCII 경로 파라미터 미디코딩

**증상**: `/learn/아두이노로-배우는-...` 경로에서 DB 쿼리가 0 rows를 반환해 "not found" 발생.

**원인**: Next.js 16(최소 16.2.9)에서 `await params`를 통해 받는 동적 경로 파라미터가 한국어·em-dash 등 비-ASCII 문자의 경우 **URL 디코딩 없이 raw 인코딩 상태**로 반환됨.

```
URL 경로:       /learn/%EC%95%84%EB%91%90...%E2%80%94-chapter-01-02
params.slug:    %EC%95%84%EB%91%90...%E2%80%94-chapter-01-02  (len=144)
DB slug:        아두이노로-배우는-사물-인터넷-—-chapter-01-02  (len≈30)
```

`.eq('slug', params.slug)` 비교에서 인코딩 형태 vs 디코딩 형태 불일치 → 0 rows.

**진단 방법**: 에러 메시지에 slug 값과 길이를 직접 출력:
```tsx
return <div>에러 [slug="{slug}" len={slug.length}]</div>;
// 출력: 에러 [slug="%EC%95%84..." len=144]
```

**해결법**: `decodeURIComponent()` 적용:
```typescript
// 비-ASCII 문자가 경로에 포함될 수 있는 모든 동적 라우트에 필수 적용
const { slug: rawSlug } = await params;
const slug = decodeURIComponent(rawSlug);
```

---

## 4. PPR(Partial Prerender) 이해

```
◐ (Partial Prerender) — cacheComponents: true 시 동작
├── Static Shell:    레이아웃·헤더 등 → CDN에서 캐시
└── Dynamic Content: Suspense 내부 → 서버 렌더 OR 컴포넌트 캐시에서 서비스

ƒ (Dynamic) — cacheComponents 없을 때
└── 전체 페이지 → 매 요청마다 서버에서 새로 렌더링
```

`cacheComponents: true`를 제거하면 Suspense를 포함한 페이지도 `ƒ Dynamic`으로 전환되어 항상 최신 데이터를 서비스.

---

## 관련 사례

- [[course-learn-page-bugfix]]: 강좌 learn 페이지 "not found" 버그 — 3중 원인 해결 전체 기록
- [[admin-course-preview-bugfix]]: 이전 단계의 Suspense 구조 리팩토링
