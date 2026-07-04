# Hermes Agent Security Architecture

## 개요
PennyPress와 외부 연동되는 Hermes Agent(Tencent Cloud 호스팅) 간의 통신 아키텍처 및 보안 한계점에 대한 기록입니다. 향후 완전한 보안 적용(HTTPS 도입)을 위한 레퍼런스로 활용됩니다.

## 1. 아키텍처 (Vercel Proxy)
- 대화(채팅) 트래픽은 사용자의 브라우저에서 직접 Tencent 서버로 가지 않고, **Vercel 서버 (Next.js API Route)를 경유(Proxy)**합니다.
- `app/api/external-agents/[id]/chat/route.ts` 에서 백엔드가 DB에 저장된 `API_SERVER_KEY`를 HTTP `Authorization: Bearer` 헤더로 실어서 Tencent 에이전트로 전송합니다.
- 장점: 브라우저에 Tencent 서버 IP와 API 인증키가 노출되지 않음.
- 취약점: Vercel과 Tencent 서버 간 통신이 `http://` 기반이므로, 패킷 감청(MitM) 공격에 취약함. (향후 HTTPS 적용 필요)

## 2. 대시보드 보안과 iframe 트릴레마 (구조적 한계)
에이전트 관리용 Hermes Dashboard (Web UI)를 페니프레스 웹(`AgentKanbanTab.tsx`)에 `<iframe>`으로 임베딩할 때 발생하는 인증 문제입니다.

최신 웹 보안(Chrome, Safari 등) 정책상 다음 3가지를 동시에 만족시킬 수 없습니다.
1. **강력한 인증 (Basic Auth 또는 쿠키)**
2. **타 도메인(Cross-Origin) iframe 임베딩**
3. **HTTP 통신 (HTTPS 미적용)**

### 대안 비교
- **Nginx Basic Auth**: 타 도메인 iframe에서는 브라우저가 로그인 프롬프트를 차단함. 새 창에서만 정상 동작.
- **Nginx Referer 검증**: `valid_referers ~\.pennypress\.com` 으로 iframe을 허용하는 방법. iframe에서 잘 작동하지만 해커가 `curl -H "Referer: pennypress.com"` 로 쉽게 우회할 수 있어 보안상 매우 취약함 (Security by Obscurity).
- **인증 쿠키 (SameSite=None)**: 완벽한 보안과 iframe 임베딩을 모두 지원하지만, 반드시 **HTTPS** 환경에서만 쿠키가 생성됨.

## 3. 임시 결론 및 향후 계획
현재 HTTPS 인증서가 없는 상태에서 완벽한 보안을 유지하려면, **Nginx Basic Auth(기본 인증)를 설정하고 페니프레스의 iframe 표시를 포기하여 [새 창에서 열기] 전용으로 운영**하는 것이 가장 안전합니다.

**향후 개선 과제:**
1. Tencent 서버에 무료 도메인 연결 및 Let's Encrypt를 통해 HTTPS 설정.
2. Vercel에서 쿠키 기반 또는 안전한 Token 프록싱 방식으로 iframe 내부 대시보드 표시 복구.
