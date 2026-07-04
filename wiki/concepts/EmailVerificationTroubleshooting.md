# Email Verification Troubleshooting Guide (이메일 인증 장애 해결 가이드)

본 문서는 PennyPress FE 서비스에서 회원가입 후 발송되는 인증 이메일의 URL이 `http://localhost:3000/?code=...` 로 설정되어 이메일 인증이 불가능했던 현상에 대한 디버깅 과정과 해결책을 기록한 기술 트러블슈팅 문서입니다.

---

## 🚨 1. 장애 현상 (Symptom)
- Vercel에 배포된 환경에서 회원가입을 수행할 경우, 발송되는 인증 이메일의 확인(Confirm) 링크가 배포 주소가 아닌 로컬 환경 주소(`http://localhost:3000/?code=...`)를 가리킴.
- 사용자가 해당 링크를 클릭할 경우 존재하지 않는 로컬 주소로 리다이렉트되어 인증 처리가 불가능함.

---

## 🔍 2. 디버깅 및 분석 과정 (Troubleshooting Steps & Findings)

### 원인 1: Supabase 대시보드 Redirect URLs 미설정으로 인한 Fallback
- `components/sign-up-form.tsx` 내부에서는 정상적으로 `emailRedirectTo: \`\${window.location.origin}\${ROUTES.DASHBOARD}\`` 를 사용하여 Vercel 도메인을 전달하고 있었음.
- 그러나 해당 Vercel 배포 도메인이 Supabase 프로젝트 설정의 **Redirect URLs** 허용 목록에 등록되어 있지 않았음.
- Supabase Auth는 보안 정책 상 허용 목록에 없는 URL 요청이 들어오면 이를 무시하고, 프로젝트의 기본 설정인 **Site URL** (`http://localhost:3000`)로 강제 폴백(Fallback)시킴.

### 원인 2: PKCE Code 교환을 위한 Callback 라우트 부재
- Supabase의 기본 이메일 템플릿(`{{ .ConfirmationURL }}`)은 인증 성공 시 `redirect_to` 주소 뒤에 PKCE 인증 코드(`?code=...`)를 붙여서 리다이렉트함.
- 기존 코드베이스에는 `token_hash` 기반의 인증을 처리하는 `/auth/confirm` 라우트만 존재했고, URL 쿼리로 전달되는 `code`를 세션으로 교환(`exchangeCodeForSession`)해 줄 `/auth/callback` 서버 측 라우트 핸들러가 누락되어 있었음.

---

## 🛠️ 3. 해결책 및 적용 사항 (Solutions Applied)

### 1) Auth Callback 라우트 신규 생성
- **파일**: `app/auth/callback/route.ts` 신규 생성
- **내용**: URL 파라미터로 전달된 `code`를 읽어와 `supabase.auth.exchangeCodeForSession(code)`를 호출, 서버 사이드 세션을 안전하게 확립한 뒤 지정된 `next` 라우트로 리다이렉트 처리함.

### 2) 회원가입 폼 리다이렉트 경로 변경
- **파일**: `components/sign-up-form.tsx`
- **내용**: `emailRedirectTo`를 단순 `/dashboard`가 아닌 `/auth/callback?next=/dashboard`로 변경하여, 인증 코드가 정상적으로 서버측 Callback 라우트를 거치도록 수정.

### 3) Supabase Dashboard 환경 설정 안내 (사용자 조치)
- **조치 필요 사항**: 사용자가 직접 Supabase Dashboard의 `Authentication > URL Configuration` 메뉴에 접근하여, 배포된 Vercel 도메인(`https://*.vercel.app/**` 등)을 **Redirect URLs**에 추가하도록 가이드함.

---

## 💡 4. 향후 예방 지침 (Prevention & Best Practices)
1. **배포 환경 URL 화이트리스트 관리**: 새로운 프론트엔드 도메인이나 프리뷰 도메인이 생성될 때마다 반드시 Supabase Dashboard의 Redirect URLs를 최신화하는 프로세스 확립.
2. **PKCE Flow 완결성 유지**: Next.js App Router + Supabase SSR 환경에서는 반드시 `exchangeCodeForSession` 역할을 수행하는 콜백 API 라우트를 구비하여, 클라이언트 노출 없이 서버 측 쿠키를 안전하게 세팅해야 함.
