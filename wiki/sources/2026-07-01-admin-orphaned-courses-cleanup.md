# 어드민 강좌 등록 오류(고아 강좌) 검사 및 정리 기능 구현

> **개요**: 강좌 등록 중 1단계 개별 강좌 ZIP 업로드 후 2단계 매니페스트(JSON) 등록 실패 또는 중도 이탈로 인해 발생하는 불완전한 고아 강좌 리소스를 감지하고 원클릭으로 정리(Storage + DB)할 수 있는 어드민 검사 및 정리 기능을 구축한 내역.

---

## 🔍 배경 및 문제점

1. **강좌 등록 파이프라인의 2단계 구조**:
   - 관리자가 강좌를 등록할 때, 개별 하위 강좌 파일들(`.zip`)을 차례로 업로드하고(`POST /api/admin/courses/upload`), 그 다음 최종적으로 이들을 하나로 묶어줄 패키지 매니페스트(`package-manifest.json`)를 등록(`POST /api/admin/packages/upload`)한다.
2. **트랜잭션 미보장으로 인한 리소스 고립**:
   - 1단계 개별 ZIP 업로드가 완료되면 DB `courses` 테이블에 레코드가 생성되고 Supabase Storage `courses` 버킷의 `${slug}/` 폴더에 MDX 리소스들이 저장된다.
   - 하지만 2단계 매니페스트 업로드 과정에서 문법 에러가 발생하거나, 관리자가 화면을 이탈하는 경우 이미 1단계에서 업로드된 강좌 리소스들은 어떠한 패키지(`course_packages` 및 `course_package_items`)에도 묶이지 못한 채 "고아(Orphan)" 상태로 서버에 잔류하게 된다.
   - 이러한 강좌들은 수강생 검색이나 대시보드에는 표시되지 않으면서 스토리지 공간과 DB 테이블 행만 무의미하게 차지하여 데이터 정합성을 깨뜨리는 원인이 된다.

---

## 🛠️ 해결 방안 및 구현 사항

### 1. 백엔드 검사 및 정리 통합 API 구현 (`/api/admin/courses/check-orphans`)
- **`GET /api/admin/courses/check-orphans`**:
  - `courses` 테이블의 모든 강좌 목록을 가져온다.
  - `course_package_items` 테이블의 매핑된 모든 `course_id` 목록을 가져와 대조용 Set을 구성한다.
  - 패키지 아이템에 매핑되지 않은(즉, 어느 패키지에도 할당되지 않은) 강좌 레코드들만 필터링하여 "등록 오류 고아 강좌" 목록으로 반환한다.
- **`POST /api/admin/courses/check-orphans`**:
  - 클라이언트로부터 정리할 `courseIds` 배열을 수신한다. (배열이 없거나 비어 있는 경우 전체 고아 강좌들을 온디맨드로 조회하여 일괄 타깃팅한다.)
  - 대상 강좌별로 Supabase Storage `courses` 버킷 내의 `${slug}/` 하위 리소스 목록을 `list` API로 조회하고 `remove` API를 통해 안전하게 스토리지에서 제거한다.
  - 리소스 제거 완료 후 DB `courses` 테이블에서 해당 레코드를 일괄 삭제하여 정합성을 맞춘다.

### 2. 어드민 강좌 관리 화면 UI 통합 (`app/admin/courses/page.tsx`)
- **"등록 오류 검사" 기능 제공**:
  - 강좌 관리 메인 화면의 우측 상단("새 강좌 등록" 옆)에 `AlertCircle` 아이콘을 포함한 **"등록 오류 검사"** 버튼을 신설했다.
- **오류 진단 및 정리용 대화 상자 모달 (`OrphanedCoursesModal`) 구현**:
  - 모달 진입 시 자동으로 검사 API를 호출하고 로딩 스피너 및 스켈레톤을 렌더링한다.
  - 검출된 고아 강좌가 없는 경우 "검출된 등록 오류가 없습니다"라는 메시지를 띄워 안전 상태를 피드백한다.
  - 고아 강좌가 존재하는 경우 썸네일/아이콘, 강좌 타이틀, 슬러그, 업로드 일자를 리스트로 제공하며, "전체 선택" 및 "개별 체크박스 선택" 기능을 제공한다.
  - 개별 삭제(`Trash` 버튼) 또는 하단의 "선택한 강좌 정리" 버튼을 클릭하여 선택된 고아 강좌들을 원클릭으로 정리할 수 있는 일괄 자동 파이프라인을 연동했다.
  - 정리 시 blocking progress UI 상태가 활성화되며, 정리가 종료되면 브라우저 alert 알림을 띄우고 내부 목록과 강좌 관리 메인 목록을 리프레시한다.

---

## 📁 변경 및 생성 파일 목록

- **[app/api/admin/courses/check-orphans/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/check-orphans/route.ts)** (신규)
  - 고아 강좌 탐색을 위한 GET 핸들러 및 스토리지 연쇄 삭제를 수반한 POST 핸들러 통합 구현.
- **[app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)** (수정)
  - 고아 강좌 관련 상태값, `fetchOrphans` 및 `cleanOrphans` 핸들러 구현.
  - UI 상단 제어 바에 "등록 오류 검사" 버튼 추가 및 `OrphanedCoursesModal` Shadcn/Dialog 컴포넌트 렌더링 이식 완료.

---

## ✅ 무결성 검증 완료
- `pnpm build`를 통한 Next.js Production Build 실행 결과, 오류 및 타입 경고 없이 깨끗하게 성공하는 것을 확인했습니다.
- 이를 통해 등록 과정 오류로 낭비되는 Supabase Storage 및 DB 용량을 효율적이고 편리하게 관리할 수 있는 강력한 시스템 관리자 정합성 툴을 확보했습니다.
