# Iframe Security Trilemma

## 개요
외부 웹 애플리케이션의 대시보드를 iframe으로 서비스(SaaS) 내에 안전하게 임베딩할 때 발생하는 보안 아키텍처의 한계를 설명하는 개념입니다.

## 3요소 (Trilemma)
최신 브라우저 정책 하에서는 다음 세 가지 조건을 동시에 만족할 수 없습니다.

1. **강력한 인증(Authentication):** 접근을 제어하기 위해 쿠키(Cookie)나 기본 인증(Basic Auth)이 필요.
2. **타 도메인(Cross-Origin) iframe:** 서비스 도메인과 대시보드 서버 도메인(IP)이 다름.
3. **HTTP 통신 (HTTPS 미적용):** SSL 인증서 없이 평문 통신.

### 왜 불가능한가?
- **Basic Auth + iframe:** 브라우저가 피싱 방지를 위해 Cross-Origin iframe 내부에서는 ID/PW 입력 프롬프트를 띄우지 않거나 렌더링을 차단합니다.
- **쿠키 + iframe:** Cross-Origin iframe 간 쿠키(Third-Party Cookie)를 전송하려면 반드시 `SameSite=None` 및 `Secure` 속성이 필요하며, `Secure` 속성은 **HTTPS 환경에서만 동작**합니다.

## 해결 방법의 선택
이 한계를 극복하려면 반드시 하나의 조건을 포기해야 합니다.

1. **iframe 포기 (Basic Auth 유지):** 가장 안전한 차선책. 대시보드를 iframe 대신 `[새 창에서 열기]` 버튼으로 제공하여 브라우저의 프롬프트 차단을 우회합니다.
2. **HTTP 포기 (HTTPS 필수 적용):** 가장 이상적인 방법. 대상 서버에 HTTPS를 적용하여 보안 쿠키 전달을 가능하게 만듭니다.
3. **강력한 인증 포기 (Referer 검증 등 우회책):** HTTP Referer 헤더를 검사하여 특정 도메인에서의 iframe 로드만 허용합니다. 사용성은 뛰어나지만, 해커가 HTTP 헤더를 쉽게 위조할 수 있어 보안성이 매우 낮습니다(Security by Obscurity).
