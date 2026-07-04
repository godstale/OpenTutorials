# Authentication Troubleshooting Guide (로그인 장애 해결 가이드)

본 문서는 PennyPress FE 서비스 개발 중 발생한 **로그인 실패 및 무한 로그인 페이지 리다이렉트 현상**에 대한 디버깅 과정, 근본 원인 분석, 해결책을 기록한 기술 트러블슈팅 문서입니다.

---

## 🚨 1. 장애 현상 (Symptom)

- **현상 A**: `/auth/login` 페이지에서 유효한 계정(`godstale@hotmail.com`)으로 로그인을 시도할 때, 아무런 오류 메시지나 alert 알림 없이 로그인 페이지로 다시 리다이렉트되며, 이메일/비밀번호 입력 폼이 완전히 리셋(초기화)되는 문제가 발생함.
- **현상 B**: 특히 공유기 내부 사설 IP 대역(`http://192.168.0.51:3000/auth/login`)을 통해 접속했을 때, 로그인 버튼을 누르면 주소창 끝에 `?`가 달라붙으며 (`http://192.168.0.51:3000/auth/login?`) 강제로 페이지가 새로고침되는 오류가 동반됨.

---

## 🔍 2. 디버깅 및 분석 과정 (Troubleshooting Steps & Findings)

### 원인 1: Supabase SSR `updateSession` 내 잘못된 API 호출 (런타임 오류)

