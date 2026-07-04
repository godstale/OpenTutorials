# 어드민 강좌 등록 시 스키마 캐시 미반영 예외 처리 (트러블슈팅)

## 📅 작성일
2026-07-01

## 🏷️ 카테고리
`bugfix`, `admin-portal`, `database-schema`, `graceful-degradation`

## 🔍 문제 현상
어드민 포탈에서 새로운 강좌(패키지) 등록 시 다음과 같은 백엔드 에러가 발생하며 등록에 실패함:
> `강좌 매니페스트 등록 실패: Could not find the 'changelog' column of 'course_packages' in the schema cache`

## 🕵️ 원인 분석
- 통합 강좌 패키지 구조 마이그레이션 중, `course_packages` 테이블에 `version` 및 `changelog` 필드를 추가하는 DDL 스크립트(`supabase/migrations/20260705_add_version_and_changelog_to_packages.sql`)를 작성했으나,
- 사용자의 로컬/원격 Supabase Database 환경에 해당 DDL SQL이 아직 실행 및 반영되지 않았거나, PostgREST 스키마 캐시(Schema Cache)가 즉시 리로드되지 않은 경우 발생합니다.
- 또한, `20260704_integrate_courses_to_packages.sql` 마이그레이션(순차 학습 `sequential_play` 및 체크포인트 강제 `force_checkpoint` 필드) 역시 실행되지 않은 극단적인 구형 로컬 DB 환경인 경우, 1차 폴백 시도 시 `sequential_play` / `force_checkpoint` 컬럼 미비로 인한 에러가 추가로 발생할 수 있습니다.

---

## 🛠️ 해결책 및 반영 내용

### 1. 백엔드 API 다단계 하위 호환성 예외 처리 (Graceful Fallback)
데이터베이스 버전이나 스키마 캐시가 최신화되지 않은 환경에서도 강좌 자체의 등록/업로드는 정상적으로 동작하도록 예외 처리를 다단계로 고도화했습니다.
- **AS-IS**: `version` 및 `changelog` 필드를 필수로 포함하여 `upsert` 시도 -> 실패 시 1단계 폴백 시도 -> 1단계 폴백에서 `sequential_play` 컬럼 부재 시 실패
- **TO-BE**:
  1. **1차 시도**: `version`, `changelog`, `sequential_play`, `force_checkpoint`를 모두 포함하여 `upsert` 시도.
  2. **2차 시도 (1차 폴백)**: `changelog` 또는 `version` 스키마 캐시 에러 감지 시, 해당 필드들을 제외한 페이로드로 `upsert` 재시도.
  3. **3차 시도 (2차 폴백/Ultra Fallback)**: `sequential_play` 또는 `force_checkpoint` 스키마 캐시 에러 감지 시, 해당 필드까지 추가로 제외하고 필수 기본값 필드(`slug`, `title`, `description`, `thumbnail`, `published`, `updated_at`)만으로 `upsert` 재시도.
  - 이를 통해 로컬 DB가 어떤 이전 마이그레이션 상태에 머물러 있든 강좌 패키지 정보가 무사히 등록/업데이트되도록 보장합니다.

```typescript
// 1차 폴백: version / changelog 컬럼이 없는 경우
if (packageErr && (
  packageErr.message?.includes('changelog') || 
  packageErr.message?.includes('version') || 
  packageErr.message?.includes('schema cache')
)) {
  console.warn('[AdminPackageUpload] DB schema cache lacks version/changelog columns. Retrying without them...');
  const fallbackPayload = {
    slug, title, description, thumbnail, published, sequential_play, force_checkpoint, updated_at
  };
  // Retry without version & changelog
  const resFallback = await supabaseAdmin.from('course_packages').upsert(fallbackPayload, { onConflict: 'slug' }).select().single();
  // ...
}

// 2차 폴백: sequential_play / force_checkpoint 컬럼도 없는 경우 (또는 1차 폴백 후에도 계속 에러인 경우)
if (packageErr && (
  packageErr.message?.includes('sequential_play') || 
  packageErr.message?.includes('force_checkpoint') || 
  packageErr.message?.includes('schema cache')
)) {
  console.warn('[AdminPackageUpload] DB schema cache lacks sequential_play/force_checkpoint columns. Retrying with ultra fallback...');
  const ultraFallbackPayload = {
    slug, title, description, thumbnail, published, updated_at
  };
  // Retry with minimum required columns
  const resUltra = await supabaseAdmin.from('course_packages').upsert(ultraFallbackPayload, { onConflict: 'slug' }).select().single();
  // ...
}
```

### 2. 사용자 대응 및 DB 수동 갱신 가이드
해당 에러가 발생하는 근본적인 원인은 DB 마이그레이션이 반영되지 않았기 때문이므로,
사용자가 완벽한 기능(강좌 변경 이력 및 버전 관리 기능)을 활성화할 수 있도록 `supabase/migrations/20260705_add_version_and_changelog_to_packages.sql` 안의 아래 SQL을 Supabase 대시보드 SQL Editor에 입력하여 수동 실행하도록 안내합니다.
```sql
ALTER TABLE course_packages ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE course_packages ADD COLUMN IF NOT EXISTS changelog TEXT DEFAULT '최초 릴리즈';
```

---

## 📂 관련 파일
- [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/upload/route.ts)
- [supabase/migrations/20260705_add_version_and_changelog_to_packages.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260705_add_version_and_changelog_to_packages.sql)

