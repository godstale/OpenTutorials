# PennyPress 로그인 무한 리다이렉트 루프 및 Vercel 배포 오류 해결

이 문서는 Phase 3 Vercel 배포 환경에서 발생한 Google OAuth 로그인 이후의 무한 리다이렉트 현상과, 이후 이어진 Vercel 빌드 오류(미들웨어 파일명 및 구문 에러)에 대한 트러블슈팅과 조치 내용을 기록합니다.

## 1. 로그인 무한 리다이렉트 현상 및 원인

### 문제 증상
- 사용자가 `/auth/login`에서 Google 로그인을 완료하면, 브라우저가 대시보드로 이동하려다 다시 로그인 화면으로 튕겨 나옵니다.
- 이때 주소창은 `https://pennypress-one.vercel.app/auth/login?redirect=%2Fdashboard`와 같이 `?redirect` 파라미터가 추가되어 있습니다.

### 원인 파악
1. **잘못된 쿠키 파싱 로직**: 미들웨어(`middleware.ts`, 또는 이전의 `proxy.ts`) 내부에서 사용자의 인증 여부를 확인하기 위해 수동으로 Supabase 쿠키를 조회하는 코드가 있었습니다.
   ```typescript
   const sessionCookie = request.cookies.get('sb-access-token') ??
     request.cookies.getAll().find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
   ```
2. **Supabase SSR 쿠키 청킹 문제**: `@supabase/ssr` 라이브러리는 브라우저 쿠키 크기 제한을 피하기 위해 세션 데이터를 여러 청크(예: `sb-xxxxx-auth-token.0`, `sb-xxxxx-auth-token.1`)로 분할하여 저장합니다.
3. 이로 인해 `c.name.endsWith('-auth-token')` 검사가 항상 `false`를 반환하였고, 사용자가 정상적으로 로그인했음에도 미들웨어가 쿠키를 인식하지 못해 `!sessionCookie` 조건에 걸려 강제로 로그인 화면으로 튕겨내는 문제가 발생했습니다.

### 조치 내용
- 미들웨어 파일 내에 존재하던 잘못된 중복 쿠키 검증 로직(`sessionCookie` 관련 수동 체크 및 강제 리다이렉트 코드)을 완전히 삭제했습니다.
- 대신 Supabase SSR에서 권장하는 서버 인증 헬퍼인 `updateSession()` 내부의 `supabase.auth.getUser()`가 직접 인증 정보를 검증하고, 유효하지 않은 경우에만 리다이렉트를 처리하도록 로직을 일원화했습니다.
- `updateSession()` 내에서 인증되지 않은 사용자를 리다이렉트 할 때 원래 가려던 목적지를 보존하기 위해 `?redirect=...` 쿼리 파라미터를 추가하도록 보강했습니다.

## 2. Vercel 빌드 오류 및 Next.js 미들웨어 대응

### 문제 증상
무한 리다이렉트 문제를 수정하고 배포하는 과정에서 Vercel 빌드 중 아래와 같은 컴파일 에러와 경고가 발생했습니다.
- **오류 (Error)**: `'const' declarations must be initialized`
- **경고 (Warning)**: `The "middleware" file convention is deprecated. Please use "proxy" instead.`

### 원인 파악 및 조치
1. **구문 오류 (Syntax Error)**:
   미들웨어 함수 블록 내부의 `if`문 안에 `const { createServerClient } from '@supabase/ssr';` 와 같이 ES Module의 `import/from` 구문이 잘못 배치되어 있었습니다.
   **조치**: `import` 구문을 파일 최상단으로 옮겨 올바른 문법을 따르도록 수정했습니다.

2. **Next.js 16 미들웨어 컨벤션 변경 대응**:
   최신 Next.js 버전(16.2.9)에서는 기존의 `middleware.ts` 파일명이 deprecated(사용 중단 권고)되었으며, 대신 `proxy.ts`로 이름을 변경할 것을 요구하고 있습니다.
   **조치**: 프로젝트 최상단의 `middleware.ts` 파일을 다시 `proxy.ts`로 변경하고, 내부에서 호출하는 함수 이름도 `export async function proxy`로 맞추었습니다. 또한 내부적으로 사용되는 헬퍼 파일명도 일관성을 위해 `lib/supabase/proxy.ts`로 다시 변경했습니다.

## 3. 결과 요약
- Vercel에서의 빌드(`pnpm run build`)가 정상적으로 통과되며 Syntax 오류가 해결되었습니다.
- 사용자는 정상적으로 Google OAuth를 통해 로그인한 후 무한 루프 없이 대시보드 화면(`/dashboard`)으로 진입할 수 있게 되었습니다.