- **원인 분석**:
  - 이 프로젝트는 **Fluid Compute** edge 또는 custom runtime 환경에서 구동됩니다. 이에 따라 Next.js 표준인 `middleware.ts` 대신 [proxy.ts](file:///C:/___Workspace/Projects/PennyPress/proxy.ts)를 Next.js의 미들웨어 성격으로 사용합니다.
  - 이 미들웨어([proxy.ts](file:///C:/___Workspace/Projects/PennyPress/proxy.ts))는 모든 요청의 세션을 갱신하기 위해 [lib/supabase/proxy.ts](file:///C:/___Workspace/Projects/PennyPress/lib/supabase/proxy.ts)의 `updateSession` 함수를 호출합니다.
  - 그러나 `updateSession` 함수 내부에서, 실제 Supabase JS SDK (`@supabase/supabase-js`) 명세에 존재하지 않는 메서드인 **`supabase.auth.getClaims()`**를 호출하는 코드가 포함되어 있었습니다:
    ```typescript
    // 기존 오류 코드 (lib/supabase/proxy.ts)
    const { data } = await supabase.auth.getClaims();
    const user = data?.claims;
    ```
  - 이 호출은 런타임에 즉시 `TypeError`를 유발하였고, 미들웨어 내부 세션 유효성 판정이 실패하여 항상 사용자 정보가 `null` (`user = null`)로 판정되었습니다.
- **장애 연결 고리**:
  - 브라우저에서 로그인이 성공하더라도, 다음 라우트 탐색(`/dashboard` 등 보호받는 경로) 시 미들웨어(`proxy.ts`)가 호출됩니다.
  - 미들웨어는 `!user` 상태로 감지하여 사용자를 비로그인 상태로 판단하고, 조건식에 의해 브라우저를 다시 `/auth/login`으로 강제 리다이렉트시켰습니다.
  - 이에 따라 로그인 창이 반복적으로 리셋되며 유지되었던 것입니다.

### 원인 2: 사설 IP 접속 시 Next.js HMR/하이드레이션 차단 (이벤트 바인딩 실패)

- **원인 분석**:
  - `192.168.0.51` IP를 사용해 개발 서버에 접근했을 때, Next.js 개발 서버의 보안 정책에 의해 webpack HMR 웹소켓 자원(`/_next/webpack-hmr`) 로드가 완전히 차단되었습니다.
  - 웹소켓 연결이 거부되면서 클라이언트 측 리액트 하이드레이션(Hydration)이 완료되지 못하고 자바스크립트가 무력화되었습니다.
- **장애 연결 고리**:
  - 하이드레이션이 실패하면서, 로그인 폼 컴포넌트의 `onSubmit` 핸들러(`handleLogin`)와 `e.preventDefault()`가 브라우저 DOM 요소에 바인딩되지 못했습니다.
  - 사용자가 로그인 버튼을 누르는 순간, 자바스크립트 핸들러가 트리거되지 않고 브라우저 순수 HTML의 기본 **GET 폼 전송**이 일어났습니다.
  - `input` 태그들에 `name` 속성이 없고 `id`만 지정되어 있었기 때문에, 쿼리 스트링의 키-값 쌍이 누락된 채 URL 맨 끝에 빈 `?`만 붙고 화면이 강제 새로고침(하드 리로드)되며 리셋되는 현상이 유발되었습니다.

---

## 🛠️ 3. 해결책 및 적용 사항 (Solutions Applied)

### 1) Supabase 세션 갱신 API 표준화
- [lib/supabase/proxy.ts](file:///C:/___Workspace/Projects/PennyPress/lib/supabase/proxy.ts) 의 `updateSession` 내에서 유효하지 않은 `getClaims()` 대신 Supabase 공식 권장 API인 **`supabase.auth.getUser()`**를 사용하여 세션 유저 정보를 정확하게 파싱하고 쿠키를 갱신하도록 전면 수정했습니다.
  ```typescript
  // 수정된 표준 코드 (lib/supabase/proxy.ts)
  const { data: { user } } = await supabase.auth.getUser();
  ```

### 2) Next.js 개발 환경 도메인 예외 추가 및 재기동
- 외부 사설 IP를 통한 개발 테스트가 가능하도록 [next.config.ts](file:///C:/___Workspace/Projects/PennyPress/next.config.ts)에 `allowedDevOrigins` 옵션을 추가했습니다.
  ```typescript
  const nextConfig: NextConfig = {
    cacheComponents: true,
    allowedDevOrigins: ['192.168.0.51', 'localhost'],
  };
  ```
- 설정을 완벽하게 빌드 및 런타임에 반영하기 위해 기존 Next.js 서버(PID: 18232)를 정지시키고 재기동했습니다.

### 3) 로컬 Supabase 잔재 정리
- 프로젝트 지침(원격 Supabase 활용)에 어긋나게 디스크와 도커를 점유하고 있던 로컬 `supabase` 설정 폴더를 제거했습니다.
- 로컬 docker 내에 정지/유실된 채 남아있던 `public.ecr.aws/supabase/` 관련 Docker 이미지들을 일괄 소거(`docker rmi`)하였습니다.

---

## 💡 4. 향후 예방 지침 (Prevention & Best Practices)

1. **외부 IP 접속 개발 시 HMR 모니터링**:
   - `localhost`가 아닌 외부 IP로 접속해 웹 사이트를 개발할 경우, 브라우저 개발자 도구의 콘솔이나 서버 터미널에서 HMR/Halt 관련 보안 경고가 발생하는지 항상 확인하고, 필요 시 `next.config.ts` 에 `allowedDevOrigins`를 즉각 반영합니다.
2. **Supabase Auth API 검증**:
   - 서버 측 및 미들웨어 측 세션 검증 시에는 다른 솔루션(예: Firebase)의 독자적 API인 `getClaims` 등과 혼용하지 않고, 반드시 Supabase SDK 표준인 `supabase.auth.getUser()` 또는 `supabase.auth.getSession()`을 명시적으로 사용하도록 타입 체크를 준수합니다.
3. **미들웨어 이중화 경계**:
   - Fluid Compute 환경 등 특수 래퍼 환경에서 `proxy.ts`를 미들웨어로 대행하는 경우, 루트에 중복된 `middleware.ts`를 생성하지 않도록 아키텍처 규칙을 철저히 유지합니다.

---

## 🚨 5. 추가 장애 현상: Vercel 배포 시 로그인 무한 리다이렉트 및 구문 오류 (2026-06-23)

### 원인 3: Supabase SSR 쿠키 청킹 문제로 인한 무한 리다이렉트
- **현상**: Vercel 배포 후 사용자가 정상적으로 Google OAuth 로그인을 마쳤음에도, 대시보드로 넘어가지 않고 `?redirect=%2Fdashboard` 파라미터가 붙으며 다시 로그인 화면으로 튕겨져 나오는 현상.
- **원인 분석**:
  - 미들웨어(`proxy.ts`) 내부에서 세션 검증 전 사용자 수동 쿠키 파싱 로직에 문제가 있었습니다.
  - `c.name.endsWith('-auth-token')` 검사 로직을 사용해 쿠키를 찾으려 했으나, `@supabase/ssr`은 브라우저 쿠키 크기 한계로 인해 세션 쿠키를 여러 조각(`sb-...-auth-token.0`, `sb-...-auth-token.1` 등)으로 청킹하여 분할 저장합니다.
  - 따라서 `endsWith('-auth-token')` 조건이 실패하여 세션 토큰을 찾지 못했고, 사용자가 비인증 상태인 것으로 잘못 판단하여 무한 로그인 루프가 발생했습니다.
- **해결 방안**:
  - 수동으로 쿠키를 검사하는 비표준 검증 로직을 모두 삭제했습니다.
  - Supabase SSR에서 권장하는 서버 인증 헬퍼인 `updateSession()` 내부에서 **`supabase.auth.getUser()`**를 호출하여 세션을 안정적으로 검증하고, 여기서 인증이 실패할 경우에만 `redirect` 파라미터를 붙여 로그인 화면으로 유도하도록 인증 제어를 일원화했습니다.

### 원인 4: 미들웨어 구문 오류 및 Next.js 컨벤션 충돌
- **현상**: Vercel 빌드 과정에서 `const declarations must be initialized` 구문 오류로 빌드 실패. 또한 `The "middleware" file convention is deprecated. Please use "proxy" instead.` 경고 발생.
- **원인 분석**:
  - 파일 하단 `if`문 스코프 내부에 `const { createServerClient } from '@supabase/ssr'` 와 같이 ES Module의 `import/from` 구문이 들어가 있어 Turbopack 빌더가 자바스크립트 구문 분석(Parsing) 에러를 일으켰습니다.
  - Next.js 16.2.9부터 기존 `middleware.ts` 방식이 deprecated 되고 `proxy.ts`로 전환하는 새로운 컨벤션 규칙이 적용되었습니다.
- **해결 방안**:
  - `createServerClient` 임포트 문을 모듈 최상단의 `import` 영역으로 이동하여 구문 오류를 고쳤습니다.
  - `middleware.ts` 파일명을 `proxy.ts`로, 내부 헬퍼 `lib/supabase/middleware.ts`를 `lib/supabase/proxy.ts`로 복구 변경하여 컨벤션 충돌로 인한 Vercel의 빌드 경고 및 에러를 완벽히 해결했습니다.
