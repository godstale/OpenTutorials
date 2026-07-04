---
slug: admin-course-upload-improvements
title: PennyPress: Admin 강좌 등록 warning 팝업, 삭제 blocking progress 구현 및 대용량 업로드 Gateway Timeout 해결
source_file: wiki/sources/admin-course-upload-improvements.md
ingested_at: 2026-06-30T22:05:00Z
pages_created:
  - sources/admin-course-upload-improvements.md
  - concepts/ConcurrencyUploadLimit.md
  - concepts/WarningAlertSystem.md
  - concepts/BlockingDeleteOverlay.md
---

# PennyPress: Admin 강좌 등록 및 삭제 UX 개선 & Gateway Timeout 트러블슈팅

이번 업데이트에서는 관리자 페이지의 강좌 및 패키지 관리 기능의 UX를 보완하고, 대용량 강좌 리소스 업로드 시 발생하던 Gateway Timeout(504) 오류를 구조적으로 해결했습니다.

---

## 1. ⚙️ 주요 개선 사항 및 구현 내역

### 1) 강좌 번들 2개 이상 등록 시 패키지 등록 권장 Warning 팝업 추가
- **배경**: 여러 개의 단과 강좌 ZIP 번들을 한 번에 업로드할 때, 사용자가 이 강좌들을 유기적으로 묶는 '강좌 패키지' 기능을 인지하지 못하고 개별 단과 강좌로 나누어 등록할 우려가 있었습니다.
- **해결 방안**:
  - `app/admin/courses/upload/page.tsx`의 등록 버튼 클릭 시점(`handleSubmit`)에 validation 로직을 추가했습니다.
  - `zipFiles.length >= 2`이면서 `useManifest`가 비활성화(`false`) 상태인 경우, Shadcn UI 기반의 `AlertDialog` warning 팝업을 노출합니다.
  - 사용자는 팝업을 통해 패키지 등록 기능을 권장받고, "취소" 후 패키지 옵션을 켜거나 "개별 등록 진행"을 눌러 그대로 진행할 수 있습니다.

### 2) 강좌/패키지 삭제 시 Blocking Progress Overlay 구현
- **배경**: 강좌나 패키지 삭제 작업은 데이터베이스 RLS 관계, 수강 유저 정보 삭제 등으로 인해 완료까지 다소 시간이 걸릴 수 있습니다. 이 과정에서 화면이 얼어붙지 않고 사용자가 다른 버튼을 중복 클릭하거나 페이지를 이탈할 위험이 있었습니다.
- **해결 방안**:
  - `app/admin/courses/page.tsx`에 `isDeleting` 및 `deleteMessage` 상태(state)를 선언했습니다.
  - 삭제 작업이 시작되면 `Loader2`와 함께 뒷단 화면을 반투명하게 덮고 조작을 원천적으로 차단하는 **Glassmorphism Blocking Overlay**를 구현하여 적용했습니다.
  - 강좌 삭제(`deleteCourse`) 및 패키지 삭제(`deletePackage`)에 모두 적용되어 삭제 중 사용자의 중복 액션을 완벽 차단합니다.

### 3) 13개 이상 대량 강좌 등록 시 Gateway Timeout (504) 해결
- **배경**: 파일 개수가 많거나 파일이 큰 경우(예: 13개 강좌 ZIP 등록 시), 백엔드 API `/api/admin/courses/upload/route.ts` 내부에서 파일 하나씩 순차적으로 Supabase Storage로 업로드하다가 Next.js Serverless Function Execution Timeout(10초) 혹은 Gateway Timeout에 걸려 업로드가 중단되는 현상이 발생했습니다.
- **해결 방안**:
  - **병렬 동시성 제어(Concurrency Control)**: 단일 ZIP 파일 내의 파일들을 한 개씩 동기적으로 업로드하던 루프를 `Promise.all`과 청크 분할 기법으로 리팩토링했습니다. 동시 업로드 제한 개수를 `CONCURRENCY_LIMIT = 5`로 설정하여, 부하를 주지 않으면서도 한 번에 5개씩 병렬 업로드하도록 처리했습니다.
  - **재시도 메커니즘(Retry Logic)**: 일시적인 네트워크 순단이나 Supabase Gateway 과부하로 인한 실패를 복구하기 위해 최대 3회(`MAX_RETRIES = 3`)까지 1초 간격으로 재시도하는 `uploadFileWithRetry` 비동기 래퍼 함수를 적용했습니다.
  - 이를 통해 대량의 mdx 카드를 포함한 ZIP 파일도 타임아웃 없이 안전하게 업로드할 수 있는 견고함을 확보했습니다.

---

## 2. 📁 변경된 파일 목록

- **[app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)**
  - 동시성 제어(5개 병렬 청크) 및 재시도(최대 3회) 기반의 Supabase Storage 파일 업로드 최적화 로직 적용.
- **[app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)**
  - `isDeleting` 상태를 활용한 삭제 진행 중인 blocking progress UI 추가.
  - `deleteCourse`, `deletePackage` 핸들러 내에 overlay 상태 연동.
- **[app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)**
  - `AlertDialog` 컴포넌트를 이용한 다중 강좌 개별 등록 경고 팝업 구현.
  - `handleSubmit` 함수 구조 리팩토링 (검증 및 전송 단계 분리).

---

## 3. 💡 향후 유지보수를 위한 팁

- 파일 업로드 병렬 계수가 너무 크면 Supabase Storage API Gateway에서 `429 Too Many Requests`를 뱉을 수 있으므로 현재의 `CONCURRENCY_LIMIT = 5`가 가장 안정적인 임계치입니다.
- 삭제 차단 오버레이의 CSS는 `fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999]` 스타일을 사용하여 다른 내비게이션이나 엘리먼트보다 무조건 최상단에 렌더링되도록 보장합니다.
