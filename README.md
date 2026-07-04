# PennyPress-FE (Frontend)

PennyPress는 AI Agent 기반 기능들을 사용자에게 제공하는 SaaS 서비스입니다. 
사용자는 제공되는 여러 AI 기능들을 둘러보고 구독하여 손쉽게 AI 자동화 작업을 수행할 수 있습니다. 
본 저장소는 Next.js (App Router), Tailwind CSS, Shadcn UI, Supabase 기반의 프론트엔드 서비스 프로젝트입니다.

---

## 📖 주요 문서 및 매뉴얼 (docs/)

프로젝트 기획 및 서버/인프라 설정에 관련된 상세 문서는 `docs/` 폴더에 정리되어 있습니다.
- [서비스 기획서 (PennyPress_Service_Plan.md)](./docs/PennyPress_Service_Plan.md)
- [데이터베이스 스키마 (DATABASE_SCHEMA.md)](./docs/DATABASE_SCHEMA.md)
- [Supabase 셋업 가이드 (SUPABASE_SETUP.md)](./docs/SUPABASE_SETUP.md)
- [Hermes AI Worker 가이드 (HERMES_GUIDE.md)](./docs/HERMES_GUIDE.md)
- [Windows/WSL2 개발 환경 설정 (INSTALL_WINDOWS_WSL2.md)](./docs/INSTALL_WINDOWS_WSL2.md)
- [실제 에르메스 에이전트 로컬 연동 (INSTALL_ACTUAL_HERMES_WSL2.md)](./docs/INSTALL_ACTUAL_HERMES_WSL2.md)
- [Tencent Cloud 배포 가이드 (HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md)](./docs/HOW_TO_DEPLOY_HERMES_TO_TENCENT_CLOUD.md)

---

## 🚀 로컬 개발환경 설정 방법

### 1. Supabase 프로젝트 준비
인증 및 데이터베이스 연동을 위해 Supabase 프로젝트가 필요합니다.
1. [Supabase](https://supabase.com)에 로그인 후 새로운 프로젝트를 생성합니다.
2. 대시보드 좌측 하단의 **Project Settings** -> **API** 메뉴에서 **Project URL**과 **Project API Keys (`anon` / `public`)** 값을 복사합니다.

### 2. 환경 변수 설정
프로젝트 루트 경로에 `.env.local` 파일을 생성(또는 `.env.example` 복사)하고 복사한 값들을 입력합니다.
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
ADMIN_EMAILS=admin@pennypress.com
```

### 3. 패키지 설치 및 실행 (Next.js)
Node.js(v18 이상 권장) 환경에서 패키지를 설치하고 서버를 실행합니다.
```bash
npm install
npm run dev
```

### 4. 접속 확인
- **사용자 포털**: [http://localhost:3000](http://localhost:3000)
- **관리자 포털**: [http://localhost:3000/admin](http://localhost:3000/admin) (`ADMIN_EMAILS`에 설정된 계정으로 로그인해야 접근 가능)

> **💡 AI Worker 로컬 실행 (Phase 2 테스트용)**
> 실제 AI 기능을 로컬에서 테스트하기 위해서는 `hydra-agent`나 `agent-worker` 디렉토리 내의 Python Worker 스크립트도 함께 구동되어야 합니다.

---

## 📁 폴더 구조 및 파일 역할

### 주요 폴더
- `app/`: Next.js App Router 구조. 페이지(UI), 레이아웃 라우팅 및 API 라우트 (SSE 실시간 통신 포함)가 위치합니다.
- `components/`: UI를 구성하는 재사용 가능한 컴포넌트 모음입니다. (Shadcn UI 기반)
- `lib/`: 공통 유틸리티 함수, Supabase 클라이언트 셋업, 타입 정의 및 Phase 1 확인용 더미 데이터가 포함되어 있습니다.
- `docs/`: 인프라, DB 스키마, 환경 설정, 아키텍처 등 프로젝트의 주요 문서들이 저장됩니다.
- `wiki/`: 프로젝트의 기술 스택 히스토리, 이슈 관리 등 AI Agent들이 사용하는 장기 기억/지식 베이스 폴더입니다.
- `hydra-agent/` & `agent-worker/`: 사용자 요청을 처리하는 실제 AI 기반 백그라운드 Worker 스크립트 및 설정이 위치합니다.
- `.playwright-mcp/`: 로컬 환경에서 E2E 테스트 혹은 AI 에이전트 브라우저 조작 과정에서 생성되는 임시 파일들이 저장되는 폴더입니다. **이 폴더는 Github 저장소에 올라가지 않도록 제외(.gitignore) 처리되어 있습니다.**

### 루트(Root) 파일
- `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`: AI Agent들이 코드를 작성할 때 참고해야 하는 코딩 규칙, 아키텍처 가이드라인이 담긴 문서들입니다.
- `DESIGN.md`: UI/UX 디자인 원칙, Shadcn/Tailwind CSS 적용 방식 등이 정의된 디자인 문서입니다.
- `middleware.ts`: 사용자의 로그인 상태를 확인하고 특히 관리자 페이지(`/admin`)의 접근 권한을 보호하는 미들웨어 파일입니다.
- `tailwind.config.ts`: Tailwind CSS 스타일 및 테마, 애니메이션 속성 등이 정의되어 있습니다.

---

## ☁️ 클라우드 및 외부 연동 인프라

- **Vercel (배포)**: Next.js 프론트엔드 프로젝트 및 서버리스 API Route 의 프로덕션 배포 환경을 제공합니다.
- **Supabase (Backend as a Service)**: 
  - `Auth`: 이메일 및 소셜 로그인 등 사용자 인증 처리
  - `Database`: PostgreSQL 기반의 DB 서비스로 사용자 정보, 기능(Feature), 구독 내역(Subscription) 등을 저장
  - `Storage`: 프로필 이미지 등 파일 스토리지 기능
- **Tencent Cloud / AI 인프라 (Phase 3)**: Vercel의 서버리스 타임아웃 한계를 극복하기 위해, 오래 걸리는 AI 작업(스크래핑, LLM 추론)을 전담하는 Hermes AI Worker 서버가 별도 인프라에 배포되어 실행됩니다.

---

## 🚀 프로젝트 사용 방법 및 구현 진행 상황

**사용 흐름:** 
1. 사용자가 서비스에 로그인하여 `/features`에서 제공되는 여러 AI 기능(예: 콘텐츠 모니터링)을 둘러봅니다.
2. 원하는 기능에 파라미터를 입력하고 구독(실행)합니다.
3. `/my-features` 대시보드에서 SSE를 통한 실시간 로그(스트리밍)를 통해 AI Agent 작업의 진행 상황을 모니터링할 수 있습니다.

**구현 단계 (Roadmap):**
- ✅ **Phase 1 (UI 로컬 구현 완료)**: 모든 라우팅, 컴포넌트, 화면 레이아웃 작성이 완료되었습니다. 더미 데이터를 통해 UI 동작을 확인할 수 있습니다.
- ✅ **Phase 2 (AI Agent 연동 완료)**: SSE(Server-Sent Events) 통신 환경 구축, Hermes Agent 연동 등 실시간 백엔드 연결 테스트가 로컬 환경에서 완료되었습니다.
- ⏳ **Phase 3 (클라우드 배포 예정)**: Vercel, Supabase Cloud 및 외부 클라우드로 서비스를 배포하고, Toss Payments 등을 연동하여 실제 상용 서비스(결제 및 구독) 단계로 진입할 예정입니다.
