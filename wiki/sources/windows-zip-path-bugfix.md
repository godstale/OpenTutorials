# Windows 환경 Zip 파일 업로드 경로 버그 수정

> **이슈**: `docs/arduino-beginner` 폴더의 아두이노 테스트용 강좌 번들(zip)을 등록한 후 학습 페이지로 이동 시 Card 1이 "준비 중"으로 표시되는 현상 발생.

---

## 🔍 원인 분석

1. **OS 경로 구분자 불일치**:
   - Windows 환경에서 압축된 zip 파일의 경우, `AdmZip`이 파일 엔트리를 읽어올 때 경로 구분자로 백슬래시(`\`)를 사용합니다 (예: `cards\01-intro.mdx`).
2. **저장소 업로드 경로 오류**:
   - [route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts) API에서 보정 과정 없이 `storagePath`를 `${slug}/${file.path}` 형태로 조합했습니다.
   - 이에 따라 Supabase Storage에는 `${slug}/cards\01-intro.mdx` 형태로 백슬래시가 포함되어 파일이 올라갔습니다.
3. **학습 페이지 다운로드 실패**:
   - 학습 뷰어 서버 컴포넌트인 [page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)에서는 웹 표준 슬래시(`/`) 구분자를 활용하여 `${slug}/cards/${filename}` 경로로 다운로드를 시도하므로, Storage의 백슬래시 파일과 매칭되지 않아 다운로드 오류(404)가 발생했습니다.
   - 결과적으로 카드가 한 개도 로드되지 않아 `cards.length === 0` 분기에 걸리며 "이 강좌는 준비 중이거나 콘텐츠가 없습니다." 알림을 띄우게 되었습니다.

---

## 🛠️ 해결 방안 및 조치 사항

### 1. 경로 정규화 적용
- [route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)에서 zip 엔트리를 순회할 때 백슬래시(`\`)를 슬래시(`/`)로 일괄 변환하여 운영체제에 상관없이 Storage 경로가 통일되도록 조치했습니다.
```typescript
const entryName = entry.entryName.replace(/\\/g, '/');
```

### 2. ESLint 경고(Type Safety) 해결
- 해당 파일에 남아있던 `any` 타입 경고 2건을 해결하여 린트 안전성을 확보했습니다.
  - `configJson`에 `CourseConfig` 타입을 적용하여 명시적 타입 정의 수행.
  - catch 블록의 `(error: any)` 타입을 `(error: unknown)` 및 타입 캐스팅(`error as Error`)으로 수정하여 엄격한 TS 검사 충족.

---

## 🔍 2차 장애 원인 분석 (Supabase Storage 비-ASCII 키 제한)

1. **상황**:
   - 경로 구분자를 백슬래시에서 슬래시로 변경한 이후에도, `docs/arduino-beginner` 강좌 번들 업로드 시 학습 페이지에서 동일하게 "준비 중" 알림이 뜨는 현상이 발생했습니다.
2. **원인**:
   - `docs/arduino-beginner/config.json` 내에 `slug` 필드가 정의되어 있지 않아, 타이틀인 `"아두이노로 배우는 사물 인터넷 — Chapter 01-02"`를 기반으로 자동 슬러그(`아두이노로-배우는-사물-인터넷-—-chapter-01-02`)가 생성되었습니다.
   - Supabase Storage는 버킷 내부 경로 키(Key)로 **ASCII 문자셋만 지원**하며, 한글(non-ASCII) 또는 특수 대시(`—`, em-dash)가 포함된 키 경로로 파일 업로드를 시도할 경우 `StorageApiError: Invalid key` (HTTP 400) 오류를 발생시킵니다.
   - 업로드 API는 개별 파일 업로드 실패 시 로그만 출력하고 요청 자체는 `201 Created (success: true)`로 성공 처리했기 때문에, 사용자 및 관리자는 에러를 인지하지 못했으나 실제로는 Storage에 파일이 하나도 저장되지 않았습니다.

---

## 🛠️ 2차 해결 방안 및 조치 사항

### 1. 강좌 설정에 영문 슬러그 추가
- [config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json) 파일에 명시적인 ASCII 슬러그 `"slug": "arduino-beginner"`를 지정했습니다.
- 수정된 구성을 반영하여 `docs/arduino-beginner/arduino-beginner.zip` 번들을 다시 빌드했습니다.

### 2. 업로드 API 슬러그 정규화 및 에러 핸들링 강화
- [route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)에서 슬러그 생성 시 ASCII 안전 문자(소문자, 숫자, 하이픈 등)만 남도록 강하게 정규화(slugify)하는 로직을 통합했습니다:
```typescript
const rawSlug = configJson.slug || configJson.title;
let slug = rawSlug
  .toLowerCase()
  .replace(/[\s_-]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');
```
- 만약 한글 타이틀 등으로 인해 슬러그가 완전히 비게 되는 경우, 타이틀 기반 해시값을 사용하여 fallback 슬러그(`course-********`)가 생성되도록 예외 처리했습니다.
- 개별 파일 업로드 실패 시 단순히 무시하지 않고, 요청을 즉시 실패(`HTTP 500`) 처리하도록 에러 핸들링 구조를 보강했습니다.

---

## ✅ 검증 결과
- `npx eslint app/api/admin/courses/upload/route.ts` 검사를 실행하여 경고/에러 0건 성공.
- `pnpm build`를 통한 Next.js 빌드 시 정상 컴파일 완료.
- 직접 업로드 시뮬레이션 스크립트를 통해 `arduino-beginner` 슬러그로 Supabase Storage에 13개의 MDX 카드가 성공적으로 업로드 및 검증되는 것을 확인했습니다.
