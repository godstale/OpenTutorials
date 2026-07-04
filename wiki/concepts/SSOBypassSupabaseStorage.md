# SSOBypassSupabaseStorage (Supabase Storage를 통한 Vercel SSO 우회)

## 정의
Vercel SSO(배포 보호/Deployment Protection)가 설정된 웹 애플리케이션 환경에서 외부 에이전트(AI Tutor 등)가 리소스 다운로드 API에 직접 접근하지 못하는 보안 제약을 극복하기 위해, 해당 리소스를 Supabase Storage(Public 또는 Signed URL을 지원하는 객체 스토리지)에 컴파일 및 업로드하여 외부 도메인(`*.supabase.co`) 우회 경로로 리소스의 읽기 전용 URL을 제공하는 아키텍처 패턴입니다.

## 등장 배경
Vercel Preview Deployment 환경 및 Enterprise 배포 시, Vercel SSO를 활성화하면 외부 AI Worker 및 외부 알림 봇 등 세션 쿠키가 없는 외부 클라이언트가 `/api/courses/[slug]/resource`와 같은 호스트 API 호출 시 인증 페이지로 리다이렉트되어 302 Redirect 또는 401 Unauthorized 에러를 받게 됩니다.
보안 설정을 완전히 비활성화하지 않고 외부 튜터가 리소스 데이터를 정상적으로 파싱할 수 있게 하기 위해, 인증 장벽이 없는 별도의 Supabase Cloud Storage 영역을 우회 경로로 사용합니다.

## 아키텍처 및 구현 방식
1. **Next.js API Route에서의 컴파일 및 업로드**:
   - `/api/courses/[slug]/resource?json=true` 호출 시, 전체 강좌 카드와 설정을 기반으로 단일 Markdown 파일(`resource.md`)을 실시간 병합/컴파일합니다.
   - Supabase Admin Client (`SUPABASE_SERVICE_ROLE_KEY`) 권한을 사용해 `courses` 버킷의 `${slug}/resource.md` 경로로 업로드(`upsert: true`)합니다.
   - 업로드 완료 후, 7일 동안 유효한 `createSignedUrl`을 생성하여 클라이언트에 `{ url: signedUrl }` 형태로 반환합니다.
2. **클라이언트 동적 URL 바인딩**:
   - 학습화면 컴포넌트([client.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/(user)/learn/[slug]/client.tsx)) 마운트 단계에서 이 우회 URL을 동적으로 fetch 해둡니다.
   - AI 튜터에게 질문을 전송하는 시점에, `systemPrompt` 내 `resourceUrl` 바인딩 자리에 해당 signed URL을 동적으로 주입합니다.
3. **이중화 Fallback (Inline ToC)**:
   - 만약 Supabase Storage 연동에 실패하거나 로컬 더미 데이터 환경인 경우, 리소스 주소는 기존 Vercel Host API 주소로 자동 대체되며, 세션의 첫 질문 시점에 클라이언트가 보유한 강좌 목차(ToC) 데이터를 프롬프트 내에 직접 인라인 텍스트로 보조 전송하여 AI 튜터가 강좌의 뼈대를 이해할 수 있도록 안전장치를 제공합니다.

## 장점
- **보안성 유지**: Vercel SSO 설정을 끄거나 비활성화하지 않고 우회할 수 있어 기밀성을 유지합니다.
- **민감정보 보호**: 사용자 API 키나 결제 정보 등 중요 데이터는 스토리지 URL에 전혀 노출되지 않고, 강좌의 공개 학습용 텍스트 리소스만 정제되어 전송됩니다.
- **하위 호환성**: JSON 응답 방식을 요청 쿼리(`?json=true`)로 나누어 처리하여, 기존의 텍스트 다운로드 도구와의 연동성을 깨뜨리지 않습니다.
