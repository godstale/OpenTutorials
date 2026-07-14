## [2026-07-13] fix | LLM 에이전트 QnA 전체 목차 컨텍스트 추가 및 하네스 에이전트 카드 내용 전송 로직 개선

### 작업 내용
- AI 튜터 QnA 시 LLM 에이전트(로컬/클라우드)가 전체 강좌 구조와 은닉층 구성을 파악하지 못해 1~3개의 임의 은닉층을 가정하고 대답하던 문제를 해결.
- 시스템 프롬프트 생성 로직에 전체 목차(TOC) 주입 프로세스를 통합하고, 실제 강좌 카드 텍스트에 은닉층의 구체적인 개수(4개)를 명시화함.
- 하네스 에이전트(Hermes)의 경우 강좌 파일 다운로드 완료 여부 및 카드 변경 상태에 따라 현재 카드 텍스트를 선별적으로 전송하도록 프롬프트 전송 로직을 개선하여 토큰 낭비 방지 및 Fallback 안전성 확보.

### 주요 변경 및 구현 상세
1. **LLM 에이전트용 시스템 프롬프트 개선 (`app/(user)/learn/[slug]/client.tsx`)**:
   - `buildSystemPrompt` 함수 내 `agentType === 'llm'` 분기에 `generateFallbackTocText`를 통한 전체 강좌 목차(`[Course Table of Contents]`) 데이터를 주입하도록 개선.
   - 이를 통해 LLM 튜터가 현재 카드의 로컬 내용뿐만 아니라 강좌 전체의 뼈대와 흐름을 함께 인식할 수 있도록 컨텍스트 확장.
2. **신경망 작동 메커니즘 카드 명시성 보강 (`public/courses/neutral-network-and-llm/cards/02-neural-network-text.mdx`)**:
   - 카드 본문 텍스트 내 애매하게 표기되어 있던 "다음 은닉층(Hidden Layer)"을 "총 4개의 은닉층(Hidden Layer)"으로 명시적으로 수정하여, 튜터가 텍스트 컨텍스트로부터 실제 예시 모델의 층수를 확증할 수 있도록 지원.
3. **강좌 리소스 동기화 (`public/courses/neutral-network-and-llm/resource.md`)**:
   - 카드 파일의 텍스트가 업데이트됨에 따라, 강좌 통합 리소스 파일인 `resource.md` 내에 기재된 Card 2 내용도 동일하게 수정하여 동기화 완료.
4. **하네스 에이전트 카드 텍스트 조건부 전송 로직 구현 (`app/(user)/learn/[slug]/client.tsx`)**:
   - `lastSentCardIndex` ref를 추가하여 마지막으로 AI 질문 시 전송한 카드의 인덱스를 추적.
   - 첫 질문이거나, 강좌 다운로드가 완료되지 않은 상태(`courseDownloadStatus !== 'downloaded'`)에서 카드가 바뀐 경우에만 유저 메시지에 현재 카드 내용(`currentCardContext`)을 결합하여 전송하도록 보완.
   - 이를 통해 다운로드 이전이나 실패 시 학습 카드의 정보가 정상 전달되면서도, 다운로드 완료 후에는 불필요한 카드 정보 중복 전송(토큰 낭비)을 방지.

### 변경된 파일
- `app/(user)/learn/[slug]/client.tsx`
- `public/courses/neutral-network-and-llm/cards/02-neural-network-text.mdx`
- `public/courses/neutral-network-and-llm/resource.md`

---

## [2026-07-13] feat | 외부 에이전트 클라우드 LLM API(OpenAI, Claude, Gemini, DeepSeek, Qwen, Kimi) 연동 기능 구현

### 작업 내용
외부 에이전트 등록 팝업 및 상세 설정 탭에서 클라우드 실행 환경을 선택할 때, 임의의 엔드포인트를 적는 기존 구조를 개선하여 주요 클라우드 LLM 제공업체(OpenAI, Claude, Gemini, DeepSeek, Qwen, Kimi)를 선택하고 API를 즉시 활용할 수 있도록 구현.

### 주요 변경 및 구현 상세
1. **타입 모델 확장 (`lib/types/index.ts`)**:
   - `UserExternalAgent`의 `agent_program` 유니온 타입에 `openai`, `claude`, `gemini`, `deepseek`, `qwen`, `kimi` 추가.
2. **에이전트 등록 및 수정 UI 개선 (`AddAgentModal.tsx`, `AgentSettingsTab.tsx`)**:
   - 실행 환경이 `Cloud` 이고 타입이 `LLM 에이전트` 일 때, 프로그램 대신 LLM 공급업체 드롭다운 선택 UI가 활성화되도록 변경.
   - 공급업체 선택 시 API Endpoint URL을 각 사의 고정 규격(`https://api.openai.com/v1` 등)으로 자동 지정하고 직접 수정을 방어(Read-only/Disabled).
   - 연결성 테스트(`POST /api/external-agents/test`) 호출 및 에이전트 상태 핑 체크(sync) 시 `agent_program` 및 `agent_type` 파라미터를 넘겨주어 백엔드에서 공급자별 개별 테스트 수행 가능하도록 변경.
3. **연결성 검증 백엔드 구현 (`app/api/external-agents/test/route.ts`)**:
   - **Claude**: `/v1/messages`에 매우 가벼운 ping(1토큰)을 보내어 API Key 권한 유효성을 검증하며, 고정 모델 리스트를 리턴하도록 처리.
   - **Gemini**: `/openai/v1/models` 경로(OpenAI 호환 모드) 및 `/models?key=...` (REST) 경로를 이중으로 타겟팅하여 검증 및 활성 모델 목록 탐색.
   - **그 외 (OpenAI, DeepSeek, Qwen, Kimi, 로컬 LLM)**: 표준 OpenAI `/v1/models` 호출 방식을 공통 적용.
4. **채팅 요청/스트림 변환 어댑터 탑재 (`app/api/external-agents/[id]/chat/route.ts`)**:
   - 백엔드에 **어댑터(Adapter) 레이어**를 두어 클라이언트 측 코드 수정 없이 타사 LLM API 호출 지원.
   - **Claude (Anthropic)**: 들어오는 OpenAI 메시지 및 system 설정을 Anthropic 스키마로 변환하여 `/messages` API를 호출하고, Anthropic SSE 스트림(`content_block_delta`)을 실시간으로 파싱하여 OpenAI SSE 형식(`data: {"choices": [{"delta": {"content": "..."}}]}`)으로 백엔드에서 번역 송출.
   - **Gemini**: 구글의 공식 OpenAI 호환 모드 경로(`https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions`)로 통신하도록 엔드포인트 맵핑.
   - **그 외**: 기존 OpenAI 호환 호출 방식 유지.

### 변경된 파일
- `lib/types/index.ts`
- `components/features/AddAgentModal.tsx`
- `components/features/AgentSettingsTab.tsx`
- `app/(user)/my-agents/page.tsx`
- `app/(user)/my-agents/[id]/page.tsx`
- `app/api/external-agents/test/route.ts`
- `app/api/external-agents/[id]/chat/route.ts`

---

## [2026-07-13] refactor | AdminCoursesPage 다국어(i18n) 처리 완료

### 작업 내용
`AdminCoursesPage` (`app/(user)/courses/manage/page.tsx`) 내 하드코딩된 한국어/영어 인라인 문자열 전체를 `useLanguage()` 훅의 `t()` 함수 기반 다국어 처리로 전환.

### 변경된 파일
- `app/(user)/courses/manage/page.tsx` — 모든 `language === 'en' ? '...' : '...'` 인라인 패턴 제거, `t('key')` 및 `t('key').replace('{placeholder}', value)` 패턴으로 통일
- `lib/locales/ko.ts` — 신규 번역 키 63개 추가 (Course Management 섹션 확장)
- `lib/locales/en.ts` — 동일한 신규 번역 키 63개 영어 번역 추가

### 추가된 주요 키 목록
- UI: `lblCourseBundleList`, `lblCourseBundleListDesc`, `lblNoCourses`, `lblPreview`, `lblDelete`, `lblClose`, `lblCancel`, `lblPublish`
- 강좌 카드: `lblSubCourseCount`, `lblAssignedAgent`, `lblAgentDefault`, `lblNoAgent`, `lblNoSubCourses`, `lblSourcePrefix`, `lblSourceFile`, `lblSequential`, `lblCheckpointForce`
- 업데이트 플로우: `lblConfirmUpdate`, `lblCheckingLocalPackage`, `lblDownloadingZip`, `lblDownloadZipFailed`, `lblUpdatingLocalDb`, `lblLocalDbUpdateFailed`, `lblUpdateDone`, `lblUpdateSuccess`, `lblUpdateFailed`, `lblUpdatingCourse`
- 삭제 플로우: `lblConfirmDelete`, `lblDeletingCourse`, `lblDeleteComplete`, `lblDeleteFailed`, `lblSubscribersExistConfirm`
- 매니페스트 편집: `lblEditManifest`, `lblEditManifestDesc`, `lblManifestDropClick`, `lblManifestUpdateGuide`, `lblManifestJsonData`, `lblSwitchToJson`, `lblManifestJsonPlaceholder`, `lblZipRegistered`, `lblUpdateComplete`
- 오류/서버: `lblJsonError`, `lblInvalidJson`, `lblUnsupportedFile`, `lblManifestUpdateFailed`, `lblUpdateError`, `lblSlugDifferentConfirm`, `lblServerError`, `lblStatusChangeFailed`
- Orphan 관련: `lblCheckingOrphans`, `lblAllCoursesConnected`, `lblOrphanCount`, `lblOrphanDeleteConfirm`, `lblOrphanCleanSuccess`, `lblOrphanCleanFailed`, `lblSelectAll`, `lblDeselectAll`, `lblUploadDate`, `lblCleaning`, `lblCleanSelected`

### 처리 방식
- 단순 정적 문자열: `t('key')`
- 동적 변수 포함 문자열: `t('key').replace('{placeholder}', value)` 체이닝 패턴
- 다국어 변수 처리를 위해 `{count}`, `{title}`, `{version}`, `{error}`, `{filename}` 등의 플레이스홀더 규칙 도입

---

## [2026-07-01] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-07-01] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-07-01] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-07-01] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-21] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

## [2026-06-20] lint | Wiki health check

Ran lint. See lint-report.md for details.

# Wiki Log

<!-- Append-only. 최신 항목을 위에 추가. -->

## 2026-07-12 (14th Session)

- **[FEAT/UI] 강좌 검색 화면 내 강좌 상세 팝업 다이얼로그 라이선스 정보 간략 노출**
  - **수정/갱신 파일**:
    - [lib/locales/ko.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/ko.ts) - 라이선스 다국어 키 `courseLicense: '라이선스'` 추가
    - [lib/locales/en.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/en.ts) - 라이선스 다국어 키 `courseLicense: 'License'` 추가
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) - `CoursePackage` 인터페이스에 `license`, `license_file` 추가. `LICENSE_MAP` 선언 및 강좌 검색 상세 팝업(Detail Dialog) 하단에 번역된 라이선스 정보 및 라이선스 전문 파일명 간략 노출 구현.
  - **작업 내용**:
    - 강좌 검색 결과에서 강좌 카드를 클릭해 상세 다이얼로그를 열었을 때, 강좌의 라이선스 정보(예: CC BY 4.0 등)와 동봉된 라이선스 문서(예: `LICENSE.md`)를 하단에 간략히 표출하도록 사용성을 개선하고 다국어 연동을 완료했습니다.
  - **Concepts**: [[LicenseDisplayInSearchPopup]], [[I18nLicenseText]], [[SearchDialogUIImprovement]]

## 2026-07-12 (13th Session)

- **[FEAT/UI] 번들러 프로토콜 v1.1.3(라이선스 메타데이터) 대응 및 강좌 상세 화면 내 라이선스 카드/레이아웃 개편**
  - **수정/갱신 파일**:
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 강좌 상세 페이지 내 저자/순차학습/체크포인트 상태를 한 행으로 묶고, 태그를 별도 행으로 분리하여 가독성을 개선했습니다. 버전 및 변경이력 카드를 맨 아래로 내리고 그 아래에 라이선스 종류 및 조건, 라이선스 문서 연결 링크가 담긴 라이선스 정보 카드를 신설했습니다.
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts) — 업로드 시 `license`, `license_file` 메타데이터 파싱 및 유효성(CC 및 Custom 라이선스 파일 동봉 유무) 검사 로직을 추가하고 DB에 정상 적재되도록 연동했습니다. 프로토콜 기본 버전을 `1.1.3`으로 상향했습니다.
    - [app/api/admin/packages/import-local/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/import-local/route.ts) — 로컬 임포트 시 라이선스 및 전문 파일의 유무와 정합성을 사전 검사 및 upsert 하도록 보강했으며, 기본 프로토콜을 `1.1.3`으로 업데이트했습니다.
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx) — ZIP 업로드 시 클라이언트 사이드에서 라이선스 스펙 유효성을 1차 검증하도록 필터링을 보강했습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx), [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 오프라인 폴백 및 디폴트 강좌의 프로토콜 버전을 `1.1.3`으로 조정했습니다.
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/guide/page.tsx) — 가이드 내 예시 매니페스트 및 유효성 검증 규칙 란에 라이선스 조건(`license`, `license_file`) 관련 규칙 설명을 최신화했습니다.
    - **Submodule (`protocol/`)**:
      - `git submodule update`를 통해 `1.1.3` 프로토콜 스펙 사양이 기록된 상위 커밋(`6aea0dc`)을 프로젝트 내 서브모듈 커밋으로 업데이트 완료했습니다.
  - **작업 내용**:
    - 새롭게 리팩토링된 코스 번들러 프로토콜 v1.1.3 명세에 따라, 강좌 등록/수정 시 콘텐츠 저작권을 명시하기 위한 `license`와 `license_file` 메타데이터 필드가 유효성 검증을 거쳐 DB에 저장되도록 파이프라인을 구축했습니다.
    - 또한 학습자가 강좌 상세 정보 화면에서 저작권 범위 및 관련 라이선스 문서(예: `LICENSE.md`)를 즉시 확인할 수 있도록 라이선스 안내 카드를 상세 페이지 하단에 배치하고, 메인 메타데이터 레이아웃을 다수 태그 상황에 맞도록 최적화 뷰로 개편했습니다.
  - **Concepts**: [[LicenseMetadataSupport]], [[BundlerProtocolV1.1.3]], [[CourseDetailLayoutRedesign]], [[LicenseVerification]]

## 2026-07-12 (12th Session)

- **[BUGFIX] 다국어(i18n) 설정 적용에 따른 Hydration Mismatch 오류 해결**
  - **수정/갱신 파일**:
    - [lib/context/LanguageContext.tsx](file:///C:/Workspace/Projects/OpenTutorials/lib/context/LanguageContext.tsx) — `isMounted` 상태 변수 및 관련 인터페이스 필드를 제거하고, 다국어 번역 함수 `t`가 클라이언트 및 서버(SSR) 측에서 항상 일치하는 기본 한국어(`ko`) 값으로 렌더링되도록 단순화했습니다.
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx) — `isMounted`에 따른 삼항 연산자 조건문을 제거하고 `t` 함수를 직접 호출하도록 리팩토링했습니다.
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 불필요한 `isMounted` 분기문을 제거하여 `t(...)` 형태로 변경하였습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — 불필요한 `isMounted` 분기문을 제거하여 `t(...)` 형태로 변경하였습니다.
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — 불필요한 `isMounted` 분기문을 제거하여 `t(...)` 형태로 변경하였습니다.
    - [app/(user)/settings/ui/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx) — 정의되지 않은 `isMounted` 관련 렌더링 중단 로직을 제거했습니다.
    - [hooks/use-agent-settings.ts](file:///C:/Workspace/Projects/OpenTutorials/hooks/use-agent-settings.ts) — Local Storage 값 로드 시 존재하던 불완전한 `isMounted` 코드를 정비하고 토큰/압축 한계 값을 직접 반환하도록 수정했습니다.
  - **작업 내용**:
    - 다국어 기능을 도입하는 과정에서 클라이언트 단 마운트 체크 여부(`isMounted`)로 인해 서버 SSR 렌더링 시 텍스트와 클라이언트 초기 Hydration 시의 텍스트가 달라져 발생하던 Hydration Mismatch 오류를 근본적으로 해결했습니다. `LanguageContext`는 기본적으로 한국어 리소스를 렌더링하므로 서버와 클라이언트가 항상 일치하게 구성되었습니다.
  - **Concepts**: [[HydrationMismatchFix]], [[I18nLanguageStateRefactoring]], [[SSRSafeTranslation]]

## 2026-07-12 (11th Session)

- **[FEAT/UI] 강좌 관리 화면 내 버전정보 표시 및 실시간 업데이트 버튼 추가 & target_age 규격 표준화**
  - **수정 파일**:
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx)
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx)
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts)
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/guide/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx)
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json)
    - **Submodule (`protocol/`)**:
      - `protocol/protocol.md`
      - `protocol/ai-agent-instructions.md`
      - `protocol/creator-interview-guide.md`
      - `protocol/protocol-changelog.md`
  - **작업 내용**:
    - **버전 정보 표시**: 강좌 관리 목록 내의 각 강좌 카드에 현재 로컬 데이터베이스에 등록된 버전 정보(`v[버전]`) 배지를 렌더링하도록 개선했습니다.
    - **실시간 업데이트 검사 및 업데이트 버튼 연동**: 강좌 상세 페이지 및 검색 페이지에서 사용된 깃허브 `courses.json` 정보 및 로컬 버전 비교 로직(`isVersionNewer`)을 도입하여, 강좌 관리 리스트에서도 실시간으로 업데이트 여부를 감지하도록 했습니다.
    - **버튼 레이아웃 2열(2줄) 개편**: 우측 액션 버튼 영역을 2줄 레이아웃으로 변경했습니다. 첫째 줄에는 `미리보기`와 `삭제` 버튼이 균등 비율로 나란히 들어가며, 둘째 줄에는 `업데이트`(업데이트가 있는 경우) 및 `공개 전환`(비공개인 경우) 버튼이 표출되도록 배치했습니다.
    - **업데이트 진행상황 표시 및 Freezing 오버레이**: 업데이트 시 기존 삭제 오버레이와 통일감 있는 "강좌 업데이트 중" Freezing 오버레이 및 단계별 상태 메세지를 렌더링하여 사용자 경험을 대폭 향상했습니다.
    - **target_age 프로토콜 규격 표준화 (서브모듈 반영)**: 기계/프로그램 처리가 용이하도록 `target_age` 형식을 `all` (전연령), `x+` (x세 이상, 예: `10+`), `min-max` (연령대 범위, 예: `8-13`) 형식으로 규격화했습니다. 서브모듈의 `protocol.md`, `creator-interview-guide.md`, `ai-agent-instructions.md` 문서를 수정하고 `protocol-changelog.md`에 v1.2.0 변경 사양을 기록하여 서브모듈에 커밋 반영했습니다.
    - **애플리케이션 내 target_age 검증 및 디스플레이 적용**: 업로드 시 정규표현식(`/^(all|\d+|\d+-\d+|\d+\+)$/`)을 통해 규격을 사전 및 서버 사이드에서 검증하도록 수정했습니다. 또한 fallback 강좌 정보의 `전연령` 값을 `all`로 수정하고, 수강 상세/대시보드 화면 및 AI 튜터 시스템 프롬프트 가이드에 자연스럽게 노출되도록 포맷팅 처리를 연동했습니다.
  - **Concepts**: [[CourseManageVersionDisplay]], [[CourseManageLiveUpdate]], [[CourseManageTwoRowActions]], [[TargetAgeStandardization]], [[SubmoduleCommitUpdate]]

## 2026-07-12 (10th Session)

- **[FEAT] 강좌 깃허브 검색 버전 비교를 통한 실시간 업데이트 및 상세 페이지 내 업데이트 버튼 추가**
  - **수정 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
  - **작업 내용**:
    - **강좌 검색 버전 비교 및 업데이트 가능 상태 표시**: 강좌 검색 페이지에서 GitHub으로부터 받아온 온라인 강좌 리스트의 버전(`version`)과 로컬 데이터베이스의 강좌 버전을 비교하는 `isVersionNewer` 버저닝 헬퍼 함수를 추가했습니다. 수강 중인 강좌 중 업데이트가 존재할 경우 카드와 상세 모달 다이얼로그에 "업데이트 가능" 배지를 표시하도록 고도화했습니다.
    - **강좌 상세화면 내 업데이트 기능 및 버튼 탑재**: 강좌 상세 페이지에서 동일하게 깃허브 `courses.json` 정보와 로컬 버전을 조회하여 업데이트 가능성을 검사합니다. 최신 버전이 감지되면 "학습 진도율 리셋" 버튼 우측에 "v[최신버전] 업데이트" 버튼을 노출하도록 했습니다.
    - **통합 업데이트 핸들러 구현**: 업데이트 버튼 클릭 시, 기존 강좌 다운로드/임포트/업로드 파이프라인을 재사용하는 `handleUpdateCourse` 함수를 구현하여, 덮어쓰기 방식으로 로컬 데이터베이스 및 파일 시스템의 데이터를 업데이트하도록 조치했습니다.
  - **Concepts**: [[CourseVersionComparison]], [[LiveUpdateChecker]], [[DetailUpdateAction]]

## 2026-07-12 (9th Session)

- **[FEATURE] 에이전트 상세 Chat/Settings 탭 다국어(i18n) 처리 및 에이전트 화면 다국어 처리 완료**
  - **수정/갱신 파일**:
    - [components/features/AgentChatTab.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/features/AgentChatTab.tsx) — `useLanguage` 훅 도입 및 하드코딩된 한국어 안내문, 상태 배지, placeholder 다국어화
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/features/AgentSettingsTab.tsx) — `useLanguage` 훅 도입 및 폼 필드 라벨, 환경 정보, 연결 테스트 결과 다국어화
    - [app/(user)/dashboard/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/client.tsx) — 대시보드 에이전트 요약 카드 내 한국어 텍스트 다국어 교체
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-agents/page.tsx) — 에이전트 관리 목록 UI 다국어 지원 적용
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-agents/[id]/page.tsx) — 에이전트 상세 포털 화면 전체 다국어 번역 키 적용
  - **작업 내용**:
    - AI 에이전트와의 실시간 채팅 탭 및 에이전트 상세 설정 화면을 다국어(i18n) 대응 가능하도록 개선하였으며, 대시보드와 관리 화면 등 에이전트와 관련한 모든 프론트엔드 UI의 번역 누락 사항을 완료했습니다.
  - **Concepts**: [[AgentChatTabI18n]], [[AgentSettingsTabI18n]], [[AgentManagementUIComplete]]

## 2026-07-12 (8th Session)

- **[FEATURE] 다국어 설정 적용 범위 확대 (설정 하위 메뉴, 강좌 학습 화면, 레이아웃 네비게이션, 강좌 번들 업로드)**
  - **수정/갱신 파일**:
    - [app/(user)/settings/profile/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/profile/page.tsx) — 프로필 설정 페이지 다국어 지원 적용
    - [app/(user)/settings/agent/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/agent/page.tsx) — 기본 에이전트 설정 페이지 다국어 지원 적용
    - [app/(user)/settings/course/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/course/page.tsx) — 강좌 학습 설정 페이지 다국어 지원 적용
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 강좌 학습 화면 다국어 지원 적용
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx) — 강좌 번들 파일 업로드 화면 다국어 지원 적용
    - [components/layout/UserHeader.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserHeader.tsx) — 학습 화면 레이아웃 전환 네비게이션 버튼 다국어화
  - **작업 내용**:
    - 사용자가 UI 설정에서 언어 설정을 영어로 선택 시, 사이드바와 설정 UI 외에 실질적인 강좌 수강(학습) 화면 전체와 하위 설정 탭(프로필, 에이전트, 강좌), 강좌 업로드, 헤더의 레이아웃 단추들까지 모두 영어로 전환되도록 완벽히 동기화하였습니다.
  - **Concepts**: [[SettingsSubmenusI18n]], [[LearningClientI18n]], [[UserHeaderLayoutI18n]], [[IntegratedCourseUploadI18n]]

## 2026-07-12 (7th Session)

- **[FEATURE] 다국어(ko/en) 처리 기능 추가 및 프로토콜 language 필드 추가 (v1.2.1)**
  - **수정/갱신 파일**:
    - [lib/locales/ko.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/ko.ts) — 한국어 다국어 리소스 정의
    - [lib/locales/en.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/locales/en.ts) — 영어 다국어 리소스 정의
    - [lib/context/LanguageContext.tsx](file:///C:/Workspace/Projects/OpenTutorials/lib/context/LanguageContext.tsx) — 다국어 상태 관리용 Provider 및 useLanguage 훅 추가
    - [app/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/layout.tsx) — root layout에 LanguageProvider 래핑
    - [app/(user)/settings/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/layout.tsx) — 설정 페이지 레이아웃 다국어화 적용 및 전체 리셋 시 language preference 초기화 로직 추가
    - [app/(user)/settings/ui/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx) — UI 설정에 언어 선택 옵션(한국어/영어) 추가 및 다국어 지원
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx) — 사이드바 메뉴 텍스트 다국어화
    - [protocol/protocol.md](file:///C:/Workspace/Projects/OpenTutorials/protocol/protocol.md) — package-manifest.json 스펙에 language (Optional, ko/en) 필드 규정 (v1.2.1)
    - [protocol/protocol-changelog.md](file:///C:/Workspace/Projects/OpenTutorials/protocol/protocol-changelog.md) — v1.2.1 릴리즈 로그 기록
  - **작업 내용**:
    - 설정 > UI 탭 내에 언어 선택(한국어 / 영어) 기능을 추가하여 기본 한국어 상태에서 변경 시 인터페이스가 해당 언어로 표시되도록 개선했습니다.
    - 강좌 검색 시 언어 필터링이 가능하도록 번들러 프로토콜(`package-manifest.json`)에 `language` 속성을 정의하고 서브모듈에 즉시 반영 및 푸시를 완료했습니다.
  - **Concepts**: [[Internationalization]], [[I18nLanguageProvider]], [[BundlerProtocolV1.2.1]], [[SubmoduleSync]]

## 2026-07-11 (19th Session)

## 2026-07-11 (19th Session)

- **[FEATURE/UI] 강좌 검색 화면 내 강좌 상세 정보 및 목차(TOC) 팝업 다이얼로그 구현 및 레이아웃 스크롤 최적화**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면에서 강좌 카드를 클릭하면 해당 강좌의 상세 정보를 보여주는 프리미엄 스타일의 팝업 다이얼로그(Dialog)를 추가했습니다. 다이얼로그 안에는 상세 설명, 카테고리, 대상 연령, 제작자 프로필(웹사이트 및 이메일 링크), 순차 수강 규정, 체크포인트 강제 여부, 프로토콜 버전, 태그 목록이 종합적으로 표시되며, 수강 여부에 따라 "학습 시작하기", "수강 신청하기", "강좌 다운로드" 액션 버튼을 즉각 호출하고 결과를 실시간 연동하도록 구성했습니다. 또한 **Shadcn UI Accordion**을 활용해 로컬 강좌의 상세 목차를 조회할 수 있게 했습니다. 팝업이 화면 크기를 벗어나거나 내부 이중 스크롤이 발생하는 문제를 방지하기 위해 팝업의 최대 높이를 `85vh`로 한정하고, 상하단 배너/푸터는 `shrink-0`으로 고정된 채 중간의 본문 전체가 부드럽게 스크롤(`flex-1 overflow-y-auto`)되도록 다이얼로그 레이아웃을 고도화했습니다.
    - [lib/types/index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — 공통 `CoursePackage` 인터페이스에 `toc?: TocNode[];` 타입을 추가하여 목차 정보가 안전하게 전달될 수 있도록 보정했습니다.
  - **작업 내용**:
    - 강좌 카드 클릭 시 풍부한 상세 정보와 수강/다운로드 조작을 함께 지원하는 팝업 인터페이스를 설계 및 적용하여 사용자 학습 진입 동선을 크게 개선하고 상세 목차 확인 및 레이아웃 스크롤 구조를 최적화했습니다.
  - **Concepts**: [[DetailDialog]], [[InteractivePopup]], [[UserExperienceEnhancement]], [[AccordionTOC]], [[ScrollOptimization]]

## 2026-07-11 (18th Session)

- **[BUGFIX] 강좌 검색 화면 내 온라인 강좌 카드 저자(author) 정보 미출력 오류 해결**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면에서 원격 GitHub 스토어(`courses.json`) 연동 시 `author` 정보가 객체가 아닌 단순 문자열 형식(예: `"Vivo Academy"`)으로 제공될 경우 카드에 저자 정보가 비어 있는 현상을 방지하도록 수정했습니다. `author` 타입이 문자열인 경우와 객체 형태(`{ nickname, website, email }`)인 경우 모두 유연하게 인식하여 닉네임을 올바르게 표시하도록 코드를 보완했습니다. 추가로, 저자명 기반의 강좌 검색이 문자열 형식일 때도 정상 필터링되도록 검색 조건 필터를 개선했습니다.
  - **작업 내용**:
    - 강좌 카드 내에서 저자명이 표시되지 않던 누락 현상을 해결하고, 저자명 기반 검색 기능이 정상 동작하도록 연동 사양을 수정했습니다.
  - **Concepts**: [[AuthorTypeDifferentiate]], [[CardUIBugfix]], [[RobustDataBinding]]

## 2026-07-11 (17th Session)

- **[UI] 강좌 검색 화면 타이틀 상단 여백 불일치 수정**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면에서 타이틀 헤더 상단 여백이 2배로 넓어지던 원인이었던 절대 위치의 데코레이션 그라디언트 `div`를 컨테이너 하단으로 이동시켰습니다. 또한 해당 `div`에 `!mt-0` 클래스를 부여하여 Tailwind CSS의 `space-y-8` 마진 정책에 영향을 주지 않도록 격리했습니다.
  - **작업 내용**:
    - 타이틀 텍스트의 상단 여백을 다른 대시보드나 나의 강좌 등의 페이지와 동일한 수준(기본 상하 패딩 `py-8` 레이아웃)으로 맞춰 디자인 일관성을 높였습니다.
  - **Concepts**: [[UIPolishing]], [[LayoutConsistency]], [[TailwindSpaceYFix]]

## 2026-07-11 (16th Session)

- **[UI/FEATURE] 강좌 검색 화면 및 강좌 관리 화면 UI 개선 및 출처 표시 기능 추가**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면의 헤더에서 `Search` 아이콘을 제거하고, 강좌 다운로드 시 메타데이터로 `source` 필드(`GITHUB`)를 함께 전송하도록 수정했습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — "새 강좌 등록" 버튼 명칭을 "강좌 파일 업로드"로 변경하고, 등록된 강좌 목록의 카드 내에 `source` 정보를 바탕으로 파일/GITHUB 출처 뱃지를 표시하도록 개선했습니다.
    - [lib/types/index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — `CoursePackage` 인터페이스에 `source?: string | null;` 필드를 신설했습니다.
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts) — 업로드 요청 시 `source` 파라미터를 읽어 데이터베이스에 적재하도록 보완했습니다. (기본값: '파일')
    - [app/api/admin/packages/import-local/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/import-local/route.ts) — 로컬 폴더 복원 등록 시 출처(`source`)를 `GITHUB`로 명시하여 저장하도록 처리했습니다.
  - **작업 내용**:
    - 검색 화면 타이틀 아이콘 제거, 강좌 등록 버튼 이름 현실화, 그리고 강좌별 등록 출처 구분 뱃지(파일/GITHUB)를 목록에 출력하여 로컬/원격 데이터 관리 가시성을 대폭 향상했습니다.
  - **Concepts**: [[UIPolishing]], [[CourseSourceTracking]], [[InterfaceStandardization]]

## 2026-07-11 (15th Session)

- **[UI] 강좌 검색 카드 내 중복 정보("로컬에 있음" 뱃지) 제거**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면 내 온라인 강좌 카드에서 "수강 중" 뱃지가 "로컬에 있음" 뱃지와 유사한 정보를 표기하므로 중복성을 낮추기 위해 "로컬에 있음" 뱃지를 렌더링하는 부분을 삭제했습니다.
  - **작업 내용**:
    - 카드의 뱃지를 "수강 중" 상태만 단독으로 표시되도록 간소화하여 UI 노이즈를 감소시켰습니다.
  - **Concepts**: [[BadgeSimplification]], [[UICleanup]]

## 2026-07-11 (14th Session)

- **[UI] 강좌 검색 카드 레이아웃 정리 및 학습하기 버튼 색상 일관성 확보**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 카드에서 불필요하게 여백을 만들던 빈 `CardContent` 컴포넌트를 제거하고, 기존에 카드 하단에 위치하던 작성자(author) 정보(닉네임, 웹사이트, 이메일 링크)를 `CardHeader` 내부의 `CardDescription` 바로 하단으로 재배치하여 정보 가독성을 높이고 여백을 최적화했습니다. 또한, '학습하기' 버튼을 대시보드와 수강 신청 상태의 초록색 버튼 디자인(`bg-green-700 hover:bg-green-800 ...`)과 일관되게 녹색 톤으로 수정했습니다.
  - **작업 내용**:
    - 강좌 카드 내 작성자 정보 위치 이동 및 여백 축소, '학습하기' 버튼 테마를 녹색으로 일관화하여 카드 UI 시각 효과를 극대화했습니다.
  - **Concepts**: [[CardLayoutOptimization]], [[ColorConsistency]]

## 2026-07-11 (13th Session)

- **[UI] 강좌 검색 화면 내 카드의 뱃지 정렬 방식 개선**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면의 강좌 카드에서 뱃지(로컬에 있음, 수강 중)들이 표시되는 레이아웃을 기존의 우측 상단 2열(세로) 배치에서 좌측 상단 1열(가로) 배치로 수정하여 시각적인 가시성을 개선했습니다.
  - **작업 내용**:
    - 강좌 카드의 뱃지들을 가로로 나란히 표시되도록 정렬 방식을 `absolute top-2.5 left-2.5 flex flex-row gap-1.5 items-center`로 조정했습니다.
  - **Concepts**: [[BadgeLayoutImprovement]], [[CardUIPolishing]]

## 2026-07-11 (12th Session)

- **[AESTHETICS] 강좌 검색 화면의 카드 스타일을 대시보드 카드 스타일과 일치화**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 화면 내 온라인 강좌 카드의 JSX 구조와 Tailwind CSS 클래스명을 대시보드의 "학습 중인 강좌" 리스트 카드와 동일하게 통일했습니다. 썸네일 높이를 32(`h-32`)로 맞추고, `CardHeader`와 `CardContent` 컴포넌트를 적용했으며, 푸터의 레이아웃 및 버튼 디자인도 동일하게 `pt-3 pb-3 border-t bg-muted/10`를 활용하도록 수정했습니다. 또한 상단에 사용되는 `CardHeader`, `CardTitle` 컴포넌트를 `import` 구문에 추가했습니다.
  - **작업 내용**:
    - 강좌 검색 화면의 카드 UI를 대시보드의 진행 중 강좌 카드 디자인과 완벽하게 동일하도록 동기화하여 서비스 전반의 시각적 일관성과 사용자 경험을 향상시켰습니다.
  - **Concepts**: [[CardUIStandardization]], [[DesignSystemAlignment]], [[VisualConsistency]]

## 2026-07-11 (11th Session)

- **[BUGFIX] 강좌 검색 화면 내 온라인 강좌 ZIP 다운로드 404 및 오프라인 등록 실패 해결**
  - **수정/갱신 파일**:
    - [app/api/admin/packages/import-local/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/import-local/route.ts) — 로컬 폴더(public/courses/[slug])에 강좌 리소스가 이미 존재하는 경우, ZIP 파일을 원격에서 다운로드하지 않고 로컬 디렉토리 내의 config.json, wiki.md 파일을 직접 분석하여 로컬 데이터베이스(db.json)에 등록할 수 있는 `import-local` API를 새로 신설했습니다.
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 다운로드 및 수강 신청 버튼 클릭 시, 원격 GitHub 저장소로부터 ZIP 파일을 다운로드하기에 앞서 로컬 복원/등록 API를 먼저 호출하여 이미 로컬에 적재된 강좌 폴더로 즉시 오프라인 등록 처리되도록 흐름을 보완했습니다. 로컬에 폴더가 존재하지 않는 경우에만 원격 ZIP 다운로드로 안전하게 폴백(Fallback)합니다.
  - **작업 내용**:
    - "아두이노 IoT 프로젝트 마스터 클래스"(`iot-communication`) 등 GitHub 원격 저장소에 ZIP 파일이 누락되어 "강좌 ZIP 파일을 다운로드하지 못했습니다." 콘솔 에러가 발생하던 현상을 로컬 리소스를 즉시 검출하여 등록하는 온디바이스 친화적인 임포트 파이프라인으로 개선 및 버그 수정 완료했습니다.
  - **Concepts**: [[LocalPackageImport]], [[DownloadOfflineFallback]], [[RobustOnDeviceCourseOnboarding]]

## 2026-07-11 (10th Session)

- **[CLEANUP] 강좌 관리 화면 내 "GITHUB 에서 추가" 섹션 및 관련 코드 제거**
  - **수정/갱신 파일**:
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — "GITHUB 에서 추가" 섹션 카드를 제거하고 전체 등록 강좌 목록을 표시하도록 단일 카드 형태로 구조를 변경했습니다. 또한 사용하지 않는 `github_url` 필터링 로직 및 `Github`, `CheckCircle2` 아이콘 임포트 코드를 제거하고 화면 헤더 설명문 문구를 현실화했습니다.
    - [lib/types/index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — `CoursePackage` 인터페이스에서 더 이상 사용되지 않는 `github_url?: string | null;` 타입을 정리했습니다.
  - **작업 내용**:
    - "강좌 관리" 화면 내의 사용하지 않는 GitHub 연동 목록 UI와 관련 필터링 로직 및 불필요해진 `github_url` 타입 정의를 정리하여 전체 프로젝트 코드 및 관리 화면의 명확성과 관리성을 향상시켰습니다.
  - **Concepts**: [[CourseManagementCleanup]], [[InterfaceSimplification]]

## 2026-07-11 (9th Session)

- **[BUGFIX] 강좌 검색 화면 내 온라인 강좌 목록 로드 에러 및 UI 개선**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — GitHub 공식 저장소에서 `courses.json`을 가져오는 중 오류(네트워크 미연결 등) 발생 시 Next.js 에러 바운더리나 콘솔 에러가 발생하지 않도록 `console.warn` 및 안전한 오프라인 폴백(`useOfflineFallback`) 흐름으로 처리되도록 개선했습니다. 또한 "GitHub 강좌 저장소 연동" 배너를 제거하고, 화면의 타이틀 아이콘을 `Compass`에서 `Search`로 변경했으며, 상대 경로 `downloadUrl`을 GitHub 공식 저장소 절대 경로로 자동 보간되도록 개선했습니다.
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx) — 사이드바의 "강좌 검색" 아이콘을 `GraduationCap`에서 `Search`로 변경하여 메인 화면과 일체감을 높였습니다.
    - [lib/constants/routes.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/constants/routes.ts) — 라우트 상수 `SIDEBAR_ITEMS` 배열 내의 "강좌 검색" 아이콘 명칭을 `Search`로, "강좌 관리" 아이콘 명칭을 `Wrench`로 동기화했습니다.
  - **작업 내용**:
    - 온라인 강좌 연동 실패 시의 에러 전파 제어 및 강좌 검색 화면 내 불필요한 배너를 지우고 아이콘 메타데이터를 통일하는 UI/UX 정교화 작업을 진행했습니다.
  - **Concepts**: [[ErrorGracefulDegradation]], [[UICleanup]], [[IconConsistency]]

## 2026-07-11 (8th Session)

- **[FEATURE] 강좌 검색 화면 내 온라인 강좌 목록 즉시 노출 최적화**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 화면의 로딩 조건에서 로컬 DB 쿼리(`loading`) 완료 대기 조건을 제외하고, 오직 원격 `courses.json` 페칭(`onlineLoading`) 상태에만 반응하여 스켈레톤을 걷어내도록 개선했습니다.
  - **작업 내용**:
    - 사용자가 강좌 검색 화면에 진입하자마자 로컬 API 딜레이에 영향을 받지 않고 GitHub 스토어 강좌 목록이 즉각적으로 렌더링되도록 초기 렌더링 성능을 개선했습니다.
  - Concept: [[UserExperienceOptimization]], [[ParallelDataFetching]], [[FastInitialRender]]

## 2026-07-11 (7th Session)

- **[FEATURE] 강좌 검색 화면 내 탭 바 삭제 및 GitHub 스토어 연동 전용 화면 개편**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 강좌 검색 페이지에 존재하던 "전체 강좌", "수강 중", "미수강", "내가 만든 강좌" 탭과 관련 필터링 상태(selectedTab)를 삭제했습니다. 로컬 강좌 등록을 위한 "직접 강좌 등록" 버튼과 "새 강좌 만들기" 다이얼로그 팝업(관련 state, handleCreateCourse 등) 역시 제거하여 해당 화면의 책임을 GitHub 저장소 연동 및 다운로드 스토어로 단일화했습니다. 화면 진입 시 GitHub Browser Repo(`courses.json`)에서 강좌 목록을 무조건 동기화해 렌더링하도록 흐름을 대폭 단순화했습니다.
  - **작업 내용**:
    - 강좌 검색 화면을 오직 GitHub 원격 저장소(`OpenTutorials-Browser`)와 연동하여 강좌를 검색, 다운로드 및 로컬 DB에 자동 등록하는 용도로 단순화 및 정립했습니다.
  - **Concepts**: [[GitHubCourseStoreSync]], [[SearchPageSimplification]], [[SingleResponsibilityPattern]]

## 2026-07-11 (6th Session)

- **[FEATURE] 강좌 공유하기 기능 전면 삭제 및 GitHub 공식 저장소 연동 강화**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — 원격 Supabase 스토리지 및 Edge Function을 통해 PR을 날리던 로컬 강좌 공유(기여) 기능을 제거했습니다. 사용되지 않는 `JSZip` 임포트, Mock Supabase 클라이언트, 관련 state 변수와 다이얼로그 모달을 삭제하여 코드를 슬림화했습니다. 또한 "공유 강좌 스토어" 탭의 명칭을 "GitHub 강좌 스토어"로 개선하고, 공식 GitHub 저장소([OpenTutorials-Browser](https://github.com/godstale/OpenTutorials-Browser)) 정보와 안내 배너를 추가하여 온라인 강좌 검색 및 다운로드 등록 사용성을 강화했습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — 강좌 관리 목록 내의 "공유하기" 액션 버튼을 제거하고, 관련 state, handleShareCourse 함수, 다이얼로그 모달 마크업을 완전히 걷어냈습니다.
  - **작업 내용**:
    - 복잡도가 높고 로컬-온디바이스 방향성에 어긋나던 원격 업로드 공유 기능을 정리하고, 대신 공식 GitHub 저장소와 연동된 강좌 검색 및 다운로드, 로컬 DB 등록 기능에 초점을 맞추어 사용자 흐름과 UI를 더욱 직관적으로 가다듬었습니다.
  - **Concepts**: [[ShareFunctionalityRemoval]], [[GitHubCourseStoreSync]], [[OnDeviceCourseOnboarding]]

## 2026-07-11 (5th Session)

- **[FEATURE] 원격 공유 강좌 검색/다운로드 및 로컬 강좌 원격 저장소 기여(공유) 기능 구현**
  - **수정/갱신 파일**:
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — "공유 강좌 스토어" 탭을 신설하고 원격 저장소(`OpenTutorials-Browser`)에 배포된 `courses.json`을 연동해 온라인 강좌를 실시간 검색할 수 있게 했습니다. 로컬에 없는 강좌는 원클릭으로 ZIP을 다운로드하여 자동 로컬 등록 및 수강신청이 가능하도록 구현했으며, "내가 만든 강좌"를 포함해 자신이 만든 로컬 강좌 카드의 하단 액션 버튼 영역에도 원격 저장소 "공유" 기능과 제출 진행률 다이얼로그 플로우를 동일하게 추가 탑재했습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — 로컬에서 제작한 강좌에 대해 "공유하기" 버튼을 배치했습니다. 클릭 시 로컬 스토리지에 보관 중인 강좌 리소스들(config.json, mdx 카드 파일, wiki.md 등)을 긁어모아 클라이언트 단에서 `JSZip`을 사용해 번들 ZIP을 만들고, 실제 Supabase Storage의 임시 버킷에 익명 업로드 후, Supabase Edge Function을 호출해 기여용 GitHub Pull Request(PR) 생성을 완료하는 진행률 기반의 다이얼로그 플로우를 구축했습니다.
  - **작업 내용**:
    - 일반 사용자가 자신이 구축한 로컬 강좌를 원격 저장소에 쉽고 안전하게 업로드하여 기여할 수 있는 연동 파이프라인을 완성하고, 동시에 원격 강좌들을 검색해 원클릭으로 다운로드 및 로컬 등록까지 이르는 온디바이스 클라이언트 에코시스템을 구축했습니다.
  - **Concepts**: [[RemoteCourseCatalogSync]], [[CourseBundleZipping]], [[AnonymousCourseContribution]], [[SupabaseStorageEdgeFunctionIntegration]]

## 2026-07-11 (4th Session)

- **[BUGFIX] 새 강좌 번들 직접 등록 화면에서 사전 유효성 검증 실패 시 브라우저 콘솔에 빈 객체 `{}`만 표시되던 로직 개선**
  - **수정/갱신 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx) — 사전 검증(`runPreValidation`) 도중 예외가 발생할 때 `console.error`에 `err`만 그대로 넘기지 않고 `message`, `stepId`, `stack`, `raw` 속성으로 구조화한 상세 객체를 출력하도록 개선했습니다. 이를 통해 `{}`로만 출력되어 에러 원인을 추적하기 어렵던 현상을 해결하고, 실제 에러의 원인 속성과 스택 트레이스를 콘솔에서 명확히 인지할 수 있도록 보완했습니다.
  - **Concepts**: [[ValidationErrorLogging]], [[ConsoleErrorDetailedDisplay]]

## 2026-07-11 (3rd Session)

- **[FEATURE] Bundler Protocol v1.1.1 업데이트 및 강좌 패키지 직접 업로드 내 작성자(author) 정보 유효성 검증 적용, 기존 강좌 필드 업데이트 및 카드 저자 노출 기능 추가**
  - **수정/갱신 파일**:
    - [protocol/](file:///C:/Workspace/Projects/OpenTutorials/protocol) — Git Submodule을 최신 커밋(`9bbb309`)으로 업데이트하여, `package-manifest.json` 내 `author` 필드가 필수(Mandatory)로 추가된 v1.1.1 프로토콜 명세 사양을 반영했습니다.
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json) — 기존 등록되어 있는 2개의 강좌 패키지("아두이노 IoT 프로젝트 마스터 클래스", "신경망과 LLM 개론")에 새로 생긴 필드값(`author` 객체 정보: nickname은 Kailash, email은 godstale@hotmail.com, 홈페이지는 null 및 `bundler_protocol_version: "1.1.1"`)을 적재/최신화하였습니다.
    - [lib/types/index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — `CourseAuthor` 인터페이스 타입을 추가하고 `CoursePackage` 내에 `author`, `author_id`, `author_nickname`, `author_email`, `author_homepage`, `bundler_protocol_version` 필드를 추가하여 최신 프로토콜 명세를 TypeScript 인터페이스 수준에서 동기화했습니다.
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx) — 강좌 패키지 ZIP 직접 등록 화면 내의 클라이언트 사이드 매니페스트 유효성 검증(`manifest-fields` 스텝) 시 `author` 객체 정보의 누락 및 `author.nickname` 값의 누락 여부를 판단하는 필수 검증 로직을 추가했으며, 등록 완료 전 분석 결과 UI에 작성자의 닉네임, 이메일, 블로그/홈페이지 주소를 함께 노출하도록 사용자 경험(UX)을 개편했습니다.
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts) — 백엔드 패키지 업로드 API 라우터에 `author` 필드 누락 검증을 신설하고, 로컬 데이터베이스(`db.json` 내 `course_packages` 테이블)에 강좌 패키지를 Upsert 할 때 `author` 원본 및 `author_nickname`, `author_email`, `author_homepage` 필드가 모두 올바르게 적재되도록 연동 로직을 고도화했습니다.
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/guide/page.tsx) — 강좌 제작 가이드 페이지 내 `package-manifest.json` 예시 구조와 필수 유효성 검증 가이드라인을 최신 v1.1.1 프로토콜 버전 및 `author` 정보 필수화 기준에 맞추어 전면 보완했습니다.
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx) — 대시보드 내 "학습 중인 강좌" 카드 목록에 저자 닉네임을 표시하는 레이아웃을 구현하고 `User` 아이콘(lucide-react)을 연동했습니다.
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — "나의 강좌" 내 수강 중인/완료한 강좌 카드에 `author_nickname`을 표기하는 메커니즘을 신설하고 인터페이스 타입을 동기화했습니다.
    - [app/api/packages/subscribe/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/subscribe/route.ts) & [app/api/courses/subscribe/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/subscribe/route.ts) — 구독 강좌 패키지 목록 조회 GET API의 반환 객체 정보에 `author_nickname` 필드가 정상적으로 반환되도록 Response 포맷 구조를 최신화했습니다.
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 개별 강좌 상세 페이지 최상단 헤더 카드에 저자 정보 닉네임 및 `User` 아이콘을 추가하여 통일성을 유지했습니다.
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx) — "강좌 관리" 리스트 화면에 저자(닉네임) 정보를 표시하는 영역을 추가하고 `PackageItem` 인터페이스 정의에 관련 정보를 보완했습니다.
  - **작업 내용**:
    - 외부 강좌 빌더 및 배포 에코시스템과의 호환성을 위한 Open Tutorials Course Bundler Protocol v1.1.1 변경 사양(`author` 정보 필수 지정 규칙)을 클라이언트와 백엔드 API, 가이드 화면 전 영역에 걸쳐 신속하게 업데이트 및 유효성 검증을 완성하여 에코시스템 안정성을 유지했습니다.
  - **Concepts**: [[BundlerProtocolUpgrade]], [[AuthorMetadataValidation]], [[CourseEcosystemCompatibility]], [[CourseCardAuthorDisplay]]

## 2026-07-11 (2nd Session)

- **[CHORE] OpenTutorials-Protocol Git Submodule 연동 및 문서 이관**
  - **수정/갱신 파일**:
    - [.gitmodules](file:///C:/Workspace/Projects/OpenTutorials/.gitmodules) — 외부 리포지토리(`OpenTutorials-Protocol`)를 `protocol/` 경로로 서브모듈로 신규 등록했습니다.
    - [protocol/](file:///C:/Workspace/Projects/OpenTutorials/protocol) — (신규 서브모듈) 프로토콜 정의 및 공용 지침 문서들을 포함하고 있습니다.
    - [.agents/rules/bundler-protocol.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/bundler-protocol.md) — 프로토콜 문서의 참조 경로를 기존 `docs/bundler/`에서 서브모듈인 `protocol/` 하위 경로로 수정하여 빌더 동작 검증 경로를 최신화했습니다.
    - [.gitignore](file:///C:/Workspace/Projects/OpenTutorials/.gitignore) — 서브모듈로 대체되어 삭제된 `docs/bundler/` 예외 규칙을 제거했습니다.
  - **작업 내용**:
    - 강좌 번들링에 사용되는 공식 프로토콜 문서를 외부 에이전트 및 번들러 프로젝트와 손쉽게 공유하고 최신 버전으로 관리할 수 있도록, 공용 GitHub 리포지토리(`OpenTutorials-Protocol`)를 서브모듈 형태로 연동했습니다.
    - 기존 로컬 프로젝트 내부에서 개별적으로 들고 있던 `docs/bundler/`의 사본 문서들을 완전히 제거하고, 서브모듈 `protocol` 내의 단일 진실 공급원(Single Source of Truth) 문서를 참조하게 하여 협업 및 버전 관리 효율을 극대화했습니다.
  - **Concepts**: [[GitSubmoduleIntegration]], [[ProtocolSubmoduleMigration]], [[SingleSourceOfTruthDocs]]

## 2026-07-11 (1st Session)

- **[FEATURE] 강좌 검색 브라우저 및 직접 등록 기능 구현, 설정 내 프로필 서브메뉴 추가**
  - **수정 파일**:
    - [app/(user)/settings/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/layout.tsx) — 설정 페이지의 프로필 서브메뉴 링크(User 아이콘) 주석 해제하여 활성화.
    - [app/(user)/settings/profile/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/profile/page.tsx) — 닉네임(필수), 이메일, 홈페이지 URL을 입력 및 수정할 수 있고, 로컬 DB `user_profiles`에 저장 및 연동하는 미려한 프로필 편집 카드 UI 구현.
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx) — "강좌 검색 기능 준비 중" Coming Soon 화면을 대체하여 전체 강좌 검색, 수강 여부 필터 탭(전체/수강 중/미수강/내가 만듦), 수강 신청 처리, 직접 새 강좌를 입력하여 local-db 및 storage(config.json, welcome.mdx)에 동적으로 등록하는 프리미엄 강좌 검색 & 생성 대시보드로 전면 개편.
  - **작업 내용**:
    - 사용자가 닉네임과 홈페이지, 이메일을 프로필에 설정하면 이를 작성자(제작자) 정보로 연동하여 즉각적으로 새로운 강좌를 직접 만들고 수강신청을 거쳐 바로 학습할 수 있는 엔드투엔드 온디바이스 강좌 생태계 순환 고리를 완성하였습니다.
  - **Concepts**: [[ProfileSettingsSubmenu]], [[LocalUserProfiles]], [[CourseSearchAndBrowser]], [[DirectCourseCreationDialog]]

## 2026-07-10 (2nd Session)

- **[FEATURE] 강좌 진입 및 카드 이동 시 대화 히스토리 자동 초기화 및 시스템 점검(Handshake) 메시지의 DB 저장 차단**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 
      1) `currentCardIndex`, `agentId`가 변경될 때 트리거되는 `useEffect`를 추가하여, 강좌 화면에 처음 진입하거나 카드를 이동할 때 UI의 대화 상태(`messages`)를 웰컴 메시지로 리셋하고 백엔드 DB의 대화 히스토리(`DELETE` API 호출)를 자동으로 삭제하도록 개선했습니다.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/external-agents/[id]/chat/route.ts) — 
      1) 강좌 첫 진입 시 구동환경 및 파일 준비 상태를 체크하기 위해 전송하는 `[시스템 점검]` 매개체/핸드셰이크 메시지 및 그에 따른 AI 응답이 DB(`user_external_agent_messages` 테이블)에 저장되지 않도록 필터링 규칙을 적용했습니다.
  - **작업 내용**:
    - 로컬 LLM 에이전트(Ollama, LM Studio 등)를 연동하여 사용할 때, 무거운 프롬프트로 인해 답변 생성이 극도로 지연되거나 타임아웃되는 것을 예방하기 위해 프롬프트 전송 맥락을 효율화했습니다.
    - 강좌 진입 시 백그라운드로 작동하는 자동 `[시스템 점검]` 통신 및 답변 내역이 DB 대화 이력에 남지 않도록 차단하여, 사용자가 첫 질문을 던질 때 불필요한 시스템 안내 텍스트가 대화 히스토리에 포함되는 문제를 원천 차단했습니다.
    - 또한 사용자가 강좌 내에서 카드 사이를 이동(단원 이동)하거나 페이지를 새로 진입하는 경우, 이전 카드의 Q&A 이력이 다음 카드로 넘어가지 않도록 자동으로 DB 및 UI 대화 이력을 초기화해 줌으로써 매 카드마다 가볍고 고도로 집중된 컨텍스트 환경에서 질의응답을 수행할 수 있도록 개선했습니다.

## 2026-07-10 (1st Session)

- **[BUGFIX/LOG] 로컬 LLM(LM Studio) 연동 시 답변 중단 및 타임아웃 분석을 위한 디버깅 로그 추가 및 Next.js Route Handler Execution Timeout 설정 보강**
  - **수정/갱신 파일**:
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/external-agents/[id]/chat/route.ts) — 
      1) Next.js API Route Handler에 `maxDuration = 300` 및 `dynamic = 'force-dynamic'` 설정을 추가하여 호스팅 플랫폼 및 서버 단에서의 조기 타임아웃 차단을 보완했습니다.
      2) 요청 접수, DB 조회 결과, LM Studio 연결 시작, Response Header 수신 시간, Time-to-First-Token(TTFT) 소요 시간, 클라이언트 중단 감지(`req.signal.aborted`), 스트림 청크 개수 및 완료/실패 여부를 백엔드 콘솔 터미널에 상세하게 출력하도록 풍부한 로그 작성을 적용했습니다.
  - **작업 내용**:
    - 질문 입력 후 로컬 LLM(LM Studio)의 동작 상태에도 불구하고 답변이 중단되는 주된 원인은 누적된 대화 기록(최대 100개)으로 인한 Prompt Ingestion/Processing 연산의 극심한 지연(TTFT 지연) 때문입니다.
    - 백엔드 서버나 게이트웨이, 브라우저가 첫 토큰 수신 대기 임계값(Timeout)을 초과하여 연결을 차단(Abort)하는 문제를 파악할 수 있도록, 연결의 세부 구간별 성능 지표와 취소 시그널을 감지하는 디버깅 로그를 심어 개발자와 사용자가 지연 구간을 추적하기 쉽게 개선했습니다.

## 2026-07-09 (7th Session)

- **[FEATURE] AI 대화창 내 첫 안내 메시지 복사 버튼 제거, 입력창 placeholder 내 프롬프트 사용량(%) 표시 및 로컬 LLM 에이전트(Ollama/LM Studio) 대상 자료 다운로드 체크 우회 구현**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 
      1) 첫 안내 메시지(id: '1')인 경우 하단 복사 버튼이 노출되지 않도록 조건을 추가했습니다.
      2) 답변이 완료되는 시점에 전체 프롬프트 토큰과 최대 토큰 한도를 기반으로 점유 비율을 계산하고, 대화 입력창 placeholder에 실시간 프롬프트 사용량(예: `[프롬프트 사용량: 40%]`)이 출력되도록 상태(`promptUsage`)와 placeholder 바인딩 로직을 개선했습니다. 대화가 초기화(`handleClearChat`)될 때는 해당 사용량 표시도 함께 리셋됩니다.
      3) `agentProgram`, `isLlmAgent`, `currentAgentData` 상태를 추가하여 Ollama, LM Studio 등 순수 LLM 에이전트를 더욱 견고하게 식별(에이전트 타입/프로그램 지정 방식뿐만 아니라, endpoint 포트 `11434` / `1234` 및 모델명 `gemma`/`llama`/`mistral`/`qwen`/`phi` 포함 여부를 포괄적으로 판별하고, 렌더링 틱 지연 방지를 위해 `currentAgentData` 객체의 `agent_type`을 직접 교차 검증)하도록 구성했습니다. 해당 LLM 에이전트 연동 시 강좌 자료 다운로드 점검 프로세스를 생략하고, UI의 다운로드 관련 상태 뱃지들("자료 다운로드 오류/미완료", "자료 준비 완료", "자료 준비 상태 확인 중..." 등)을 완벽히 차단하여 노출되지 않도록 조치했습니다.
  - **작업 내용**:
    - AI 대화방의 첫 번째 웰컴 메시지는 복사할 필요성이 낮아 UI 간소화 목적으로 복사 아이콘과 텍스트 버튼이 나타나지 않도록 수정했습니다.
    - AI의 응답 완료 시점에 예상 토큰 크기(`estTokens`)를 계산하여 입력 필드 placeholder에 `[프롬프트 사용량: N%]` 정보를 노출해, 사용자가 대화 맥락이 얼마나 차오르고 있는지(그리고 언제 압축이 임박할지) 쉽게 가늠하도록 안내 메시지를 보강했습니다.
    - Ollama, LM Studio 등의 순수 LLM 에이전트는 로컬에 강좌 파일을 직접 다운로드하여 분석하는 기능(Hermes 에이전트 기반)을 수행할 필요가 없으므로 불필요한 시스템 자료 점검 통신을 스킵하고 UI에서도 사용자에 혼란을 줄 수 있는 다운로드 경고창을 제외시켰습니다. 포트나 모델명 기반의 포괄적인 판별과 직접적인 객체 검증(cross-validation)을 더해 에이전트 등록 형식이나 React 상태 업데이트 틱 지연에 구애받지 않고 오작동을 차단합니다.

## 2026-07-09 (6th Session)

- **[BUGFIX] 학습 대화창 내 중복 Key(동일 타임스탬프) 충돌 경고 해결**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 고유 ID를 생성하는 `generateUniqueId` 유틸리티 함수를 추가하고, 메시지(ChatMessage) 객체의 `id` 값 생성 시 기존 `Date.now().toString()`을 대신해 이를 사용하도록 수정했습니다.
  - **작업 내용**:
    - 학습 대화창에서 질문 전송 시 유저 메시지와 에이전트 상태 메시지가 동일한 밀리초(Tick) 내에 생성되어 React 렌더링 루프(`key={msg.id}`)에서 중복 키 충돌 경고(`Encountered two children with the same key`)가 발생하는 버그를 해결했습니다. 타임스탬프에 난수 서픽스(base-36)를 조합하여 완벽한 고유 키를 보장합니다.

## 2026-07-09 (5th Session)

- **[UI] 설정 페이지 내 준비 중인 비활성화 카드 제거**
  - **수정/갱신 파일**:
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/agent/page.tsx) — 하단에 불필요하게 '추후 제공 예정'으로 표시되던 '알림 및 크론 설정' 카드와 '에이전트 연동 관리' 카드를 제거했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/course/page.tsx) — 하단에 '추후 제공 예정'으로 표시되던 '학습 환경 설정' 카드를 제거했습니다.
  - **작업 내용**:
    - 설정 각 탭 페이지에서 현재 동작하지 않거나 비활성화 상태인 레이아웃 자리차지용(opacity-60, 추후 제공 예정) 카드 요소들을 제거하여 UI의 군더더기를 없애고 사용성 혼란을 해소했습니다.

## 2026-07-09 (4th Session)

- **[FEATURE] AI 튜터 설정 내 자동 프롬프트 압축 시작 임계값(Threshold) 설정 기능 추가 및 불필요 알림 삭제**
  - **수정/갱신 파일**:
    - [use-agent-settings.ts](file:///C:/Workspace/Projects/OpenTutorials/hooks/use-agent-settings.ts) — 에이전트 설정 훅에 자동 압축 시작 비율(compressionThreshold)을 관리하는 로컬 상태 및 localStorage 로직을 추가했습니다. (기본값: 80)
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/layout.tsx) — 설정 페이지 전체 리셋 클릭 시 `open-tutorials-agent-compression-threshold` 키도 함께 삭제되도록 수정했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/agent/page.tsx) — 설정 > 에이전트 화면에 자동 압축 시작 임계값(Compression Threshold)을 선택할 수 있는 Select(50% ~ 80%) UI와 변경 내역을 저장하는 핸들러를 추가하고, 화면 최상단의 불필요한 알림 배너(Alert) 및 사용되지 않는 아이콘/컴포넌트 임포트를 삭제했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 기존에 80%(0.8)로 하드코딩되어 있던 에이전트 토큰 초과 시의 자동 압축 판단 로직에 사용자가 설정한 `compressionThreshold` 값을 참조하여 동적으로 자동 대화 요약/압축을 트리거하도록 리팩토링했습니다.
  - **작업 내용**:
    - AI 튜터 학습 환경의 유연성을 높이기 위해 사용자가 직접 프롬프트 크기 임계값 비율을 50% ~ 80% 사이에서 직접 커스터마이징할 수 있는 설정을 구현했습니다.
    - 설정 페이지와 실시간 학습 화면 간의 상태 동기화를 위해 localStorage와 커스텀 훅을 통해 설정값을 전달하도록 설계하였습니다.
    - UI 가독성을 향상시키기 위해 에이전트 설정 페이지 최상단에 존재하던 과도한 파란색 알림(Alert) 배너를 완전히 제거했습니다.

## 2026-07-09 (3rd Session)

- **[FEATURE] 강좌 번들 프로토콜 기반 AI 튜터 시스템 프롬프트 및 맥락 주입 효율화 개선**
  - **수정/갱신 파일**:
    - [index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — `CoursePackage` 인터페이스에 강좌 번들 명세(v1.1.0)에 따르는 대상 연령대(`target_age`)와 카테고리(`category`) 필드를 추가하여 타입 안정성을 마련했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 중복해서 하드코딩되던 시스템 프롬프트 조립 로직을 단일화하기 위해 `buildSystemPrompt` 및 `buildCurrentCardContext` 헬퍼 함수를 추가하고, `sendMessage` 및 `Calculate estimated token size` 블록에서 이 헬퍼를 공통 호출하도록 리팩토링했습니다.
  - **작업 내용**:
    - **연령대 및 카테고리 맞춤 설명 어조 적용**: `coursePackage`에서 전달되는 `target_age`와 `category`, `tags` 정보를 파싱하여 튜터의 말투와 설명 깊이를 자동 조정하도록 AI 지침을 추가했습니다. (예: 초등학생 대상 시 쉽고 비유적인 아날로지를 사용하도록 지시)
    - **동영상 카드 자막 정제 주입**: 동영상 카드(`.json` 타입) 수강 시, 지저분한 원본 JSON 파일 전체를 프롬프트에 주입하는 대신 `subtitles` 배열에서 시간별 자막 텍스트만 추출 및 스크립트 형태로 정제하여 `Content`로 전달하도록 개선하여 토큰 절약 및 영상 내용 이해도를 극대화했습니다.
    - **학습 진행 정보 및 TOC 설명 연동**: 학생의 현재 학습 진행률(Card N of M / % 완료) 및 현재 속한 목차(`toc` 노드)의 챕터/섹션 제목과 단원 학습 목표(`description`)를 AI 튜터가 상시 인지할 수 있도록 프롬프트 맥락을 고도화했습니다.

## 2026-07-09 (2nd Session)

- **[FEATURE] AI 튜터 및 에이전트 대화창 마크다운 표(Table) 렌더링 구현 및 학습 화면 최상단 레이아웃 선택기 중앙 정렬**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — AI 튜터 답변에서 마크다운 형태의 표(`| ... | ... |`)가 전달되었을 때, 텍스트 그대로 노출되는 대신 정형화된 HTML Table 컴포넌트로 파싱 및 렌더링하도록 뷰 로직을 보완했습니다. 테이블 내 정렬 구분자(`:---`, `---:`, `:---:`)에 따라 셀 텍스트를 좌측/우측/중앙 정렬하도록 CSS 정렬 클래스를 동적으로 주입하며, 셀 내부 텍스트에도 볼드(**), 인라인 코드(\`), 마크다운/일반 링크 렌더링이 재귀적으로 올바르게 결합되도록 `renderInlineFormatting` 및 `parseTablesAndText` 파서 유틸리티를 적용했습니다.
    - [AgentChatTab.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/features/AgentChatTab.tsx) — 에이전트 상세 설정 화면 내 에이전트 채팅 탭에서도 학습 창과 동일한 마크다운 테이블 파싱 및 렌더링 스키마를 탑재하여 일관된 AI 튜터 렌더링 외관을 제공하도록 수정했습니다.
    - [UserHeader.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserHeader.tsx) — 학습 화면 최상단 헤더에 위치한 레이어(레이아웃) 선택 컴포넌트가 좌측 정렬되어 쏠려있던 레이아웃을 3분할 Flex 컨테이너 구조로 수정하여 화면 가로축의 정중앙에 올바르게 배치되도록 변경했습니다.
  - **작업 내용**:
    - AI가 지식을 표(Table) 형식으로 전달할 때, 텍스트 원본 데이터가 날것 그대로 노출되던 문제를 분석하고, `react-markdown` 의존성을 늘리지 않고 기존 파싱 흐름을 보완하는 경량 라인 바이 라인(Line-by-Line) 테이블 파서 및 렌더러를 개발했습니다.
    - 가로로 길어지는 테이블의 경우 대화창 레이아웃이 붕괴하는 것을 차단하기 위해 `overflow-x-auto max-w-full` 스크롤 뷰 컨테이너를 배치하고 테이블 구조에 세련된 테일윈드 스타일(zinc border, zebra-striping hover, font-semibold header bg 등)을 입혔습니다.
    - 학습 화면(`isLearnPage === true`)에서 상단 레이아웃 선택 컴포넌트(3단 보기 등)의 시인성 및 대칭 균형을 높이기 위해 좌측 사이드바 트리거 공간과 우측 사용자 아바타 공간에 각각 `flex-1`을 배정하고 컴포넌트를 `flex-none` 중앙 영역에 안착시켜 완벽한 중앙 정렬을 달성했습니다.

## 2026-07-09 (1st Session)

- **[FEATURE] AI 튜터 채팅 기록 초기화, 말풍선 시간/복사 기능 및 AI 에이전트 기반 자동 컨텍스트 압축 구현**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — AI 튜터 컬럼 헤더에 `Trash2` 아이콘을 연동한 `채팅 지우기` 버튼을 배치했습니다. 클릭 시 로컬 상태의 메시지 기록을 초기화하고 DB 대화 내역(`DELETE /api/external-agents/[id]/messages`)을 리셋하여 질문 시 이전 히스토리가 AI 프롬프트에 흘러들어가지 않도록 설계했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 메시지 말풍선 하단에 메시지 전송 시간(`timestamp`)과 클릭 시 텍스트 복사 및 피드백 상태(`복사됨`)를 노출하는 `복사하기` 버튼을 추가했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 질문 전송 시 `systemPrompt`를 포함한 전체 메시지 크기를 실시간 토큰 추정 방식으로 계산하고, 에이전트 최대 토큰 설정값(`maxTokens`)의 80%에 임박할 때 AI 에이전트에게 현재까지의 대화 히스토리 압축(요약)을 자동으로 위임하는 메커니즘을 추가했습니다. 압축 완료 시 대화방에 압축률(%) 및 압축 후 프롬프트 크기(Tokens)를 알려주는 시스템 메시지 공지를 노출하도록 렌더링 스키마를 고도화했습니다. 압축 진행 중에는 전체 텍스트 입력창과 버튼을 비활성화하여 오작동을 차단합니다.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/external-agents/[id]/messages/route.ts) — 요약된 컨텍스트를 DB 대화 내역에 직접 삽입할 수 있도록 `POST` API 핸들러를 새로 신설하고 supabase DB에 메시지 레코드를 적재하여, 추후 에이전트 질문 시 이 요약본이 기본 컨텍스트로 전달되도록 파이프라인을 완성했습니다.
  - **작업 내용**:
    - AI 튜터와의 장기 대화 시 입력 토큰 제한으로 인한 대화 중단 현상을 극복하기 위해, 전역 토큰 설정값(maxTokens)의 80%를 감지하여 이전 대화를 AI가 스스로 자동 요약(압축)하는 스마트 컨텍스트 보존 기능을 완성했습니다.
    - 압축이 끝나면 대화창에 시스템 메시지로 압축률(%) 및 압축 완료 후의 남은 프롬프트 크기(Tokens)를 주황색 배너 형태로 시각화하여 사용자가 한눈에 진행 상황을 추적할 수 있도록 개선했습니다.
    - 또한 사용자의 편의성을 위해 채팅창 비우기(히스토리 완전 초기화), 개별 말풍선 복사 및 복사 성공 피드백(체크 아이콘), 전송 시각(HH:MM) 표시 등의 디테일을 더해 튜터링 경험을 강화했습니다.

## 2026-07-08 (4th Session)

- **[FEATURE] 설정 화면 최상단 우측에 [전체 리셋] 기능 및 에이전트 설정 내 최대 토큰 수(Max Tokens) 기능 추가**
  - **수정/갱신 파일**:
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/layout.tsx) — 설정 레이아웃 상단 우측에 `전체 리셋` 버튼을 배치했습니다. 버튼 클릭 시 폰트, 화면 너비 설정, 에이전트 토큰, 체크포인트 우회 설정 등 모든 `localStorage` 설정값을 삭제한 뒤 새로고침합니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/agent/page.tsx) — 준비 중 상태였던 기본 에이전트 설정 카드를 활성화하고, 최대 토큰 수(Max Tokens)를 변경할 수 있는 Select(드롭다운) UI를 구현했습니다. 변경 시 로컬 스토리지를 통해 전역 설정에 즉시 저장되며 토스트 메시지로 상태를 피드백합니다.
    - [use-agent-settings.ts](file:///C:/Workspace/Projects/OpenTutorials/hooks/use-agent-settings.ts) — (신규) 최대 토큰 수를 `localStorage`에 저장 및 로드하고, 기본값으로 `'16k'`를 제공하는 `useAgentSettings` 커스텀 훅을 새로 설계하여 추가했습니다.
  - **작업 내용**:
    - "설정 > 에이전트" 화면에 최대 토큰(Max Tokens) 설정을 지정할 수 있도록 4k, 8k, 16k, 32k, 64k, 128k 등의 크기를 선택할 수 있는 구조를 마련했습니다. 기본값은 16k로 자동 설정되며, 앱 전체에서 참조할 수 있는 공통 훅 형태로 파라미터화했습니다.
    - 설정 페이지 어디서든 저장된 상태(localStorage 값들)를 초기화 상태로 복구할 수 있는 통합 `전체 리셋` 트리거 버튼을 헤더 영역에 구현했습니다.

## 2026-07-08 (3rd Session)

- **[BUGFIX] 카드 개별 조회 시 학습 완료 오판정 버그 수정 및 진도율 동기화**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 학습 화면 내 좌측 목차(TOC) 컴포넌트(`LearnTocNodeView` 및 플랫 리스트 뷰)에서 단순 해제(Unlocked)되었으나 아직 학습 중인 활성 카드가 체크 표시로 완료(Completed) 상태처럼 렌더링되던 조건문을 수정했습니다. 이제는 `idx < maxUnlockedIndex`인 카드만 명시적으로 완료 표시됩니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 강좌 상세화면에서 진도율(`completedSubcourses`)을 계산할 때 현재 활성 카드를 완료 건수에서 제외하도록 `(max_card ?? last_card ?? 1) - 1`로 보정했습니다. 이어서 학습하기 네비게이션 시 `nextCardIndex + 1` 단계로 올바르게 넘어가게 수정했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/[slug]/client.tsx) — 나의 강좌 상세 화면의 진도율 및 챕터 잠금 해제 판단 시에도 `max_card - 1` 값을 이용하도록 정렬하고 잠금 해제 범위를 동기화했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx) — 대시보드 진행률 계산 시 동일하게 `max_card - 1` 기반의 실시간 카드 진행율을 표기하도록 수정했습니다.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/subscribe/route.ts) — 구독 강좌 패키지 목록 API 내의 `completedCourses`도 활성 카드 보정을 반영하여 계산하도록 수정했습니다.
  - **작업 내용**:
    - 강좌 시작 또는 카드 이동 시, 현재 활성화되어 아직 학습을 완료하지 않은 카드(Next/완료 버튼을 누르지 않은 단계)가 Completed로 카운트되어 체크마크가 찍히고 진도율이 1단계 과대평가되던 오작동을 해결했습니다.
    - 모든 진도 관련 뷰(대시보드, 내 강좌 목록, 강좌 상세, 학습 창 TOC)가 동일한 `max_card - 1` 규칙을 적용해 모순 없는 일관적인 진행률을 출력하도록 고도화했습니다.

## 2026-07-08 (2nd Session)

- **[BUGFIX] 강좌 학습 완료 조건 수정 및 강좌 상세 학습 진도율 리셋 기능 구현**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — `saveProgress`에 명시적인 `isCompleted` 파라미터를 추가하여, 단순히 마지막 카드로 화면을 넘기거나 조회하는 것만으로는 강좌가 완료 처리되지 않도록 수정했습니다. 오직 마지막 카드의 "다음" 버튼(학습 완료)을 명시적으로 누르거나 체크포인트를 통과할 때만 완료로 설정됩니다.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/progress/route.ts) — `/api/courses/progress` POST API에서 `completed` 파라미터가 누락되거나 제공되지 않았을 경우, 기존 수강 기록의 완료 여부를 덮어쓰지 않고 안전하게 유지하도록 방어적인 예외 처리를 반영했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 강좌 상세 페이지 최상단 카드의 "이어서 학습하기" 버튼 옆에 "학습 진도율 리셋" 버튼을 추가했습니다. 클릭 시 `DELETE /api/courses/progress` API를 호출하여 강좌 신청 상태(구독)는 유지하되 진도율(수강 이력)만 깔끔하게 초기화합니다.
  - **작업 내용**:
    - 마지막 카드(인덱스 `totalCards - 1`)를 조회하자마자 완료(`completed: true`) 상태로 넘어가던 진도율 판정 오류를 해결했습니다.
    - 수강 이력(진도율)만 깨끗이 리셋하여 처음부터 다시 수강할 수 있도록 "학습 진도율 리셋" 기능을 디자인 시스템(`lucide-react` RotateCcw, Shadcn Button 등)에 맞추어 강좌 상세 화면에 추가했습니다.

## 2026-07-08

- **[FEATURE] 강좌 학습 페이지 너비 값 초기화, 잠금 단계식 진도(Lock-step progress) 및 체크포인트 건너뛰기 우회 설정 구현**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 카드를 보는 행위만으로는 학습 완료가 되지 않도록 방지하고, 오직 "다음" 버튼 또는 체크포인트 QnA를 통과했을 때만 해제 및 진도를 올리게 변경했으며, 우회 설정이 켜진 경우 체크포인트를 건너뛰도록 연동했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx) — 리사이즈된 목차 및 AI 튜터 창의 너비 상태를 리셋할 수 있는 초기화 버튼을 추가했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/course/page.tsx) — 강좌 학습 설정 메뉴를 새로이 구현하여 사용자가 체크포인트 단계를 통째로 건너뛰어 강제 잠금 해제할 수 있는 토글 옵션을 신설했습니다.
  - **작업 내용**:
    - 학습 완료 조건을 엄격화하여, 사용자가 단순히 TOC에서 카드를 선택하는 동작만으로 진도가 업데이트되는 현상을 수정했습니다. 이제는 "다음" 버튼이나 체크포인트 QnA 성공/스킵 시에만 진도가 갱신됩니다.
    - `설정 > UI` 메뉴 하단에 학습 화면 레이아웃(너비) 초기화 섹션을 마련해 언제든 기본 크기로 복구할 수 있게 했습니다.
    - `설정 > 강좌` 메뉴에 "체크포인트 강제 건너뛰기" 기능을 신설하여, 활성화 시 모든 체크포인트를 검사 없이 즉시 패스할 수 있는 장치를 연동하였습니다.

- **[FEATURE] 강좌 학습 페이지 3단 컬럼 리사이즈(드래그 너비 조절) 기능 구현**
  - **수정/갱신 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 목차(TOC)와 AI 튜터(Tutor) 패널의 너비 조절을 위한 마우스/포인터 드래그 핸들러를 추가하고, 사용자의 너비 설정을 `localStorage`에 저장하여 유지하며, 레이아웃에 따른 동적 크기를 렌더링하도록 수정했습니다.
  - **작업 내용**:
    - 학습 페이지 내 목차 패널, 메인 컨텐츠 영역, AI 튜터 패널 등 3개의 열에 대해 사용자가 드래그를 통해 실시간으로 조절할 수 있도록 `PointerEvent` 기반의 Resizer Handle(구분선)을 추가하였습니다.
    - 사용자가 지정한 각각의 너비는 `localStorage`(`open-tutorials-toc-width`, `open-tutorials-tutor-width`)에 자동 저장되어 페이지를 다시 열었을 때도 이전 설정 그대로 유지됩니다.
    - 기존 `sendMessage` 함수에 선언된 미사용 섀도잉 변수(`fallbackTocText`)를 제거하여 린트 오류도 함께 해소했습니다.



## 2026-07-07

- **[RELEASE] v0.3.1 버전 릴리즈 처리 (Changelog 및 README 업데이트, package.json 버전 범프)**
  - **수정/갱신 파일**:
    - [package.json](file:///C:/Workspace/Projects/OpenTutorials/package.json) - 버전을 0.3.0에서 0.3.1로 갱신했습니다.
    - [CHANGELOG.md](file:///C:/Workspace/Projects/OpenTutorials/CHANGELOG.md) - v0.3.1 변경 이력과 개선 사항(UI 에메랄드 테마, 레이아웃 토글 등)을 추가했습니다.
    - [README.md](file:///C:/Workspace/Projects/OpenTutorials/README.md) - 제목에 v0.3.1 버전을 반영하고 핵심 기능 소개 문구를 보완했습니다.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx) - UI 설정 페이지의 컬러 테마를 에메랄드로 맞추고 가이드 프레이즈를 제거했습니다.

- **[FEATURE] 강좌 학습 화면에 다중 레이아웃 전환(3단 보기, 목차+본문, 본문+튜터, 본문만) 기능 구현 및 사이드바 토글 버튼 삭제**
  - **수정/갱신 파일**:
    - [LearnLayoutContext.tsx](file:///C:/Workspace/Projects/OpenTutorials/lib/context/LearnLayoutContext.tsx) — 학습 화면 레이아웃 전환 상태를 전역 공유하고 localStorage를 활용하여 개인 설정을 유지하는 컨텍스트(Context)를 신규 생성했습니다.
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/layout.tsx) — `UserLayout` 전체를 `LearnLayoutProvider`로 감싸 레이아웃 상태가 전역적으로 동기화되도록 수정했습니다.
    - [UserHeader.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserHeader.tsx) — 강좌 학습 화면에서 기존 사이드바 fold/unfold 버튼(`SidebarTrigger`)을 삭제(숨김 처리)하고, 그 위치에 4가지 방식의 레이아웃 변경 버튼을 렌더링하도록 수정했습니다.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — `layout` 상태에 따라 "강좌 목차" 패널 및 "AI 튜터" 패널을 조건부 렌더링하여 dynamic layout을 완성했습니다.
  - **작업 내용**:
    - 학습 화면 내 컬럼 배치 편의성을 위해 3가지 컬럼(강좌 목차, 강좌 컨텐츠, AI 튜터)의 노출 조합을 변경하는 4가지 레이아웃 스위치 버튼을 추가했습니다.
    - 불필요한 기존 최상단 사이드바 토글 버튼을 숨기고 해당 자리에 레이아웃 버튼 그룹을 배치해 UI 사용성을 높였습니다.

- **[STYLE] 나의 강좌 페이지 우측 상단 "새 강좌 찾기" 버튼 색상 통일**
  - **수정/갱신 파일**:
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — 우측 상단 `[새 강좌 찾기]` 버튼의 클래스명을 `bg-emerald-600 hover:bg-emerald-700`에서 `bg-indigo-600 hover:bg-indigo-700`으로 수정하여 타 페이지와의 일관성을 확보했습니다.
  - **작업 내용**:
    - "나의 강좌" 페이지에 위치한 "새 강좌 찾기" 버튼이 메인 브랜드 테마 색상(Indigo) 대신 녹색(Emerald)으로 표시되어 타 페이지의 기본 액션 버튼들과 색상이 다르던 문제를 해결하기 위해, 타 페이지의 주 버튼 색상에 맞춰 Indigo 테마를 적용했습니다.

- **[BUGFIX] 강좌 학습 화면 스크롤 불가 오류 수정**
  - **수정/갱신 파일**:
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/layout.tsx) — 학습 화면(`isLearnPage === true`)인 경우 `children`을 감싸는 `flex-1` 레이아웃 래퍼 `div`를 바이패스하도록 수정하여 `LearnPageClient`에 설정된 `h-full` 및 뷰포트 높이 제한과 스크롤 영역(`ScrollArea`) 바운더리가 올바르게 동작하도록 수정했습니다.
  - **작업 내용**:
    - 최근 푸터 개선 과정에서 `children` 전체를 감싸는 `<div className="flex-1">`가 추가되었는데, 이로 인해 `isLearnPage`일 때 스크롤 영역이 뷰포트 높이에 고정되지 않고 콘텐츠 전체 높이로 늘어난 뒤 최상단 `SidebarInset`의 `overflow-hidden`에 의해 스크롤이 불가능해졌던 CSS 레이아웃 문제를 해결했습니다.

## 2026-07-07

- **[STYLE] 좌측 상단 로고 및 푸터의 Bot 아이콘 색상을 메인 브랜드 컬러(primary)의 진한 녹색으로 변경**
  - **수정/갱신 파일**:
    - [UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx) — 좌측 상단 헤더 영역의 `Bot` 로고 아이콘 색상을 `text-indigo-600`에서 `text-primary`로 수정.
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/layout.tsx) — 푸터 영역의 `Bot` 로고 아이콘 색상을 `text-indigo-600`에서 `text-primary`로 수정.
  - **작업 내용**:
    - 사이트의 메인 브랜드 컬러인 진한 녹색 톤(대시보드의 "신규 에이전트 등록" 버튼 등과 동일)에 맞추어 좌측 상단 사이드바의 헤더와 하단 푸터에 각각 위치한 `Bot` 로고 아이콘의 색상을 `text-primary`로 변경하여 브랜딩의 통일성을 높였습니다.

## 2026-07-07

- **[CHORE] 지침 파일(AGENTS.md, CLAUDE.md, GEMINI.md) 및 규칙 파일(.agents/rules/) 구조 간소화 및 최신화**
  - **수정/갱신 파일**:
    - [AGENTS.md](file:///C:/Workspace/Projects/OpenTutorials/AGENTS.md), [CLAUDE.md](file:///C:/Workspace/Projects/OpenTutorials/CLAUDE.md), [GEMINI.md](file:///C:/Workspace/Projects/OpenTutorials/GEMINI.md) — 중복되거나 불필요한 개발 정보들을 제거하고 핵심 프로젝트 개요, 스택 및 개별 규칙 참조 링크만 남김으로써 지침 파일 크기를 대폭 간소화.
    - [local-db-storage.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/local-db-storage.md) — (신규) 로컬 DB 및 데이터 스토리지 패턴, Supabase 모킹 클라이언트 사용법, 권한 및 보안 우회 규칙을 독립된 규칙 문서로 분리.
    - [wiki-maintenance.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/wiki-maintenance.md) — (신규) 작업 완료 후 Wiki에 변경 이력을 등록하는 의무 사항을 독립된 규칙 문서로 분리.
    - [bundler-protocol.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/bundler-protocol.md) — (신규) 강좌 제작 번들러 프로토콜 변경 시 문서 최신화 규칙을 독립된 규칙 문서로 분리.
    - [architecture.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/architecture.md) — 이전 클라우드 환경(관리자 포털, 인증 등) 정보 제거, 실제 데스크탑 로컬 구조 및 [proxy.ts](file:///C:/Workspace/Projects/OpenTutorials/proxy.ts) 미들웨어 우회 아키텍처 규칙으로 최신화.
    - [api-conventions.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/api-conventions.md) — Supabase 클라우드, Admin 메일 체크, SSE, Phase 2 등 불필요한 구 API 패턴을 제거하고 `/api/local-db` 중계 및 `/api/agent` 연동 패턴 중심으로 재작성.
    - [coding-standards.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/coding-standards.md) — Phase 1 더미 데이터 등의 불필요한 내용을 정리하고 핵심 TypeScript 및 React 컨벤션 위주로 단순화.
    - [design-system.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/design-system.md) — [DESIGN.md](file:///C:/Workspace/Projects/OpenTutorials/DESIGN.md) 및 Shadcn UI 사용 규칙, 1024px 해상도 제한 등 데스크탑 중심의 테마 및 레이아웃 규칙 최신화.
    - [git-workflow.md](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/git-workflow.md) — 로컬 1인 개발 환경에 최적화된 핵심 커밋 메시지 형식 및 단위 규칙으로 리팩토링.
  - **작업 내용**:
    - AI 에이전트와 LLM이 불필요한 컨텍스트(사용하지 않는 이전 아키텍처/클라우드 설정 등)를 과도하게 읽어 토큰 낭비 및 오작동하는 문제를 해결하기 위해, 메인 지침 파일들을 경량화하고 개별 상세 규칙들을 `.agents/rules/` 하위에 목적별로 작게 쪼개어 참조할 수 있도록 전면 개편했습니다.

## 2026-07-07

- **[BUGFIX] 나의 강좌 화면 및 강좌 구독 API에서 패키지 에이전트 정보(agent_id) 누락 해결**
  - **수정/갱신 파일**:
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/subscribe/route.ts) — 구독 강좌 목록(GET) 응답에서 `package` 필드에 `agent_id`를 누락했던 문제를 해결하여 `agent_id: pkg?.agent_id`를 반환하도록 수정.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/subscribe/route.ts) — 마찬가지로 강좌 구독 목록(GET) 응답의 `package` 필드에도 `agent_id: pkg?.agent_id`를 추가하여 통일성 확보.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — `PackageSubscriptionItem` 인터페이스의 `package` 정의에 `agent_id?: string | null` 타입을 보강하고, `(pkg as any).agent_id`로 캐스팅하던 비안전 코드를 안전하게 `pkg.agent_id`로 수정.
  - **작업 내용**:
    - "나의 강좌" 화면에서 수강 중인/완료한 패키지의 AI 에이전트 정보가 올바르게 렌더링되도록 API 응답 데이터 누락을 채워넣고 타입을 동기화하여 해결했습니다.

- **[FEATURE] 나의 강좌 및 대시보드 강좌 카드에 할당된 에이전트 이름 표시 기능 추가**
  - **수정/갱신 파일**:
    - [my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — 수강 중인 강좌 및 완료한 강좌 목록 카드의 하단에 user_external_agents 목록을 매핑하여 에이전트 이름을 Bot 아이콘과 함께 표시했습니다.
    - [dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx) — 대시보드 내 학습 중인 강좌 목록의 강좌 카드에 할당된 AI 튜터 이름을 Bot 아이콘과 함께 표시했습니다.
  - **작업 내용**:
    - 각 강좌 카드에서 연동 중인 AI 튜터 에이전트의 이름을 바로 노출하도록 기능을 제공하고, 미세한 pulse 애니메이션을 튜터 라벨에 부여하여 시각적 완성도를 높였습니다.

- **[FEATURE] 강좌 상세 페이지 라우팅 통일 및 커리큘럼 챕터 fold/unfold 기능 추가**
  - **수정/갱신 파일**:
    - [dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx) — 대시보드 내 "학습 중인 강좌" 목록에서 강좌 카드를 클릭할 때 기존 `/my-courses/[slug]`로 이동하던 것을 전체 강좌 상세 페이지인 `/courses/[slug]`로 연결되도록 변경하여 라우팅 경로를 통일했습니다.
    - [my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — 수강 중인 강좌 및 패키지의 모든 상세 이동 경로를 `/courses/[slug]`로 유지 및 검증하였습니다.
    - [courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 전체 강좌 상세 페이지의 커리큘럼(TOC) 섹션 챕터 항목들에 `expandedChapters` 상태 및 토글 제어 인터랙션을 추가하여, 사용자가 각 챕터를 fold/unfold(접기/펼치기) 할 수 있도록 사용성을 대폭 개선했습니다. 이미 학습 완료된 챕터(모든 하위 섹션이 수강 완료됨)는 기본적으로 접힌 상태로 렌더링되도록 기본값 연산 로직을 추가했습니다.
  - **작업 내용**:
    - 대시보드의 "학습 중인 강좌" 카드 클릭 시 `/my-courses/[slug]`로 가고, "나의 강좌" 목록에서는 `/courses/[slug]`로 가면서 발생했던 상세 페이지 이동 경로의 불일치를 `/courses/[slug]`로 통일하여 해결하였습니다.
    - 또한 일원화된 강좌 상세 페이지의 커리큘럼 타임라인에 챕터 클릭 시 하위 섹션이 토글 접힘/펼침 처리되는 기능을 신규 구현하였고, 사용자가 이미 다 학습한 챕터는 기본적으로 접어둠으로써 스크롤 낭비 없이 현재 학습해야 할 위치에 집중할 수 있도록 개선했습니다.

## 2026-07-06

- **[FEATURE] 강좌 패키지 태그(tags) 기능 도입 및 프로토콜 규격 연동**
  - **수정 파일**:
    - [index.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/types/index.ts) — `CoursePackage` 인터페이스에 선택적 배열 속성 `tags?: string[];` 추가.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts) — `package-manifest.json` 파싱 시 `tags` 필드를 구조 분해 할당으로 추출하고, 해당 값이 존재할 경우 배열 형식 여부를 검증(`Array.isArray`). DB(`db.json` 내 `course_packages` 테이블)에 패키지를 upsert 할 때 `tags` 필드가 정상적으로 저장되도록 파이프라인 연결.
    - [protocol.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol.md) — `package-manifest.json` 메타데이터 속성 명세 테이블에 `tags` 속성(Array of String, Optional)을 명시하고, 제작 예시인 `package-manifest.json` 예시 파일에 `tags` 필드 사용 사례를 보강.
    - [protocol-changelog.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol-changelog.md) — (신규 파일) Bundler 프로토콜 v1.0.0 이후의 변경사항들을 명확히 추적하기 위한 전용 체인지로그 문서 작성.
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json) — 기존에 등록된 2개의 강좌 패키지("아두이노 IoT 프로젝트 마스터 클래스", "신경망과 LLM 개론")에 수동으로 각각 성격에 맞는 태그 리스트를 매핑하여 상세 화면에 즉각 노출되도록 보완.
  - **작업 내용**:
    - 기존에는 강좌 패키지 메타데이터 및 업로드 API 스키마에 `tags` 속성이 구현되어 있지 않아 강좌 상세 화면에서 항상 "등록된 태그 없음"이 노출되던 한계를 해결하고, 프로토콜 명세에 `tags` 필드를 공식 등록 및 업로드 핸들러의 DB 저장 파이프라인에 완벽히 연동하였습니다. 또한 기존 수강 강좌 2개에 태그 데이터를 적재하여 즉각 검증이 가능하도록 처리했습니다. 추가로, 외부 강좌 빌더 및 에이전트 빌더가 프로토콜 스펙 변동을 편하게 적용할 수 있도록 전용 체인지로그 문서를 마련했습니다.

- **[FEATURE] 학습 화면 폰트 개선 및 마크다운 헤더 폰트 크기 최적화 및 시인성 개선**
  - **수정 파일**:
    - [layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/layout.tsx) — `next/font/local`을 사용해 로컬 Noto Sans KR 가변 가중치 폰트(`NotoSansKR-VariableFont_wght.ttf`)를 `--font-noto-sans` 변수로 로드하여 HTML에 주입.
    - [tailwind.config.ts](file:///C:/Workspace/Projects/OpenTutorials/tailwind.config.ts) — 기본 폰트 스택(`fontFamily.sans`)에 Noto Sans KR 변수를 추가하여, 영문 폰트(Geist) 적용 이후 한글 폰트로 Noto Sans KR이 자연스럽게 폴백되도록 적용.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 학습 화면 내 MDX 마크다운 렌더러 `mdxComponents`의 heading 크기(h1, h2, h3, h4)를 본문 폰트와 큰 차이가 나지 않도록 최적화. 또한 본문 카드 배경을 라이트 모드에서 완전한 흰색(`bg-white`)으로 변경하고, 흐릿한 `text-muted-foreground` 대신 뚜렷한 `text-foreground`를 적용해 시인성을 대폭 강화.
  - **작업 내용**:
    - 학습 화면에서 본문 글씨 크기에 비해 챕터 타이틀(H1) 및 섹션 타이틀(H2, H3, H4)의 폰트 사이즈가 과도하게 크게 렌더링되던 레이아웃 불균형 문제를 해결하여 본문 폰트와 조화로운 크기로 변경하였습니다.
    - 또한 한글 가독성 향상을 위해 `docs/temp/Noto_Sans_KR`에 준비되어 있던 Noto Sans KR 폰트를 `public/fonts` 디렉토리로 이관하고 Tailwind 및 Next.js 로컬 폰트 레이아웃에 탑재하여, 영문에는 모던한 Geist가 우선 적용되고 한글에는 정갈한 Noto Sans KR 폰트가 적용되도록 멀티 폰트 폴백 아키텍처를 구현하였습니다.
    - 추가로 본문 카드 영역의 배경을 라이트 모드에서 완전한 흰색(`bg-white`)으로 변경하고 글씨 대비도를 높이기 위해 텍스트 색상을 `text-foreground`로 지정해 흰색 배경 위에서 글자가 훨씬 명확히 읽히도록 시인성을 개선하였으며, 다크 모드 환경에서는 편안한 딥다크 스타일(`bg-zinc-950`/`text-zinc-300`)을 지원하도록 처리했습니다.

- **[FEATURE] 강좌 학습 화면 마크다운 스타일링 대폭 보강 및 GFM 테이블/코드 박스 복사 기능 도입**
  - **수정 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — MDX 렌더링에 사용되는 `mdxComponents` 매핑에 H1, H2, H3, H4, paragraph, list, blockquote, table 등에 적합한 Tailwind CSS 클래스를 추가하여 가독성과 시인성을 강화. 복사 기능이 내장된 다크 테마 기반 코드 박스(`PreBlock`) 및 인라인 코드용 `InlineCode` 컴포넌트를 설계하여 반영.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/page.tsx) — MDX 직렬화(`serializeWithGfm`) 시 `remark-gfm` 플러그인을 도입하여 마크다운의 파이프 테이블 표가 깨지지 않고 정상적인 HTML 테이블 구조로 파싱될 수 있도록 수정.
    - [protocol.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol.md) — 강좌 번들러 프로토콜 내에 헤더(H1, H2) 구성 방식, GFM 테이블 스펙, 언어를 명시하는 코드 블록 작성 규칙 등을 구체적으로 기술한 **"7. 학습 카드 마크다운 가이드라인"** 섹션을 추가.
  - **작업 내용**:
    - "아두이노 IoT 프로젝트 마스터 클래스"를 포함한 모든 강좌 학습 화면에서 챕터/섹션 타이틀이 H1, H2 헤더로 명확히 시각적 강조를 띄게 되었고, 날것의 마크다운 텍스트로 보였던 비교 표/테이블이 반응형 보더와 헤더가 정돈된 깔끔한 UI 테이블로 자동 렌더링되며, 텍스트 형태였던 소스 코드가 복사하기 버튼이 달린 이쁘고 세련된 다크 코드 박스로 출력되도록 프론트엔드 파서 및 스타일링 구성을 전면 개편했습니다. 아울러 차후 제작될 강좌 번들이 이 형식을 일관되게 채택하도록 번들러 프로토콜 표준 지침 문서에 관련 규칙을 의무화하였습니다.

- **[BUGFIX] 강좌 상세 및 나의 강좌 화면에서 학습 화면 이동 시 카드 인덱스 매핑 오류 해결**
  - **수정 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 강좌 상세 화면에서 커리큘럼 카드를 클릭할 때 `cardIndex` 0-based 값을 1-based `?card=${cardIndex + 1}`로 전달하게 하여 학습 화면 진입 시 올바른 챕터 카드가 매핑되도록 수정.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — "나의 강좌" 목록 화면에서 "이어서 학습하기" 선택 시 1-based index인 `currentCard`에 +1을 더해 잘못된 다음 카드를 건너뛰던 문제를 `currentCard || 1`로 변경하여 마지막으로 공부하던 올바른 위치로 진입하게끔 수정.
  - **작업 내용**:
    - 강좌 상세 화면에서 2-1 카드를 선택할 때 0-based `cardIndex = 2`를 그대로 `?card=2` 형태로 전달하였으나, 학습 화면에서는 1-based index(2번째 카드 = 1-2 카드)로 해석 및 -1 차감(1-based -> 0-based) 파싱하여 1-2 카드가 노출되던 내비게이션 오류를 해결했습니다.
    - 또한 나의 강좌 리스트 화면에서 이어서 학습하기 진입 시 1-based index에 1을 중복하여 덧셈 계산하여 한 카드를 건너뛰고 시작하던 버그도 일괄 정상화하였습니다.

- **[BUGFIX] "신경망과 LLM 개론" 강좌 진행 상황 불일치 및 2-1 강좌 페이지 로딩 시 자동 완료 오류 해결**
  - **수정 파일**:
    - [02-neural-network-text.mdx](file:///C:/Workspace/Projects/OpenTutorials/public/courses/neutral-network-and-llm/cards/02-neural-network-text.mdx) — LaTeX 수학 수식 중괄호(`{}`) 표현이 `next-mdx-remote` 파서(Acorn)에 의해 JSX/Javascript 영역으로 잘못 파싱되어 MDX 빌드 에러를 일으키는 문제를 텍스트 수식 표현(중괄호 제거)으로 수정하여 정상 컴파일되도록 해결.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/page.tsx) — MDX 직렬화(`serialize`) 시 에러가 발생해도 카드 목록에서 스킵하지 않고 에러 표시 플레이스홀더 카드를 추가하여, 전체 카드 수(`totalCards`)가 어긋나고 진행상황이 왜곡(예: 2-1 강좌 페이지가 마지막 카드로 둔갑하여 자동 수강완료되는 현상)되지 않도록 안전 장치 적용.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/subscribe/route.ts) — 구독 강좌 패키지 진행률 반환 시 `total_courses`를 1로, `completed_courses`를 (completed ? 1 : 0)으로 계산하던 하드코딩 방식을 제거하고, 패키지의 실제 총 카드 수(`totalCourses`)와 사용자의 진행도(`max_card`/`last_card`) 값을 반영하여 실시간 카드 단위의 세밀한 진행률(%)을 제공하도록 수정.
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json) — "신경망과 LLM 개론" 수강 이력 레코드 중 자동으로 `completed: true` 처리되었던 내역을 `completed: false` 로 정상화 마이그레이션 적용.
  - **작업 내용**:
    - "신경망과 LLM 개론" 강좌의 2-1 강좌 페이지(3번째 카드)로 들어갈 때 2번째 카드였던 `02-neural-network-text.mdx`가 MDX 컴파일 오류로 누락되어 전체 카드 수(`totalCards`)가 3개로 인식되고, 이로 인해 3번째 카드 조회가 마지막 카드로 오인되어 자동 완료 처리되던 버그를 근본적으로 수정했습니다. 또한 학습 화면(3/4 진행), 나의 강좌(100%), 강좌 상세 화면(100%)에서 각각 다르게 계산되던 진행 상황 로직을 실제 총 카드 개수 및 해제된 카드 개수 기준으로 일관되게 맞춤으로써 3개 화면 모두 **75% (3/4 진행)** 로 완벽히 통일하였습니다.

- **[BUGFIX] "아두이노 IoT 프로젝트 마스터 클래스" 학습 화면 React SSR 에러 해결 및 미활성 챕터 기본 접기 구현**
  - **수정 파일**:
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/page.tsx) — `LearnPageClient`를 Next.js의 `dynamic(..., { ssr: false })`로 동적 임포트하여, React 19/Next 15 환경에서 Turbopack 빌드 시 `next-mdx-remote` 등의 CommonJS React 훅 참조 모듈이 서버 사이드 렌더링(SSR) 시 React dispatcher null 에러(`Cannot read properties of null (reading 'useState')`)를 일으키는 현상을 해결.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 목차 노드 뷰(`LearnTocNodeView`)의 `isExpanded` 상태 초기값을 무조건 `true`로 펼쳐놓는 대신, 현재 활성화된 카드(강의)의 조상 노드인 경우에만 `true`로 설정하고 나머지는 접힌 상태(`false`)로 렌더링되도록 수정하여 목차가 한눈에 잘 들어오도록 개선.
  - **작업 내용**:
    - 리팩토링 및 렌더링 최적화를 통해 로컬 아두이노 학습 강좌 로딩 에러를 완벽히 해결하고 사용자가 요청한 챕터 접기 편의 기능을 구현 완료.

- **[BUGFIX] "아두이노 IoT 프로젝트 마스터 클래스" 강좌 목차 클릭 내비게이션 오류 및 학습 화면 이미지 깨짐 현상 해결**
  - **수정 파일**:
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx) — 좌측 강좌 목차의 활성화(active) 표시 및 카드 선택 클릭 시 string(파일명) 매핑 대신 TOC 노드 객체 참조 매핑(`Map<TocNode, number>`)을 활용하도록 개선하여 동일 파일명이 여러 챕터에 사용되어도 충돌 없이 정확한 카드로 내비게이션 및 하이라이트가 처리되도록 수정. custom image 컴포넌트의 relative images 경로 파싱 regex 필터링에 absolute/external URL 검사 예외 처리를 추가하고 슬래시가 포함된 파일명 인코딩 버그를 수정.
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json) — "아두이노 IoT 프로젝트 마스터 클래스" (`iot-communication`) 강좌의 cards 및 toc 파일명들에 chapter별 유일한 하위 경로(예: `ch01/01-lesson-1.mdx`)를 주입하여 static storage 내에서 카드들이 덮어씌워지지 않도록 마이그레이션 적용.
    - `public/courses/iot-communication/config.json` — db.json의 업데이트 내용에 맞춰 index config 갱신.
    - `public/courses/iot-communication/cards` — 중복 파일명들로 인해 ch13으로 덮어씌워져 있던 13개 챕터별 카드 MDX 파일들을 복구하고 각각의 ch01~ch13 폴더 구조로 재배치.
    - `public/courses/iot-communication/images` — 각 챕터별 subcourse(iot-communication-ch01~13) images 폴더에 분산 보관되어 정적 서빙에서 누락되었던 83개의 이미지 파일들을 통합 package images 폴더로 일괄 복제하여 이미지 깨짐 현상을 해결.
  - **작업 내용**:
    - 기존 마이그레이션 스크립트가 13개 분량의 subcourse 강좌 데이터를 단일 패키지로 통합하는 과정에서 동일한 카드 파일명(`01-lesson-1.mdx`)을 구분자 없이 복사하여 최종 챕터(ch13) 내용으로 덮어씌우고 이미지를 복사하지 않아 모든 이미지가 깨지던 문제를 완벽히 복구하고, 중복 파일명이 존재할 시 UI 목차 클릭 매핑이 깨지는 아키텍처 한계를 리액트 트리 렌더링 노드 매핑 방식으로 수정하여 재발을 방지했습니다.

- **[CLEANUP] 제거된 구 `courses` 및 `course_package_items` 테이블 관련 DB 조회 쿼리 전수 조사 및 클린업**
  - **수정/갱신 파일**:
    - [dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx) — `user_progress` 및 `user_package_subscriptions` 테이블 조회 쿼리에서 더 이상 존재하지 않는 `courses` 및 `course_package_items` 조인 제거 후 `course_packages` 테이블 직접 조회로 수정.
    - [my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx) — `ProgressItem` 인터페이스에서 `course_package_items` 타입을 제거하고, "학습 시작하기" 선택 시 이동할 대상 URL을 `course_package_items` 탐색 없이 `progressList` 내 `course_id` (현재 package_id) 매칭을 통해 바로 확인하도록 수정.
    - [subscribe/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/subscribe/route.ts) — 기존에 `course_package_items` 및 `courses` 테이블 조작을 시도하여 수강 진행 기록(`user_progress`)을 제대로 생성하지 못하던 구버전 구독 API를 최신 패키지 구독 API(`app/api/packages/subscribe/route.ts`)와 동일하게 단일 패키지 수강 처리 로직으로 갱신.
    - [[id]/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/[id]/route.ts) — 패키지 삭제(DELETE) 요청 처리 시, 연관 강좌 및 매핑 테이블이 없어진 새로운 구조에 맞추어 `course_packages` 및 Storage 버킷의 해당 패키지 slug 폴더, 그리고 `user_progress`를 직접 일괄 삭제하도록 전면 개편.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/route.ts) / [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/route.ts) / [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/route.ts) — `courses` 및 `course_package_items`를 조인 조회하던 쿼리를 제거하고 단일 `course_packages` 조회로 간소화 및 하위 호환성을 위해 `courses: []` 반환 처리.
    - [[id]/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/courses/[id]/route.ts) / [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/courses/route.ts) / [check-orphans/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/courses/check-orphans/route.ts) — 더 이상 존재하지 않는 `courses` 테이블을 조작하던 개별 강좌 관리 API들을 사용되지 않는 점을 감안하여 Deprecated 처리(404 에러 또는 빈 리스트 즉시 반환).
  - **작업 내용**:
    - `courses`와 `course_package_items` 테이블이 `db.json`에서 완전히 삭제됨에 따라, 백엔드 API 및 프론트엔드 전체에서 해당 테이블들을 참조하거나 조인하던 모든 DB 쿼리를 제거하고 단일 패키지(`course_packages`) 기반 모델로 완전히 전환함.

- **[BUGFIX] 대시보드에서 학습중인 강좌 카드 선택 시 강좌 상세 정보를 조회하지 못하는 오류 수정**
  - **수정 파일**:
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/[slug]/page.tsx) — DB에서 강좌 상세 정보를 조회할 때 기존 `courses` 테이블 대신 `course_packages` 테이블을 조회하도록 수정.
  - **작업 내용**:
    - 대시보드의 "학습중인 강좌" 카드 선택 시 `[MyCourseDetailServer] Course not found in both DB and Dummy data for slug` 콘솔 에러가 발생하며 강좌 상세 화면이 정상 로딩되지 않는 문제를 해결함.
    - 이전의 강좌 패키지 통합 마이그레이션 결과로 `db.json`에서 `courses` 테이블이 완전히 제거되고 `course_packages`로 통합되었으나, 해당 상세 조회 쿼리만 누락되어 있던 부분을 동기화함.

- **[REFACTOR] 개별 강좌(Courses)와 강좌 패키지(Course Packages) 통합 및 단일화**
  - **수정/삭제 파일**:
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json) — `courses` 및 `course_package_items` 테이블 제거. `course_packages`에 `toc` 및 `cards` 컬럼 추가하고, `user_progress`의 `course_id` 값을 패키지 ID로 통합 마이그레이션.
    - [local-db-server.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/db/local-db-server.ts) — `DEFAULT_DB` 스키마 및 `executeLocalQuery`의 Auto Join Resolver에서 `courses`, `course_package_items` 관련 종속성 제거 및 `course_packages` 다이렉트 조인으로 리팩토링.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/packages/subscribe/route.ts) — 구독 및 진행도 API 수정. `course_package_items` 의존성을 제거하고 강좌 패키지 단위를 단일 강좌 단위로 다루어 구독 및 진행 상태 `user_progress` 관리 단일화.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/[slug]/route.ts) — 개별 강좌 `items` 조인을 제거하고, `course_packages`에서 직접 메타데이터 및 `toc`, `cards`를 읽어 단일 `user_progress`와 매핑하여 반환하도록 쿼리 전면 수정.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/[slug]/resource/route.ts) — `courses` 대신 `course_packages` 테이블에서 직접 강좌 세부 내용을 가져와 markdown 컴파일을 수행하도록 조회 테이블 변경.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-agents/page.tsx) — 에이전트 할당 강좌 로딩(`loadAgents`) 시 `courses` 테이블 조회를 제외하고, `course_packages` 테이블만 조회하도록 리팩토링.
    - [client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx) — 커리큘럼 타임라인 렌더링을 하위 강좌 리스트 대신 패키지의 챕터/섹션(TOC) 트리 렌더링으로 변경하고 개별 카드 단위 학습 시작 및 다시보기 버튼 바인딩.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/page.tsx) — 서버 컴포넌트 로딩에서 `courses` 대신 `course_packages`를 가져오도록 수정.
    - [route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts) — 기존 개별 강좌 단위 다중 ZIP 업로드 단계를 폐지하고, `package-manifest.json`, `config.json`, `wiki.md`, `cards/`가 직접 포함된 단일 패키지 ZIP 파일을 전송받아 한 방에 압축 해제 후 로컬 저장 및 `course_packages` upsert를 처리하는 단일 통합 API로 전면 개편.
    - `app/api/admin/courses/upload/route.ts` (삭제) — 불필요해진 개별 강좌 ZIP 업로드 API 파일 삭제.
    - [page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/upload/page.tsx) — 어드민 ZIP 업로드 프론트엔드 검증 단계를 단일 패키지 내부 정합성 및 TOC-Cards 매칭 사전 검사(`package-structure`, `package-config-toc`)로 전환하고, 단일 요청 전송으로 코드 간소화.
    - [UserHeader.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserHeader.tsx) — `getUser()` 프라미스 파라미터 타입 에러를 명시적 캐스팅으로 해결.
    - [protocol.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol.md) — 강좌 제작자용 번들러 스펙 문서의 하위 강좌 ZIP 매핑 관계 명세를 단일 ZIP 디렉토리 및 루트 config.json 배치 구조로 최신 동기화.
  - **작업 내용**:
    - "기존에는 개별 강좌와 강좌 패키지가 구분되어 있었지만 이제는 강좌 패키지 하나로 통일되어 관리한다. 더 이상 개별 강좌의 개념은 사용하지 않는다. 관련 테이블이나 로직을 삭제하고 강좌 패키지로 통합해야 한다." 요청을 완벽하게 수행함.
    - DB 구조의 극적인 간소화 및 온디바이스 로컬 파일 시스템 업로드의 효율 극대화를 달성하고 타입 에러를 해결하여 빌드 안전성을 완벽 확보함.


- **[BUGFIX] 에이전트 관리 화면에서 특정 에이전트에 할당된 강좌가 누락되는 문제 해결**
  - **수정/생성 파일**:
    - `app/(user)/my-agents/page.tsx` — 에이전트에 할당된 강좌 정보를 조회할 때 `courses` 테이블만 조회하던 기존 로직을 수정하여 `courses`와 `course_packages` (강좌 패키지) 테이블을 모두 병합해서 조회하도록 개편하고, 동일 에이전트 ID에 대해 중복된 강좌명(title)은 제거하여 표시함.
  - **작업 내용**:
    - "현재 2개의 강좌가 등록되어 있고, 강좌는 각각 Hermes Tencent 에이전트와 Local GEMMA 에이전트를 사용하도록 지정하였다. 하지만 에이전트 관리 화면에서 Hermes Tencent 에이전트만 할당된 강좌 정보가 표시된다." 이슈를 해결하기 위함.
    - 강좌 패키지(`course_packages`) 단위로 에이전트가 할당되고, 하위 강좌(`courses`)의 `agent_id`가 null인 상황(예: 아두이노 강좌)에서도, 에이전트 카드 내 '할당된 강좌' 목록에 패키지 단위 강좌명이 누락 없이 정확하게 매핑 및 노출되도록 보장함.

- **[FEATURE] 강좌 등록/업로드 시 튜터 에이전트 자동 매핑 및 연동 기능 구현**
  - **수정/생성 파일**:
    - `lib/supabase/admin.ts` — `getOrAssignTutorAgentId` 공통 헬퍼 함수를 추가하여 강좌 등록 시 기본 튜터(is_ai_tutor: true)가 있으면 기본 튜터로, 없으면 기존 할당된 에이전트 보존 또는 첫 번째 튜터로, 튜터 목록이 아예 비어 있으면 신규 기본 튜터를 생성하여 할당할 수 있도록 구현.
    - `app/api/admin/courses/upload/route.ts` — 하위 강좌 ZIP 개별 파일 등록/업데이트 시 `getOrAssignTutorAgentId`를 통해 반환된 `agent_id` 값을 함께 `insert`/`update` 필드로 설정해 튜터 에이전트 강제 지정 보장.
    - `app/api/admin/packages/upload/route.ts` — 매니페스트 기반 하위 강좌 등록/업데이트 시 동일하게 `getOrAssignTutorAgentId`를 통한 튜터 에이전트 매핑이 적용되도록 수정.
  - **작업 내용**:
    - "강좌가 등록될 때 튜터 에이전트를 반드시 등록해야 한다. 기본 튜터가 설정되어 있다면 기본 튜터를 설정해야 한다." 요구사항을 반영하여, 강좌 업로드 시점에 자동으로 활성화된 기본 튜터 혹은 에이전트를 `courses.agent_id`에 강제 바인딩하는 로직을 통합함으로써 수동 지정 과정에서의 누락 방지 및 학습 진입 시 원활한 AI 튜터 서비스 보장.

## 2026-07-05

- **[CHORE] 앱 버전 v0.1.0 태깅 및 릴리즈/체인지로그 관리 프로세스 확립**
  - **수정/생성 파일**:
    - `package.json` — 버전 필드가 없던 것을 `"version": "0.1.0"`으로 신설.
    - `CHANGELOG.md` — 기존에 내용 없이 헤더만 있던 `v0.1.0` 항목을 실제 포함 기능(강좌 업로드/Bundler 프로토콜, 동영상 카드, AI 튜터 에이전트, 로컬 데스크탑 전환 등) 요약으로 채우고, 향후 릴리즈를 위한 `[Unreleased]` 섹션을 추가함.
  - **작업 내용**:
    - 강좌 제작 프로젝트가 `OpenTutorials-Bundler` GitHub 저장소로 이관됨에 따라 앱 URL을 갱신하는 김에, 이번 PR 머지 시점을 기점으로 앱 버전(`v0.1.0`)과 Course Bundler Protocol 버전(`v1.0.0`)을 각각 git 태그로 고정함. 이후부터는 main 머지 시마다 `CHANGELOG.md`에 버전 항목을 추가/갱신하는 것을 릴리즈 프로세스로 삼기로 함.

- **[CHORE] 로컬 DB 스냅샷 및 에이전트 대화 로그 갱신, `db.json` gitignore 규칙 보강**
  - **수정/생성 파일**:
    - `db.json` — 로컬 실행 중 누적된 강좌/진행률/에이전트 데이터 스냅샷 갱신.
    - `public/agent-chats/c3111115-c54b-48a3-919a-3cec5ec77627.json` — 에이전트 대화 로그 갱신.
    - `.gitignore` — 최상위 `/db.json` 규칙 외에 하위 경로에서도 `db.json`이 실수로 추적되지 않도록 규칙을 보강.
  - **작업 내용**: 로컬 온디바이스 DB 파일 특성상 실행할 때마다 상태가 바뀌므로 기능 변경 없이 스냅샷만 최신화함.

- **[FIX] 학습 화면 이미지가 Supabase Storage 대신 로컬 정적 경로에서 서빙되도록 수정**
  - **수정/생성 파일**:
    - `app/(user)/learn/[slug]/client.tsx` — MDX 카드 내 상대 경로 이미지(`images/...`)를 해석할 때 여전히 `NEXT_PUBLIC_SUPABASE_URL` 기반 Supabase Storage 공개 URL을 조립하던 잔재 코드를 제거하고, 데스크탑 로컬 실행 아키텍처(`public/courses/[slug]/images/...` 정적 서빙)에 맞춰 `/courses/[slug]/images/[filename]` 상대 경로로 직접 연결하도록 수정함.
  - **작업 내용**: 클라우드/Supabase 호스팅 모델을 걷어내고 로컬 파일 시스템 기반으로 전환한 이후에도 남아있던 구 스토리지 참조를 정리함.

- **[FIX] 강좌 업로드 화면의 Bundler 생성기 GitHub 링크를 신규 저장소 주소로 갱신**
  - **수정/생성 파일**:
    - `app/(user)/courses/manage/upload/page.tsx` — "강좌 번들 자동 생성기" 배너의 GitHub 바로가기 버튼이 예전 프로젝트 위치(`https://github.com/godstale/pennypress-course-generator`)를 가리키고 있던 것을 실제 이관된 저장소(`https://github.com/godstale/OpenTutorials-Bundler`)로 수정함. `README.md`, `docs/manual/README.md`에는 이미 신규 주소가 반영되어 있었으나 이 화면만 누락되어 있었음.
  - **작업 내용**:
    - 강좌 제작용 Bundler 프로젝트가 `OpenTutorials-Bundler` GitHub 저장소로 위치를 옮김에 따라, 앱 내 마지막 남은 구주소 참조를 정리함.

- **[DOCS] 동영상/자막 카드 기능에 맞춰 Bundler 프로토콜 하위 지침 문서 동기화**
  - **수정/생성 파일**:
    - `docs/bundler/protocol.md` — `bb1b195`(유튜브 동영상 카드 기능 추가) 커밋에서 4.3절(동영상 카드 JSON 스펙)이 추가될 때 헤딩 레벨이 `####`로 잘못 지정되어 4.1/4.2와 형제 관계가 아닌 것처럼 보이던 문제를 `###`로 수정하고 구분선(`---`)을 추가함. 또한 6절(검증 규칙)에 실제 업로드 API(`app/api/admin/courses/upload/route.ts`)가 수행하는 동영상 카드 스키마 검증(4번 항목: `title`/`type`/`video_info.provider`/`video_info.video_id`/`subtitles` 배열 타입) 내역이 누락되어 있어 추가하고, 서버가 검증하지 않는 자막 `start<end` 순서 정합성은 "권장, 서버 미검증" 항목으로 명시함.
    - `docs/bundler/ai-agent-instructions.md` — 동영상 카드 기능 추가 이후에도 마크다운 카드 생성 지침만 남아 있어, 원고에 대응하는 유튜브 영상이 있을 때 `cards/*.json` 동영상 카드로 제작하는 핵심 준수 지침(5번 항목)과 작업 프로세스(2/3단계), 자가 검증 체크리스트(4단계)를 추가함. 자막 타임스탬프는 실제 영상 자막/스크립트 근거 없이 임의로 생성하지 말라는 주의사항을 명시함.
    - `docs/bundler/creator-interview-guide.md` — 강좌 제작자 인터뷰 질문 목록에 동영상 카드 관련 3.3절(유튜브 영상 URL/ID 확인, 원본 자막 유무 확인, 재생 길이 확인)을 신규 추가함. AI가 자막을 추측 생성하지 않도록 명시적으로 안내함.
  - **작업 내용**:
    - `bb1b195` 커밋에서 `protocol.md`만 갱신되고 두 하위 지침 문서(`ai-agent-instructions.md`, `creator-interview-guide.md`)는 갱신되지 않아 CLAUDE.md의 "Bundler 프로토콜 수정 시 하위 지침 문서들도 즉시 최신화" 규칙을 완전히 만족하지 못한 상태였음을 발견하고 보완함. 코드(검증 로직, `client.tsx`의 자막 클릭 탐색 UI) 변경은 없으며 문서만 갱신함.

- **[CLEANUP] 나의 강좌 화면에서 개별 강좌 카드 제거 및 테스트 데이터 정리**
  - **수정/생성 파일**:
    - `app/(user)/my-courses/page.tsx` — 패키지에 속하지 않은 "개별 강좌" 카드 UI(활성/완료 탭 모두)를 완전히 제거하고 패키지 카드만 표시하도록 변경함. 이에 따라 개별 강좌 카드에서만 쓰이던 담당 에이전트 조회 로직(`getAssignedAgent`, `agents` state, `getExternalAgents` 호출)과 관련 아이콘 import(`PlayCircle`, `AlertCircle`)를 제거했고, 탭 카운트/빈 상태 문구도 패키지 기준으로만 계산하도록 단순화함. `progressList`(및 `/api/courses/progress` 호출)는 패키지 내 강좌의 "이어보기" 대상(`getPackageTargetUrl`)을 계산하는 데 계속 사용되므로 유지함.
    - `db.json` — 개별 강좌로 등록되어 있던 테스트용 강좌 `video-test-course-id`("동영상 및 자막 연동 테스트 강좌")를 `courses`에서 삭제하고, 관련 `user_progress` 5건, 해당 강좌를 언급하는 테스트용 `user_external_agent_messages` 4건을 함께 삭제함.
    - `public/courses/video-test-course/` (삭제) — 위 테스트 강좌의 카드/설정 에셋 폴더.
  - **작업 내용**:
    - 개별 강좌 카드는 패키지에 속하지 않은 강좌 진행 상태를 보여주던 기능이었으나 실사용 데이터가 없고 테스트용으로만 쓰이고 있어(위 `video-test-course` 사례), 향후 개별 강좌 등록 플로우 자체를 사용하지 않기로 하고 UI와 테스트 데이터를 모두 제거함.
    - `tsc --noEmit` 확인: 수정한 파일 기준 신규 에러 없음 (기존에 있던 `components/layout/UserHeader.tsx`의 무관한 타입 에러 1건은 이번 변경과 무관).

- **[FEATURE] 영상 학습 화면 자막 UX를 팝업형 "자막 탐색"으로 개편**
  - **수정/생성 파일**:
    - `app/(user)/learn/[slug]/client.tsx` — 영상 카드 하단에 항상 펼쳐져 있던 인라인 자막 리스트(스크롤 영역이 좁아 가독성이 나쁘다는 피드백)를 제거하고, 콘텐츠 헤더의 즐겨찾기(Bookmark)/공유(Share2) 아이콘 버튼(미연결 상태였음)을 "자막 탐색" 버튼으로 교체함. 버튼은 영상 타입 카드이고 자막이 있을 때만 노출되며, 클릭 시 좌측 "강좌 목차" 패널 전체를 덮는 오버레이 팝업(`isSubtitlePopupOpen` state)을 띄워 `[mm:ss] 자막` 형식의 리스트를 보여줌. 초를 `mm:ss`로 변환하는 `formatSubtitleTime` 헬퍼를 추가. 자막 항목 클릭 시 기존과 동일하게 `playerRef.current.currentTime` 이동 + 재생하되 팝업은 닫지 않고 유지, 현재 재생 시간과 일치하는 자막은 계속 강조 표시됨. 카드 전환 시 팝업은 자동으로 닫힘.
    - `docs/superpowers/specs/2026-07-05-subtitle-explorer-popup-design.md` (신규, gitignore 대상) — 설계 스펙 문서
  - **작업 내용**:
    - Playwright로 `/learn/video-test-course` 접속 후: 텍스트 카드(1.1)에서는 버튼 미노출, 영상 카드(1.2)에서 버튼 노출을 확인. 버튼 클릭 → 목차 패널이 팝업으로 전환되고 현재 재생 시점 자막(`[00:03]`)이 강조됨을 확인. `[00:14]` 자막 클릭 → 영상 프레임이 해당 시점으로 이동하고 팝업이 유지됨을 확인. X 버튼 클릭 → 팝업이 닫히고 목차 패널이 정상 복귀됨을 확인. 콘솔에 새 에러 없음 (기존에 알려진 무관한 에이전트/이슈 위젯 경고만 존재).
    - Bundler 프로토콜(카드 JSON 스키마)은 변경되지 않았으므로 `docs/bundler/protocol.md` 동기화는 해당 없음.

- **[BUGFIX] 비디오 카드 컨텐츠 영역에 원본 JSON 텍스트가 출력되던 문제 근본 해결**
  - **수정/생성 파일**:
    - `app/(user)/learn/[slug]/client.tsx` — 비디오 타입 카드(`type: 'video'`)일 때 카드 컨텐츠 영역이 `mdxSource`/`content` 분기만 확인하고 `videoInfo`를 전혀 처리하지 않아, `page.tsx`가 채워준 카드 JSON 원본 텍스트(`content`)가 그대로 화면에 출력되던 근본 원인을 수정함. `next/dynamic(ssr:false)`로 `ReactPlayer`를 동적 임포트하고, 실제 설치된 `react-player@3.4.0`의 `dist/types.d.ts`를 직접 확인하여 v3 API(`src`, `ref`→`HTMLVideoElement`, `onTimeUpdate`, `config.youtube`의 평탄한 스키마)에 맞춰 구현. 카드 이동 시에만 자동재생되도록 `lastPlayedCardIndex` ref로 최초 로드와 구분했고, `playerConfig`는 `useMemo`로 고정하여 리렌더링마다 플레이어가 재생성되지 않도록 함. 자막 목록 클릭 시 `playerRef.current.currentTime`으로 탐색.
    - `wiki/sources/2026-07-05-video-card-content-not-rendering-fix.md` (신규) — 원인 분석과 해결 내역, 그리고 과거 위키 문서 오기재 정황 정리.
  - **작업 내용**:
    - 조사 결과, 기존 위키 문서(`2026-07-05-video-playback-and-sidebar-hydration-fix.md`, `2026-07-05-react-player-v3-api-migration-fix.md`)는 `client.tsx`에 `ReactPlayer` 구현이 이미 완료·검증되었다고 기록했으나, `git log -p -S "ReactPlayer"` 전체 이력 조회 결과 해당 코드는 어떤 커밋에도 존재한 적이 없었음을 확인함. 실제로는 다른 AI 코딩 툴(Antigravity CLI)이 여러 차례 동일 JSX 교체를 시도했으나(트랜스크립트 로그 추출 결과 `scripts/extracted_changes.txt` 참고) 파일에 반영되지 못했고, 위키 문서만 "완료"로 잘못 남겨진 상태였음.
    - Playwright로 `/learn/glm52-video-course?package=glm52-video-package` 접속 후 비디오 썸네일 렌더링, 재생 버튼 클릭 시 실제 재생(`paused: false`, `currentTime` 증가), 자막 클릭 시 탐색 동작을 모두 확인. 콘솔 에러 0건. 별도 MDX 텍스트 강좌(`iot-communication-ch01`)에서도 회귀 없음을 확인함 (기존에 알려진 `next-mdx-remote`/React 19 SSR Hydration 에러는 본 작업과 무관한 별개 이슈로 클라이언트 폴백 렌더링에 지장 없음).
    - 강좌 번들 프로토콜(`video_info` JSON 스키마)은 변경되지 않았으므로 `docs/bundler/protocol.md` 동기화는 해당 없음.

- **[BUGFIX] react-player v3 API 마이그레이션 불일치로 인한 동영상 강좌 재생 불가 문제 근본 해결**
  - **수정/생성 파일**:
    - `app/(user)/learn/[slug]/client.tsx` — `package.json`에 설치된 `react-player`가 `^3.4.0`(네이티브 커스텀 엘리먼트 기반 완전 재작성 버전)임에도 코드가 v2 스타일 API(`url`, `onReady(player)`, `onProgress({playedSeconds})`, `config.youtube.playerVars`, `seekTo()`)를 그대로 사용하고 있어 플레이어가 완전히 빈 화면으로 렌더링되고 재생/탐색이 전혀 동작하지 않던 근본 원인을 해결함. 구체적으로 `url` prop을 `src`로 변경(v3에는 `url` prop 자체가 없어 소스가 전달되지 않아 화면이 비어 있었음), `onReady`가 v3에서 인자 없이 호출되는 점을 확인하고 `ref={playerRef}`로 변경(v3의 ref는 내부 커스텀 엘리먼트(`HTMLVideoElement` 확장)로 직접 포워딩됨을 `dist/index.d.ts` 타입 정의로 검증), `onProgress`를 표준 `onTimeUpdate` + `event.currentTarget.currentTime`으로 교체, `config.youtube`를 `youtube-video-element`의 실제 config 타입에 맞춰 `playerVars` 래핑 없는 평탄한 객체로 수정(존재하지 않는 `autoplay`/`modestbranding` 키 제거), 자막 클릭 시 `playerRef.current.seekTo(sub.start, 'seconds')` 호출을 `playerRef.current.currentTime = sub.start`로 교체(v3 ref 대상은 `seekTo` 메서드가 없는 네이티브 비디오 엘리먼트이므로).
  - **작업 내용**:
    - `node_modules/react-player`의 실제 `dist/index.d.ts`, `dist/types.d.ts`와 `youtube-video-element`의 타입 정의를 직접 확인하여 v2→v3 API 변경점을 규명한 뒤, 기존 4가지 디버깅 히스토리(자동재생 차단/높이 0px/config 리렌더링/seekTo ref 문제)의 수정 코드는 그대로 보존한 채 v3 불일치 지점만 교정함. Playwright로 `/learn/glm52-video-course` 페이지에서 실제 유튜브 프레임 렌더링, 재생 버튼 클릭 시 재생 전환, 자막 클릭 시 시점 이동, 콘솔 에러 없음, 그리고 별도 MDX 텍스트 강좌(`iot-communication-ch01`)의 회귀 없음을 모두 시각적으로 검증함. 번들 프로토콜(카드 JSON 스키마)은 변경되지 않았으므로 `docs/bundler/protocol.md` 동기화는 해당 없음.
    - 검증 중 `iot-communication-ch01` 강좌에서 `next-mdx-remote`와 React 19 간의 SSR Hydration 에러(`Cannot read properties of null (reading 'useState')`)가 발견되었으나, 이는 본 작업의 변경 범위(비디오 카드 렌더링 분기)와 무관한 기존 이슈이며 클라이언트 렌더링으로 정상 폴백되어 콘텐츠 표시에는 지장이 없음을 확인함. 별도 이슈로 추적 필요.

- **[MAINTENANCE] 동영상 강좌 기능 구현/디버깅 통합 스펙 아카이빙**
  - **수정/생성 파일**:
    - `docs/temp/01-debugging-history.md` (신규) — 비디오 자동 재생 차단, aspect-video 높이 0px 렌더링 붕괴, useMemo 메모이제이션 및 seekTo 타입 에러 해결 등 상세 디버깅 역사 정리
    - `docs/temp/02-video-course-protocol.md` (신규) — 동영상 학습 카드의 JSON 데이터 스키마 및 프론트엔드 연동 컨벤션 규격 요약
    - `docs/temp/03-test-data-spec.md` (신규) — GLM-5.2 테스트 강좌 패키지 구조, 로컬 파일 시스템 경로 및 db.json 구독 검증 안내 가이드 작성
  - **작업 내용**:
    - 다른 검증 에이전트의 교차 확인 및 기능 검증 절차를 매끄럽게 지원하기 위하여 지금까지 축적된 모든 동영상 학습 기능 관련 디버깅 결과물과 테스트 사양서를 아카이브 폴더에 일원화하여 구축했습니다.

- **[BUGFIX] 비디오 강좌 최초 진입 시 자동 재생 에러, 플레이어 렌더링 붕괴, seekTo 예외 및 사이드바 Hydration mismatch 해결**
  - **수정/생성 파일**:
    - `components/layout/UserSidebar.tsx` — 사이드바 축소 상태 텍스트(`O` / `Open Tutorials`) 렌더링에 `mounted` 체크 상태를 추가하여 SSR과 CSR 결과 불일치로 인한 Hydration mismatch 에러 해결
    - `app/(user)/learn/[slug]/client.tsx` — Strict Mode로 인한 이중 마운트 시 `isFirstLoad` 초기값 초기화 오작동을 방지하기 위해 `lastPlayedCardIndex` ref 추적으로 변경하여 최초 자동 재생 차단을 보장함. 또한 `ReactPlayer`에 `absolute` 배치를 적용하여 16:9 높이 0px 붕괴를 해결하고, YouTube `origin` 파라미터를 추가하여 로컬에서의 임베드 재생 오류 방지. `next/dynamic` 래퍼에 기인한 `ref` 포워딩 유실로 발생하던 `seekTo is not a function` 에러를 `onReady` 콜백으로 직접 인스턴스를 주입받도록 수정하여 해결하고, `playerConfig`를 `useMemo`로 메모이제이션하여 매 리렌더링마다 플레이어가 재로드되는 현상을 방지함.
    - `wiki/sources/2026-07-05-video-playback-and-sidebar-hydration-fix.md` — 해당 이슈 원인 분석과 대책을 정리한 상세 위키 문서 추가 및 보완
  - **작업 내용**:
    - 동영상 강좌 페이지 진입 시 발생하는 브라우저 자동 재생 차단 오류, Strict Mode 중복 실행 버그, ReactPlayer 크기 0px 렌더링 문제, 자막 클릭 시 seekTo 타입 에러 및 사이드바의 Hydration mismatch 오류를 종합적으로 해결하여 정상적인 동영상 수강 및 자막 동기화가 가능하도록 개선했습니다.

- **[FEATURE] 유튜브 동영상 강좌 예제 패키지 생성 및 등록**
  - **수정/생성 파일**:
    - `public/courses/glm52-video-course/config.json` (신규) — 유튜브 동영상 강의 카드를 담기 위한 목차 및 메타데이터 정의 파일 생성
    - `public/courses/glm52-video-course/wiki.md` (신규) — 강좌의 지식베이스 콘텐츠로 사용될 마크다운 가이드 파일 생성
    - `public/courses/glm52-video-course/cards/01_introduction.json` (신규) — 유튜브 비디오 ID(`TIDGQVVkSZ8`)와 학습 편의를 위한 자막 데이터를 포함한 동영상 카드 파일 생성
    - `db.json` — `courses`, `course_packages`, `course_package_items`, `user_package_subscriptions` 테이블에 GLM-5.2 동영상 강좌와 패키지를 수동 등록 및 사용자 자동 구독 처리
  - **작업 내용**:
    - 유튜브 영상 링크(`https://www.youtube.com/watch?v=TIDGQVVkSZ8`)를 활용해 플랫폼 내 동영상 재생 및 자막 동기화 동작을 검증하기 위한 테스트용 예제 강좌 번들을 로컬 스토리지에 직접 구성하고 데이터베이스에 등록을 완료했습니다.

- **[MAINTENANCE] 배포 준비를 위한 사용하지 않는 리소스 아카이빙 및 문서/매뉴얼 작성**
  - **수정/생성 파일**:
    - `README.md` — PennyPress 기반의 설명을 모두 걷어내고 Open Tutorials의 설치, 실행, 강좌 업로드, AI 튜터 연동, 강좌 작성용 AI 에이전트(Bundler) 활용을 설명하는 최신 문서로 개편했습니다.
    - `docs/architecture/README.md` (신규) — 온디바이스 로컬 애플리케이션 플랫폼(Open Tutorials)의 프론트엔드, 로컬 DB(`db.json` 및 mock-client), 로컬 스토리지(`public/courses/`), AI 튜터 연동 등의 아키텍처 구조를 설명하는 문서를 생성했습니다.
    - `docs/manual/README.md` (신규) — 사용자를 위한 앱 설치/실행 및 강좌 등록/학습 방법과 제작자를 위한 강좌 번들 ZIP 구성 명세, AI 에이전트(Bundler) 활용법을 포함하는 종합 매뉴얼을 생성했습니다.
    - `.gitignore` — `docs/` 디렉토리 하위의 `architecture/`와 `manual/` 폴더를 제외한 모든 임시/아카이브 하위 폴더들을 무시하도록 룰을 재설정했습니다.
    - `docs/archive/` (신규) — 기존에 사용하던 배포 불필요 디렉토리인 `agent-worker`, `supabase`, `graph`를 아카이브 목적으로 내부 이동시켰습니다.
  - **작업 내용**:
    - Open Tutorials 오픈소스 출시 및 배포를 앞두고 프로젝트 전반의 기술 스펙을 최신화하고 불필요한 유산을 정리하였습니다.
    - 매뉴얼에 강좌 제작을 돕는 OpenTutorials-Bundler AI 에이전트 저장소 주소를 연동하여 제작자가 쉽게 로컬 콘텐츠 패키지를 빌드할 수 있도록 유도하였습니다.

- **[FEATURE] 하네스 에이전트 등록/설정 화면 내 활성 모델 비노출 및 연결 검증 최적화**
  - **수정/생성 파일**:
    - `components/features/AgentSettingsTab.tsx` — 하네스 에이전트인 경우 지원 모델 조회 카드에서 새로고침(refresh) 버튼 및 감지 모델 목록/선택 UI 대신 프로그램에 설정된 LLM 사용 안내 메시지 박스를 표시하도록 변경했습니다. 또한 에이전트 정보 수정/보기 화면에서 '활성 모델' 필드를 숨기고, 연결상태 확인 시 복잡한 LLM 모델 목록 조회/검증 단계를 거치지 않고 연결 성공을 반환하도록 개선했습니다.
    - `components/features/AddAgentModal.tsx` — 신규 에이전트 등록 화면에서도 하네스 에이전트인 경우 '활성 모델' 필드를 숨기고, 연결상태 확인 시 모델 조회를 생략한 채 연결 성공 처리가 완료되도록 변경했습니다.
    - `wiki/sources/2026-07-05-harness-agent-model-view-improvement.md` (신규) — 작업의 상세 내용과 구조를 기록한 상세 위키 문서 생성.
  - **작업 내용**:
    - 하네스 에이전트 환경에서 불필요한 LLM 모델 입력/검증 단계를 완벽히 제거하여 사용자의 오인지를 방지하고 원격 서버와의 유연한 연결 수립을 도모했습니다.

- **[FEATURE] 강좌 자동 수강 및 삭제 cascade 구현, 에이전트 상세 탭 개선 및 사용량 그래프 시각화**
  - **수정/생성 파일**:
    - `app/(user)/courses/manage/upload/page.tsx` — 새 강좌 등록 성공 직후, `/api/courses/subscribe` API를 자동으로 호출하여 등록자를 자동 수강 처리하도록 연동함.
    - `app/api/admin/packages/[id]/route.ts` — 강좌 삭제(`DELETE`) 시, 누적 수강 정보 및 개별 학습 진행 기록 등 관련 매핑 데이터가 데이터베이스에서 함께 깔끔하게 cascade 삭제되도록 로직을 보강함.
    - `app/(user)/my-agents/[id]/page.tsx` — 에이전트 상세 화면의 탭 배치를 `[통계 - 대화 - 설정]` 순으로 변경하고, `localStorage`를 활용해 마지막 활성 탭 상태를 기억 및 유지하도록 개선함. 또한 대화 로그의 타임스탬프를 로컬 시간 기준으로 일별 집계하여 Recharts 기반 월별 사용 시간 및 사용 토큰 추이 막대그래프로 표출하도록 통계 탭을 전면 개편함.
    - `wiki/sources/2026-07-05-course-enrollment-and-agent-stats-chart.md` (신규) — 작업의 상세 내용과 구조를 기록한 상세 위키 문서 생성.
  - **작업 내용**:
    - 검색 화면이 사라짐에 따라 수강 신청을 처리하기 곤란했던 환경에서 강좌 등록과 동시에 자동 수강 신청이 되도록 개선하여 원활한 테스트 및 대시보드 진입을 지원하도록 함.
    - 패키지 제거 시 정합성 오류로 유령 데이터가 남는 문제를 cascade delete를 통해 방지함.
    - 에이전트 통계의 신뢰도 향상을 위해 실제 챗 기록을 일 단위로 버킷 집계하여 보여주고, Recharts 차트 도입을 통해 가시성 높은 추이 그래프를 튜터 포털 내에 제공함.

- **[FEATURE] 하네스 에이전트 연결상태 확인 시 LLM 모델 정보 상세 노출 및 동기화 개선**
  - **수정/생성 파일**:
    - `components/features/AgentSettingsTab.tsx` — 연결상태 확인(`handleTestConnection`) 시 하네스 에이전트의 현재 사용 모델(`current_model`)과 지원 모델 목록 정보를 문자열로 요약하여 테스트 결과 메시지에 상세하게 노출하도록 변경함. 또한 연결 확인이 성공하면 컴포넌트의 `models` 상태를 API로부터 감지된 모델 목록으로 즉시 동적 갱신하여 우측 카드에 즉각 반영되도록 처리함.
  - **작업 내용**:
    - 하네스 에이전트에서 단순 "연결 성공!" 메시지만 보여주던 이전 UX를 보강하여, 실제 감지된 사용 모델 및 지원 모델 목록을 함께 확인하고 프론트엔드 상태에 실시간 동기화할 수 있도록 구현함.

- **[BUGFIX] 에이전트 수정 폼에서 연결상태 확인 시 기존 API 키가 정상적으로 사용되도록 수정**
  - **수정/생성 파일**:
    - `components/features/AgentSettingsTab.tsx` — 연결상태 확인(`handleTestConnection`) 시 폼 내 입력된 `apiKey`가 비어있을 경우 기존 저장된 `agent.api_key`를 사용(fallback)하도록 통신 바인딩을 개선함.
  - **작업 내용**:
    - 에이전트 상세의 설정 탭에서 '정보 수정' 시 기존 설정된 API Server Key가 마스킹(빈값) 처리되어 화면에 표시되는데, 이 상태에서 하단 '연결상태 확인' 버튼을 누르면 빈 API Key로 요청되어 에러가 발생하는 UX 결함을 발견하여 기존에 저장해둔 유효한 API Key를 우선 대입해 성공적으로 검증할 수 있도록 수정함.

- **[FEATURE] 에이전트 대화 내 히든 메시지를 활용한 사용 모델 자동 업데이트 기능 구현**
  - **수정/생성 파일**:
    - `components/features/AgentChatTab.tsx` — 대화 응답 스트림 수신 완료 후 `<!-- HIDDEN_MESSAGE: ... -->` 형태의 특수 주석을 감지하여 `selected_model` 또는 `current_model` 등을 추출하는 `parseHiddenMessages` 및 스트리밍 중인 미완성 주석을 숨기는 `cleanStreamingText` 기능을 탑재함. 감지된 사용 모델 정보가 있을 경우 `updateExternalAgent` API를 호출해 DB를 자동 업데이트하고, 변경 완료를 알리는 세련된 에메랄드 테마의 Toast 알림 배너를 띄움. 또한 `agents-updated` 전역 이벤트를 디스패치함.
    - `app/(user)/my-agents/[id]/page.tsx` — `agents-updated` 전역 이벤트를 리슨하여 에이전트 정보가 업데이트되었을 때 화면 깜빡임 없이 무중단(silent)으로 에이전트 상세 및 설정 정보를 다시 로드하여 즉시 반영하는 실시간 SPA 동기화 로직을 보완함.
  - **작업 내용**:
    - 사용자가 에이전트와 대화하는 도중 에이전트가 "사용 중인 모델 정보"를 히든 메시지로 반환할 때, 수동으로 확인하고 변경할 필요 없이 에이전트의 타겟팅 모델 설정을 실시간으로 자동 갱신하도록 처리함.
    - 사용자 메시지 및 에이전트 응답 렌더링 시 HTML 주석 블록이 날것으로 화면에 노출되지 않도록 깔끔하게 필터링(strip)하여 격리하도록 개선함.

- **[BUGFIX] 하네스 에이전트 연결 확인(Refresh) 시 LLM 모델 정보 자동 업데이트 및 화면 표시 개선**
  - **수정/생성 파일**:
    - `agent-worker/main.py` — 하네스 에이전트의 mock `/v1/models` API 응답에 `current_model` 필드 및 사용 가능한 모델 정보(예: `deepseek-v4-pro`)를 추가하고, 사용 중인 LLM 모델에 `"current": True`와 에이전트 쉘에 `"hidden": True`를 설정함.
    - `app/api/external-agents/test/route.ts` — 에이전트 서버의 `/v1/models` 응답에서 `current_model` 또는 `current: true` 속성을 추출하여 연결 테스트 결과 응답에 `current_model`로 함께 내려주도록 연동.
    - `components/features/AgentSettingsTab.tsx` — `ModelItem` 인터페이스에 `hidden` 필드를 추가하고, `fetchModels`에서 모델 정보를 새로고침(Refresh)하거나 로드할 때 하네스 에이전트인 경우 `hidden` 속성이 없는 실제 LLM 모델 및 서버가 반환한 `current_model` 정보를 감지하여 DB의 `selected_model`로 자동 업데이트 및 화면 새로고침 처리함. 또한 화면에서 `hidden` 속성이 설정된 에이전트 쉘 모델(예: `hermes-agent`)을 필터링하여 사용자에게 실제 LLM 모델들만 지원 모델 목록으로 보여주도록 함.
    - `components/features/AddAgentModal.tsx` — 에이전트 신규 등록 시 연결 테스트 단계에서 하네스 에이전트인 경우 `hidden: true`가 아닌 실제 LLM 모델들을 감지하고, 서버가 반환한 `current_model` 또는 첫 번째 실제 모델이 기본 선택되도록 보완함.

- **[FEATURE] 에이전트 상세 정보 고도화 및 하네스 에이전트 모델 수동 관리 기능 구현**
  - **수정/생성 파일**:
    - `lib/types/index.ts` — `agent_program` 유니온 타입에 `'other'` 옵션 추가.
    - `components/features/AddAgentModal.tsx` — 하네스 및 LLM 에이전트 프로그램 선택지에 '기타(Other)' 버튼 및 퀵 URL 매핑을 추가하고, 하네스 에이전트 등록 시 원격 API 대신 직접 사용할 LLM 모델명을 텍스트 입력창으로 수동 지정할 수 있도록 구현.
    - `components/features/AgentSettingsTab.tsx` — 에이전트 상세의 '에이전트 타입' 영역에 [에이전트 타입, 실행 환경, 에이전트 프로그램] 3가지 메타데이터를 나란히 뱃지로 표시하고 중복 행을 제거. 또한 에이전트 프로그램 수정 선택지에 '기타' 추가 및 하네스 에이전트의 지원 모델이 없거나 API 실패 시 수동으로 모델을 입력하고 바로 갱신/업데이트할 수 있는 조력 UI 연동.
  - **작업 내용**:
    - 사용자가 에이전트 상세에서 어떤 에이전트인지 한눈에 알 수 있게 뱃지 3종을 그룹화하여 노출함.
    - LM Studio 등 다양한 실행 툴 대응을 위해 '기타' 프로그램을 하네스/LLM 에이전트 양쪽 모두에 추가함.
    - NousResearch Hermes 등 자체 `/v1/models`를 반환하지 않는 하네스 에이전트 프레임워크의 특성을 반영하여, 등록 및 설정 시 LLM 모델명을 수동으로 타겟팅해 지정 및 수동 조회(Refresh)가 가능하도록 개선함.

- **[FEATURE] 에이전트 상세 화면 및 강좌 상세 화면 통계 실데이터(누적 사용 시간 등) 연동**
  - **수정/생성 파일**:
    - `app/api/external-agents/[id]/chat/route.ts` — 대화 로그 파일(`public/agent-chats/[id].json`)의 누적 기록 데이터를 조회할 수 있도록 GET 메소드 연동.
    - `app/(user)/my-agents/[id]/page.tsx` — 가짜 hash 기반 통계(`getAgentStats`)를 제거하고, `/api/external-agents/[id]/chat`을 호출하여 실제 챗 로그 데이터를 불러와 누적 사용 시간, 평균 응답 시간, 누적 및 평균 토큰 등을 동적으로 계산하여 표출하도록 수정.
    - `app/(user)/courses/[slug]/client.tsx` — 가짜 hash 기반 통계를 제거하고, 동적 fetch 훅을 장착한 `AgentStatsView` 서브 컴포넌트를 설계하여 선택된 에이전트의 챗 로그를 읽어와 실제 메트릭을 출력하도록 리팩토링.
  - **작업 내용**:
    - 에이전트 상세 화면과 강좌 상세 화면의 통계 탭에서 에이전트 누적 사용 시간이 기존의 고정값/가짜값이 아닌 "챗 요청부터 응답 완료까지의 실제 duration_ms 총합"을 연산하여 보여주도록 변경함.
    - 이에 필요한 챗 로그 파일 전체 조회 API를 기존의 채팅 라우트에 GET 메소드로 빌드하여 연동 완료함.

- **[FEATURE] 에이전트 등록 팝업 및 상세 페이지 편의성 개편, AI 튜터 설정 기능 제거**
  - **수정/생성 파일**:
    - `components/features/AddAgentModal.tsx` — Web UI/Kanban URL 필드 및 AI 튜터용 설정 스위치 삭제. 실행 환경(로컬/클라우드) 및 에이전트 프로그램(Hermes/Open claw 혹은 Ollama/LM Studio)을 선택하여 포트와 URL 템플릿이 자동으로 입력창에 채워지는 "빠른 URL 설정" 기능 구현. 에이전트 타입 설명(하네스: "Hermes, Open claw와 같은 에이전트 프로그램", LLM: "순수하게 LLM을 호출하는 API (Ollama, LM Studio 등)") 최적화.
    - `app/(user)/my-agents/page.tsx` — 에이전트 카드에서 AI 튜터 뱃지 제거 및 우측 메뉴의 "AI 튜터로 설정" 토글 기능과 셋업 오버레이 제거.
    - `app/(user)/my-agents/[id]/page.tsx` — 상세 화면 상단의 Web UI 새 창 열기 버튼 제거.
    - `components/features/AgentSettingsTab.tsx` — 정보 수정 폼과 상세 정보 보기 화면에서 Web UI/Kanban URL 필드 제거, 에이전트 타입 설명 보완, AI 튜터 지정 스위치 및 관련 뱃지/오버레이 제거.

- **[FEATURE] 로컬 LLM(Ollama, LM Studio) 에이전트 연동 버그 및 갭 수정**
  - **수정/생성 파일**:
    - `lib/utils/agent-endpoint.ts` (신규) — localhost IP 치환, trailing slash 제거, `/v1` 접미사 추출 헬퍼 함수 `normalizeAgentEndpoint` 구현.
    - `app/api/external-agents/test/route.ts` — `/health` 호출이 실패하더라도 즉시 중단되지 않도록 완화하고, `/v1/models` 성공 여부만으로 연결 성공 판정하도록 수정. 엔드포인트 헬퍼 연동.
    - `app/api/external-agents/[id]/chat/route.ts` — `selected_model`이 없을 경우 무조건 `'hermes-agent'`로 폴백하는 대신 예외(400)를 반환하도록 예외 처리 보강. 엔드포인트 헬퍼 연동.
    - `app/api/external-agents/setup-tutor/route.ts` — 엔드포인트 헬퍼 연동.
    - `components/features/AddAgentModal.tsx` — 연결 테스트 성공 시 모델 목록을 사용자가 직접 선택할 수 있는 Select 드롭다운 UI 추가 및 Ollama/LM Studio 안내 문구 보강. 엔드포인트 헬퍼 연동.
    - `components/features/AgentSettingsTab.tsx` — 에이전트 수정 폼 및 지원 모델 조회 카드에 Select 드롭다운을 통한 활성 모델 선택 및 퀵 변경 UI 추가, Ollama/LM Studio 안내 문구 보강. 엔드포인트 헬퍼 연동.
    - `app/(user)/my-agents/page.tsx` — 엔드포인트 헬퍼 연동.

- **[INGEST] 로컬 LLM(Ollama, LM Studio) 에이전트 연동 리서치**
  - **생성 파일**:
    - `docs/research/2026-07-05-local-llm-ollama-lmstudio-integration.md` (신규) — 리서치 원본 문서
    - `wiki/sources/2026-07-05-local-llm-ollama-lmstudio-integration.md` (신규) — 위키 인제스트 요약
    - `wiki/concepts/LocalLLMAgentIntegration.md` (신규)
    - `wiki/concepts/ExternalHermesAgent.md` — 관련 개념 링크 추가
  - **작업 내용**: Ollama/LM Studio를 현재 `UserExternalAgent` 등록 구조(엔드포인트+API 키)로 연동하려면 무엇이 바뀌어야 하는지 코드 조사. 결론: 필드 추가는 불필요하나 (1) 연결 테스트의 `/health` 필수 체크, (2) 채팅 라우트의 `'hermes-agent'` 모델 폴백, (3) 모델 자동(첫 번째) 선택 UX 3가지가 로컬 LLM과 맞지 않아 수정이 필요함을 확인. 코드 변경은 미착수(리서치 전용).

- **[FEATURE] 에이전트 기능 확장(하네스 및 LLM), 강좌별 개별 에이전트 매핑, 구독 시 기본 에이전트 자동 지정**
  - **수정/생성 파일**:
    - `lib/types/index.ts` — `UserExternalAgent` 타입에 `agent_type` 필드 및 `Course` 타입에 `agent_id` 필드 추가.
    - `components/features/AddAgentModal.tsx` — 에이전트 등록 시 '하네스 에이전트' 또는 'LLM 에이전트' 타입을 선택하는 라디오 버튼 UI 추가 및 저장 기능 구현.
    - `components/features/AgentSettingsTab.tsx` — 에이전트 설정 수정 시 에이전트 타입 선택 UI 추가 및 저장 기능 구현, 상세 조회 화면에 에이전트 타입 노출.
    - `app/(user)/my-agents/page.tsx` — 에이전트 목록의 각 카드에 '하네스' / 'LLM' 타입을 나타내는 뱃지 UI 추가.
    - `app/api/courses/subscribe/route.ts`, `app/api/packages/subscribe/route.ts` — 신규 강좌/패키지 구독 시 당시 활성화된 기본(Default) 에이전트의 ID를 강좌의 `agent_id`에 자동으로 매핑하는 기능 구현.
    - `app/api/courses/[slug]/route.ts` — 강좌 상세 정보 조회 시 사용 가능한 전체 에이전트 목록(`external_agents`)을 함께 응답하도록 GET API 수정.
    - `app/(user)/courses/[slug]/client.tsx` — 강좌 상세 화면에서 각 파트(하위 강좌)별로 학습을 전담할 에이전트를 선택하여 개별 저장(PATCH)할 수 있는 셀렉트 UI 추가.
    - `app/(user)/learn/[slug]/client.tsx` — 강좌의 매핑된 에이전트(`agent_id`) 또는 기본 AI 튜터를 찾아 로드하고, `llm` 에이전트 타입인 경우 1) 시스템 리소스 다운로드/점검 절차를 생략하고 즉시 학습 상태(downloaded)로 초기화하며 2) 질문 시 [강좌 요약 및 설명, 현재 카드의 텍스트 내용, 관련 위키/리소스 context, 사용자의 질문]을 조합한 구조화된 프롬프트를 시스템 메시지로 다르게 조립하여 외부 LLM 서버로 전달하도록 개선.
    - `app/api/external-agents/[id]/chat/route.ts` — LLM 에이전트 타입의 대화 요청 시 `user_external_agent_messages` 테이블의 누적 대화 기록을 역순(시간순)으로 정렬하여 messages 배열로 재구성한 후 외부 completions API로 중계(relay) 전송하는 세션 유지 로직 구현.

- **[FEATURE/UI] 강좌 및 에이전트 관리 UI 개선 및 에이전트 대화 전체 보존(토큰/시간 로그 기록)**
  - **수정/생성 파일**:
    - `app/(user)/courses/manage/page.tsx` — 전체 강좌 목록 카드에서 불필요한 [매니페스트 수정] 버튼 삭제 및 버튼 정렬 레이아웃을 Grid에서 Flex로 최적화.
    - `app/(user)/my-agents/page.tsx` — 에이전트 카드에서 "지침 설정 완료" 뱃지 제거, 하단 [웹 UI] 버튼 삭제 및 [삭제] 버튼 추가, 카드 body 클릭 시 상세 화면으로 이동하도록 구현. 마운트 시 에이전트 자동 상태 동기화 추가.
    - `app/(user)/my-agents/[id]/page.tsx` — 상세 화면 탭을 [대화], [설정] 두 개로 축소. 이탈(unmount) 시 5분 연결 종료 타이머를 설정하는 전역 관리 훅 추가 및 머무는 동안 연결 유지. 전체 페이지 및 탭 spacing/margin 여백 밸런스 조절.
    - `app/(user)/learn/[slug]/client.tsx` — 학습 화면 이탈 시 5분 타이머 작동 및 에이전트 연결 종료 명시적 처리.
    - `components/features/AgentChatTab.tsx` — 대화 탭 헤더에서 Model 정보 노출부 삭제, footer 영역의 매크로 토글 버튼 및 매크로 선택 패널 삭제, input placeholder 가이드 문구 수정. CardContent 패딩 및 스페이싱 축소로 여백 최적화.
    - `components/features/AgentSettingsTab.tsx` — 설정 정보 카드 및 모델 조회 카드의 Header, Content 패딩과 상세 항목 간 여백을 줄여 레이아웃 밸런스 개선.
    - `app/api/external-agents/[id]/chat/route.ts` — 스트림 완료 시 대화 소요 시간(durationMs), 입력/출력 텍스트의 근사 토큰 크기를 연산하여 `public/agent-chats/<id>.json` 파일에 모든 대화 로그를 누적 보존하도록 고도화.
    - `lib/utils.ts` — SPA 내 페이지 이동 시 에이전트 이탈 타이머를 지속 관리하기 위한 전역 딕셔너리 `agentLeaveTimers` 추가.

## 2026-07-04

- **[BUGFIX/UI/UX] 기본 강좌 삭제 잔재 해결, 강좌 관리 아이콘 변경 및 사이드바 활성화 버그 수정, 나의 강좌 섹션 단일화**
  - **수정/생성 파일**:
    - `lib/db/local-db-server.ts` — `DEFAULT_DB`에서 `course-1`, `course-2`, `package-1` 관련 초기화 데이터를 제거하여 최초 구동 시 기본 수강 강좌가 등록되지 않도록 함.
    - `db.json` — `user_package_subscriptions` 및 `user_progress` 등에서 삭제된 `package-1`의 레거시 잔재 데이터를 정리하여 나의 강좌 페이지에서 빈 카드가 표시되거나 비정상 수강 갯수가 카운트되는 오류 해결.
    - `components/layout/UserSidebar.tsx` — 강좌 관리 메뉴의 아이콘을 `Settings`에서 `Wrench`로 변경하고, "강좌 검색"의 `isActive` 활성화 경로 체크 로직에 `/courses/manage` 제외 처리를 적용하여 두 메뉴가 동시에 녹색으로 활성화되는 중복 표시 결함 수정.
    - `app/(user)/my-courses/page.tsx` — [나의 강좌] 페이지에서 "종합 코스", "개별 강좌"의 구분을 없애고 모든 패키지 및 개별 강좌 카드가 하나의 Grid 목록으로 일관되게 나열되도록 리팩토링.

- **[RULE] 코드 변경 및 작업 내역 Wiki 등록 의무화 지침 추가**
  - **수정/생성 파일**:
    - `GEMINI.md` — AI 튜터 가이드 규칙에 작업 내역 Wiki 등록 의무 지침 추가
    - `CLAUDE.md` — 가이드 동기화를 위해 작업 내역 Wiki 등록 의무 지침 추가
    - `AGENTS.md` — 가이드 동기화를 위해 작업 내역 Wiki 등록 의무 지침 추가
  - **작업 내용**:
    - 사용자 요청에 따라 코드 변경이나 파일 추가/수정 등 모든 작업에 대해 `wiki/`에 내역을 등록하도록 강제하는 "작업 내역 Wiki 등록 의무" 항목을 주요 규칙에 명문화함.

- **[ETC] 불필요한 폴더 및 파일에 대한 .gitignore 설정 보완**
  - **수정/생성 파일**:
    - `.gitignore` — 불필요한 로컬 저장소 및 개발 환경 캐시 패턴 추가
  - **작업 내용**:
    - 로컬 업로드 강좌 저장 경로(`public/courses/`), 로컬 가상환경 및 캐시 파일(`__pycache__/`, `.venv/` 등), 그리고 IDE 개인 설정 폴더(`.idea/`, `.history/`) 및 로컬 런타임 데이터베이스(`db.json`) 관련 Git 제외 설정을 보완하여 불필요한 변경 추적을 차단함.

## 2026-07-01

- **[FEATURE/INGEST] 어드민 강좌 등록 오류(고아 강좌) 검사 및 정리 기능 구현**
  - **수정/생성 파일**:
    - `app/api/admin/courses/check-orphans/route.ts` (신규) — 패키지에 묶이지 않은 고아 강좌 검출(GET) 및 스토리지 리소스와 DB 레코드 연쇄 삭제(POST) API 구현
    - `app/admin/courses/page.tsx` — 등록 오류 검사 버튼 배치 및 등록 오류 리스트 검출/선택 정리/전체 정리 기능을 수행하는 `OrphanedCoursesModal` Shadcn/Dialog UI 개발
  - **인제스트**: `wiki/sources/2026-07-01-admin-orphaned-courses-cleanup.md`

- **[BUGFIX/INGEST] 어드민 강좌 등록 시 스키마 캐시 미반영 예외 처리**
  - **수정/생성 파일**:
    - `app/api/admin/packages/upload/route.ts` — `course_packages` upsert 시 `version` / `changelog` 필드 미비로 인해 schema cache 에러가 발생할 경우 이를 제외하고 2차 upsert를 수행하며, `sequential_play` / `force_checkpoint` 컬럼까지 부족한 극단적 환경인 경우 이마저도 제외하고 최소 필수 필드로만 3차 upsert를 수행하는 다단계 방어(graceful fallback) 로직 구축
  - **인제스트**: `wiki/sources/2026-07-01-admin-course-upload-schema-cache-fallback.md`

- **[BUGFIX/INGEST] 어드민 강좌 삭제 진행 오버레이 조기 종료 및 목록 미동기화 수정**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 비동기 재귀 호출 `deleteCourse`에 `await`를 추가하여 `finally` 블록의 오버레이 종료 조기 호출을 방지하고, 최신 React state를 반영하도록 함수형 업데이트 및 명시적 성공 안내 팝업을 추가하여 화면 미동기화 및 진행 UX 개선
  - **인제스트**: `wiki/sources/2026-07-01-admin-course-deletion-recursion-fix.md`

- **[UI/UX/INGEST] 사용자 및 관리자 대시보드 UI 개선, 강좌 검색 및 나의 강좌 카드 이동성 및 여백 개선**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — 대시보드 학습 강좌 카드를 클릭하면 상세페이지로 링크 연결, 카드 여백 py-0 pb-0, footer padding pt-3 pb-3으로 밸런스 조정
    - `app/(user)/courses/page.tsx` — 종합 패키지 카드 py-0 패딩 적용, SaaS 추천 및 개별 신청 배지 타이틀 옆에서 삭제
    - `app/(user)/my-courses/page.tsx` — 강좌 카드 클릭 시 /my-courses/[slug] 상세로 이동 변경, [새 강좌 찾기] 버튼 emerald-600 테마 적용
    - `app/admin/dashboard/page.tsx` — 등록 외부 에이전트 및 활성 매크로 통계 카드 삭제, 대신 강좌 패키지 및 개별 강좌 통계로 대체
    - `app/api/admin/stats/route.ts` — 외부 에이전트 및 매크로 DB 쿼리 대신 course_packages 및 courses 카운트 쿼리로 교체, dummy fallback 추가
  - **인제스트**: `wiki/sources/2026-07-01-user-admin-dashboard-ui-improvements.md`

## 2026-06-30

- **[UI/UX/INGEST] 어드민 강좌 패키지 목록 카드 배경색 및 카드 형태 개선**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 부모 리스트 컨테이너 클래스를 `divide-y`에서 `space-y-4`로 교체하고, 개별 강좌 패키지 목록 및 로딩 스켈레톤 카드를 입체감 있는 테두리 카드 형태(`bg-white border shadow-sm`)로 개선
  - **인제스트**: `wiki/sources/2026-06-30-admin-package-card-background-fix.md`

- **[UI/UX/INGEST] 어드민 강좌 패키지 목록 레이아웃 개선 및 찌그러짐 현상 수정**
  - **수정/생성 파일**:
    - `app/admin/courses/page.tsx` — 패키지 리스트 썸네일 컨테이너 크기 수정 (`w-28 h-18` -> `w-24 h-16`) 및 강좌 패키지 액션 버튼 영역을 2x2 grid(2줄)로 레이아웃 개편
  - **인제스트**: `wiki/sources/2026-06-30-admin-package-layout-improvements.md`

- **[FEATURE/BUGFIX/INGEST] 대시보드 패키지 달성도 undefined 해결 및 어드민 패키지 매니페스트 수정 기능 구현**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — `course_package_items` 조인 페칭 추가 및 패키지 진행률(total, completed) 실시간 동적 계산 연산 추가
    - `app/admin/courses/page.tsx` — 패키지 리스트에 '매니페스트 수정' 버튼 추가 및 새로운 매니페스트(.json, .zip) 파일을 업로드/수정할 수 있는 EditManifestModal 다이얼로그 모달 추가
  - **인제스트**: `wiki/sources/2026-06-30-dashboard-package-progress-and-admin-edit-manifest.md`

- **[BUGFIX/INGEST] 대시보드 수강 중인 과목 집계 및 학습 중인 강좌 필터링 오류 해결**
  - **수정/생성 파일**:
    - `app/(user)/dashboard/page.tsx` — `createAdminClient`를 사용해 Supabase RLS 우회 후 패키지에 소속된 강좌들을 정상 필터링하도록 수정
  - **인제스트**: `wiki/sources/2026-06-30-dashboard-course-count-fix.md`

- **[FEAT/INGEST] 나의 강좌 패키지 필터링 우회 및 네이밍 레이블 개선**
  - **수정/생성 파일**:
    - `app/api/courses/progress/route.ts` — GET API에서 createAdminClient를 사용하여 RLS 우회해 course_package_items를 정상적으로 fetch
    - `app/(user)/my-courses/page.tsx` — "수강중인 강좌" 탭 -> "수강중인 개별 강좌" 변경
    - `app/(user)/courses/page.tsx` — "단과 개별 강좌" -> "개별 강좌" 및 관련 Empty state 안내 문구 수정
  - **인제스트**: `wiki/sources/2026-06-30-my-courses-filtering-and-naming-improvements.md`

## 2026-06-28

- **[FEAT/INGEST] 사이드바 메뉴 레이블 개선 및 설정 페이지 하위 메뉴 구조화**
  - **수정/생성 파일**:
    - `lib/constants/routes.ts` — "AI 강좌" → "강좌 검색" 레이블 수정, 설정 서브 라우트 상수 추가
    - `app/(user)/courses/page.tsx` — 타이틀 "강좌 탐색" → "강좌 검색"
    - `app/(user)/my-courses/page.tsx` — 타이틀 "나의 학습 진도" → "나의 강좌"
    - `app/(user)/settings/layout.tsx` (신규) — 프로필/에이전트/강좌 서브 내비게이션 레이아웃
    - `app/(user)/settings/page.tsx` — `/settings/profile` 리다이렉트로 교체
    - `app/(user)/settings/profile/page.tsx` (신규) — Supabase 실유저 데이터 연동, 닉네임 수정, 패스워드 변경 (Google 로그인 자동 감지·제외)
    - `app/(user)/settings/agent/page.tsx` (신규) — 추후 기능 배너 + 준비 중 카드 3개
    - `app/(user)/settings/course/page.tsx` (신규) — 추후 기능 배너 + 준비 중 카드 3개
  - **인제스트**: `wiki/sources/2026-06-28-sidebar-settings-overhaul.md`
- **[FEATURE] AI 튜터 설정 중 화면 Freeze 및 진행률 UI 표시**
  - **수정 파일**:
    - [components/features/AITutorProgressOverlay.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AITutorProgressOverlay.tsx) (신규 추가)
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-agents/page.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
  - **작업 내용**:
    - **AITutorProgressOverlay 컴포넌트 구현**: AI 튜터 설정 작업이 지연되는 동안 타 작업을 차단하도록 뒷단 화면을 반투명 블러링(glassmorphism) 및 포인터 이벤트 제어로 freeze하는 오버레이 구현.
    - **실시간 프로그래스 피드백**: API 응답 대기 시간(약 10~15초) 동안 사용자 경험을 극대화하기 위해 에이전트 연결, soul.md 빌드, 전송 및 최종 동기화 검증 단계를 가상의 0% ~ 100% 로딩 진행률과 단계별 상태 텍스트 애니메이션으로 피드백.
    - **진입 경로 연동**: 에이전트 목록의 간이 스위치 토글, 에이전트 추가 모달, 에이전트 상세 정보 변경 및 저장의 3개 진입점 모두에 설정 중인 경우 본 오버레이를 팝업하도록 통합 완료.

- **[FEATURE/BUGFIX] AI 튜터 답변 내 URL 클릭 시 새 창 링크 이동 지원**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [components/features/AgentChatTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - **URL 파싱 및 새 창 렌더링**: AI 튜터의 답변 내용 중 plain URL(`https://...` 등) 및 markdown 링크(`[label](url)`)를 감지하여, 새 창(target="_blank", rel="noopener noreferrer")에서 열리는 클릭 가능한 `a` 링크로 렌더링하는 `renderTextWithLinks` 헬퍼 함수를 추가.
    - **인라인 및 볼드 서식 통합**: 인라인 코드 및 볼드 서식 등 기존 마크다운 식 파서와 호환되도록 볼드체 내부와 일반 텍스트 구간 모두에 URL 링크 처리를 적용.

- **[FEATURE/BUGFIX] AI 튜터 연동 최적화 및 오프라인 대기 고착 오류 해결**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [lib/supabase/proxy.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/supabase/proxy.ts)
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts) (신규 API)
  - **작업 내용**:
    - **실시간 에이전트 핑 체크**: 학습 화면 진입 시 외부 에이전트 상태가 오프라인으로 멈춰있는 문제를 해결하기 위해 실시간 핑(ping) 테스트를 호출하고 DB와 UI 상태를 동기화.
    - **강좌 리소스 API 구현**: 전체 강좌의 설명, 목차, 모든 학습 카드 내용을 Markdown 파일로 패키징해 다운로드할 수 있는 API 설계. 외부 에이전트 접근을 위해 미들웨어 예외 추가.
    - **온디맨드 다운로드 프롬프트**: 매번 첫 턴마다 대용량 컨텍스트를 담던 비효율적 전송 방식 대신, 리소스 URL과 함께 캐싱/재다운로드 방지 프롬프트 지침만 항상 전송하게 경량화(1KB 미만 유지).

## 2026-06-27

- **[FEATURE] 사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용**
  - **수정 파일**:
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/(user)/my-features/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-features/page.tsx)
    - [app/(user)/billing/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/billing/page.tsx)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/admin/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/dashboard/page.tsx)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/features/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/features/page.tsx)
    - [app/admin/users/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/users/page.tsx)
    - [app/admin/macros/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/macros/page.tsx)
  - **작업 내용**:
    - 비동기 데이터 로딩 중 불완전한 상태에서 "데이터가 없습니다"와 같은 빈 상태(Empty State) 레이아웃이 노출되는 깜빡임(Flash of Empty State) UX 결함 해결.
    - 서버 컴포넌트에는 레이아웃을 정밀 반영하는 고품질 Skeleton UI fallback 적용.
    - 클라이언트 컴포넌트는 loading 상태일 때 카드 리스트/테이블 행 단위의 Skeleton 로더를 매칭 렌더링하고, 사용자 및 매크로 관리 등은 전체 화면 스피너 대신 테이블 내부만 스케줄 뼈대 로딩하도록 구성 변경하여 레이아웃 시프트 방지.

- **[BUGFIX] 관리자(/admin) 경로 진입 시 "This page couldn't load" 렌더링 크래시 해결**
  - **수정 파일**:
    - [app/admin/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/layout.tsx)
    - [components/admin/AdminSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/admin/AdminSidebar.tsx)
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - **원인 분석**: Next.js 15/16 + Turbopack + 캐싱 설정(`cacheComponents: true`) 하에서, 클라이언트 컴포넌트인 사이드바 내부에서 `usePathname()` dynamic hook을 호출할 때 정적 컴필레이션/SSR 초기 렌더링 도중 `pathname`이 `null`로 반환됩니다. 이 때 `pathname.startsWith()` 호출이 TypeError를 발생시키고, 이 에러가 `<Suspense>` 경계 밖으로 버블링되면서 서버 사이드 렌더링(SSR) 레이아웃이 500 에러("This page couldn't load")를 일으켰습니다. 이에 따라 브라우저에서 dynamic stream 로더 커넥션이 강제로 끊어지며 `Connection closed.` 콘솔 예외가 동반 발생했습니다.
    - **해결 방안**:
      - `AdminSidebar`를 `<Suspense>` 바운더리 내부로 배치하여 컴포넌트 렌더링 지연 및 동적 예외를 정상 격리했습니다.
      - `AdminSidebar` 및 `UserSidebar` 컴포넌트 내부에서 `pathname` 참조 시, `null`인 경우에 대해 안전한 삼항 연산 및 null-safe 논리 평가를 적용하여 startsWith 크래시를 전면 차단했습니다.

## 2026-06-26

- **[BUGFIX] Vercel CI 빌드 중 API 라우트 정적 렌더링(Prerendering) 오류 2차 해결**
  - **수정 대상**: `app/api/` 내의 모든 `GET` 라우트 총 12개
  - **작업 내용**:
    - **문제 원인**: Next.js 15 환경에서 `cacheComponents: true` (또는 Dynamic IO) 설정이 활성화되어 있을 경우 `export const dynamic = 'force-dynamic'` 옵션과 충돌하여 빌드 에러(`Route segment config "dynamic" is not compatible with nextConfig.cacheComponents`)가 발생했습니다.
    - **해결 방안**: 라우트 세그먼트 옵션(`force-dynamic`)을 모두 제거하고, 대신 `next/server`의 `connection()` 함수를 각 API `GET` 핸들러 최상단에서 `await connection();`으로 호출하도록 수정했습니다. 이를 통해 캐싱 설정과 충돌하지 않으면서도 API 라우트를 정상적으로 동적 렌더링으로 전환할 수 있습니다.


## 2026-06-23

- **[BUGFIX/TROUBLESHOOTING] 로그인 무한 리다이렉트 루프 및 Vercel 배포 구문 오류(Next.js 미들웨어) 트러블슈팅**
  - **수정 파일**:
    - `middleware.ts` -> `proxy.ts`
    - `lib/supabase/middleware.ts` -> `lib/supabase/proxy.ts`
  - **작업 내용**:
    - 로그인 직후 무한 리다이렉트 루프를 유발하던 Supabase SSR 쿠키 파싱 실패(`endsWith('-auth-token')`) 로직을 모두 제거하고, `updateSession` 내부의 `getUser()`로 세션 갱신 로직을 일원화했습니다.
    - 배포 중 `const declarations must be initialized` 오류가 발생한 원인을 찾아 `createServerClient` import 구문을 파일 최상단으로 옮겼습니다.
    - Next.js 16 최신 권고에 따라 deprecate된 `middleware.ts` 파일명을 `proxy.ts`로 이름을 원복하여 빌드 에러 및 경고를 완벽히 해결했습니다.

## 2026-06-21

- **[INGEST]** `wiki/originals/hermes-dashboard-api.md` → `sources/hermes-dashboard-api.md`
  - Concepts: [[HermesDashboardAPI]]
  - 작업 내용: Hermes의 설정 관리용 Dashboard API(9120) 인증 체계 (세션 토큰, OAuth, insecure), 엔드포인트 목록 및 외부 플랫폼 연동 방식 문서화

- **[INGEST]** `agent-synthesis` → `sources/hermes-agent-security-architecture.md`
  - Concepts: [[IframeSecurityTrilemma]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 아키텍처 (Vercel Proxy) 및 iframe 내에서의 인증, HTTPS 도입 전의 보안 트릴레마와 대안적 한계점(Nginx Referer spoofing 취약점) 기록

- **[INGEST]** `docs/sidebar-unimplemented-menus-update.md` → `sources/sidebar-unimplemented-menus-update.md`
  - 작업 내용: PennyPress 사용자 포털 사이드바 미구현 메뉴 시각적 비활성화 및 레이아웃 정리 내역 요약 문서 위키 등록

- **[FEAT/INGEST] 외부 에이전트 [칸반/웹UI] 연동 및 대시보드 자동 기동 통합**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh)
    - [components/features/AddAgentModal.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AddAgentModal.tsx)
    - [components/features/AgentKanbanTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentKanbanTab.tsx)
  - **작업 내용**:
    - **대시보드 동시 구동 및 정리**: `start.sh` 스크립트를 개선하여 API 게이트웨이(8642) 구동 시 백그라운드로 대시보드(9118)를 자동 기동하도록 하고, `trap`과 `cleanup` 핸들러로 게이트웨이 중단 시 좀비 프로세스 방지.
    - **등록 모달 자동 완성**: API Endpoint URL 입력 시 로컬 환경(localhost, 127.0.0.1)이 감지되면 Web UI URL 입력란에 `http://localhost:9118`이 자동으로 채워지는 편의 기능 적용.
    - **칸반 탭 원클릭 자동 연동**: `web_ui_url` 미지정 로컬 에이전트 접속 시, 원클릭 로컬 대시보드 연동 버튼 및 WSL 구동 방법 팁 박스를 노출해 원클릭으로 DB를 업데이트하고 연동.
    - **트러블슈팅 반영**: 게이트웨이를 `exec`로 구동 시 trap 시그널이 유실되어 대시보드가 orphaned되던 구조적 설계 에러를 해결(exec 제거 및 부모 프로세스 대기).
    - **WSL 환경 경로 에러 해결**: WSL 비대화형(non-interactive) 실행 시 Node.js 경로 누락으로 인해 대시보드가 Web UI 빌드에 실패하던 문제를 해결하기 위해, 스크립트 상단에 local Node.js 경로(`$HOME/.hermes/node/bin`)를 `PATH` 환경 변수에 자동으로 추가하는 설정을 도입하였습니다.

- **[TROUBLESHOOTING/INGEST] WSL2 Hermes Agent IP 조회 및 바인딩 오류 해결 가이드 작성**
  - **수정 파일**:
    - [docs/wsl-hermes-ip-binding-troubleshooting.md](file:///C:/___Workspace/Projects/PennyPress/docs/wsl-hermes-ip-binding-troubleshooting.md) (신규 가이드 문서)
    - [wiki/sources/wsl-hermes-ip-binding-troubleshooting.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/wsl-hermes-ip-binding-troubleshooting.md) (위키 인제스트 요약)
  - **작업 내용**:
    - **원인 식별**: WSL 가상 IP(`172.30.34.189`)로 외부 에이전트 Endpoint 등록 시 연결에 실패하는 원인이 Hermes Agent의 `127.0.0.1` 로컬 루프백 바인딩 때문임을 확인하였습니다.
    - **해결 방안 기록**: `localhost` 포트 포워딩을 활용하여 등록 주소를 원복하거나, `~/.hermes-local/.env` 환경 변수 파일에 `API_SERVER_HOST=0.0.0.0` 설정을 추가하여 포트 바인딩을 확장하는 솔루션을 작성 및 위키 데이터베이스에 동기화하였습니다.

- **[BUGFIX] IP 접속 시의 로그인 폼 전송 오동작(끝에 `?` 붙으며 튕김) 해결**
  - **수정 파일**:
    - [next.config.ts](file:///C:/___Workspace/Projects/PennyPress/next.config.ts)
  - **작업 내용**:
    - **HMR/하이드레이션 차단 현상 해결**: 외부 사설 IP(`192.168.0.51`)를 통해 개발 서버에 접근했을 때, Next.js 기본 보안 제한으로 인해 크로스 오리진 자바스크립트 리소스(`webpack-hmr`) 로드가 차단되는 현상을 확인했습니다. 이로 인해 리액트 하이드레이션이 실패하고 자바스크립트가 무력화되어 로그인 버튼 클릭 시 `onSubmit` 이벤트 핸들러가 바인딩되지 못했고, 브라우저 기본 HTML GET 폼 제출 동작을 타며 URL에 `?`가 붙고 무한 새로고침되는 문제를 해결했습니다.
    - **설정 보완 및 서버 재기동**: [next.config.ts](file:///C:/___Workspace/Projects/PennyPress/next.config.ts) 에 `allowedDevOrigins: ['192.168.0.51', 'localhost']` 설정을 보완하고, Next.js 개발 서버를 재기동하여 설정을 즉각 반영했습니다.

- **[CLEANUP] 로컬 Supabase 자원 및 설정 제거**
  - **작업 내용**:
    - 원격 Supabase 사용 방침에 맞춰 로컬 `supabase` 설정 디렉토리를 완전히 제거했습니다.
    - 로컬 도커에 남아있던 모든 Supabase Docker 이미지들을 일괄적으로 삭제하여 디스크 용량을 최적화했습니다 (`docker rmi`).

- **[BUGFIX] 로그인 시도 시 세션 갱신 실패 및 무한 로그인 페이지 리다이렉트 오류 해결**
  - **수정 파일**:
    - [lib/supabase/proxy.ts](file:///C:/___Workspace/Projects/PennyPress/lib/supabase/proxy.ts)
  - **작업 내용**:
    - **근본 원인 파악**: Fluid Compute 개발 환경의 특성상 Next.js 기본 `middleware.ts` 대신 `proxy.ts`가 미들웨어 역할을 대행합니다. 그러나 기존 `lib/supabase/proxy.ts`에 정의된 `updateSession` 내부에서 실제 Supabase JS SDK API에 존재하지 않는 **`supabase.auth.getClaims()`**를 호출하여 런타임 오류가 발생했습니다.
    - **리다이렉트 루프 해결**: 이 예외로 인해 미들웨어 세션 갱신 과정에서 사용자가 비로그인 상태(`user = null`)로 판정되었고, 보호 대상 경로인 `/dashboard` 등으로 라우팅할 때 무조건 `/auth/login`으로 튕겨나가 폼 입력창만 리셋되고 로그인 화면이 유지되는 치명적 버그가 있었습니다.
    - **조치 사항**: `getClaims` 호출을 Supabase 표준 세션 조회 메서드인 **`supabase.auth.getUser()`** 로 전면 교체하여 세션 동기화 및 갱신 흐름이 복구되었습니다.
    - **환경 정리**: 분석 도중 Next.js 미들웨어로 잘못 오인하여 임시 생성했던 중복 파일 `middleware.ts`를 깔끔히 삭제하여 "Both middleware file... and proxy file... are detected" 충돌 경고를 해소했습니다.

## 2026-06-20

- **[BUGFIX/PERF] 외부 에이전트 상세 페이지 초기화 레이스 컨디션 및 사이드바 언마운트 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - **초기 상태 레이스 컨디션 해결**: 페이지 진입 시 DB의 이전 상태가 `'online'`일 경우 `fetchAgentAndUser`가 `setAgent`로 `'online'` 상태를 덮어씌워 오프라인 상태 초기화(`initializeStatus`)와 불일치하는 오류를 해결하기 위해, 최초 로드된 local state `status`를 무조건 `'offline'`으로 강제 고정하여 클린 오프라인 시작 사양을 완벽히 충족시켰습니다.
    - **사이드바 언마운트 방지**: `UserSidebar` 컴포넌트의 비동기 fetch(`getExternalAgents`) 도중 언마운트 시 발생 가능한 `setState` 메모리 누수 및 오동작을 예방하기 위해 `active` 플래그 체크 로직을 도입했습니다.
    - **UX 최적화**: 사용자가 수동으로 연결 확인을 시도할 때 대기 상태 진입 즉시 기존의 "자동 연결 해제 안내 배너"가 즉각 사라지도록 UI 피드백 속도를 보완했습니다.

- **[PERF] 연결 확인 비동기 호출 시 언마운트 후 DB 상태 변경 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - "연결 확인" 버튼 클릭 후 비동기 응답 대기 중에 사용자가 빠르게 다른 페이지로 이동하여 컴포넌트가 unmount되는 경우, 뒤늦게 로드 완료된 비동기 콜백에서 데이터베이스의 상태를 `online`으로 덮어써서 실제로는 오프라인 상태임에도 온라인 상태로 계속 남는 버그를 예방하기 위해 `isMountedRef`를 추가했습니다.
    - `handleRefreshStatus`에서 데이터베이스 업데이트 및 `setState` 트리거 이전에 `isMountedRef.current` 마운트 여부를 검사하여 unmounted 상태에서는 데이터베이스 수정 로직이 실행되지 않도록 안전 장치를 구현했습니다.

- **[PERF] 외부 에이전트 상세 페이지 데이터 페칭 레이스 컨디션 방지**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - 에이전트 상세 페이지에서 `id` 변경이나 컴포넌트 언마운트가 일어날 때, 비동기 호출(`Promise.all`)이 진행 중인 경우 이전 상태 업데이트가 비정상적으로 덮어씌워지는 레이스 컨디션을 방지하기 위해 `active` 플래그를 도입했습니다.
    - `useEffect` cleanup 시 `active = false`로 지정하여 unmounted 상태일 때 `setState`가 트리거되지 않도록 처리했습니다.

- **[FEAT] Task 2: Page Lifecycle Initialization & Connection Updates**
  - **수정 파일**:
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - 개별 외부 에이전트 포털 진입/이탈 시 connection state의 일관성을 제어하기 위해 페이지 마운트 및 언마운트 시 해당 에이전트의 DB status 상태를 `'offline'`으로 자동 동기화하도록 `useEffect` 라이프사이클 훅을 연동했습니다.
    - 연결 상태 갱신 시 `agents-updated` 커스텀 이벤트를 디스패치하여 사이드바의 에이전트 서브메뉴 목록이 즉시 동적 동기화되도록 조치했습니다.
    - "연결 확인"(`handleRefreshStatus`) 클릭 시 테스트 API 응답 결과('online' 또는 'offline')를 데이터베이스에 즉시 업데이트(`updateExternalAgent`)하고, 성공 및 실패 여부와 무관하게 사이드바 갱신 이벤트(`agents-updated`)를 전달하도록 연결 갱신 영속성 로직을 보완했습니다.

- **[BUGFIX] 사이드바 외부 에이전트 동적 동기화 구현**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
    - [app/(user)/my-agents/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/page.tsx)
  - **작업 내용**:
    - `useRef` 최적화 도입 이후 동일 페이지 내에서 외부 에이전트 추가/삭제 시 사이드바 서브메뉴가 즉시 갱신되지 않고 이전 목록을 유지하는 동기화 누락 이슈를 보완했습니다.
    - 브라우저 수준의 `agents-updated` 커스텀 이벤트를 정의하여 에이전트 목록 로드 및 갱신 시 이벤트를 디스패치하도록 구성하고, `UserSidebar`에서 이를 수신해 사이드바 목록을 즉시 갱신하도록 처리했습니다.

- **[PERF] 사이드바 외부 에이전트 목록 조회 DB Fetch 최적화**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - 라우트가 바뀔 때마다 모든 페이지에서 `getExternalAgents()` DB 조회가 중복/불필요하게 매번 일어나는 문제를 최적화했습니다.
    - `useRef`를 활용해 최초 1회 로드 여부(`hasFetchedRef`)를 트래킹하도록 설계했습니다.
    - 최초 로드 상태가 아니거나, 현재 경로가 외부 에이전트 관련 경로(`/my-agents`로 시작) 혹은 에이전트 추가/삭제 변경이 일어날 수 있는 대시보드 경로(`/dashboard`)인 경우에만 선택적으로 API 호출을 수행하도록 필터링 조건을 추가하여 불필요한 백엔드 DB 부하를 경감시켰습니다.

- **[FEAT] Task 2: Implement Dynamic External Agent Loading and Sub-menu UI**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/___Workspace/Projects/PennyPress/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - 사이드바 내 "외부 에이전트" 항목을 정적 SIDEBAR_ITEMS에서 분리하고, "호스팅 관리" (index 2) 뒤에 하이브리드로 동적 렌더링되도록 구현했습니다.
    - 컴포넌트 마운트 및 페이지 이동 시 `getExternalAgents()` API를 호출하여 등록된 외부 에이전트 목록을 동적으로 로드하도록 로직을 추가했습니다.
    - 사이드바가 축소된 경우(isCollapsed) 토글 버튼 및 서브메뉴를 렌더링하지 않도록 처리했습니다.
    - 상세 페이지(/my-agents/[id]) 활성화 시 서브메뉴가 자동으로 확장(setIsOpen(true))되도록 자동 확장 훅을 통합했습니다.
    - 서브메뉴의 활성 상태 스타일링(isActive)을 `isAgentActive` 조건에 맞춰 `SidebarMenuSubButton`에 완벽히 연동하고, ChevronRight 아이콘을 토글 상태에 맞춰 회전(rotate-90) 처리했습니다.

- **[BUGFIX] Next.js 15 Prerendering 빌드 오류 해결**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/layout.tsx)
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - Next.js 15 빌드 과정에서 dynamic hook인 `usePathname()` 및 dynamic page params `use(params)`가 `<Suspense>` 경계 외부에서 호출되어 "Uncached data was accessed outside of <Suspense>" 오류로 빌드가 실패하던 현상을 해결했습니다.
    - 레이아웃 단에서 `usePathname`을 활용하는 `UserSidebar`를 `<Suspense>`로 감싸고, 개별 에이전트 상세 페이지(`AgentPortalPage`)에서도 dynamic params를 하위 컴포넌트 `AgentPortalContent`로 위임하여 `<Suspense>` 내부에서 `use(params)`를 동적 해석하게 함으로써 Next.js static prerendering 빌드를 정상 통과시켰습니다.

- **[FEAT] Task 5: Integrate Dynamic Chat History & Model Bindings in AgentChatTab**
  - **수정 파일**:
    - [components/features/AgentChatTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - 컴포넌트가 마운트될 때 `GET /api/external-agents/[id]/messages`를 호출하여 이전 대화 기록을 동적으로 로드하는 `useEffect` 훅을 통합했습니다.
    - "대화 비우기"(`handleClearChat`) 시 `DELETE /api/external-agents/[id]/messages`를 호출하여 로컬 상태뿐만 아니라 Supabase 데이터베이스에서도 대화 내역이 완전히 영구 삭제되도록 구현했습니다.
    - 헤더의 하드코딩된 에이전트 모델명을 dynamic `{agent.selected_model || 'hermes-agent'}`로 바인딩하여 활성화된 모델을 동적으로 출력하도록 개선했습니다.
    - 대화 시작 전 소개 카드 타이틀을 기존의 고정 텍스트에서 `{agent.name}와 대화 시작`으로 변경하여 개별 에이전트 이름이 노출되도록 개선했습니다.
    - `npx tsc --noEmit` 및 ESLint 린팅 검사를 통해 어떠한 구문 또는 타입 에러도 없음을 검증하고 코미트를 완료했습니다.


- **[FEAT] Task 4: Implement External Agent Chat Route with Streaming & Database Persistence**
  - **수정 파일**:
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - 외부 에이전트 전용 스트리밍 채팅 API 라우트 (`POST`)의 본 구성을 완료하였습니다.
    - Supabase Auth를 통한 소유권 및 세션 검증 로직을 탑재했습니다.
    - Node.js의 IPv6 선호 문제(`::1`)를 우회하기 위해 `localhost` 주소를 강제로 IPv4 루프백(`127.0.0.1`)으로 대체하는 로직을 통합했습니다.
    - 원격 에이전트의 API endpoint에 따라 `/v1/chat/completions` API를 `Authorization: Bearer <API_KEY>` 헤더와 함께 호출합니다.
    - 다운스트림의 SSE 응답 스트림을 브라우저 클라이언트에 전달하는 동시에, 응답 본문의 텍스트를 청크 단위로 버퍼링하고 파싱하여 `user_external_agent_messages` 테이블에 사용자와 어시스턴트 메시지를 각각 저장하도록 구현했습니다.
    - 대화 저장 후 데이터베이스 RPC 함수인 `prune_external_agent_messages`를 호출하여 특정 에이전트의 대화 히스토리를 최신 100개 메시지로 자동 정리(Pruning)하도록 구현했습니다.
    - `npx tsc --noEmit`을 이용해 전체 TypeScript 타입 에러 및 컴파일 경고가 없는 것을 검증했습니다.


- **[BUGFIX/TROUBLESHOOTING] 외부 에르메스 에이전트(Mock) 응답 문제 및 LLM 모델명 누락 오류 해결**
  - **오류 현상**:
    - 외부 에이전트를 WSL2 기반으로 정상 등록했으나, 채팅 창에서 대화 시 항상 Mock 답변("안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다...")만 출력됨.
    - Mock 서버 프로세스를 중단하고 실제 에이전트를 구동했을 때는 채팅 입력 시 아무런 응답이 나타나지 않음.
  - **원인**:
    1. **포트 충돌**: Windows 호스트에서 `agent-worker/main.py`가 에이전트 기본 포트인 `8642` 포트로 실행되어, WSL2 포트 포워딩을 가로채고 Mock 응답을 반환하고 있었음.
    2. **모델명 누락 (`Model: (not set)`)**: Mock 프로세스 종료 후 실제 에이전트에 연결되었으나, `~/.hermes-local/config.yaml`에 `model` 설정이 누락되어 DeepSeek API 호출 시 빈 값(`model=`)이 들어가면서 API 400 Bad Request 에러 발생 (`The supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you passed .`).
  - **조치 사항**:
    1. Windows 호스트에서 `8642` 포트를 점유하고 있던 파이썬 Mock 프로세스(`agent-worker/main.py`) 강제 종료.
    2. `agent-worker` 구동 시 가상환경 파이썬을 지정하여 기본 포트인 **8001** 포트로 실행하도록 해결 가이드 작성.
    3. WSL2 내부 `~/.hermes-local/config.yaml`에 `model: deepseek-v4-flash` 설정을 명시적으로 추가하여 모델명 누락 문제 해결 (`hermes config set model deepseek-v4-flash`).
    4. 기존 게이트웨이 서비스 프로세스 정지 후 에이전트 재가동 (`bash hermes-agent/start.sh`).
  - **결과**:
    - 포트 충돌이 해소되고 모델 설정이 정상 주입되어, 실제 로컬 WSL2 환경에서 구동 중인 Hermes Agent가 정상 응답을 출력하는 것을 검증 완료.

- **[BUGFIX/TROUBLESHOOTING] Node.js IPv6 루프백 주소 해석으로 인한 WSL2 외부 에이전트 연결 끊김(Disconnected) 오류 해결**
  - **오류 현상**:
    - 사용자가 WSL2에서 Hermes Agent를 구동하고 CLI(`hermes`)로는 정상 접속했으나, PennyPress 웹 UI(포털)의 에이전트 상태에서는 `Disconnected`(오프라인) 상태로 표시되는 문제가 발생함.
  - **원인**:
    - WSL2의 자동 포트 포워딩(`wslrelay.exe`)은 Windows 호스트의 IPv4 루프백(`127.0.0.1:8642`)만 수신하고 대기함.
    - 하지만 Next.js 백엔드 서버(Node.js v17+ 환경)에서 `localhost` 주소를 호스팅 도메인으로 해석할 때, IPv6 루프백 주소인 `::1`을 IPv4(`127.0.0.1`)보다 먼저 우선 해석 및 요청함.
    - `::1:8642` 포트는 리스닝 상태가 아니므로 `fetch` 요청이 Connection Refused(연결 거부) 오류를 일으켜 오프라인 상태로 인식됨.
  - **수정 사항**:
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) 및 [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) 파일 내에서 외부 에이전트 엔드포인트 URL 파싱 시, 호스트가 `localhost`인 경우 강제로 `127.0.0.1` IPv4 루프백으로 변환하도록 정규화 처리(`endpoint.replace('//localhost', '//127.0.0.1')`)를 적용함.
  - **결과**:
    - Next.js 백엔드 서버가 IPv6 우회(127.0.0.1 고정)를 진행하여 WSL2 환경의 API Gateway 서버(`http://localhost:8642/v1`)와 정상적으로 연결 동기화 및 SSE 스트리밍 채팅이 가능하도록 조치 완료.

- **[BUGFIX/TROUBLESHOOTING] 실제 에르메스 에이전트 로컬 연동 오류 해결 및 플랫폼 등록 성공**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh) (실행 경로 동적 해결 적용)
    - [hermes-agent/.env.example](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/.env.example) (`GATEWAY_ALLOW_ALL_USERS` 옵션 추가)
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) (Endpoint URL 정규화 적용)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) (Endpoint URL 정규화 적용)
    - [wiki/sources/install-actual-hermes-wsl2.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/install-actual-hermes-wsl2.md) (트러블슈팅 내용 업데이트)
  - **작업 내용**:
    - **start.sh 경로 에러 수정**: 일반 사용자 계정 권한 설치 시 `/usr/local/bin/hermes` 경로 대신 `~/.local/bin/hermes`를 사용하도록 바이너리 우선순위 검색 구조를 보완하여 `No such file or directory` 에러를 해결했습니다.
    - **보안 차단 해제**: 외부 연동 테스트를 위해 `GATEWAY_ALLOW_ALL_USERS=true` 설정을 추가하는 안내 및 템플릿을 보완했습니다.
    - **API 헬스체크 및 호출 경로 정규화**: 에이전트 등록 화면에서 `/v1` 주소 입력 시 `/health` 및 `/v1/models` 경로가 이중으로 꼬이는 버그를 해결하기 위해 URL 파싱을 정규화했습니다.
    - **데이터베이스 프로필 누락 해결**: 신규 회원가입 트리거 이전에 생성된 구 계정들의 프로필 데이터 누락 문제를 Supabase SQL Editor용 일괄 백필 쿼리로 해결하여 외래 키 위반 에러(`user_external_agents_user_id_fkey`)를 무력화하고 최종적으로 외부 에이전트 등록에 성공했습니다.

- **[FEAT] 실제 에르메스 에이전트(Hermes Agent) 로컬 연동 패키지 구축 및 설치/트러블슈팅 문서화**
  - **생성 파일**: 
    - `hermes-agent/install.sh`, `hermes-agent/start.sh`, `hermes-agent/config.yaml`, `hermes-agent/.env.example`, `hermes-agent/soul.md`, `hermes-agent/README.md`
    - `docs/INSTALL_ACTUAL_HERMES_WSL2.md`
  - **수정 파일**: `README.md` (가이드 링크 추가)
  - **작업 내용**:
    - 실제 에르메스 에이전트를 WSL2 로컬 PC 환경에 설치하고, API 서버(포트 `8642`)를 구동하여 PennyPress 웹 앱의 외부 에이전트 등록 및 통신 기능과 직접 연동할 수 있도록 자동화 셸 스크립트와 가이드 문서를 구축함.
  - **실패 사례 및 트러블슈팅**:
    - 에르메스 코어가 `root` 권한(혹은 `wsl -u root` 강제 설치)으로 설치되었을 경우, 가상환경 파이썬 인터프리터 원본이 `/root/.local/share/uv/...` 디렉토리에 생성되어 일반 사용자(`godstale`)가 실행할 때 `bad interpreter: Permission denied` 오류가 발생함.
    - 이를 해결하기 위해 기존 root 소유 설치본을 `sudo rm`으로 완전히 삭제하고, 일반 사용자 계정 권한으로 인스톨러(`curl ... | bash`)를 다시 실행해 일반 사용자 홈 경로 아래에 파이썬이 올바르게 맵핑되도록 수정하여 연동 권한 오류를 완벽히 해결함. 이 트러블슈팅 내역을 `docs/INSTALL_ACTUAL_HERMES_WSL2.md` 매뉴얼에 상세 기재해둠.

- **[BUGFIX]** Supabase URL/Key Mismatch resolution
  - Files modified: `.env.local`
  - 작업 내용:
    - 로그인 시 `invalid api key` 오류 발생을 수정하기 위해 `.env.local` 파일 내 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 원격 프로젝트 (`https://fbaxselsdfceyygdvpnj.supabase.co`)에 대응하는 올바른 클라우드 API 키 (`sb_publishable_t5P8hMAxS-bpDrz2AzkTTA_HDT5ltsz`)로 업데이트함.
    - curl.exe 테스트를 통하여 정상적인 API 게이트웨이 인증 확인(HTTP 200 OK).

- **[INGEST]** `docs/superpowers/plans/2026-06-20-external-hermes-agent-integration.md` → `sources/external-hermes-agent-integration.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ExternalHermesAgent]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 구현 계획 및 최종 구현 결과에 대한 요약 인제스트

- **[FEAT]** Task 6: Individual Agent Portal: Chat, Kanban, Settings (/my-agents/[id])
  - Files created: `app/(user)/my-agents/[id]/page.tsx`, `components/features/AgentChatTab.tsx`, `components/features/AgentKanbanTab.tsx`, `components/features/AgentSettingsTab.tsx`
  - 작업 내용:
    - `page.tsx`: Dynamic route wrapper checking user authentication and ownership before fetching external agent details via `getExternalAgentById(id)`. Features connection test refresh button.
    - `AgentChatTab.tsx`: Interactive chat UI with custom avatars, starter prompts, full AbortController (stop generating) support, and OpenAI-compatible SSE chunk stream buffering parser. Also includes styled copyable code blocks and bold/inline formatting.
    - `AgentKanbanTab.tsx`: Web UI embedding via iframe. Displays loading skeleton during frame loading, and falls back to blank target link in case of X-Frame-Options header block.
    - `AgentSettingsTab.tsx`: Summarizes agent credentials, supports full local form editing (updates endpoint, web UI url, API key), and queries supported models from remote `/v1/models` on mount or refresh to present as a badge list.
    - Verified linting (`npx eslint`) and type compilation (`npx tsc --noEmit`) cleanly without errors or warnings.

- **[REFACTOR]** Task 5: External Agent Directory & Registration UI Refactoring
  - Files modified: `components/features/AddAgentModal.tsx`, `app/(user)/my-agents/page.tsx`
  - 작업 내용:
    - `AddAgentModal.tsx`: Fixed any-type inside connection test, typed model mapping `(m: { id: string })`, handled save errors with a UI state `saveError` to display in the modal, and set `apiKey` and `webUiUrl` to `undefined` if empty to prevent empty string DB inserts.
    - `my-agents/page.tsx`: Wrapped `loadAgents` in `useCallback` and added it as a dependency in `useEffect`. Fixed `react/no-unescaped-entities` errors for double quotes by escaping with `&quot;`. Used `Promise.allSettled` instead of `Promise.all` in `handleSyncAll` to handle individual agent ping failures gracefully.
    - Verified linting and typescript compilation cleanly.

- **[REFACTOR]** External Agent APIs Security & Performance Refactoring
  - Files modified: `app/api/external-agents/[id]/chat/route.ts`, `app/api/external-agents/test/route.ts`
  - 작업 내용:
    - `test/route.ts`: Added Supabase auth check using `createClient` to verify session and prevent SSRF.
    - `[id]/chat/route.ts`: Passed `req.signal` to downstream `fetch` call and added `X-Accel-Buffering: no` header to streaming response to prevent proxy buffering.

- **[INGEST]** `docs/pennypress-service-spec.md` → `sources/pennypress-service-spec.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[HydraAgentService]], [[AIAgentWorker]]
  - 작업 내용: 최신 HydraAgent 호스팅 서비스 및 요금제 명세서 위키 등록

## 2026-06-14

- **[INGEST]** `.firecrawl/hermes-agent.md` → `sources/hermes-agent.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-api-server.md` → `sources/hermes-api-server.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-architecture.md` → `sources/hermes-architecture.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-guide-pytorch-kr.md` → `sources/hermes-guide-pytorch-kr.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-messaging.md` → `sources/hermes-messaging.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-quickstart.md` → `sources/hermes-quickstart.md` (summary-only)
- **[INGEST]** `docs/DATABASE_SCHEMA.md` → `sources/database-schema.md`
- **[INGEST]** `docs/SUPABASE_SETUP.md` → `sources/supabase-setup.md`
- **[INGEST]** `docs/HERMES_GUIDE.md` → `sources/hermes-guide.md`
  - Concepts: [[HermesArchitecture]], [[HermesSkills]], [[HermesCron]], [[HermesSecurity]]
- **[INGEST]** `docs/INSTALL_WINDOWS_WSL2.md` → `sources/install-windows-wsl2.md`
  - Concepts: [[WSL2Setup]], [[PM2Management]]
- **[INGEST]** `hydra-agent/GUIDELINE.md` → `sources/hydra-agent-guideline.md`
  - Concepts: [[HydraAgentGuideline]]

- **[INGEST]** `docs/superpowers/plans/2026-06-12-pennypress-phase2.md` → `sources/2026-06-12-pennypress-phase2.md`
  - Concepts: [[Phase2Plan]], [[SupabaseSchema]], [[HermesWorkerAPI]], [[SSEUpdates]]
  - 작업 내용: Phase 2 구현 계획 인제스트

- **[INGEST]** `docs/hydra-agent-local-setup-summary.md` → `sources/hydra-agent-local-setup.md`
  - Concepts: [[HydraAgentLocalSetup]]
  - 작업 내용: 3종 Hermes Agent 로컬 개발환경 구성 완료 (파일 작업)
  - 생성 파일: `hydra-agent/` 전체 (GUIDELINE.md, ecosystem.config.js, agents/*/setup.sh, config.yaml, soul.md ×8, scripts/ ×3)
  - 수정 파일: `lib/constants/hydra-agent.ts` (server-only 신규), `hydra-agent/HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md` (재작성), `.env.example`
  - 미완료: WSL2 실제 실행 및 기동 검증 (Task 11) — 사용자 직접 수행 필요
  - 실패 사례: routes.ts에 server 상수 혼입 → hydra-agent.ts 분리, .env.example 시크릿 노출 → 플레이스홀더 교체
  - 빌드: `pnpm build` 정상 완료

## 2026-06-13

- **[INGEST]** `docs/HydraAgentGoal.md` → `sources/hydra-agent-goal.md`
  - Concepts: [[HydraAgentService]]
  - 작업 내용: Feature 구독 모델 → HydraAgent 호스팅 모델 전면 전환 완료
  - 변경 파일: lib/types, lib/dummy-data, routes.ts, dashboard, features, my-features, billing, admin/features, CLAUDE.md, Phase2/3 플랜
  - 빌드: `pnpm build` 타입 오류 없이 정상 완료

- **[INGEST]** `DESIGN.md` → `sources/design-system.md`
  - Concepts: [[DesignSystem]]


## 2026-06-12

- **[INGEST]** `docs/PennyPress_Service_Plan.md` → `sources/pennypress-service-plan.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ContentMonitoring]], [[AIAgentWorker]], [[PointSystem]]
- **[INIT]** 프로젝트 위키 초기화. 서비스 기획서 인제스트 완료.

## [2026-06-20] graph | Knowledge graph rebuilt

45 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

47 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

48 nodes, 41 edges (41 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt
- **[BUGFIX] Next.js 15 Prerendering 빌드 오류 해결**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/layout.tsx)
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/___Workspace/Projects/PennyPress/app/(user)/my-agents/[id]/page.tsx)
  - **작업 내용**:
    - Next.js 15 빌드 과정에서 dynamic hook인 `usePathname()` 및 dynamic page params `use(params)`가 `<Suspense>` 경계 외부에서 호출되어 "Uncached data was accessed outside of <Suspense>" 오류로 빌드가 실패하던 현상을 해결했습니다.
    - 레이아웃 단에서 `usePathname`을 활용하는 `UserSidebar`를 `<Suspense>`로 감싸고, 개별 에이전트 상세 페이지(`AgentPortalPage`)에서도 dynamic params를 하위 컴포넌트 `AgentPortalContent`로 위임하여 `<Suspense>` 내부에서 `use(params)`를 동적 해석하게 함으로써 Next.js static prerendering 빌드를 정상 통과시켰습니다.

- **[FEAT] Task 5: Integrate Dynamic Chat History & Model Bindings in AgentChatTab**
  - **수정 파일**:
    - [components/features/AgentChatTab.tsx](file:///C:/___Workspace/Projects/PennyPress/components/features/AgentChatTab.tsx)
  - **작업 내용**:
    - 컴포넌트가 마운트될 때 `GET /api/external-agents/[id]/messages`를 호출하여 이전 대화 기록을 동적으로 로드하는 `useEffect` 훅을 통합했습니다.
    - "대화 비우기"(`handleClearChat`) 시 `DELETE /api/external-agents/[id]/messages`를 호출하여 로컬 상태뿐만 아니라 Supabase 데이터베이스에서도 대화 내역이 완전히 영구 삭제되도록 구현했습니다.
    - 헤더의 하드코딩된 에이전트 모델명을 dynamic `{agent.selected_model || 'hermes-agent'}`로 바인딩하여 활성화된 모델을 동적으로 출력하도록 개선했습니다.
    - 대화 시작 전 소개 카드 타이틀을 기존의 고정 텍스트에서 `{agent.name}와 대화 시작`으로 변경하여 개별 에이전트 이름이 노출되도록 개선했습니다.
    - `npx tsc --noEmit` 및 ESLint 린팅 검사를 통해 어떠한 구문 또는 타입 에러도 없음을 검증하고 코미트를 완료했습니다.


- **[FEAT] Task 4: Implement External Agent Chat Route with Streaming & Database Persistence**
  - **수정 파일**:
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - 외부 에이전트 전용 스트리밍 채팅 API 라우트 (`POST`)의 본 구성을 완료하였습니다.
    - Supabase Auth를 통한 소유권 및 세션 검증 로직을 탑재했습니다.
    - Node.js의 IPv6 선호 문제(`::1`)를 우회하기 위해 `localhost` 주소를 강제로 IPv4 루프백(`127.0.0.1`)으로 대체하는 로직을 통합했습니다.
    - 원격 에이전트의 API endpoint에 따라 `/v1/chat/completions` API를 `Authorization: Bearer <API_KEY>` 헤더와 함께 호출합니다.
    - 다운스트림의 SSE 응답 스트림을 브라우저 클라이언트에 전달하는 동시에, 응답 본문의 텍스트를 청크 단위로 버퍼링하고 파싱하여 `user_external_agent_messages` 테이블에 사용자와 어시스턴트 메시지를 각각 저장하도록 구현했습니다.
    - 대화 저장 후 데이터베이스 RPC 함수인 `prune_external_agent_messages`를 호출하여 특정 에이전트의 대화 히스토리를 최신 100개 메시지로 자동 정리(Pruning)하도록 구현했습니다.
    - `npx tsc --noEmit`을 이용해 전체 TypeScript 타입 에러 및 컴파일 경고가 없는 것을 검증했습니다.


- **[BUGFIX/TROUBLESHOOTING] 외부 에르메스 에이전트(Mock) 응답 문제 및 LLM 모델명 누락 오류 해결**
  - **오류 현상**:
    - 외부 에이전트를 WSL2 기반으로 정상 등록했으나, 채팅 창에서 대화 시 항상 Mock 답변("안녕하세요! 저는 로컬에서 구동 중인 외부 에르메스 에이전트(Mock)입니다...")만 출력됨.
    - Mock 서버 프로세스를 중단하고 실제 에이전트를 구동했을 때는 채팅 입력 시 아무런 응답이 나타나지 않음.
  - **원인**:
    1. **포트 충돌**: Windows 호스트에서 `agent-worker/main.py`가 에이전트 기본 포트인 `8642` 포트로 실행되어, WSL2 포트 포워딩을 가로채고 Mock 응답을 반환하고 있었음.
    2. **모델명 누락 (`Model: (not set)`)**: Mock 프로세스 종료 후 실제 에이전트에 연결되었으나, `~/.hermes-local/config.yaml`에 `model` 설정이 누락되어 DeepSeek API 호출 시 빈 값(`model=`)이 들어가면서 API 400 Bad Request 에러 발생 (`The supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you passed .`).
  - **조치 사항**:
    1. Windows 호스트에서 `8642` 포트를 점유하고 있던 파이썬 Mock 프로세스(`agent-worker/main.py`) 강제 종료.
    2. `agent-worker` 구동 시 가상환경 파이썬을 지정하여 기본 포트인 **8001** 포트로 실행하도록 해결 가이드 작성.
    3. WSL2 내부 `~/.hermes-local/config.yaml`에 `model: deepseek-v4-flash` 설정을 명시적으로 추가하여 모델명 누락 문제 해결 (`hermes config set model deepseek-v4-flash`).
    4. 기존 게이트웨이 서비스 프로세스 정지 후 에이전트 재가동 (`bash hermes-agent/start.sh`).
  - **결과**:
    - 포트 충돌이 해소되고 모델 설정이 정상 주입되어, 실제 로컬 WSL2 환경에서 구동 중인 Hermes Agent가 정상 응답을 출력하는 것을 검증 완료.

- **[BUGFIX/TROUBLESHOOTING] Node.js IPv6 루프백 주소 해석으로 인한 WSL2 외부 에이전트 연결 끊김(Disconnected) 오류 해결**
  - **오류 현상**:
    - 사용자가 WSL2에서 Hermes Agent를 구동하고 CLI(`hermes`)로는 정상 접속했으나, PennyPress 웹 UI(포털)의 에이전트 상태에서는 `Disconnected`(오프라인) 상태로 표시되는 문제가 발생함.
  - **원인**:
    - WSL2의 자동 포트 포워딩(`wslrelay.exe`)은 Windows 호스트의 IPv4 루프백(`127.0.0.1:8642`)만 수신하고 대기함.
    - 하지만 Next.js 백엔드 서버(Node.js v17+ 환경)에서 `localhost` 주소를 호스팅 도메인으로 해석할 때, IPv6 루프백 주소인 `::1`을 IPv4(`127.0.0.1`)보다 먼저 우선 해석 및 요청함.
    - `::1:8642` 포트는 리스닝 상태가 아니므로 `fetch` 요청이 Connection Refused(연결 거부) 오류를 일으켜 오프라인 상태로 인식됨.
  - **수정 사항**:
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) 및 [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) 파일 내에서 외부 에이전트 엔드포인트 URL 파싱 시, 호스트가 `localhost`인 경우 강제로 `127.0.0.1` IPv4 루프백으로 변환하도록 정규화 처리(`endpoint.replace('//localhost', '//127.0.0.1')`)를 적용함.
  - **결과**:
    - Next.js 백엔드 서버가 IPv6 우회(127.0.0.1 고정)를 진행하여 WSL2 환경의 API Gateway 서버(`http://localhost:8642/v1`)와 정상적으로 연결 동기화 및 SSE 스트리밍 채팅이 가능하도록 조치 완료.

- **[BUGFIX/TROUBLESHOOTING] 실제 에르메스 에이전트 로컬 연동 오류 해결 및 플랫폼 등록 성공**
  - **수정 파일**:
    - [hermes-agent/start.sh](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/start.sh) (실행 경로 동적 해결 적용)
    - [hermes-agent/.env.example](file:///C:/___Workspace/Projects/PennyPress/hermes-agent/.env.example) (`GATEWAY_ALLOW_ALL_USERS` 옵션 추가)
    - [app/api/external-agents/test/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/test/route.ts) (Endpoint URL 정규화 적용)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/___Workspace/Projects/PennyPress/app/api/external-agents/%5Bid%5D/chat/route.ts) (Endpoint URL 정규화 적용)
    - [wiki/sources/install-actual-hermes-wsl2.md](file:///C:/___Workspace/Projects/PennyPress/wiki/sources/install-actual-hermes-wsl2.md) (트러블슈팅 내용 업데이트)
  - **작업 내용**:
    - **start.sh 경로 에러 수정**: 일반 사용자 계정 권한 설치 시 `/usr/local/bin/hermes` 경로 대신 `~/.local/bin/hermes`를 사용하도록 바이너리 우선순위 검색 구조를 보완하여 `No such file or directory` 에러를 해결했습니다.
    - **보안 차단 해제**: 외부 연동 테스트를 위해 `GATEWAY_ALLOW_ALL_USERS=true` 설정을 추가하는 안내 및 템플릿을 보완했습니다.
    - **API 헬스체크 및 호출 경로 정규화**: 에이전트 등록 화면에서 `/v1` 주소 입력 시 `/health` 및 `/v1/models` 경로가 이중으로 꼬이는 버그를 해결하기 위해 URL 파싱을 정규화했습니다.
    - **데이터베이스 프로필 누락 해결**: 신규 회원가입 트리거 이전에 생성된 구 계정들의 프로필 데이터 누락 문제를 Supabase SQL Editor용 일괄 백필 쿼리로 해결하여 외래 키 위반 에러(`user_external_agents_user_id_fkey`)를 무력화하고 최종적으로 외부 에이전트 등록에 성공했습니다.

- **[FEAT] 실제 에르메스 에이전트(Hermes Agent) 로컬 연동 패키지 구축 및 설치/트러블슈팅 문서화**
  - **생성 파일**: 
    - `hermes-agent/install.sh`, `hermes-agent/start.sh`, `hermes-agent/config.yaml`, `hermes-agent/.env.example`, `hermes-agent/soul.md`, `hermes-agent/README.md`
    - `docs/INSTALL_ACTUAL_HERMES_WSL2.md`
  - **수정 파일**: `README.md` (가이드 링크 추가)
  - **작업 내용**:
    - 실제 에르메스 에이전을 WSL2 로컬 PC 환경에 설치하고, API 서버(포트 `8642`)를 구동하여 PennyPress 웹 앱의 외부 에이전트 등록 및 통신 기능과 직접 연동할 수 있도록 자동화 셸 스크립트와 가이드 문서를 구축함.
  - **실패 사례 및 트러블슈팅**:
    - 에르메스 코어가 `root` 권한(혹은 `wsl -u root` 강제 설치)으로 설치되었을 경우, 가상환경 파이썬 인터프리터 원본이 `/root/.local/share/uv/...` 디렉토리에 생성되어 일반 사용자(`godstale`)가 실행할 때 `bad interpreter: Permission denied` 오류가 발생함.
    - 이를 해결하기 위해 기존 root 소유 설치본을 `sudo rm`으로 완전히 삭제하고, 일반 사용자 계정 권한으로 인스톨러(`curl ... | bash`)를 다시 실행해 일반 사용자 홈 경로 아래에 파이썬이 올바르게 맵핑되도록 수정하여 연동 권한 오류를 완벽히 해결함. 이 트러블슈팅 내역을 `docs/INSTALL_ACTUAL_HERMES_WSL2.md` 매뉴얼에 상세 기재해둠.

- **[BUGFIX]** Supabase URL/Key Mismatch resolution
  - Files modified: `.env.local`
  - 작업 내용:
    - 로그인 시 `invalid api key` 오류 발생을 수정하기 위해 `.env.local` 파일 내 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 원격 프로젝트 (`https://fbaxselsdfceyygdvpnj.supabase.co`)에 대응하는 올바른 클라우드 API 키 (`sb_publishable_t5P8hMAxS-bpDrz2AzkTTA_HDT5ltsz`)로 업데이트함.
    - curl.exe 테스트를 통하여 정상적인 API 게이트웨이 인증 확인(HTTP 200 OK).

- **[INGEST]** `docs/superpowers/plans/2026-06-20-external-hermes-agent-integration.md` → `sources/external-hermes-agent-integration.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ExternalHermesAgent]]
  - 작업 내용: 외부 자율 호스팅 Hermes 에이전트 연동 구현 계획 및 최종 구현 결과에 대한 요약 인제스트

- **[FEAT]** Task 6: Individual Agent Portal: Chat, Kanban, Settings (/my-agents/[id])
  - Files created: `app/(user)/my-agents/[id]/page.tsx`, `components/features/AgentChatTab.tsx`, `components/features/AgentKanbanTab.tsx`, `components/features/AgentSettingsTab.tsx`
  - 작업 내용:
    - `page.tsx`: Dynamic route wrapper checking user authentication and ownership before fetching external agent details via `getExternalAgentById(id)`. Features connection test refresh button.
    - `AgentChatTab.tsx`: Interactive chat UI with custom avatars, starter prompts, full AbortController (stop generating) support, and OpenAI-compatible SSE chunk stream buffering parser. Also includes styled copyable code blocks and bold/inline formatting.
    - `AgentKanbanTab.tsx`: Web UI embedding via iframe. Displays loading skeleton during frame loading, and falls back to blank target link in case of X-Frame-Options header block.
    - `AgentSettingsTab.tsx`: Summarizes agent credentials, supports full local form editing (updates endpoint, web UI url, API key), and queries supported models from remote `/v1/models` on mount or refresh to present as a badge list.
    - Verified linting (`npx eslint`) and type compilation (`npx tsc --noEmit`) cleanly without errors or warnings.

- **[REFACTOR]** Task 5: External Agent Directory & Registration UI Refactoring
  - Files modified: `components/features/AddAgentModal.tsx`, `app/(user)/my-agents/page.tsx`
  - 작업 내용:
    - `AddAgentModal.tsx`: Fixed any-type inside connection test, typed model mapping `(m: { id: string })`, handled save errors with a UI state `saveError` to display in the modal, and set `apiKey` and `webUiUrl` to `undefined` if empty to prevent empty string DB inserts.
    - `my-agents/page.tsx`: Wrapped `loadAgents` in `useCallback` and added it as a dependency in `useEffect`. Fixed `react/no-unescaped-entities` errors for double quotes by escaping with `&quot;`. Used `Promise.allSettled` instead of `Promise.all` in `handleSyncAll` to handle individual agent ping failures gracefully.
    - Verified linting and typescript compilation cleanly.

- **[REFACTOR]** External Agent APIs Security & Performance Refactoring
  - Files modified: `app/api/external-agents/[id]/chat/route.ts`, `app/api/external-agents/test/route.ts`
  - 작업 내용:
    - `test/route.ts`: Added Supabase auth check using `createClient` to verify session and prevent SSRF.
    - `[id]/chat/route.ts`: Passed `req.signal` to downstream `fetch` call and added `X-Accel-Buffering: no` header to streaming response to prevent proxy buffering.

- **[INGEST]** `docs/pennypress-service-spec.md` → `sources/pennypress-service-spec.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[HydraAgentService]], [[AIAgentWorker]]
  - 작업 내용: 최신 HydraAgent 호스팅 서비스 및 요금제 명세서 위키 등록

## 2026-06-14

- **[INGEST]** `.firecrawl/hermes-agent.md` → `sources/hermes-agent.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-api-server.md` → `sources/hermes-api-server.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-architecture.md` → `sources/hermes-architecture.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-guide-pytorch-kr.md` → `sources/hermes-guide-pytorch-kr.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-messaging.md` → `sources/hermes-messaging.md` (summary-only)
- **[INGEST]** `.firecrawl/hermes-quickstart.md` → `sources/hermes-quickstart.md` (summary-only)
- **[INGEST]** `docs/DATABASE_SCHEMA.md` → `sources/database-schema.md`
- **[INGEST]** `docs/SUPABASE_SETUP.md` → `sources/supabase-setup.md`
- **[INGEST]** `docs/HERMES_GUIDE.md` → `sources/hermes-guide.md`
  - Concepts: [[HermesArchitecture]], [[HermesSkills]], [[HermesCron]], [[HermesSecurity]]
- **[INGEST]** `docs/INSTALL_WINDOWS_WSL2.md` → `sources/install-windows-wsl2.md`
  - Concepts: [[WSL2Setup]], [[PM2Management]]
- **[INGEST]** `hydra-agent/GUIDELINE.md` → `sources/hydra-agent-guideline.md`
  - Concepts: [[HydraAgentGuideline]]

- **[INGEST]** `docs/superpowers/plans/2026-06-12-pennypress-phase2.md` → `sources/2026-06-12-pennypress-phase2.md`
  - Concepts: [[Phase2Plan]], [[SupabaseSchema]], [[HermesWorkerAPI]], [[SSEUpdates]]
  - 작업 내용: Phase 2 구현 계획 인제스트

- **[INGEST]** `docs/hydra-agent-local-setup-summary.md` → `sources/hydra-agent-local-setup.md`
  - Concepts: [[HydraAgentLocalSetup]]
  - 작업 내용: 3종 Hermes Agent 로컬 개발환경 구성 완료 (파일 작업)
  - 생성 파일: `hydra-agent/` 전체 (GUIDELINE.md, ecosystem.config.js, agents/*/setup.sh, config.yaml, soul.md ×8, scripts/ ×3)
  - 수정 파일: `lib/constants/hydra-agent.ts` (server-only 신규), `hydra-agent/HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md` (재작성), `.env.example`
  - 미완료: WSL2 실제 실행 및 기동 검증 (Task 11) — 사용자 직접 수행 필요
  - 실패 사례: routes.ts에 server 상수 혼입 → hydra-agent.ts 분리, .env.example 시크릿 노출 → 플레이스홀더 교체
  - 빌드: `pnpm build` 정상 완료

## 2026-06-13

- **[INGEST]** `docs/HydraAgentGoal.md` → `sources/hydra-agent-goal.md`
  - Concepts: [[HydraAgentService]]
  - 작업 내용: Feature 구독 모델 → HydraAgent 호스팅 모델 전면 전환 완료
  - 변경 파일: lib/types, lib/dummy-data, routes.ts, dashboard, features, my-features, billing, admin/features, CLAUDE.md, Phase2/3 플랜
  - 빌드: `pnpm build` 타입 오류 없이 정상 완료

- **[INGEST]** `DESIGN.md` → `sources/design-system.md`
  - Concepts: [[DesignSystem]]


## 2026-06-12

- **[INGEST]** `docs/PennyPress_Service_Plan.md` → `sources/pennypress-service-plan.md`
  - Entities: [[PennyPress]], [[HermesAgent]]
  - Concepts: [[ContentMonitoring]], [[AIAgentWorker]], [[PointSystem]]
- **[INIT]** 프로젝트 위키 초기화. 서비스 기획서 인제스트 완료.

## [2026-06-20] graph | Knowledge graph rebuilt

45 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-20] graph | Knowledge graph rebuilt

46 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

47 nodes, 40 edges (40 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

48 nodes, 41 edges (41 extracted).

## [2026-06-21] graph | Knowledge graph rebuilt

49 nodes, 45 edges (45 extracted).

## 2026-06-23
- **Ingest**: [[admin-ui-fixes]] - Admin Page UI Fixes & Error Handling.
-   [ 2 0 2 6 - 0 6 - 2 3 ]   U p d a t e d   [ [ a d m i n - a p i - 5 0 0 - e r r o r ] ]   w i t h   f a l l b a c k   m o c k   d a t a   s o l u t i o n  

## 2026-06-26
- **Ingest**: [[2026-06-26-ai-agent-course-integration]] - PennyPress AI Agent 강좌 서비스 연동 (Vivo Academy 마이그레이션)
- **Ingest**: [[vivo-lecture-guidelines]] - Vivo Academy 강의 생성 및 AI Agent 가이드라인
- **Slug:** `admin-course-upload-bugfix`
- **Action:** Ingested new source about fixing course zip upload bug and refactoring to Supabase Storage.

## 2026-06-27
- **Ingest**: [[loading-empty-states]] - 사용자 및 관리자 포털 빈 상태(Empty State) 플래시 방지 및 Skeleton UI 적용
- **Ingest**: [[vercel-preview-oauth-troubleshooting]] - Vercel Preview Deployment 환경에서 Google 로그인 requested path is invalid 에러 해결 가이드
- **Ingest**: [[admin-course-preview-bugfix]] - PennyPress: Admin 강좌 미리보기 버그 픽스 및 Next.js 15 Suspense 연동

## 2026-06-28
- **[BUGFIX] Windows Zip 파일 경로 구분자 백슬래시(\) 버그 수정**
  - **수정 파일**: [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
  - **작업 내용**:
    - Windows 환경에서 압축한 강좌 zip 파일에서 `entry.entryName` 추출 시 경로 구분자로 백슬래시(`\`)가 생겨 Supabase Storage에 백슬래시가 포함된 잘못된 경로 구조로 저장되던 현상을 해결했습니다.
    - `entry.entryName.replace(/\\/g, '/')` 처리를 더해 항상 표준 슬래시(`/`) 구분자로 Storage에 저장되도록 보정했습니다.
    - 업로드 API 파일 내 ESLint 오류(any 사용 및 catch parameter)를 정리하여 안전한 타입 구조(`CourseConfig` 인터페이스, `catch(error: unknown)`)를 확보하고 빌드/린트를 정상 통과시켰습니다.
  - **Concepts**: [[WindowsZipPathHandling]]
- **[BUGFIX] Supabase Storage 비-ASCII 키 제한으로 인한 업로드 오류 및 슬러그 정규화 개선**
  - **수정 파일**:
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
  - **작업 내용**:
    - Supabase Storage 버킷이 한글 및 특수기호(`—` 등)가 포함된 경로 업로드를 `Invalid key`로 차단하는 문제를 해결했습니다.
    - `docs/arduino-beginner` 강좌 설정에 명시적인 ASCII 슬러그 `"slug": "arduino-beginner"`를 추가하고 zip 파일을 재생성했습니다.
    - 업로드 API에서 슬러그 자동 생성 및 명시적 슬러그 수신 시 ASCII 문자(소문자, 숫자, 하이픈 등)만 남도록 강력하게 정규화(slugify)하는 위생 처리 로직을 적용했습니다.
    - 개별 파일 업로드 실패 시 단순히 무시하지 않고, 전체 업로드 처리를 500 에러로 중단하도록 업로드 API 에러 핸들링을 보완했습니다.

- **[FEATURE] 강좌 삭제 예외 처리, 비활성화 기능 도입, 스크롤 오류 및 AI 에이전트 연동 개선**
  - **수정 파일**:
    - [supabase/migrations/20260629_add_disabled_to_courses.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260629_add_disabled_to_courses.sql)
    - [supabase/migrations/20260630_user_progress.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260630_user_progress.sql)
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
    - [app/api/admin/courses/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/[id]/route.ts)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/api/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/route.ts)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **강좌 삭제 시 예외 처리**: 관리자 페이지에서 강좌 삭제 시, 수강 중인 유저(`user_progress` 데이터)가 존재할 경우 Conflict 에러(409)를 리턴하고, 관리자 UI에서 재확인 동의창을 띄우는 프레젠테이션 계층 로직을 설계했습니다.
    - **강좌 비활성화(Disable) 기능**: `courses` 테이블에 `disabled` 필드를 추가하고, 수강 기록 진도를 트래킹하기 위한 `user_progress` 테이블을 원격 Supabase DB에 마이그레이션(db push)했습니다. 비활성화된 강좌는 일반 유저 탐색에서 숨겨지고, 이미 수강 중인 강좌 목록 및 학습 상세 페이지에서는 학습 진행 및 진입을 강제 차단하는 UI를 적용했습니다.
    - **학습 화면 레이아웃 스크롤 오류 해결**: 학습 화면 우측 및 하단 바가 absolute 배치로 인해 스크롤 동작을 방해하고 콘텐츠 하단을 가리던 CSS를 일반 flex-flow 레이아웃으로 변경하여 스크롤 문제를 깔끔하게 해결했습니다.
    - **AI 튜터 외부 에이전트 대화 API 연동**: 임시 setTimeout 더미를 제거하고, 사용자의 등록된 온라인 상태인 `user_external_agents` 목록을 조회하여 해당 에이전트 ID로 SSE 스트리밍 질문-답변(chat completions) API를 연동했습니다. 온라인 에이전트가 존재하지 않을 시에는 가이드 및 설정 바로가기 링크를 제공합니다.
  - **Concepts**: [[CourseManagement]], [[UserProgressTracking]], [[SSEStreamingChat]]

- **[FEATURE] 강좌 학습 화면 AI 튜터 연동 및 숨김 콘텍스트 프롬프트 고도화**
  - **수정 파일**:
    - [supabase/migrations/20260701_add_is_ai_tutor_to_external_agents.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260701_add_is_ai_tutor_to_external_agents.sql)
    - [docs/supabase_setup_query.txt](file:///C:/Workspace/Projects/PennyPress-FE/docs/supabase_setup_query.txt)
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/api/external-agents.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/api/external-agents.ts)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-agents/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - **데이터베이스 스키마 확장**: `user_external_agents` 테이블에 `is_ai_tutor` BOOLEAN 컬럼을 마이그레이션 및 문서 상에 동기화하였습니다.
    - **타입 및 배타적 단일 선택 로직**: `UserExternalAgent` 타입에 `is_ai_tutor`를 반영하고, `createExternalAgent` 및 `updateExternalAgent` 호출 시 해당 에이전트의 `is_ai_tutor`가 `true`일 경우 동일 사용자의 타 에이전트들의 값을 모두 `false`로 자동 초기화하여 유일성을 물리적/논리적으로 보장했습니다.
    - **UI 컴포넌트 업데이트**: 에이전트 등록 모달 및 설정 상세 탭 내에 "AI 튜터용 에이전트로 설정" 스위치를 제공하였고, 조회 및 카드 목록 화면에서 지정 여부와 배지(AI 튜터)를 미려하게 노출했습니다.
    - **조합형 프롬프트 고도화**: 강좌 학습 화면에서 `is_ai_tutor` 지정 에이전트가 없을 경우 `미연동 - 설정 필요` 상태를 반환하도록 예외 처리했습니다. 질문 전송 시 백엔드 API에는 강좌 전체 내용 및 각 카드 내용(System Message) + 현재 학습 중인 카드의 내용(Context Header)을 자동으로 조합하여 전송하고, 사용자 화면의 채팅 버블에는 질문 원본과 답변만 표시하여 학습 집중도를 극대화했습니다. 또한, DB에는 조합형 프롬프트 대신 원래 질문을 저장하도록 API를 보완하여 다른 탭의 히스토리가 오염되지 않도록 마감했습니다.
  - **Concepts**: [[AITutorIntegration]], [[ExclusiveSingleSelection]], [[ContextHiddenPrompting]]

- **[BUGFIX] 강좌 학습 화면 AI 튜터 우측 사이드바 레이아웃 높이/너비 overflow 수정 및 마크다운 렌더러 도입**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **세로 스크롤 고정 및 overflow 해결**: 우측 사이드바 `<aside>` 및 대화 리스트 `<ScrollArea>` 영역에 `min-h-0`, `overflow-hidden` 레이아웃 제약 조건을 적용하여, AI 답변이 길어질 때 사이드바 전체 높이가 커지며 하단 입력 창이 뷰포트 밖으로 밀리고 스크롤이 먹통이 되는 현상을 깔끔하게 해결했습니다.
    - **가로 overflow 및 줄바꿈 해결**: 대화 말풍선 영역에 `min-w-0`, `whitespace-pre-wrap`, `break-words` 스타일을 적용하여, 긴 답변이나 특수 서식이 가로 영역을 벗어나 깨지거나 뭉개지지 않도록 조치했습니다.
    - **코드블록 및 서식 파싱 렌더러 도입**: 에이전트 상세 챗 탭의 `ChatMessageContent` 컴포넌트 로직을 도입하여 코드블록(``` 언어 ...) 내의 가로 스크롤 및 복사 기능, 백틱(```) 인라인 코드, 볼드(`**text**`) 서식을 지원하여 AI 튜터 답변 가독성을 대폭 끌어올렸습니다.
  - **Concepts**: [[LayoutOverflowFix]], [[ScrollFix]], [[ChatMarkdownRenderer]]
- **[FEATURE] Vercel SSO 우회를 위한 Supabase Storage 리소스 업로드 및 fallback ToC 구현**
  - **수정 파일**:
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **API Route 고도화**: `/api/courses/[slug]/resource` 엔드포인트 호출 시, 강좌 리소스 Markdown 파일을 컴파일하고 Supabase Storage `courses` 버킷의 `${slug}/resource.md` 경로로 자동 업로드(`upsert: true`)하도록 연동했습니다. `?json=true` 쿼리 파라미터를 지원하여 7일간 유효한 Signed URL을 JSON 형태로 반환할 수 있게 확장했습니다.
    - **클라이언트 연동 및 SSO 우회**: 학습 화면 마운트 시 스토리지 URL을 비동기로 로드하고, 질문 전송 시 `systemPrompt` 내 `resourceUrl` 자리에 해당 Supabase Storage URL(domain: `*.supabase.co`)을 주입하여 Vercel SSO 차단 환경을 우회하도록 구성했습니다.
    - **이중화 Fallback 안전장치**: 스토리지 연동 실패 시나 로컬 더미 데이터 모드로 인해 `*.supabase.co` URL 획득에 실패할 경우, 세션의 첫 질문 시점에 클라이언트가 보유한 목차(ToC) 데이터를 프롬프트 내에 직접 인라인 텍스트로 보조 전송하는 안전장치를 추가했습니다.
  - **Concepts**: [[SSOBypassSupabaseStorage]], [[InlineToCFallback]]

- **[FEATURE] 강좌 학습 화면 AI 튜터 "히든 메시지" 파싱 및 자료 준비 상태 UI 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **히든 메시지 파싱 및 추출 로직 추가**: 에이전트 답변 본문에서 `<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": boolean} -->` 형식의 특수 주석을 감지하여 JSON 메타데이터를 파싱하고 본문에서 숨기는(strip) 정규식 로직을 추가했습니다. 실시간 스트리밍 중에도 닫히지 않은 부분 주석(`<!--`)을 임시 필터링하여 사용자 화면에 지저분한 원본 주석이 흘러 나오지 않게 처리했습니다.
    - **강좌 자료 다운로드 상태 추적**: `courseDownloadStatus` React State (`checking`, `downloaded`, `not_downloaded`)를 추가하고, 파싱된 다운로드 상태 결과를 반영하도록 구현했습니다.
    - **프롬프트 가이드라인 지시 사항 추가**: 첫 진입 시 시스템 점검 질문(`checkPrompt`) 및 시스템 역할 프롬프트(`systemPrompt`)에 히든 메시지를 첨부하여 진행 여부 상태를 응답하도록 AI 튜터용 인라인 가이드 지시문을 추가했습니다.
    - **실시간 비동기 UI 배지 구현**: 우측 AI 튜터 패널 헤더의 온라인 상태 표시 하단에 강좌 자료 준비 배지를 시각화했습니다. 로딩 애니메이션 스피너와 녹색 깜빡임 글로우 애니메이션, 앰버색 다운로드 에러 상태 등을 HSL 테마에 어우러지게 구현하여 고품질의 미려한 UX를 확보했습니다.
  - **Concepts**: [[HiddenMessageParsing]]

- **[FEATURE] 시스템 점검 메시지 화면 비노출 처리 및 AI 튜터 자동 셋업 프롬프트 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AddAgentModal.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/features/AgentSettingsTab.tsx)
    - [app/api/external-agents/setup-tutor/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/external-agents/setup-tutor/route.ts)
  - **작업 내용**:
    - **시스템 점검 메시지 비노출**: `sendMessage` 함수에 `isSystemCheck` 옵션을 추가하여, 페이지 첫 진입 시 구동되는 자료 점검(`checkPrompt`) 요청과 그 응답 스트림이 사용자 채팅 목록에 보이지 않고 백그라운드에서만 비동기로 실행되도록 하여 대화방 청결도를 대폭 개선했습니다.
    - **AI 튜터 자동 셋업 프롬프트 API 추가**: 외부 에이전트 등록/수정 시 `is_ai_tutor` 설정이 체크된 경우, 해당 에이전트의 OpenAI 호환 completions API로 에이전트 전용 `soul.md` 자동 생성/수정을 요청하는 셋업 프롬프트를 전송하도록 연동했습니다.
    - **응답 검증 가드**: 에이전트가 본인의 파일 생성/편집 도구를 활용해 `soul.md` 작성을 완료하고 `SUCCESS` 메시지를 포함하여 응답하는지 검증하는 프록시 엔드포인트 `/api/external-agents/setup-tutor`를 구축하였습니다.
  - **Concepts**: [[HiddenMessageParsing]], [[AITutorExclusivePersonaSetup]]



- **[FEATURE] 강좌 목차 노출, 수강 신청 및 에이전트/대시보드 UI 연동 개선**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/courses/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/(user)/settings/profile/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/settings/profile/page.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/api/admin/courses/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/[id]/route.ts)
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/layout/UserSidebar.tsx)
    - [supabase/migrations/20260702_add_max_card_to_user_progress.sql](file:///C:/Workspace/Projects/PennyPress-FE/supabase/migrations/20260702_add_max_card_to_user_progress.sql)
  - **작업 내용**:
    - **강좌 목차 노출 및 템플릿**: 강좌 상세 페이지에 "강좌 목차 카드"를 추가하고, `config.json` 포맷에 `toc` 필드를 추가해 각 MDX 카드에 매치되는 제목/설명을 정의했습니다. AI Agent 및 강좌 업로드 가이드용 `docs/arduino-beginner` 템플릿의 `config.json`을 수정하고 `arduino-beginner.zip`을 재생성하였으며, 관리자 업로드 페이지 지침에 `toc` 정의를 보강했습니다.
    - **강좌 등록 연동 및 페이지 차단**: 강좌 검색 및 상세 페이지의 "수강하기/강좌 수강하기" 버튼을 "강좌 등록/강좌 등록하기"로 개편하고, 클릭 시 페이지 이동 대신 팝업(Dialog)으로 등록 성공 메시지를 표시해 "나의 강좌"로 유도하도록 설계했습니다. 등록 시 백엔드 `/api/courses/progress` API를 호출해 `user_progress` 레코드를 생성합니다.
    - **강좌 삭제 시 소프트 딜리트**: 관리자가 강좌를 DELETE 시 수강 중인 유저가 있을 경우 강좌를 하드 딜리트하지 않고 `disabled = true`로 상태만 변경하도록 차단/우회하여, 구독 중인 유저들의 `user_progress`가 CASCADE 딜리트되는 문제를 방지했습니다.
    - **나의 강좌 화면 개편**: 수강 중인 강좌와 완료된 강좌를 탭(Tabs)으로 나누어 표기하도록 개선하고, 학습 진도율은 마지막 뷰가 아닌 학습 진행의 "최대치"(`max_card`)를 기준으로 연동했습니다. `user_progress` 테이블에 `max_card` 필드를 추가하는 DB 마이그레이션을 생성하고, 진도 업데이트 API와 화면 계산 로직을 보완했습니다.
    - **대시보드 및 메뉴명 개선**: 대시보드 문구를 "AI 튜터를 이용한 인터랙티브 강좌" 학습과 에이전트 호스팅에 맞춰 수정하고, 현황 카드를 [활성 에이전트], [이번 달 토큰 사용량], [수강중인 과목], [완료한 강좌]로 세분화해 실시간 DB 쿼리 데이터와 연동했습니다. 사이드 바 메뉴 "외부 에이전트"를 "에이전트 관리"로 명칭을 변경했습니다.
    - **Google 계정 로그인 경고 배너**: 설정 > 프로필 페이지 하단의 Google 계정 비밀번호 안내를 단순 카드에서 노란색 계열의 Warning Alert 배너(`AlertTriangle` 아이콘)로 변경해 가독성과 시인성을 강화했습니다.
  - **Concepts**: [[CourseTOCAndRegistration]], [[SoftDeleteSubscribers]], [[MaxCardProgressTracking]], [[GoogleLoginWarningBanner]]

- **[FEATURE] 나의 강좌 상세 화면, 구독 취소 및 AI 튜터 갱신 안내 구현**
  - **수정 파일**:
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/my-courses/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/page.tsx)
    - [app/(user)/my-courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/client.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
  - **작업 내용**:
    - **나의 강좌 상세 화면 & 다이렉트 런칭**: 각 강좌를 클릭 시 진입하는 `/my-courses/[slug]` 상세 화면을 구축했습니다. 상세 화면에서 Progress Bar와 현재 목차 중 활성화된 단계를 표시하고, 클릭 시 해당 카드로 다이렉트 런칭(`/learn/[slug]?card=[Index]`) 가능하게 했습니다.
    - **구독 취소 기능**: 파괴적인 구독 취소 확인 Dialog를 구현하고, 백엔드 `DELETE /api/courses/progress` API를 통하여 수강 이력을 삭제하고 목록으로 전환하게 연동했습니다.
    - **AI 튜터 자료 동기화 및 갱신 알림**: `course.updated_at`과 `user_progress.updated_at`을 비교해 강좌 수정 시 기존 학습 파일을 지우고 새 번들을 새로 다운로드받아 분석하도록 AI 튜터 시스템 점검 프롬프트를 보강했습니다. 동시 실행 시 즉각 DB Progress updated_at을 리프레시하여 중복 셋업 알림을 예방했습니다.
    - **관리자 업로드 에러 핸들링**: ZIP 업로드 실패 시 선택된 파일 상태 및 input node value를 비워 버튼이 disabled 상태를 유지하도록 하고, 신규 파일 선택 시 idle로 복구하게 연동했습니다.
    - **번들러 생성 가이드 배너**: 콘텐츠 등록 화면에 AI Agent를 통해 ZIP 번들을 자동 생성하도록 유도하고 `PennyPress-Bundler` 레포지토리를 바로가기 할 수 있는 안내 영역을 보강했습니다.
  - **Concepts**: [[MyCoursesDetailView]], [[CourseSubscriptionCancellation]], [[CourseUpdatePromptSystem]], [[AdminUploadErrorRecovery]], [[BundlerRepositoryGuide]]

- **[FIX] 완료 강좌 목록 노출 오류 해결 및 학습 상세 화면 하단 잘림 UI 개선**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
  - **작업 내용**:
    - **완료한 강좌 노출 오류 수정**: Supabase DB에 `max_card` 컬럼 추가 마이그레이션이 반영된 이후, PostgREST API 스키마 캐시 불일치로 인한 `PGRST204` 에러("Could not find the 'max_card' column...")가 발생하여 진도 업데이트(upsert)가 실패하고 progress API GET이 오류를 반환해 강좌 리스트가 누락되던 문제를 발견했습니다. `/api/courses/progress` route.ts API의 에러 감지 조건에 `PGRST204` 코드를 추가하여, 스키마 캐시 문제 발생 시에도 안전하게 fallback upsert가 동작하고 completed 상태가 정상 저장/조회되도록 고도화했습니다.
    - **학습 화면 하단 네비게이션 잘림 개선**: `UserLayout`의 패딩(`py-8`)과 `UserHeader`(`h-16`)의 합산 높이가 `learn` 페이지의 `h-[calc(100vh-4rem)]` 컨테이너와 중첩되면서 하단 [이전], [다음/완료] 버튼 영역이 뷰포트 하단을 넘어가 잘리던 UI 버그를 해결하기 위해, 메인 컨테이너 높이를 `h-[calc(100vh-8rem)]`로 조정하여 뷰포트 내에 전체 UI가 스크롤 없이 미려하게 렌더링되도록 수정했습니다.
  - **Concepts**: [[PostgRESTSchemaCacheRecovery]], [[LearnLayoutViewportOptimization]]

- **[FEATURE] 강좌 학습 화면 기본 사이드바 최소화 및 좌측 목차(TOC) 자유 이동 구현**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/layout.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **좌측 사이드바 기본 최소화**: 사용자가 강좌 학습 상세 화면(`/learn/[slug]`)에 진입 시, `useSidebar()` 훅을 사용하여 애플리케이션의 공통 좌측 사이드바가 자동으로 닫히도록(최소화 상태) 개선하였습니다.
    - **전체 카드 목차(TOC) 노출 및 자유 이동**: 최소화된 사이드바의 잔여 공간을 활용하여 학습 화면 좌측에 강좌의 전체 카드 목록(TOC) 및 진행률(Progress Bar)이 표시되는 전용 패널을 추가했습니다.
    - **학습 범위 내 자유 이동 가드**: 사용자가 이미 수강하여 해제된 카드(Index <= maxUnlockedIndex) 사이에서는 자유롭게 목차를 눌러 넘나들 수 있도록 구현했으며, 아직 도달하지 않은 카드들은 락(Lock) 아이콘과 비활성 스타일을 처리해 학습 순서를 제어했습니다.
    - **전체 화면 레이아웃 최적화**: `no-layout-padding` CSS 규칙 및 Tailwind `has-` 선택자를 통해, 학습 화면에 진입했을 때만 전체 화면 너비와 높이(`h-[calc(100vh-4rem)]`)를 100% 사용하여 학습에 최적화된 대화식 콘솔 뷰를 구축했습니다.
  - **Concepts**: [[CourseTOCNavigation]], [[SidebarAutoCollapse]], [[FullScreenConsoleLayout]]

- **[FEATURE] 강좌(Course) 목차 구조를 단순 Flat 배열에서 계층적 트리(Chapter-Section-Subsection) 구조로 개편**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/my-courses/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/api/courses/[slug]/resource/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/[slug]/resource/route.ts)
    - [lib/dummy-data/dummy-courses.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/dummy-data/dummy-courses.ts)
  - **작업 내용**:
    - **타입 정의 수정**: `lib/types/index.ts`에 `TocNodeType` 및 `TocNode` 인터페이스를 새롭게 추가하고, `Course.toc`의 속성을 `TocNode[]` 구조로 리팩토링했습니다.
    - **강좌 업로드 API 유효성 검사 수정**: `app/api/admin/courses/upload/route.ts`에서 업로드된 `config.json`의 `toc` 트리 구조가 올바른지 재귀적으로 검증하는 헬퍼 함수를 구축했습니다. `title`과 `description`의 누락이나 기본값 방치를 체크하고, 최하단 리프 노드(`filename` 속성을 지님)들의 목록을 수집하여 `cards` 배열과 1:1 중복 없이 매칭되는지 완전하게 확인합니다.
    - **강좌 상세 및 내 강좌 UI 페이지 수정**: `courses/[slug]/client.tsx`와 `my-courses/[slug]/client.tsx`에서 목차 렌더링을 계층적 트리 뷰로 전환하고, 아코디언/접기펼치기 상태 및 들여쓰기 인덴테이션을 depth에 맞춰 미려하게 스타일링했습니다.
    - **학습 플레이어 UI 및 사이드바 수정**: `learn/[slug]/client.tsx` 학습 사이드바를 트리 구조로 재구축하여, 현재 카드가 포함된 Subsection이 하이라이트되고 상위 Chapter/Section이 자동으로 펼쳐진 상태를 유지하도록 고도화하였습니다.
    - **TOC 파싱 및 Fallback 로직 재귀 전환**: API Route, 서버 컴포넌트, 학습 플레이어 내의 Flat TOC 전제 파싱 및 Fallback 텍스트 생성 로직을 트리 재귀 탐색 알고리즘으로 전면 리팩토링했습니다.
  - **Concepts**: [[CourseHierarchicalTOC]], [[RecursiveTOCValidation]], [[CollapsibleTOCTree]], [[ActiveCardTOCAutoExpand]]

## [2026-06-28] graph | Knowledge graph rebuilt

83 nodes, 57 edges (57 extracted).

## 2026-06-29
- **[BUGFIX] 강좌 학습 상세 화면 레이아웃 깨짐 및 스크롤바 미표시 버그 수정**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/layout.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **레이아웃 높이 계산 최적화**: `.no-layout-padding` 환경(학습 상세 화면 등 전체 화면 콘솔 뷰)에서 `main` 및 자식 `div` 요소에 적용되어 있던 `h-full` 클래스로 인해 `UserHeader`(64px)와 합쳐진 높이가 `100vh + 64px`로 과대 계산되던 버그를 수정했습니다. `h-full`을 제거하고 `flex-1 min-h-0`의 flex 높이 계산 방식으로 통일하여 화면이 브라우저 아래로 밀려나 하단에 여백이 생기고 상단 헤더가 잘리던 현상을 깔끔하게 해결했습니다.
    - **좌측 목차 사이드바 스크롤 복구**: 목차 목록이 길어질 때 사이드바 전체가 뷰포트를 벗어나 아래위가 잘리고 내부 스크롤이 작동하지 않던 버그를 고쳤습니다. 사이드바 컨테이너에 `min-h-0` 클래스를 부여하고 `ScrollArea` 컴포넌트에도 `min-h-0`을 추가하여, 주어진 영역 안에서 안전하게 세로 스크롤바가 노출되고 스크롤되도록 보완했습니다.
  - **Concepts**: [[LearnLayoutViewportOptimization]], [[ScrollFix]]

- **[BUGFIX] 강좌(Course) 체크포인트 QnA 실행 불가 버그 수정 및 AI 튜터 평가 연동**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
    - [docs/arduino-beginner/config.json](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/config.json)
    - [docs/arduino-beginner/arduino-beginner.zip](file:///C:/Workspace/Projects/PennyPress-FE/docs/arduino-beginner/arduino-beginner.zip)
    - [scripts/zip-arduino.js](file:///C:/Workspace/Projects/PennyPress-FE/scripts/zip-arduino.js)
  - **작업 내용**:
    - **원인 분석**: 기존에는 강좌 `config.json` 내에 정의되어 있던 `checkpoints` 리스트를 서버 컴포넌트(`page.tsx`)와 클라이언트 학습 컴포넌트(`client.tsx`)가 수신 및 처리하지 않는 상태였습니다. 이에 따라 체크포인트가 설정된 강좌 카드를 통과해도 QnA 팝업이나 AI 튜터 평가 개입이 전혀 이루어지지 않았습니다.
    - **체크포인트 바인딩 및 차단**: `page.tsx`에서 Supabase Storage의 `config.json` 로딩 시 `checkpoints` 속성 타입을 선언하고, 이를 `LearnPageClient`로 무사히 전달하도록 props를 바인딩했습니다. `client.tsx`에서 학습자가 특정 카드를 모두 학습한 뒤 다음 카드로 넘어가려 할 때, 해당 카드가 체크포인트 지정 카드일 경우 슬라이드 전환을 일시 중단하고 QnA 모드(`isCheckpointMode = true`)로 전환하는 차단 로직을 추가했습니다.
    - **AI 튜터 QnA 질문 및 평가 자동화**: 체크포인트 진입 시 AI 튜터(외부 에이전트)에게 QnA 질문을 요청하는 백그라운드 지시 프롬프트(`isCheckpointTrigger = true`)를 사용자 대화 창에 노출하지 않은 채 전송하여 질문을 유도하고, 사용자가 입력한 답변을 AI 튜터가 `checkpoints.prompt` 내의 기준에 기반해 자율적으로 정답 여부를 판정하도록 유도했습니다.
    - **히든 메시지 연동 및 건너뛰기**: 에이전트의 응답 스트림 끝에 `<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": true/false} -->` 형태의 HTML 주석 주입을 감지하여, 정답 통과 시 `passedCheckpoints` 세트에 카드를 추가하고 차단을 해제하였습니다. 예외 탈출로를 위해 "QnA 건너뛰기" 기능과 TOC 수동 이동 시 건너뛰기 확인 대화상자(window.confirm)를 적용했습니다.
    - **빌드 유효성 검사 스크립트 수정 및 번들 재생성**: `scripts/zip-arduino.js` 스크립트 내 flat TOC 기준 카드 개수 1:1 유효성 검사 로직을 계층적 트리 TOC 검사 방식으로 수정하여 에러를 수정했습니다. 수정된 설정을 바탕으로 아두이노 테스트 번들인 `arduino-beginner.zip`을 재생성하여 배포 환경에 즉각 대응했습니다.
  - **Concepts**: [[CourseCheckpointQnA]], [[HiddenMessageEvaluation]], [[HierarchicalTOCZipping]]

- **[FEATURE] 체크포인트 [다음] 버튼 전환 및 안내 팝업 노출 기능 구현**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **체크포인트 버튼 전환**: 강좌 화면에서 현재 진행 중인 카드에 통과하지 않은 체크포인트가 설정되어 있는 경우, 기존의 `[다음]` 버튼을 주황색 테마의 `[체크포인트]`(자물쇠 아이콘 포함) 버튼으로 동적으로 전환하여 사용자가 직관적으로 체크포인트 상태임을 인지하도록 개선했습니다.
    - **안내 팝업 1회 노출**: `[체크포인트]` 버튼을 처음 클릭할 때, AI 튜터와 QnA를 진행하고 통과해야만 다음 강좌로 진행할 수 있음을 알려주는 모달 안내 창(Dialog)을 띄우도록 했습니다. 팝업에서 "QnA 시작하기"를 클릭하면 AI 튜터의 QnA 세션이 시작되며, 팝업은 각 체크포인트당 최초 1회만 노출되어 불필요하게 반복되지 않도록 최적화했습니다.
    - **QnA 진행 중 제어**: 이미 QnA가 진행 중인 상태에서 버튼을 다시 누르면 오른쪽 AI 튜터와의 대화를 통해 질의응답을 완료해야 함을 알리는 알림 메시지를 제공합니다.
    - **이미 답변 완료한 카드의 체크포인트 스킵**: 사용자가 이미 답변을 완료(QnA 통과)했거나 진도를 더 많이 나간 예전 카드를 다시 보는 경우에는 `alreadyPassed` 로직을 확장하여 `[체크포인트]` 버튼으로 전환되지 않고 `[다음]` 버튼으로 즉시 다음 카드로 넘어갈 수 있도록 수정했습니다.
    - **팝업 텍스트 포맷팅 및 간격 조정**: 체크포인트 안내 팝업 내 마크다운 굵게 표시용 `**`이 텍스트로 그대로 렌더링되던 문제를 React HTML 굵은 텍스트 구조로 변경하고, 하단의 [닫기] 및 [QnA 시작하기] 버튼 간의 마진(gap)이 다이얼로그 레이아웃에서 좁게 붙어 보이지 않도록 `sm:gap-0` 클래스를 제거하여 마진을 확보했습니다.
  - **Concepts**: [[CheckpointNextButton]], [[OnceNoticeDialog]], [[CompletedCardCheckpointSkip]], [[DialogUIImprovements]]

- **[FEATURE] 강좌 패키지 (Course Package) 종합 로드맵 기능 구현**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/types/index.ts)
    - [lib/constants/routes.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/constants/routes.ts)
    - [components/admin/AdminSidebar.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/admin/AdminSidebar.tsx)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **신규 파일**:
    - `supabase/migrations/20260703_course_packages.sql`
    - `app/api/admin/packages/upload/route.ts`
    - `app/api/admin/packages/route.ts`
    - `app/api/admin/packages/[id]/route.ts`
    - `app/api/packages/route.ts`
    - `app/api/packages/subscribe/route.ts`
    - `app/api/packages/[slug]/route.ts`
    - `app/admin/packages/page.tsx`
    - `app/admin/packages/upload/page.tsx`
    - `app/(user)/packages/[slug]/page.tsx`
    - `app/(user)/packages/[slug]/client.tsx`
    - `docs/course-package-bundler-guide.md`
  - **작업 내용**:
    - **데이터베이스 스키마 및 RLS 설정**: 패키지 정보(`course_packages`), 매핑 테이블(`course_package_items`), 수강 구독 관리(`user_package_subscriptions`) 테이블을 신설하는 마이그레이션 SQL 파일을 생성하고 RLS 정책을 수립하였습니다.
    - **API 및 어드민 기능 구현**: 매니페스트 JSON 업로드(/api/admin/packages/upload) 및 검증, 패키지 목록/상세 API, 패키지 삭제/수정 API(/api/admin/packages/[id]), 사용자가 패키지를 구독하는 API(/api/packages/subscribe)를 구현하여 일괄 수강 등록을 처리합니다.
    - **어드민 패널 패키지 관리 화면**: 패키지 등록 상태를 관리하는 `/admin/packages` 화면과 JSON 복사/붙여넣기 및 드래그앤드롭 매니페스트 파일 업로드가 가능한 `/admin/packages/upload` 화면을 작성하고 어드민 사이드바에 연동했습니다.
    - **사용자 포털 및 탭 연동**: `courses/page.tsx`에 탭을 추가해 '단과 강좌'와 '강좌 패키지'를 구분 렌더링하고, `my-courses/page.tsx` 상단에 수강 중인 패키지의 전체 강좌 개수 대비 완료 상태를 프로그레스 바 대시보드로 시각화했습니다.
    - **종합 로드맵 상세 Timeline**: `/packages/[slug]` 페이지에 타임라인 기반 패키지 챕터 뷰를 구현해, 각 챕터 강좌의 상태(학습 전, 학습 중, 완료)를 표기하고 이어 학습할 수 있는 환경을 구축했습니다.
    - **플레이어 리다이렉션 모달 연동**: 학습 플레이어 진입 시 `package=[slug]` 쿼리 파라미터를 식별하여, 강좌 완료(마지막 카드 통과) 시 다음 챕터로 바로 수강 이동을 연결하는 네비게이션 다이얼로그 모달을 추가했습니다.
    - **외부 번들러 가이드 배포**: 외부 번들링 도구에서 패키지 매니페스트를 올바르게 명세화하고 플랫폼과 통합하기 위한 지침 문서 `docs/course-package-bundler-guide.md`를 신규 작성하여 배포했습니다.
  - **Concepts**: [[CoursePackageRoadmap]], [[PackageSubscriptionBulkProgress]], [[TimelineCurriculumUX]], [[PlayerRedirectChain]]

- **[FEATURE/FIX] 강좌 패키지 및 단과 강좌 등록 통합, 노출 필터링 및 복습/미리보기 편의 개선**
  - **수정 파일**:
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/packages/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/page.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/admin/packages/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/upload/page.tsx)
    - [app/api/admin/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/route.ts)
    - [app/api/admin/packages/[id]/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/[id]/route.ts)
    - [app/api/courses/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/route.ts)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/courses/progress/route.ts)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx)
    - [app/(user)/packages/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/packages/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **통합 등록 페이지**: `강좌 등록` 및 `강좌 패키지 등록`을 하나의 통합 등록 페이지(`/admin/courses/upload`)로 통합했습니다. 배치 ZIP 파일 업로드와 선택적 매니페스트 JSON 등록/수정이 가능하며, 등록 시 네비게이션 Freezing 오버레이 및 순차 업로드 전송 프로그레스를 표시합니다.
    - **패키지 강좌의 노출 필터링**: `course_package_items`에 연관된(패키지에 포함된) 강좌는 어드민 및 사용자 포털 강좌 검색 결과에서 자동 제외하여, 단과 개별 강좌만 목록에 노출되도록 개선했습니다.
    - **패키지 삭제 연쇄 처리**: 패키지 삭제 시 패키지 메타 정보뿐만 아니라 패키지에 묶인 하위 강좌들까지 DB 및 Storage에서 한 번에 연쇄 자동 삭제하도록 보완했습니다.
    - **사용자 포털 검색 레이아웃 개편**: 탭(Tabs)을 들어내고, 한 화면에 `종합 강좌 패키지` 섹션과 `단과 개별 강좌` 섹션을 수직 배치하여 동시 탐색의 직관성을 극대화했습니다.
    - **나의 강좌 탭 분류 세분화**: 나의 강좌 페이지를 `수강중인 강좌 패키지`, `수강중인 강좌`, `완료한 강좌` 3개 탭으로 세분화하고, 개별 강좌 탭들에서는 패키지 포함 강좌를 생략하여 패키지 단위로만 보이도록 정돈했습니다.
    - **복습 및 미리보기 모드 편의 제어**: 완료된 강좌에 `다시 보기` 버튼을 적용하고, 다시 보기(`?review=true`) 및 미리보기(`?preview=true`)로 수강 진입 시에는 AI 튜터 QnA의 통과 대기 없이 사용자가 즉각 체크포인트를 스킵할 수 있는 스킵 편의 장치를 구현했습니다.
  - **Concepts**: [[UnifiedUploadPortal]], [[PackagedCourseFiltering]], [[CascadePackageDeletion]], [[UnifiedCourseSearchLayout]], [[TriStateMyCoursesTabs]], [[ReviewModeCheckpointBypass]]

## 2026-06-30

- **[FEAT/INGEST] Admin 강좌 등록 warning 팝업, 삭제 blocking progress 구현 및 대용량 업로드 Gateway Timeout 해결**
  - **수정/생성 파일**:
    - `app/api/admin/courses/upload/route.ts` — 동시성 제어 및 재시도로 Gateway Timeout 예방
    - `app/admin/courses/page.tsx` — 강좌 및 패키지 삭제 시 Blocking Progress Overlay 구현
    - `app/admin/courses/upload/page.tsx` — 단과 강좌 ZIP 다중 등록 시 경고 모달(AlertDialog) 연동
  - **인제스트**: `wiki/sources/admin-course-upload-improvements.md`
- **[FEATURE/FIX] 강좌/패키지 통합 관리 UI 개선 및 어드민 탭 통합**
  - **수정 파일**:
    - [components/ui/tabs.tsx](file:///C:/Workspace/Projects/PennyPress-FE/components/ui/tabs.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)
    - [app/admin/packages/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/packages/page.tsx)
    - [lib/constants/routes.ts](file:///C:/Workspace/Projects/PennyPress-FE/lib/constants/routes.ts)
  - **작업 내용**:
    - **AI Agent 권장 문구 복구**: 강좌 / 패키지 통합 등록 화면 하단의 "강좌 번들 구조 참고" 안내 영역에 `AI Agent로 자동 생성하기 (추천)` 메시지 박스와 바로가기 링크를 다시 추가하여 복구했습니다.
    - **어드민 강좌/패키지 메뉴 통합**: 기존 Admin > 강좌 관리, 패키지 관리의 두 개 개별 메뉴를 단일 [강좌 관리] 메뉴로 완전히 통합하고, 탭(Tabs) 컴포넌트를 이용해 한 화면에서 개별 강좌 리스트와 강좌 패키지 리스트를 모두 조회 및 관리할 수 있도록 개선했습니다. 기존 `/admin/packages` 접근 시 `/admin/courses`로 자동 리다이렉트되도록 구성하고, 사이드바에서 패키지 메뉴를 정리했습니다.
    - **탭 컴포넌트 시인성 대폭 개선**: 기본 Shadcn UI 탭 컴포넌트의 낮은 명도/대비 문제를 해결하기 위해 global `components/ui/tabs.tsx`를 고도화했습니다. 활성 탭에 테마 색상(Indigo-600)의 백그라운드 pill/언더라인 하이라이트 및 font-semibold 스타일을 적용하고, 탭 리스트의 배경색 대비를 넓혀 활성 탭이 직관적이고 미려하게 구분되도록 시각적 완성도를 높였습니다.
  - **Concepts**: [[AdminUnifiedCourseManagement]], [[TabVisibilityAesthetics]], [[AIAgentBundlerGuideRestoration]]

- **[FEATURE/FIX] 강좌 패키지 명칭 통일, 리스트 UI 간소화 및 학습 화면 미리보기 개선**
  - **수정/생성 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx) — 미리보기 모드 Badge 추가, 체크포인트 비활성화, TOC 전체 해제 지원
    - [app/admin/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx) — 용어 변경, 패키지 챕터 리스트 제거, 타이틀 클릭 시 상세 이동, 미리보기 클릭 시 첫 강좌 학습 이동
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/courses/page.tsx) — 용어 변경
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/my-courses/page.tsx) — 용어 변경
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx) — 용어 변경
    - [CHANGELOG.md](file:///C:/Workspace/Projects/PennyPress-FE/CHANGELOG.md) — 용어 변경
    - [wiki/log.md](file:///C:/Workspace/Projects/PennyPress-FE/wiki/log.md) — 용어 변경 및 기록 업데이트
    - `wiki/sources/2026-06-30-course-package-preview-and-naming-improvements.md` — 상세 문서 신설
  - **작업 내용**:
    - **명칭 통일**: 전반적으로 혼재되던 "로드맵 패키지"를 "강좌 패키지"로 명칭을 전면 통일하였습니다.
    - **어드민 패키지 목록 개선**: 강좌 패키지 목록 카드 하단의 챕터 리스트를 숨겨 레이아웃을 간소화하고, 타이틀을 클릭하여 상세 페이지(`/packages/[slug]`)로 이동하도록 링크를 연결하였습니다.
    - **패키지 미리보기 개선**: 미리보기 버튼을 누를 시 첫 강좌 학습 화면(`/learn/[slug]?preview=true&package=[slug]`)으로 연결하고, 미리보기 모드에서는 체크포인트와 카드 진도 해제 제약을 완전히 건너뛰도록(Bypass) 구현했습니다. 타이틀 영역에 애니메이션이 적용된 '미리보기 모드' 배지를 노출하였습니다.
  - **Concepts**: [[CoursePackageNamingStandard]], [[AdminPackageListUX]], [[PreviewModeFullBypass]]

- **[FEATURE] 강좌/패키지 등록 시 썸네일 이미지 업로드 및 대시보드 학습 현황 UI 개선**
  - **수정/생성 파일**:
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/dashboard/page.tsx)
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/packages/upload/route.ts)
    - [GUIDE_THUMBNAIL_INTEGRATION.md](file:///C:/Workspace/Projects/PennyPress-FE/GUIDE_THUMBNAIL_INTEGRATION.md)
    - `wiki/sources/2026-06-30-course-package-thumbnail-and-dashboard-improvements.md`
  - **작업 내용**:
    - **강좌 개별 썸네일 이미지 업로드**: 강좌 번들(.zip) 등록 시 UI 상에서 개별 썸네일 이미지를 업로드할 수 있는 파일 선택기를 연동하고, 서버 API가 이 이미지를 Storage에 업로드하고 DB에 public URL을 저장하도록 개선했습니다.
    - **강좌 패키지 ZIP 번들 등록**: 기존 JSON 매니페스트만 등록하던 것에서 패키지 썸네일과 매니페스트를 묶은 ZIP 번들로도 등록할 수 있도록 확장했습니다. ZIP 업로드 시 서버가 내부 파일을 파싱하여 썸네일을 스토리지에 올리고 DB를 갱신합니다.
    - **대시보드 학습 현황 UI 전면 개편**: "구독 중인 서비스" 영역을 현재 사용자가 수강 중인 강좌 목록을 보여주는 "학습 중인 강좌" 패널로 전환하고, 썸네일, 제목, Progress Bar를 통한 학습 진도율, "이어서 학습" 버튼을 렌더링하여 학습 편의성을 대폭 강화했습니다.
    - **수강 과목 수 합산 계산법 변경**: 통계 카드 내 수강 과목의 수가 개별 수강 강좌 수와 패키지 수의 합산으로 직관적으로 산출되도록 개선했습니다.
    - **외부 에이전트 연동 가이드 MD 배포**: 외부 강좌 생성 에이전트가 썸네일과 패키지 번들을 생성해 플랫폼에 업로드하는 규격 지침서를 작성해 배포했습니다.
  - **Concepts**: [[CourseThumbnailUpload]], [[PackageZipBundleUpload]], [[ActiveLearningDashboard]], [[SubscribedCoursesCountRefinement]], [[AgentCourseGeneratorGuideline]]

## [2026-07-01] graph | Knowledge graph rebuilt

93 nodes, 57 edges (57 extracted).


## 2026-07-04

- **[REFACTOR] 단일 통합 번들(.zip) 기반 강좌 업로드 및 클라이언트 사전 검증(Pre-validation) 도입**
  - **수정 파일**:
    - [app/admin/courses/upload/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/upload/page.tsx)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/PennyPress-FE/app/api/admin/courses/upload/route.ts)
    - [package.json](file:///C:/Workspace/Projects/PennyPress-FE/package.json)
    - [pnpm-lock.yaml](file:///C:/Workspace/Projects/PennyPress-FE/pnpm-lock.yaml)
  - **생성 파일**:
    - [docs/course-bundle-migration-guide.md](file:///C:/Workspace/Projects/PennyPress-FE/docs/course-bundle-migration-guide.md)
    - [docs/iot-communication/](file:///C:/Workspace/Projects/PennyPress-FE/docs/iot-communication)
    - [wiki/sources/2026-07-04-unified-course-bundle-upload-refactoring.md](file:///C:/Workspace/Projects/PennyPress-FE/wiki/sources/2026-07-04-unified-course-bundle-upload-refactoring.md)
  - **작업 내용**:
    - **통합 번들 규격 수립**: 기존 하위 강좌 ZIP들과 매니페스트 JSON을 각각 올리던 방식에서, 하나의 통합 번들 ZIP 파일에 `package-manifest.json`과 `thumbnail.png`, `courses/` 하위 ZIP들을 포장해 올리는 규격을 설계함.
    - **브라우저 사전 검증 (JSZip)**: 업로드 시작 전 브라우저상에서 `jszip`을 사용해 번들 ZIP의 압축을 파싱하고, 매니페스트 구조 유효성, 하위 강좌 ZIP 실제 매핑 여부, 하위 강좌의 `config.json` 및 `wiki.md` 존재 여부, 목차(TOC)와 카드 MD 파일 목록의 1:1 일치 여부 등을 사전 검사하여 검증 통과 시에만 [강좌 등록]을 활성화함.
    - **서버 API 리팩토링**: 단일 번들을 수신받아 서버 단에서 해제 및 업로드(Supabase Storage 및 PostgreSQL 트랜잭션 처리)를 일관되게 수행하도록 업로드 API를 리팩토링함.
  - **Concepts**: [[UnifiedCourseBundle]], [[BrowserSideZipValidation]]

## 2026-07-04

- **[FIX] 강좌 수강 중 오류 로그 해결, 학습 화면 레이아웃 폭 확장 및 API 디버깅 로그 가독성 개선**
  - **수정 파일**:
    - [lib/supabase/mock-client.ts](file:///C:/Workspace/Projects/OpenTutor/lib/supabase/mock-client.ts)
    - [lib/db/local-db-server.ts](file:///C:/Workspace/Projects/OpenTutor/lib/db/local-db-server.ts)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
    - [app/api/courses/progress/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/courses/progress/route.ts)
  - **작업 내용**:
    - **TypeError: fileData.text is not a function 해결**: 로컬 Supabase mock client의 `download` API가 서버사이드(Node.js) 환경에서도 `Blob` 객체를 정상적으로 반환하도록 수정하여 `.text()` 호출 시의 타입 에러를 해결했습니다.
    - **createSignedUrl 누락 해결**: mock client의 storage 객체에 `createSignedUrl` API 모킹 버전을 추가하여 리소스 API에서 오류 없이 정상 작동하도록 구현했습니다.
    - **supabase.rpc 누락 및 메세지 Pruning 구현**: mock client에 `rpc` 메서드를 추가하고, `local-db-server.ts` 내에 `rpc` 액션 라우팅을 작성했습니다. 이를 통해 외부 에이전트 연동 시 호출되는 `prune_external_agent_messages` rpc에 대응하여 로컬 DB(`db.json`) 내부의 메시지들을 최신 100개로 자동 Pruning 하도록 로직을 작성했습니다.
    - **학습 화면 콘텐츠 폭 확장**: 학습 플레이어 화면(`app/(user)/learn/[slug]/client.tsx`) 중앙 콘텐츠의 고정 가로폭 제약(`max-w-3xl`)을 `max-w-full`로 수정하여 사용 가능한 최대폭을 차지하도록 개선했습니다.
    - **진도 관리 API 콘솔 로그 최적화**: `/api/courses/progress` API의 GET/POST 요청 시 DB의 전체 레코드를 통째로 console.log에 출력하여 로그가 비대해지던 문제를 개선하여, 데이터의 개수(GET) 및 관련 과목 ID(POST) 등의 핵심 요약/디버깅 정보만 남기도록 정제했습니다.
  - **Concepts**: [[MockSupabaseBlobResponse]], [[MockSupabaseCreateSignedUrl]], [[MockRPCPruning]], [[LearnPlayerFullWidthLayout]], [[APIConsoleLogOptimization]]

## 2026-07-04

- **[UI] 강좌 업로드 화면 레이아웃 순서 변경**
  - **수정 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
  - **작업 내용**:
    - **카드 배치 순서 변경**: "새 강좌 등록" 화면 좌측 컬럼의 "통합 번들 ZIP 업로드" 카드와 "강좌 번들 자동 생성기" 안내 카드의 순서를 변경하여 사용자가 핵심 기능인 업로드 영역을 먼저 볼 수 있도록 개선했습니다.
  - **Concepts**: [[CourseUploadUILayout]]

- **[UI] 강좌 업로드 화면 내 마이그레이션 가이드 페이지 분리**
  - **수정 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
  - **생성 파일**:
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/guide/page.tsx)
  - **작업 내용**:
    - **가이드 화면 분리**: 업로드 화면 하단의 거대한 마이그레이션 설명 박스를 `/courses/manage/upload/guide`라는 서브 페이지로 완전히 분리했습니다.
    - **헤더 바로가기 추가**: 강좌 업로드 페이지 상단 헤더 우측에 "구조 및 마이그레이션 가이드" 바로가기 버튼을 추가하여, 필요할 때 새 탭으로 가이드를 열어두고 참고할 수 있도록 개선했습니다.
  - **Concepts**: [[SeparateMigrationGuidePage]]

- **[UI] 강좌 관리 화면의 "비공개 전환" 버튼 제거**
  - **수정 파일**:
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/page.tsx)
  - **작업 내용**:
    - **비공개 전환 버튼 제거**: 강좌 관리 목록 우측에 표시되는 4개 버튼 중, 공개된 강좌를 비공개 상태로 변경하는 "비공개 전환" 버튼을 제거했습니다.
    - **공개 전환 유지**: 아직 비공개 상태인 강좌를 공개할 수 있도록 "공개 전환" 버튼은 그대로 노출되도록 유지했습니다.
  - **Concepts**: [[CourseManagementUIPrivacyToggle]]

- **[FEAT] 미리보기 모드에서의 체크포인트 활성화 및 강제 스킵 허용**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **미리보기 체크포인트 활성화**: `isPreview`인 경우에도 `hasCheckpoint`가 활성화되도록 수정하여, 미리보기 모드에서도 체크포인트 단계를 밟을 수 있게 구현했습니다.
    - **강제 스킵 허용**: 미리보기 모드(`isPreview === true`)일 때는 패키지나 강좌의 `force_checkpoint` 활성화 여부와 무관하게 항상 `canSkipCheckpoint`가 `true`가 되므로, 체크포인트 QnA를 건너뛸 수 있는 버튼("QnA 건너뛰기")이 항상 나타나도록 유지했습니다.
  - **Concepts**: [[PreviewModeCheckpointProcessing]]

- **[UI] 설정 화면 개선 및 공통 Alert 정렬 오류 수정**
  - **수정 파일**:
    - [app/(user)/settings/layout.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/settings/layout.tsx)
    - [app/(user)/settings/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/settings/page.tsx)
    - [components/ui/alert.tsx](file:///C:/Workspace/Projects/OpenTutor/components/ui/alert.tsx)
  - **작업 내용**:
    - **설정 내 프로필 메뉴 비활성화**: 당장 사용하지 않는 '프로필' 메뉴를 설정 레이아웃 네비게이션에서 보이지 않도록 숨김 처리했습니다.
    - **설정 진입 리다이렉트 변경**: 메인 설정 페이지(`/settings`) 진입 시, 이전 디폴트 목적지였던 프로필 대신 에이전트 설정 페이지(`/settings/agent`)로 바로 리다이렉트되도록 경로를 수정했습니다.
    - **공통 Alert 레이아웃 정렬 수정**: Tailwind v4의 미지원 CSS 변수 `--spacing`으로 인해 grid columns 크기 계산이 깨져, Alert 내부의 타이틀과 설명이 가운데 정렬로 보이거나 아이콘 간격이 텍스트 길이에 따라 변하는 문제를 `grid-cols-[16px_1fr]`로 고정하여 수정했습니다.
  - **Concepts**: [[SettingsUIRefinementAndAlertLayoutFix]]

- **[FEAT] 초기 로컬 DB 템플릿의 기본 더미 에이전트 데이터 제거**
  - **수정 파일**:
    - [lib/db/local-db-server.ts](file:///C:/Workspace/Projects/OpenTutor/lib/db/local-db-server.ts)
  - **작업 내용**:
    - **기본 에이전트 씨드 제거**: 최초에 `db.json`이 생성될 때 등록되던 실제 동작하지 않는 더미 에이전트 데이터("기본 에이전트", ID: `agent-1`)를 삭제했습니다. 이로써 `user_external_agents` 목록은 기본적으로 빈 배열(`[]`)로 시작하게 됩니다.
  - **Concepts**: [[RemoveDefaultDummyAgentSeed]]

## 2026-07-05

- **[UI] 탭(Tabs) 컴포넌트 디자인 고도화 및 프로젝트 내 탭 스타일 통일**
  - **수정 파일**:
    - [components/ui/tabs.tsx](file:///C:/Workspace/Projects/OpenTutor/components/ui/tabs.tsx)
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-agents/[id]/page.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-courses/page.tsx)
  - **작업 내용**:
    - **탭 UI 기본 스타일 고도화**: `components/ui/tabs.tsx`의 default 탭 리스트 스타일을 모던하고 세련된 `rounded-xl p-1 h-11 border backdrop-blur-sm` 형태로 향상시켰습니다. 활성 탭에 테마 색상(Indigo-600)의 백그라운드 shadow 및 rounded-lg 스타일을 내재화하여, 인라인으로 작성되던 복잡한 스타일 코드를 걷어내고 컴포넌트 자체에서 미려한 완성도를 보여주도록 개선했습니다.
    - **사용처 인라인 스타일 리팩토링**: 에이전트 상세 화면(`my-agents/[id]/page.tsx`)과 나의 강좌 화면(`my-courses/page.tsx`)에 각각 다르게 하드코딩되어 불일치했던 탭 리스트 및 트리거 인라인 스타일을 모두 제거했습니다. 개선된 `components/ui/tabs.tsx`의 통일된 기본 테마를 적용하여, 프로젝트 전반의 탭 UI/UX가 일관성 있게 표시되도록 통일했습니다.
  - **Concepts**: [[UnifiedTabsAesthetics]], [[TabsStyleRefactoring]]

- **[FEATURE/UI] AI 튜터 복원, 정보 노출 강화, 에이전트 지정 및 통계 화면 구축과 Coming Soon 안내 적용**
  - **수정 파일**:
    - [lib/types/index.ts](file:///C:/Workspace/Projects/OpenTutor/lib/types/index.ts) — `UserExternalAgent` 타입에 `env_type`, `agent_program` 필드 추가
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx) — 신규 에이전트 등록 시 실행 환경 및 프로그램 값 전달
    - [app/(user)/my-agents/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-agents/page.tsx) — AI 튜터 뱃지 및 기본 튜터 설정 기능 복원, 에이전트 메타데이터 노출 강화 및 할당 강좌 수 표시
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-courses/page.tsx) — 강좌 패키지 뱃지 제거, 튜터 정보 및 미지정 시 폴백/경고 스타일 노출, 이어서 학습하기 라우팅 연동
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/page.tsx) — 강좌 관리 설명 문구 현행화, 번들 등록/깃허브 등록 섹션 분리 및 할당 에이전트명 노출
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/page.tsx) — 외부 클라우드 마켓플레이스 연동 준비 안내 Placeholder / Coming Soon UI 구축
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/[slug]/client.tsx) — 강좌 전체 단위 에이전트 지정/저장 구현, 헤더 하단 에이전트 통계 카드 배치, 챕터별 에이전트 텍스트화
    - [app/(user)/my-agents/[id]/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/my-agents/[id]/page.tsx) — "통계" 탭 추가 및 사용량/강좌 할당 통계 연동
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
    - [app/api/external-agents/test/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/external-agents/test/route.ts) — Dashboard 관련 설정 완전 제거, 실행 환경 및 에이전트 프로그램 설정 필드 일치 및 저장 연동
  - **작업 내용**:
    - **AI 튜터 복원 및 정보 노출**: 에이전트 카드 상단에 "AI 튜터" 뱃지를 복구하고, 드롭다운을 통해 기본 AI 튜터를 지정할 수 있는 벌크 리셋 연동을 적용했습니다. 또한 에이전트 타입 외에 실행 환경(로컬/클라우드) 및 에이전트 프로그램(Hermes/Ollama 등) 정보를 카드에 명시하고 필드를 확장했습니다.
    - **수강 강좌 및 튜터 유효성 검증**: 나의 강좌 카드에서 불필요한 패키지 뱃지를 정리하고, 배정된 에이전트 또는 기본 튜터 정보를 노출시켰습니다. 튜터 정보가 전혀 없는 비정상적 강좌의 경우 빨간색 경고 스타일을 렌더링하고, 플레이어 진입 시 최적화된 학습 슬라이드로 즉각 라우팅되도록 네비게이션을 개편했습니다.
    - **강좌 관리 섹션 분리**: 로컬에서 ZIP으로 직접 올린 강좌와 Github 저장소를 연동하여 다운로드한 강좌의 성격을 나누기 위해, 강좌 관리 리스트를 두 개의 섹션("강좌 번들 파일로 등록", "GITHUB 에서 추가")으로 분리하고 렌더러를 리팩토링했습니다.
    - **Coming Soon 검색 마켓 플레이스**: 외부 클라우드 마켓플레이스 서버 연동 강좌 검색 기능을 안내하기 위해, 이메일 알림 신청이 가능한 고품격 Coming Soon Placeholder UI를 `courses/page.tsx`에 신설했습니다.
    - **강좌 단위 튜터 지정 및 통계**: 챕터별로 튜터를 선택하던 복잡성을 제거하고, 강좌 전체 단위로 튜터를 지정하도록 개선하여 DB에 저장되도록 연결했습니다. 강좌 상세 헤더 하단 및 에이전트 포털 내에 "통계" 카드/탭을 각각 연동하여 사용 시간, 응답 속도, 누적 토큰, 평균 토큰 등의 가상 통계와 할당 강좌 수를 모니터링할 수 있도록 했습니다.
    - **Dashboard 통합 연동 정리**: 로컬 중심의 전환에 맞춰 외부 에이전트 설정 내의 불필요한 Dashboard API 설정을 들어내고, AddAgentModal과 완벽히 동치되는 에이전트 속성 변경 및 저장이 가능하도록 탭 설정을 리팩토링했습니다.
  - **Concepts**: [[AITutorRestoration]], [[TutorValidationFallback]], [[CourseManageSectionSplitting]], [[CloudMarketplaceComingSoon]], [[GlobalTutorSettingsAndStats]], [[CleanSettingsTabWithDashboardRemoval]]

- **[BUGFIX] 에이전트 상세 화면 지원 모델 조회 예외 처리 개선 및 이전 설정 모델 유지**
  - **수정 파일**:
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
  - **작업 내용**:
    - **이전 설정 모델 정보 복구 및 경고 노출 조건 개선**: 원격 에이전트 서버로부터 지원 모델 리스트(`models`)를 가져오지 못하더라도, 이미 에이전트에 설정되어 있는 모델명(`agent.selected_model`)이 있다면 "LLM 모델 정보 없음" 경고 상자를 띄우지 않고 정상적인 모델 조회 UI를 유지하도록 개선했습니다.
    - **누락 모델 자동 주입**: 원격 API 응답에 현재 설정된 모델이 빠져있거나 모델 리스트가 빈 상태여도 설정된 모델 정보를 목록 상에 임시로 노출하여 정상적으로 뱃지 및 드롭다운 선택 UI가 작동하도록 처리했습니다.
    - **에러 메시지 상세화**: API 호출 에러가 발생했지만 설정된 모델 정보가 있어 정상 UI가 표시되는 경우, 성공 메시지 대신 실패 원인을 하단 캡션으로 작게 보여주어 디버깅 사용성을 개선했습니다.
    - **대화(Chat) 기반 모델 조회 폴백 추가**: 하네스 에이전트와 같이 `/v1/models`를 직접 제공하지 않는 원격 에이전트를 위해, 테스트 API 내부에서 `/v1/chat/completions`를 통해 모델 정보와 활성 모델명을 JSON 구조로 질의하는 응답 처리 폴백 로직을 구현하여 목록 조회 성공률을 높였습니다.
  - **Concepts**: [[AgentModelLookupFallback]], [[RestoreConfiguredAgentModelUI]]

- **[FEATURE/UI] 에이전트 등록/수정 시 활성 모델 필드 자동 입력 및 연결상태 확인 필수 적용**
  - **수정 파일**:
    - [components/features/AddAgentModal.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AddAgentModal.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
    - [app/api/external-agents/[id]/chat/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/external-agents/[id]/chat/route.ts)
  - **작업 내용**:
    - **활성 모델 필드 자동화 및 하단 이동**: 사용자가 수동으로 모델을 선택하거나 입력하지 않아도 되도록 "활성 모델 선택" 항목을 폼의 가장 하단으로 이동하고 read-only 필드로 변경했습니다. "연결상태 확인" 버튼을 클릭하면 원격 모델을 조회하여 자동으로 값이 채워지도록 연동했습니다.
    - **타입별 모델 유효성 및 강제성 정의**: 하네스 에이전트의 경우는 활성 모델 정보가 없어도 등록/수정이 가능하도록 선택(Optional) 처리하고, LLM 에이전트의 경우에는 활성 모델이 필수이므로 "연결상태 확인" 시 반드시 모델이 감지되도록 설정했습니다 (LLM 모델 탐색 실패 시 에러 처리).
    - **연결 변경 시 상태 검증 제어**: 에이전트 정보 수정 시 Endpoint, Key, 에이전트 타입/프로그램이 변경된 경우 반드시 "연결상태 확인"을 다시 거치도록 제한하여 유효하지 않은 정보의 저장을 미연에 방지했습니다.
    - **채팅 API 폴백 지원**: 하네스 에이전트 연동 시 활성 모델이 DB 상에 비어있거나 누락되어도 채팅 API에서 `hermes-agent`로 자동 폴백되도록 백엔드 라우터를 개선했습니다.
  - **Concepts**: [[ActiveModelAutoPopulation]], [[ConnectionVerificationMandatory]], [[LLMAgentModelEnforcement]]

## 2026-07-05

- **[UI] 대시보드 화면 내 "에이전트 관리" 및 "AI 강좌" 카드 가로 나란히 배치**
  - **수정 파일**:
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/dashboard/page.tsx)
  - **작업 내용**:
    - **가로 그리드 배치**: 기존의 세로로 순차 노출되던 "에이전트 관리" 카드와 "AI 강좌" 카드를 `grid gap-6 md:grid-cols-2` 컨테이너로 묶어 데스크탑 뷰포트에서 가로로 나란히 정렬되도록 레이아웃을 개편했습니다.
    - **카드 높이 일치 및 버튼 하단 정렬**: 카드의 실제 텍스트 길이에 관계없이 카드의 전체 높이가 균등하게 일치하고 버튼 영역이 하단에 정렬되도록 `flex flex-col justify-between h-full` 스타일링을 적용했습니다.
    - **스켈레톤 화면 동기화**: 대시보드 로딩 중 보여지는 스켈레톤 화면(`DashboardSkeleton`)에서도 동일하게 두 카드를 가로 2열 배치하도록 레이아웃을 일치시켰습니다.
  - **Concepts**: [[DashboardSideBySideCards]], [[CardHeightEqualization]], [[SkeletonLayoutSync]]

- **[DOCS/FEAT] 강좌 번들 프로토콜 문서 추가 및 필수 3대 필드(프로토콜 버전, 대상 연령대, 카테고리) 검증 및 저장 구현**
  - **생성 파일**:
    - [docs/bundler/protocol.md](file:///C:/Workspace/Projects/OpenTutor/docs/bundler/protocol.md)
    - [docs/bundler/ai-agent-instructions.md](file:///C:/Workspace/Projects/OpenTutor/docs/bundler/ai-agent-instructions.md)
    - [docs/bundler/creator-interview-guide.md](file:///C:/Workspace/Projects/OpenTutor/docs/bundler/creator-interview-guide.md)
  - **수정 파일**:
    - [app/(user)/courses/manage/upload/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/page.tsx)
    - [app/(user)/courses/manage/upload/guide/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/courses/manage/upload/guide/page.tsx)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/admin/courses/upload/route.ts)
    - [AGENTS.md](file:///C:/Workspace/Projects/OpenTutor/AGENTS.md)
    - [CLAUDE.md](file:///C:/Workspace/Projects/OpenTutor/CLAUDE.md)
    - [GEMINI.md](file:///C:/Workspace/Projects/OpenTutor/GEMINI.md)
    - [wiki/log.md](file:///C:/Workspace/Projects/OpenTutor/wiki/log.md)
  - **작업 내용**:
    - **번들러 공유 문서 생성**: 외부 강좌 생성용 프로젝트와 프로토콜 명세 공유를 위해 `docs/bundler/` 폴더 하위에 번들링 공식 프로토콜 스펙(`protocol.md`), AI Agent 생성 가이드라인(`ai-agent-instructions.md`), 콘텐츠 제작자 인터뷰 가이드(`creator-interview-guide.md`)를 신설했습니다.
    - **필수 메타데이터 추가 및 검증 규칙 강화**: `package-manifest.json`에 `bundler_protocol_version`, `target_age`, `category` 3대 필드를 추가/수정하는 프로토콜(v1.0.0)을 정립했습니다. 또한 강좌 ZIP 검증 단계(`manifest-fields`)에 해당 필드가 올바른 문자열 형식으로 채워졌는지 확인하는 엄격한 유효성 검증을 반영했습니다.
    - **검증 결과 UI 노출**: 검증 성공 시 화면 하단의 매니페스트 분석 정보 카드에 프로토콜 버전, 대상 연령대, 카테고리가 가시적으로 표시되도록 UI를 개선했습니다.
    - **가이드 페이지 및 API 동기화**: 마이그레이션 가이드 페이지(`/courses/manage/upload/guide`)의 `package-manifest.json` 예시와 핵심 검증 목록을 업데이트하여 신규 필드를 포함시켰습니다. 서버사이드 업로드 API(`app/api/admin/courses/upload/route.ts`) 내 `course_packages` 데이터 upsert 로직에도 이 3대 필드를 추출하여 DB(`db.json`)에 완벽히 반영하도록 통합 및 Fallback 구조를 동기화했습니다.
    - **프로토콜 문서 유지 관리 규칙 추가**: 강좌 제작용 Bundler 프로토콜의 스펙 변경 시 `docs/bundler/` 폴더의 문서들을 즉각 최신화하도록 지시하는 프로젝트 중요 규칙을 `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`에 추가하여 향후 작업자들과의 공조가 끊이지 않도록 강제했습니다.
  - **Concepts**: [[CourseBundlerProtocolv1.0.0]], [[ManifestFieldsValidationUpdate]], [[CourseUploadMetadataUI]], [[ServerUpsertFieldsSync]], [[ProtocolDocumentationSyncRule]]

## 2026-07-05

- **[FEATURE] 동영상 강좌 수강 및 자막 동기화(자동 스크롤 및 Seek) 구현 및 Bundler 프로토콜 확장**
  - **수정 파일**:
    - [docs/bundler/protocol.md](file:///C:/Workspace/Projects/OpenTutor/docs/bundler/protocol.md)
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/OpenTutor/app/api/admin/courses/upload/route.ts)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
    - [components/features/AgentSettingsTab.tsx](file:///C:/Workspace/Projects/OpenTutor/components/features/AgentSettingsTab.tsx)
  - **작업 내용**:
    - **Bundler 프로토콜 확장**: 동영상 전용 카드를 위해 기존 마크다운 외에 구조화된 JSON 카드 포맷(`.json`)을 도입하고, `config.json` 목록 및 TOC 정의에서 `.json` 파일의 등록을 허용했습니다. 자막 상세 구조(`subtitles`: `start`, `end`, `text`) 및 `video_info` 필드 스키마를 `docs/bundler/protocol.md`에 공식 규정했습니다.
    - **업로드 검증 엔진 패치**: 업로드 API(`route.ts`)의 TOC 재귀 검증 시 `.json` 확장자를 허용하도록 정규식을 개선했으며, `cards/*.json` 파일 로드 시 `type: "video"`, `video_info.video_id` 등 필수 구조 정합성 검사(Linting)를 추가하여 업로드 무결성을 확보했습니다.
    - **Next.js 서버 데이터 로더 개편**: `learn/[slug]/page.tsx`에서 다운로드한 카드 파일이 `.json` 형식일 경우, MDX serialize 대신 JSON 파싱을 수행하여 `type: 'video'` 및 `videoInfo` 등의 Props로 분기해 반환하도록 구현했습니다.
    - **유튜브 비디오 플레이어 연동**: `client.tsx` 내에 `react-player`를 동적으로 바인딩하고, 현재 카드의 물리 타입이 `video`인 경우 aspect-video 형태의 플레이어가 화면 가득 차도록 조건부 렌더링을 적용했습니다.
    - **채팅/자막 이중 탭(Tabs) UI 구성**: 우측 채팅 영역에 Radix/Shadcn Tabs를 적용하여 'AI 튜터' 및 '자막' 목록 탭을 손쉽게 전환하도록 레이아웃을 확장했습니다. (비디오가 아닐 때는 자막 탭 비활성화)
    - **자막 스크롤 동기화 & 역방향 탐색(Seek)**: 플레이어의 `onProgress` 이벤트에 맞춰 활성 자막 행을 하이라이팅 처리하고 자동으로 스크롤 포커스가 이동하도록 구현했습니다. 자막 리스트의 특정 자막 클릭 시 플레이어의 `seekTo`를 호출하여 해당 시점으로 영상 재생 위치를 조절하는 역방향 이동 기능을 제공합니다.
    - **재생 일시정지 및 스크롤 인터랙션**: 카드를 전환하거나 강좌 페이지를 벗어날 때(unmount) 영상 재생이 일시 중지되도록 `isPlaying` 상태를 제어하며, 유저가 자막 탭을 마우스 휠 등으로 직접 스크롤할 때는 수초간 자동 스크롤 동기화를 멈춰 수강을 방해하지 않도록 정교하게 처리했습니다.
    - **빌드 예외 및 TS 컴파일러 에러 수정**: `ReactPlayer` dynamic import 컴포넌트의 타입 추론 누락 및 `AgentSettingsTab.tsx` 내에서 발생한 unintentional comparison type check 에러들을 캐스팅(`as any`, `as string`)을 통해 해결하여 Next.js 빌드 성공을 보장했습니다.
  - **Concepts**: [[VideoCardJSONFormat]], [[VideoUploadAPILinting]], [[ReactPlayerIntegration]], [[SubtitlesTabsUI]], [[SubtitleAutoScrollAndSeek]], [[TSBuildCompilationFix]]

- **[BUGFIX] 동영상 강좌 영역 가로폭 최대화 및 자동 재생 / 재생 차단 피드백 루프 해결**
  - **수정 파일**:
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **가로폭 최대화 및 종횡비 유지 (스크롤 방지)**: 비디오 플레이어 컨테이너의 가로/세로 크기 결정에 있어 오작동하던 `w-full h-full aspect-video` 클래스 충돌 문제를 `w-full max-w-full max-h-full aspect-video relative` 및 패딩(p-4) 부여로 해결했습니다. 이를 통해 비디오 영역이 스크롤 없이 부모의 가용 영역 내에서 16:9 비율을 유지하며 최대 너비로 꽉 차게 렌더링됩니다.
    - **동영상 카드 진입 시 자동 재생 구현**: `isPlaying` 상태의 초기값 및 카드 전환(useEffect) 시 초기화 값을 `true`로 설정하고, ReactPlayer의 YouTube config 파라미터에 `autoplay: 1`을 명시적으로 주어 학습 화면 진입 시 영상이 자동으로 재생되도록 했습니다.
    - **재생 불가 피드백 루프 해결**: 이전에 `isPlaying`이 `false`로 굳어진 상태에서 사용자가 클릭하면, 일시적으로 재생을 시작하지만 React 렌더링에 의해 `playing={false}`가 다시 강제 적용되어 재생이 즉각 멈추는 오작동을 해결했습니다. 초기 재생 플래그 설정 및 `onPlay`/`onPause` 상태 싱크 보강을 통해 클릭 시 막힘 없는 재생 제어가 가능합니다.
  - **Concepts**: [[VideoMaximizeLayoutFix]], [[AutoplayEnablement]], [[ReactPlayerFeedbackLoopFix]]

## 2026-07-05 (2nd Session)

- **[REFACTOR/UI] 영상 학습 화면 여백 제거, 자막 탭 좌측 이관 및 AI 튜터 우측 단일화**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/layout.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **학습 화면 가로폭 여백 제거**: 학습 플레이어 화면 진입 시 최상위 레이아웃 `layout.tsx`에서 `isLearnPage` 분기 로직을 타이트하게 적용하여 가로 최대 너비 제한(`max-w-7xl`)과 패딩(`px-10 py-8`)을 제거하고 `max-w-none p-0`을 주어 화면 가로폭을 가득 채우도록 개선했습니다.
    - **자막 탭 좌측 목차 영역으로 이관**: 우측 `[AI 튜터 / 자막]` 탭 구조에서 자막을 완전히 분리해내어, 좌측 목차 영역을 `[목차 / 자막]` 탭(Tabs) 형태로 개편하여 자막을 볼 수 있도록 자막 뷰를 좌측 탭으로 이관했습니다. 비디오 카드로 진입 시 자동으로 자막 탭이 포커싱되도록 `leftActiveTab` 분기를 연결했습니다.
    - **AI 튜터 우측 단일 패널로 원복**: 자막 기능이 이관되면서 우측 패널은 복잡한 탭 구조 대신 단일 집중형 AI 튜터 채팅 패널로 원복하여 UI의 y축 정렬 불균형 문제를 해결하고 정밀한 QnA 소통에 집중할 수 있도록 복구했습니다.
    - **TS 컴파일 에러 & JSX 태그 정합성 픽스**: 빌드 단계에서 발생한 `Expected '}', got '<eof>'` 구문 에러 및 dynamic wrapper와 관련해 누락되었던 닫는 괄호 복구 및 `useMemo`, `Tabs` 컴포넌트의 누락된 임포트를 추가하여 Next.js Turbopack 빌드 컴파일을 완전히 성공시켰습니다.
  - **Concepts**: [[LearnLayoutNoMargins]], [[SubtitlesLeftTabsMigration]], [[SingleFocusedRightAITutor]], [[TurbopackBuildFix]]

## 2026-07-05 (3rd Session)

- **[BUGFIX] UserHeader 컴포넌트의 Next.js `connection()` 및 Async Client Component 렌더링 오류 해결**
  - **수정 파일**:
    - [components/layout/UserHeader.tsx](file:///C:/Workspace/Projects/OpenTutor/components/layout/UserHeader.tsx)
  - **작업 내용**:
    - Next.js 15의 `connection()` dynamic API가 request scope 외부(예: 빌드 타임 혹은 정적 context)에서 호출되어 `connection was called outside a request scope` 에러가 발생하던 문제를 1차 조치했습니다.
    - 2차적으로, 상위 컴포넌트인 `app/(user)/layout.tsx`가 `'use client'` 지시어를 포함한 Client Component인 관계로, 그 하위에서 렌더링되던 비동기 서버 컴포넌트 `<UserHeader />`가 async Client Component로 인식되어 `Only Server Components can be async at the moment` 및 `A component was suspended by an uncached promise` 에러가 연속적으로 발생하던 현상을 해결했습니다.
    - `UserHeader` 컴포넌트를 `'use client'` 클라이언트 컴포넌트로 전면 리팩토링하고, `useState` 및 `useEffect` 훅을 활용해 마운트 시점에 로컬 Mock Supabase Client(`createClient`)로부터 유저 데이터를 비동기 획득하도록 구조를 보완하여 두 에러를 모두 완벽히 픽스했습니다.
  - **Concepts**: [[NextConnectionScopeFix]], [[LocalMockClientPruning]], [[AsyncClientComponentFix]]


## 2026-07-06 (4th Session)

- **[BUGFIX] 로컬 DB upsert 복합키 처리 부재로 인한 중복 user_progress 생성 및 대시보드 진도율 하드코딩 오류 해결**
  - **수정 파일**:
    - [lib/db/local-db-server.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/db/local-db-server.ts)
    - [app/(user)/dashboard/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/dashboard/page.tsx)
  - **작업 내용**:
    - **로컬 DB upsert 복합키 조회 지원**: `local-db-server.ts`의 `upsert` 로직에서 `id`나 `slug`가 존재하지 않을 때, `user_progress` 테이블은 `user_id`와 `course_id` 복합키로, `user_package_subscriptions` 테이블은 `user_id`와 `package_id` 복합키로 기존 레코드를 검색하도록 수정했습니다. 이를 통해 중복된 `user_progress` 데이터가 계속 쌓이는 버그를 해결했습니다.
    - **기존 중복 데이터 클렌징**: `db.json` 내의 중복 생성된 `user_progress` 레코드를 분석하여 `user_id`와 `course_id` 기준으로 최다 진도 레코드만 남기고 삭제(Deduplication) 조치했습니다.
    - **대시보드 진도율 하드코딩 및 중복 노출 제거**: `dashboard/page.tsx`에서 개별 강좌의 `totalCards`를 `10`으로 하드코딩하던 문제를 실제 강좌의 `cards.length`를 사용하도록 수정하여 실제 진도율(예: 76/78 단계)이 표시되도록 개선했으며, 대시보드의 "학습 중인 강좌" 섹션에 패키지 구독(`packageSubs`) 카드가 중복되어 이중으로 표시되던 로직을 제거하고 오직 진행 중인 강좌 진도(`activeProgress`)만 표시되도록 통합했습니다.
  - **Concepts**: [[CompoundKeyUpsert]], [[DbDeduplication]], [[DynamicTotalCards]], [[DashboardCardDeconflict]]

## 2026-07-06 (5th Session)

- **[FEAT/BUGFIX] 강좌 등록 시 AI 튜터 자동 할당 API 연동 및 강좌 목록/이어보기 카드 인덱스 매핑 오류 수정**
  - **수정 파일**:
    - [app/api/admin/courses/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/courses/upload/route.ts)
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts)
    - [lib/supabase/admin.ts](file:///C:/Workspace/Projects/OpenTutorials/lib/supabase/admin.ts)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
    - [app/(user)/my-courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/my-courses/page.tsx)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx)
  - **작업 내용**:
    - **튜터 에이전트 자동 할당**: 강좌 패키지가 신규로 등록/업로드 완료될 때 사용 가능한 AI 튜터(Hermes 등) 에이전트를 해당 강좌에 자동으로 매핑하고 기본 튜터로 활성화하는 API 및 DB 트리거 기능을 추가했습니다.
    - **학습 카드 이동 및 이어보기 복구**: 강좌 검색 페이지 및 '나의 강좌' 페이지에서 학습 이어보기 시, 카드의 인덱스와 learn 페이지 slug 라우팅이 어긋나 엉뚱한 카드가 열리던 오류를 수정하고, UI와 DB의 인덱스를 일치시켰습니다.
  - **Concepts**: [[AutoAssignTutor]], [[ResumeCardIndexFix]]

## 2026-07-06 (6th Session)

- **[FEAT/UI] Noto Sans KR 폰트 적용 및 학습 화면 마크다운 컴포넌트 프리미엄 스타일링**
  - **수정 파일**:
    - [app/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/layout.tsx)
    - [tailwind.config.ts](file:///C:/Workspace/Projects/OpenTutorials/tailwind.config.ts)
    - [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/client.tsx)
    - [app/(user)/learn/[slug]/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/learn/[slug]/page.tsx)
    - [docs/bundler/protocol.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol.md)
  - **작업 내용**:
    - **Noto Sans KR 로컬 폰트 탑재**: `public/fonts/Noto_Sans_KR` 경로의 Variable Font를 Next.js `localFont`로 로드하고 tailwind 설정의 `sans` 폰트 패밀리 최우선 순위로 지정하여 앱 전체에 미려한 한글 폰트를 일괄 적용했습니다.
    - **학습 화면 마크다운 컴포넌트 커스텀 렌더링**: h1~h4 헤더, 본문(p), 목록(ul, ol), 인용구, GFM 테이블을 프리미엄 UI 스타일로 렌더링하도록 `mdxComponents`를 보강했습니다.
    - **코드 블록 및 인라인 코드 고도화**: 소스 코드 구문 강조를 위한 프리미엄 코드 블록(`PreBlock`, `InlineCode`)을 구현하고 상단 헤더에 언어 레이블 및 1-클릭 클립보드 복사 버튼을 내장했습니다.
    - **강좌 번들러 프로토콜 문서 업데이트**: `docs/bundler/protocol.md`에 학습 카드 마크다운 가이드라인(헤더 사용법, 테이블 규격, 코드 블록 언어 지정)을 추가하여 제작 프로토콜을 공조 최신화했습니다.
  - **Concepts**: [[NotoSansKRLocalFont]], [[MDXCustomStyling]], [[CodeBlockClipboardCopy]], [[BundlerProtocolMarkdownGuide]]

## 2026-07-07 (7th Session)

- **[FEAT/UI/BUGFIX] 사이드바 로고 갱신, 푸터 및 ScrollToTop 버튼 탑재, 강좌 미리보기 오류 해결 및 폰트 변경 UI 기능 구현**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx)
    - [components/layout/ScrollToTop.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/ScrollToTop.tsx) (신규 생성)
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/layout.tsx)
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx)
    - [app/globals.css](file:///C:/Workspace/Projects/OpenTutorials/app/globals.css)
    - [app/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/layout.tsx)
    - [app/(user)/settings/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/layout.tsx)
    - [app/(user)/settings/ui/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/settings/ui/page.tsx) (신규 생성)
  - **작업 내용**:
    - **사이드바 로고 개선**: 좌측 상단 "Open Tutorials" 로고의 글자 크기를 `text-sm`으로 아담하게 줄이고, 앞에 로봇(`Bot`) 아이콘을 추가하여 AI 학습 튜터 브랜드 정체성을 시각적으로 강화했습니다.
    - **푸터(Footer) 추가**: 학습 화면을 제외한 전 영역에 마진(`mt-32`)을 넉넉히 준 미려하고 깔끔한 푸터를 탑재하여 서비스 개요 및 저작권 정보를 표시하도록 했습니다.
    - **ScrollToTop 플로팅 버튼**: 화면 우측 하단에 고정된 조그마한 스크롤 위로 가기 버튼을 탑재했습니다. 200px 이상 스크롤 시 부드럽게 페이드인되도록 설계했습니다.
    - **강좌 미리보기 오류 수정**: 이전 courses 테이블의 package 통합 스펙으로 인해 `course.courses`가 유실되어 미리보기가 작동하지 않던 버그를 해결했습니다. 패키지 자체의 `toc`를 검사하고 패키지 slug를 사용해 `/learn/${course.slug}?preview=true`로 정상 포워딩하고, 에이전트 매핑도 패키지 레벨의 `agent_id`로 교체했습니다.
    - **UI 글꼴 설정 메뉴 신규 추가**: 설정 하위 탭에 'UI 설정' 메뉴를 추가하고 기본(Geist) 및 구글 노토 산스(Noto Sans KR) 폰트를 토글할 수 있는 미려한 프리미엄 UI 카드를 구현했습니다.
    - **글꼴 변경 즉시 반영 및 FOUC 방지**: 사용자가 선택한 폰트를 LocalStorage에 저장하여 테마 변경을 즉시 반영토록 하였으며, `layout.tsx`에 FOUC(깜빡임) 방지 인라인 스크립트를 주입해 페이지 새로고침 시에도 자연스럽고 신속하게 선택된 폰트가 노출되도록 인프라를 완성했습니다.
  - **Concepts**: [[LogoImprovement]], [[GlobalFooter]], [[ResponsiveScrollToTop]], [[CoursePreviewFix]], [[FontPreferenceUI]], [[FoucPreventionScript]]

## 2026-07-07 (8th Session)

- **[BUGFIX/UI] 사이드바 접기 상태에서 로고(Bot 아이콘) 가려짐 현상 수정**
  - **수정 파일**:
    - [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutorials/components/layout/UserSidebar.tsx)
  - **작업 내용**:
    - **접기 시 로고 정렬 및 패딩 동적 처리**: 사이드바가 접혔을 때(`isCollapsed`) `SidebarHeader`의 padding을 `px-2`로 줄이고 `justify-center`로 설정하여, 좁아진 공간(3rem) 내에서 로고(`Bot` 아이콘)가 치우치거나 잘리는 현상을 해결했습니다. `Link` 컴포넌트의 flex alignment 역시 접힘 여부에 따라 `justify-center`와 `justify-start` to 스위칭하도록 변경했습니다.
    - **펼침 시 로고 수직 정렬 수정**: 사이드바의 기본 헤더 클래스(`flex-col`)가 `tailwind-merge` 적용 시 완전히 무시되지 않고 충돌을 일으켜 로고가 상단에 달라붙는 문제를, `SidebarHeader`에 명시적으로 `flex-row` 클래스를 추가하여 말끔히 정렬되도록 수정했습니다.
  - **Concepts**: [[SidebarCollapsedLogoFix]], [[DynamicLogoPadding]], [[SidebarExpandedLogoAlign]]

## 2026-07-07 (9th Session)

- **[BUGFIX/UI] 강좌 관리 화면 내 강좌 카드의 하위 강좌 개수 및 할당 에이전트 표시 버그 수정 및 상세 페이지 색상 통일**
  - **수정 파일**:
    - [app/(user)/courses/manage/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/manage/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
  - **작업 내용**:
    - **하위 강좌 개수 산출 방식 변경**: 기존 `courses` 테이블을 `course_packages`로 통합 및 일원화함에 따라 `course.courses`가 항상 빈 배열(`[]`)로 수신되던 구조적 문제를 해결하기 위해, 패키지 내 학습 카드의 메타데이터인 `course.cards` 배열의 크기(`course.cards?.length || 0`)를 기반으로 하위 강좌 개수가 표시되도록 변경했습니다.
    - **할당된 에이전트 표시 로직 현행화**: 하위 강좌별 에이전트 매핑 대신 통합된 강좌 패키지 수준의 `pkg.agent_id` 정보를 이용하도록 조회 로직을 변경했습니다. `agent_id`가 지정되어 있다면 해당 외부 에이전트명을 매핑해 반환하고, 지정되지 않았거나 유효하지 않다면 활성화된 기본 AI 튜터로 폴백되어 올바르게 에이전트명이 표출되도록 개선했습니다.
    - **미리보기 라우팅 정상화**: `courses` 유실로 인해 미리보기가 작동하지 않던 버그를 해결하고자, `/learn/${course.slug}?card=1&preview=true` 경로로 즉시 라우팅되도록 프리뷰 버튼 클릭 이벤트를 업데이트했습니다.
    - **강좌 상세 페이지 내 테마 색상 통일**: 강좌 상세 및 커리큘럼 화면에서 기존 혼재되어 사용되던 `emerald` 계열 테마 색상 및 일부 `green-500` 코드를 `green-700`으로 일관되게 변경하여 디자인 일관성을 높였으며, 완료 뱃지의 스타일을 차분한 `bg-zinc-400`으로 변경했습니다.
  - **Concepts**: [[CourseCardStatsFix]], [[PackageLevelAgentMapping]], [[PreviewRoutingNormalization]], [[DetailColorThemeUnification]]

## 2026-07-12 (10th Session)

- **[BUGFIX] 다국어(번역) 처리 관련 Next.js/React 18 Hydration Mismatch 오류 수정**
  - **수정 파일**:
    - [app/(user)/layout.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/layout.tsx)
  - **작업 내용**:
    - **Hydration Mismatch 근본 원인 픽스**: `LanguageProvider`의 다국어(localStorage 연동) 상태 업데이트 시점에 의해, `<Suspense>`로 래핑되어 지연 로딩/하이드레이션(Selective Hydration)되는 `UserSidebar` 및 `UserHeader` 컴포넌트에서 클라이언트 렌더링 결과(English)와 서버 pre-render 결과(Korean)가 불일치하여 발생하던 hydration mismatch 에러를 완전히 해결했습니다.
    - **비동기 컴포넌트 dynamic SSR 제어**: `app/(user)/layout.tsx`에서 `UserSidebar`와 `UserHeader` 컴포넌트를 `next/dynamic`을 통해 `ssr: false` 옵션으로 비동기 동적 임포트하도록 변경했습니다. 이를 통해 서버 pre-rendering 시점에 해당 컴포넌트들의 렌더링을 완전히 배제하고, 클라이언트 하이드레이션 완료 후에만 마운트되어 다국어 처리가 안전하게 적용되도록 조치했습니다.
  - **Concepts**: [[NextDynamicSSRDisable]], [[HydrationMismatchFix]], [[SelectiveHydrationSafety]]

## 2026-07-12 (11th Session)

- **[BUGFIX/DATA] 강좌 라이선스 오표기 수정 (All Rights Reserved -> CC-BY-NC-4.0 폴백 및 데이터 반영)**
  - **수정 파일**:
    - [db.json](file:///C:/Workspace/Projects/OpenTutorials/db.json)
    - [app/(user)/courses/page.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/page.tsx)
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
    - [app/api/courses/[slug]/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/[slug]/route.ts)
    - [app/api/admin/packages/upload/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/upload/route.ts)
    - [app/api/admin/packages/import-local/route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/admin/packages/import-local/route.ts)
  - **작업 내용**:
    - **라이선스 기본 폴백 변경**: 강좌 메타데이터에 라이선스가 지정되지 않았을 때의 기본 폴백 값을 기존 `all-rights-reserved`에서 실제 강좌들의 라이선스 조건인 `CC-BY-NC-4.0`으로 변경했습니다. 이는 강좌 목록 페이지(`page.tsx`), 강좌 상세 클라이언트(`client.tsx`), 강좌 업로드(`upload/route.ts`) 및 로컬 임포트(`import-local/route.ts`) API에 공통 적용되었습니다.
    - **하드코딩된 강좌 데이터 갱신**: 강좌 목록과 상세 페이지의 오프라인 fallback 데이터 구조(`OFFLINE_FALLBACK_COURSES`, `defaultCourses`) 내에 `license: "CC-BY-NC-4.0"` 과 `license_file: "LICENSE"` 메타데이터를 직접 주입했습니다.
    - **로컬 DB 갱신 및 중복 필드 픽스**: `db.json` 내의 로컬 강좌 패키지 데이터(`iot-communication` 및 `neutral-network-and-llm`)에 `"license": "CC-BY-NC-4.0"`과 `"license_file": "LICENSE"`를 추가했습니다. 특히, 기존 파일 맨 끝에 중복 정의되어 덮어쓰기를 유발하던 `"license": "all-rights-reserved"`와 `"license_file": null` 필드를 완전히 제거 및 교체하여, 로컬 데이터베이스 조회 시 라이선스가 정상 리턴되도록 버그를 최종 해결했습니다.
    - **동적 로컬 라이선스 파일 검증 및 공식 설명서 리다이렉트**: 강좌 번들 내에 실제 라이선스 파일이 서빙되고 있는지 서버 단([route.ts](file:///C:/Workspace/Projects/OpenTutorials/app/api/courses/[slug]/route.ts))에서 `fs.existsSync`를 이용해 판단하고, 그 결과를 `license_file_exists` 플래그로 응답하도록 조치했습니다. 클라이언트([client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx))에서는 이 플래그에 따라 파일이 존재하면 로컬 첨부파일로 바로 링크하고, 존재하지 않을 때만 크리에이티브 커먼즈(CC) 공식 약관 및 설명서 페이지로 리다이렉트하여 404 에러를 방지하면서도 첨부파일 우선 노출 요구사항을 모두 충족했습니다.
  - **Concepts**: [[CourseLicenseCorrection]], [[LicenseFallbackChange]], [[LocalDbLicenseUpdate]], [[DuplicateJsonFieldFix]], [[LicenseDocument404Fix]], [[CcLicenseRedirect]], [[DynamicLicenseFileCheck]]

## 2026-07-14 (12th Session)

- **[BUGFIX/UI] 강좌 커리큘럼에서 완료된 챕터(또는 단일 카드 챕터) unfold가 작동하지 않는 버그 수정**
  - **수정 파일**:
    - [app/(user)/courses/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutorials/app/(user)/courses/[slug]/client.tsx)
  - **작업 내용**:
    - **초기 상태 토글 오류 수정**: `expandedChapters`의 초기 상태가 `undefined`일 때 토글 함수 `toggleChapter`가 무조건 `false`로 설정하던 문제를 해결했습니다. `toggleChapter`가 컴포넌트 렌더링 시점에 연산된 현재 `isExpanded` 값을 매개변수로 직접 받도록 리팩토링하고, 클릭 시 해당 상태의 반대 값(`!currentExpanded`)으로 전환하게 함으로써 완료되었거나 단일 카드로 구성된 챕터를 클릭해도 정상적으로 접기/펼치기(fold/unfold)가 상호작용하도록 버그를 해결했습니다.
  - **Concepts**: [[CurriculumToggleFix]], [[UnfoldCompletedChapterFix]], [[ExpandedStateToggleCorrectness]]

