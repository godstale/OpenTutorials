# Vercel Preview Deployment 환경에서 Google 로그인 requested path is invalid 에러 해결 가이드

본 문서는 Vercel의 PR Preview Deployment 도메인에서 Google 소셜 로그인 시도 시 `{"error":"requested path is invalid"}` 오류가 발생하며 로그인이 불가능했던 현상의 원인 분석 및 설정 해결 방법을 기술합니다.

---

## 🚨 1. 장애 현상 (Symptom)

- 코드를 수정하고 PR을 생성하면 Vercel Deployments를 통해 아래와 같은 임시 프리뷰 도메인이 생성됩니다.
  - `https://pennypress-git-fix-api-prerender-error-godstale-s-projects.vercel.app`
  - `https://pennypress-c85h6vci0-godstale-s-projects.vercel.app`
- 해당 프리뷰 도메인 페이지에서 Google 로그인을 시도할 시, 로그인 페이지로 안전하게 진입하거나 다시 페니프레스 페이지로 정상 리다이렉트되지 못하고 빈 화면에 아래 에러 메시지가 출력됩니다.
  
  ```json
  {"error":"requested path is invalid"}
  ```

---

## 🔍 2. 원인 분석 (Root Cause)

1. **동적 Redirect URL의 Supabase 검증 실패 (GoTrue API)**
   - [app/auth/login/page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/auth/login/page.tsx)에서 구글 로그인을 진행할 때 `redirectTo` 파라미터에 브라우저 기준 도메인(`window.location.origin/auth/callback`)을 동적으로 전달합니다.
   - Supabase Auth API(GoTrue)는 보안을 위해 요청받은 `redirectTo` URL이 **허용 목록(Redirect URLs)**에 포함되어 있는지 검증합니다.
   - 하지만 Vercel PR Preview Deployment 도메인은 동적으로 새롭게 생성되기 때문에 Supabase의 기본 허용 목록에 등록되어 있지 않습니다.
   - 이에 따라 Supabase Auth 서버는 리다이렉션을 거부하고 `requested path is invalid` 오류를 반환합니다.

2. **Google Cloud Console의 설정 역할**
   - 구글 로그인은 브라우저가 직접 Vercel Preview URL로 돌아오는 것이 아니라, **Google OAuth API -> Supabase Auth API -> Vercel Preview URL** 단계를 거칩니다.
   - 따라서 Google Cloud Console of 승인된 리디렉션 URI에는 Supabase API callback URL만 있으면 되며, Vercel Preview 도메인은 등록할 필요가 없습니다. 이 에러는 구글 콘솔이 아니라 **Supabase Dashboard의 Redirect URLs** 설정 누락이 유일한 원인입니다.

---

## 🛠️ 3. 해결을 위한 설정 가이드 (Solutions)

### 1) Supabase Dashboard 와일드카드 패턴 추가
Supabase 프로젝트 설정에 Vercel Preview 도메인을 유연하게 허용하도록 **와일드카드 기호(`*` 및 `**`)**를 사용하여 Redirect URLs를 등록해야 합니다.

1. **[Supabase Dashboard](https://supabase.com/dashboard) 로그인** 후 해당 프로젝트로 이동합니다.
2. 왼쪽 사이드바에서 **Authentication** > **URL Configuration** 메뉴로 진입합니다.
3. **Redirect URLs** 항목에서 **Add URL** 버튼을 클릭하여 아래 두 패턴을 차례대로 추가합니다.
   - `https://pennypress-*-godstale-s-projects.vercel.app/**` (프로젝트 Preview URL 패턴)
   - `https://pennypress-git-*.vercel.app/**` (Git 브랜치 기준 Preview URL 패턴)

> [!NOTE]
> Supabase는 glob 패턴 매칭을 지원하므로 `*`는 서브도메인이나 브랜치명 부분을 매칭하고, 맨 뒤의 `**`는 하위 경로(`/auth/callback?code=...` 등) 전체를 수용하게 해줍니다.

### 2) Google Cloud Console 검증 (필요시)
만약 계속해서 구글 로그인 연동이 정상 작동하지 않는다면 Google Console의 설정도 함께 체크합니다.

1. **[Google Cloud Console](https://console.cloud.google.com/)** > **API 및 서비스** > **사용자 인증 정보**로 이동합니다.
2. 프로젝트의 OAuth 2.0 클라이언트 ID 설정으로 진입합니다.
3. **승인된 리디렉션 URI**에 다음 Supabase Callback 주소가 정확히 등록되어 있는지 확인합니다.
   - `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`

---

## 💡 4. 향후 예방 지침 (Prevention & Best Practices)

- **프리뷰 도메인 패턴 통일**: Vercel의 프로젝트 설정이나 Supabase Redirect URLs 설정을 주기적으로 점검하여, 새로운 서브도메인 구조나 Vercel 프로젝트 팀 변경 시 와일드카드 주소도 함께 업데이트해주어야 로그인 실패를 미리 예방할 수 있습니다.
- **로컬 개발 환경(localhost)**: 로컬 개발 시에는 `http://localhost:3000/**` 또한 Supabase Redirect URLs에 항상 포함되어 있어야 안전한 로그인 개발이 가능합니다.
