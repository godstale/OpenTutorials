# PennyPress 서비스 기획서

**Source:** `docs/PennyPress_Service_Plan.md`
**Ingested:** 2026-06-12
**Entities:** [[PennyPress]], [[HermesAgent]]
**Concepts:** [[ContentMonitoring]], [[AIAgentWorker]], [[PointSystem]]

---

## 서비스 개요

PennyPress는 AI Agent 기능들을 사용자에게 소개하고, 사용자의 프롬프트와 결합해 사용할 수 있도록 돕는 서비스. 전통적인 FE/BE/DB 구조에 Agent Worker 서버를 추가. 과금은 AI Agent 사용량과 연계.

**첫 번째 기능:** 컨텐츠 모니터링 (URL + 요청사항 입력 → 주기적 모니터링 → Slack/Telegram/Email 알림)

## 아키텍처

- **FE:** Next.js + TypeScript + Tailwind + Shadcn (Vercel)
- **BE/DB:** Supabase (Serverless)
- **AI Agent:** Tencent Cloud + Hermes Agent (https://github.com/nousresearch/hermes-agent)
- **실시간:** SSE (Server-Sent Events)

## 화면 구성 (사용자)

1. **Intro (랜딩)**: 비로그인 접근 가능. Google/SNS 로그인.
2. **대시보드**: 즐겨찾기, 구독 기능 목록, 사용 현황, 추천 기능, TAG 리스트
3. **기능 검색**: 검색 패널, 검색 결과 카드, 기능 상세 팝업
   - 팝업 내용: 기능명, 설명, 좋아요, 동작 유형, **가격 정보, 사용 예시/미리보기, 구독/사용 버튼, 파라미터 입력 폼**
4. **기능 사용 현황**: 구독 기능 목록 카드
5. **결제 및 요금제**: 구독 플랜, 사용량 기반, 결제 수단 관리
6. **설정**: 프로필 (이미지, 닉네임, 이메일)

## 화면 구성 (Admin)

1. **Admin 로그인**: 별도 접근 제어
2. **Admin 대시보드**: DAU/MAU, 결제 건수/매출액
3. **기능 관리**: 기능 리스트, 추가/상세 팝업
4. **사용자 관리**: 사용자 리스트, 상세 팝업 (약관 동의 등)
5. **AI 에이전트 관리**: Worker 인스턴스 리스트, 상태/제어, Gateway 관리
6. **결제 관리**: 결제 내역, 환불 처리, 가격 설정
7. **Admin 설정**: 세부 기능 설정

## 비즈니스 로직

### 과금 모델
| 모델 | 설명 |
|------|------|
| 포인트 구매 | 기능 사용할 때마다 포인트 차감 (1포인트 = 1원) |
| 구독 | 기간 내 사용, AI 토큰 제한 있음 |

### 인증 구조
- 사용자: 기본 역할
- Admin: 특정 이메일 주소 지정

### 포털 구조 (결정됨: 동일 앱, Route Group)
- `(user)` route group → pennypress.com
- `(admin)` route group → admin.pennypress.com

## 구현 단계

- **Phase 1:** FE/BE/DB 로컬 구현. 더미 데이터. 결제/AI 제외.
- **Phase 2:** Hermes Agent 연동, SSE 실시간 통신, 로컬 stage 테스트.
- **Phase 3:** Vercel/Supabase/Tencent Cloud 배포, TossPayments, 알림 시스템.

## 기술 스택 결정 사항

- **Admin 구조**: 동일 Next.js 앱, `/app/(admin)/` Route Group (2026-06-12 확정)
- **Hermes Agent**: https://github.com/nousresearch/hermes-agent 오픈소스 기반
- **Phase 1 구현 순서**: 로그인 → 대시보드 → 기능검색 순
