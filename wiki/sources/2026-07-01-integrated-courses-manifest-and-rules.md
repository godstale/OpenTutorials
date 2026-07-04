# 통합 강좌 매니페스트 및 학습 제약 옵션 구현 결과 (Sequential Play & Force Checkpoint)

> **인제스트 날짜:** 2026-07-01  
> **작성자:** Antigravity  
> **관련 브랜치:** `feat/dashboard-and-my-courses-fixes`  

---

## 1. 구현 개요
기존에 분리되어 운영되던 **개별 단과 강좌**와 **종합 강좌 패키지** 개념을 하나로 통합하였습니다. 이제 모든 강좌는 **통합 패키지 매니페스트(manifest)** 구조 하에 1개 이상의 하위 챕터/강좌를 포함하는 **'통합 강좌'** 형태로 등록됩니다.
또한 매니페스트 내에 학습 제약을 위한 신규 옵션(`sequential_play`, `force_checkpoint`)을 제공하고, 하위 강좌들의 타이틀, 요약 설명 및 태그 리스트를 기반으로 검색할 수 있도록 검색 로직을 일원화하였습니다.

---

## 2. 매니페스트(Manifest) 스펙 고도화

### 통합 강좌 매니페스트 구조 (`package-manifest.json` / JSON 템플릿)
```json
{
  "title": "마케팅 테마 통합 강좌",
  "slug": "marketing-theme-course",
  "description": "마케팅 에이전트 서비스와 리서치 도구 활용법을 완전 마스터하는 강좌입니다.",
  "thumbnail": "icon:megaphone",
  "published": true,
  "sequential_play": false,
  "force_checkpoint": false,
  "courses": [
    {
      "slug": "marketing-basic-1",
      "title": "마케팅 기초 실습",
      "description": "마케팅 에이전트의 기본적인 사용법과 프롬프트를 배웁니다.",
      "tags": ["마케팅", "기초", "에이전트"]
    },
    {
      "slug": "marketing-strategy-2",
      "title": "마케팅 전략 및 기획",
      "description": "실제 광고 캠페인 전략을 수립하고 AI로 문안을 작성합니다.",
      "tags": ["마케팅", "실무", "전략"]
    }
  ]
}
```

### 신규 제약조건 정의
1. **순차재생 강제 여부 (`sequential_play`)**:
   - `on` (`true`): 사용자는 반드시 이전 하위 챕터들을 순차적으로 완료해야 다음 하위 챕터를 수강할 수 있습니다. 수강 상세 페이지에서 잠금(Locked) 처리 및 뱃지로 시각적 제한을 제공합니다.
   - `off` (`false`): 기본값이며, 사용자는 원하는 파트부터 자유롭게 학습할 수 있습니다.
2. **체크포인트 강제 여부 (`force_checkpoint`)**:
   - `on` (`true`): 각 카드에 설정된 체크포인트 단계에서 AI 튜터의 질문에 정확히 답하여 통과해야만 다음 카드로 넘어갈 수 있습니다.
   - `off` (`false`): 기본값이며, 답변이 틀리더라도 "체크포인트 건너뛰기" 버튼을 누르거나 다음 카드로 즉시 이동할 수 있습니다.

---

## 3. 주요 수정 파일 및 처리 로직

### 1) 데이터베이스 마이그레이션 (`supabase/migrations/` 추가)
- `course_packages` 테이블에 `sequential_play` (BOOLEAN), `force_checkpoint` (BOOLEAN) 컬럼 추가.
- `courses` 테이블에 `tags` (TEXT[]) 컬럼 추가.

### 2) API 엔드포인트 개편
- `GET /api/courses`: 기존 개별 강좌 필터링을 제거하고, `course_packages` 전체 데이터를 하위 강좌 `courses` 정보와 함께 포맷팅하여 "통합 강좌" 목록으로 반환합니다.
- `GET /api/courses/[slug]`: 통합 강좌 세부 정보와 사용자의 수강 상태를 함께 제공합니다.
- `POST /api/courses/subscribe`: 통합 강좌 수강 신청 시, `user_package_subscriptions`를 생성하고 하위 강좌들의 `user_progress` 레코드를 일괄 초기화(0단계)합니다.
- `POST /api/admin/packages/upload`: 매니페스트 업로드 시, 하위 강좌들(`courses` 객체 배열)의 타이틀, 설명, 태그를 `courses` 테이블에 일괄 업서트/업데이트하여 데이터 정합성을 맞춥니다.

### 3) 프론트엔드 UI/UX 개편
- **강좌 검색 페이지 (`app/(user)/courses/page.tsx`)**:
  - 기존 2개(개별 강좌, 종합 패키지)였던 결과 목록을 하나로 통일.
  - 검색 입력 시, 통합 강좌 정보뿐만 아니라 **매니페스트 내 하위 강좌들의 타이틀, 짧은 설명, 태그 리스트**까지 소스로 삼아 matching 처리.
- **강좌 상세 페이지 (`app/(user)/courses/[slug]/client.tsx`)**:
  - `sequential_play`가 `true`일 때 이전 파트 미완료 시 잠금 스타일링(`opacity-60 bg-zinc-50/30` 및 `잠금` 뱃지) 제공 및 버튼 비활성화.
- **강좌 학습 플레이어 (`app/(user)/learn/[slug]/client.tsx`)**:
  - URL Query parameter `package`를 통해 수강 중인 강좌의 매니페스트 옵션 로드.
  - `force_checkpoint` 설정에 따른 `canSkipCheckpoint` 연산 개편. `force_checkpoint`가 `off`일 때 틀리더라도 다음으로 즉시 이동 및 "건너뛰기" 팝업 동작 유도.

---

## 4. 빌드 및 배포 안정성 확보
Next.js 16 빌드 파이프라인에서 Type Safety를 확보하기 위해, TypeScript 타입 정의(`lib/types/index.ts`)를 보강하고 학습용 컴포넌트에 올바른 Import가 제공되는 것을 확인하였습니다.
구 `packages` 관련 경로 진입 시 `/courses` 경로로 리다이렉트 처리하여 이전 사용자 링크 호환성도 충족합니다.
