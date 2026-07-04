# 나의 강좌 상세 화면, 구독 취소 및 AI 튜터 갱신 안내 구현

- **날짜**: 2026-06-28
- **작성자**: Antigravity
- **상태**: 완료 (Completed)

---

## 📌 개요

PennyPress 플랫폼의 수강 경험 및 관리자 콘텐츠 등록 기능을 고도화하기 위한 다섯 가지 핵심 개선 작업을 수행했습니다.
1. **나의 강좌 상세 화면 (`/my-courses/[slug]`) 구현**: 구독 중인 각 강좌의 진행률 확인 및 목차 이동 지원
2. **구독 취소 기능 구현**: 취소 확인용 파괴적 경고 모달 및 백엔드 DELETE API 처리
3. **강좌 업데이트 확인 및 AI 튜터 자료 동기화 안내**: 강좌 수정 시 기존 파일을 지우고 새 번들을 받도록 AI 튜터 점검 프롬프트 확장 및 업데이트 알림 자동 리프레시
4. **관리자 강좌 업로드 에러 복구**: 업로드 에러 시 파일 리셋 및 등록 버튼 비활성화 상태 유지
5. **번들 생성 도구 가이드 제공**: 콘텐츠 업로드 화면에 `PennyPress-Bundler` 레포지토리 소개 배너 통합

---

## 🛠️ 상세 구현 내용

### 1. 나의 강좌 상세 화면 & 다이렉트 런칭
- **목적**: 수강생이 수강 중인 강좌의 전체 구조(TOC)와 현재 진도율을 명확히 확인하고, 이미 잠금 해제된 진도로 손쉽게 바로 이동할 수 있도록 지원합니다.
- **수정/신규 파일**:
  - `app/(user)/my-courses/page.tsx` (카드 클릭 시 상세 이동 연동)
  - `app/(user)/my-courses/[slug]/page.tsx` (서버 컴포넌트: 강좌 정보 및 수강 진행률 로드)
  - `app/(user)/my-courses/[slug]/client.tsx` (클라이언트 컴포넌트: 진도 계산, TOC 리스트 렌더링, 구독 취소 모달)
  - `app/(user)/learn/[slug]/page.tsx` & `client.tsx` (`card` 쿼리 파라미터를 읽어 해당 슬라이드에서 학습 페이지 런칭 가능하게 개선)
- **비즈니스 로직**:
  - `max_card` 또는 `last_card` 값을 바탕으로 해제된 단계를 계산하여, `idx <= currentCard`에 해당하는 목차 아이템만 활성화 처리합니다.
  - 활성화된 단계 클릭 시 `/learn/[slug]?card=[Index]` 형태로 이동하여 학습을 재개할 수 있습니다.

### 2. 강좌 구독 취소 (DELETE API & 경고 Dialog)
- **목적**: 사용자가 강좌 구독을 취소할 때 데이터 소실(학습 이력 파괴)의 위험성을 사전에 인지할 수 있도록 명확히 경고하고, 백엔드 데이터를 깔끔히 청소합니다.
- **수정 파일**:
  - `app/api/courses/progress/route.ts` (DELETE HTTP Method 구현)
  - `app/(user)/my-courses/[slug]/client.tsx` (`AlertDialog` 형태의 구독 취소 팝업 및 API 호출 구현)
- **비즈니스 로직**:
  - 구독 취소 클릭 시: "구독을 취소하면 학습 진도와 모든 진행 내역이 완전히 삭제되며, 이 작업은 되돌릴 수 없습니다." 경고 노출.
  - API DELETE 요청 완료 후 `/my-courses` 목록 화면으로 전환 처리합니다.

### 3. AI 튜터 강좌 파일 업데이트 & 알림 자동 갱신
- **목적**: 관리자가 강좌 내용(MDX 번들)을 수정하여 업로드했을 때, 사용자의 AI 튜터가 구버전의 파일로 계속 질문에 답하는 오동작을 방지합니다.
- **수정 파일**:
  - `app/(user)/learn/[slug]/page.tsx` (`course.updated_at > user_progress.updated_at` 비교를 통한 업데이트 여부 판별)
  - `app/(user)/learn/[slug]/client.tsx` (AI 튜터 시스템 점검 프롬프트 개편 및 DB updated_at 즉시 갱신)
- **비즈니스 로직**:
  - 강좌가 최근 수정된 경우 `isUpdated` 상태를 획득하여 AI 튜터 백그라운드 점검 시 "기존 `workspaces/courses/[slug]`의 모든 파일을 삭제(clear/delete)하고 새 URL에서 리소스를 새로 복사 및 분석하라"는 특수 지시를 내립니다.
  - 지시가 시작되면 클라이언트에서 `/api/courses/progress` (POST)를 즉시 요청하여 유저의 `user_progress.updated_at` 필드를 현재 시간으로 초기화함으로써, 다음 진입 시에 튜터 리셋 메시지가 무한 반복되는 루프를 미연에 방지했습니다.

### 4. 관리자 강좌 등록 화면 업로드 에러 핸들링
- **목적**: 파일 업로드 실패 시 잔여 데이터가 존재하여 사용자가 고장 난 제출 시도를 반복하는 일을 차단하고, 화면 상태를 초기화합니다.
- **수정 파일**:
  - `app/admin/courses/upload/page.tsx`
- **비즈니스 로직**:
  - `upload` API 호출이 에러 코드나 익셉션을 던질 시, `catch` 구문 내에서 선택된 파일 상태를 초기화(`setFile(null)`)하고, DOM Input Node의 파일 값을 리셋(`inputRef.current.value = ''`)합니다.
  - 파일이 제거되었으므로 등록 버튼은 자동으로 비활성화(`disabled`) 상태를 유지합니다.
  - 에러가 발생한 뒤 새로운 zip 파일을 다시 드래그하거나 선택하면 `state`가 `'idle'`로 환원되어 오류 메시지가 숨겨지고 등록 버튼이 활성화됩니다.

### 5. 번들 생성 가이드 배너 제공
- **목적**: 관리자가 MDX 강좌 번들의 내부 구조를 수동으로 작성하는 과정에서의 실수를 예방하기 위해 번들러 가이드 도구 링크를 등록 화면에 통합합니다.
- **수정 파일**:
  - `app/admin/courses/upload/page.tsx`
- **내용**:
  - "등록 방법안내" 우측 설명 카드 하단에 미려한 테마의 배너를 추가하여, AI 에이전트를 시켜서 ZIP 번들을 쉽게 자동 생성하도록 유도하고 `https://github.com/godstale/PennyPress-Bundler` 저장소 링크를 제공합니다.

---

## 💡 Concepts & Wiki Links

- [[MyCoursesDetailView]] — 수강 강좌 상세화면 구조와 이동 가능한 TOC 노출 및 런칭 규칙
- [[CourseSubscriptionCancellation]] — 수강 포기 정책 및 Supabase 테이블의 user_progress DELETE 처리
- [[CourseUpdatePromptSystem]] — 강좌 번들 업데이트 날짜 판정 및 AI 튜터 덤프파일 동기화 매커니즘
- [[AdminUploadErrorRecovery]] — 파일 업로드 트랜잭션 에러 복구 전략 및 폼 무효화
- [[BundlerRepositoryGuide]] — PennyPress-Bundler 연동을 통한 에이전트 강좌 번들링 자동화 안내
