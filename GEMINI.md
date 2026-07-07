# Open Tutorials FE — AI Tutor Guide

> **Sync:** CLAUDE.md, GEMINI.md, AGENTS.md 는 동일한 내용을 유지합니다. 변경 시 세 파일 모두 업데이트하세요.

---

## 프로젝트 개요

Open Tutorials는 로컬 환경에서 AI 튜터와 함께 학습하고 강의(Course) 콘텐츠를 업로드 및 관리할 수 있는 데스크탑 친화적 로컬 애플리케이션 플랫폼입니다.
- 기존의 클라우드(Vercel/Supabase) 및 SaaS 호스팅 요금제 모델을 완전히 걷어내고, **데스크탑에서 직접 실행하고 로컬 파일 시스템(`db.json` 및 `public/courses/`)을 활용**하는 온디바이스형 도구로 전환되었습니다.
- **핵심 서비스**:
  - 1. **학습 콘텐츠 수강 및 진행률 관리**: 다양한 강좌 패키지를 다운로드/업로드하여 로컬 카드 형식으로 학습하고 진행률을 자동 저장합니다.
  - 2. **강좌 관리 및 업로드**: 사용자가 직접 zip 번들 형식의 강의 매니페스트와 콘텐츠 카드를 업로드하여 강좌 데이터베이스를 로컬로 구축할 수 있습니다.
  - 3. **로컬 에이전트 및 AI 튜터**: 로컬 또는 외부 에이전트를 등록하여 학습 시 질문에 답해주는 AI 튜터를 설정 및 연동합니다.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + Shadcn UI |
| Backend/DB | Local JSON Database (db.json) + Mock Supabase Client |
| AI Worker | Hermes Agent / External AI API |
| 실시간 | Local Fetch / API Routes |

---

## 개발 및 협업 규칙 (규칙 파일 참조)

상세한 개발 지침 및 아키텍처 규칙은 아래 개별 규칙 문서를 참조하십시오. AI 에이전트는 작업 수행 시 해당 규칙들을 반드시 준수해야 합니다.

### 1. 개발 및 아키텍처 규칙
- [아키텍처 구조 규칙](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/architecture.md): Next.js App Router 폴더 구조 및 Server/Client 컴포넌트 규칙
- [API 개발 컨벤션](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/api-conventions.md): Local DB API 및 에이전트 연동 API 규격
- [로컬 DB & 스토리지 패턴](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/local-db-storage.md): `db.json` 및 Mock Supabase Client 사용 방법 및 권한 우회 지침

### 2. 코드 및 디자인 시스템 규칙
- [코딩 컨벤션 표준](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/coding-standards.md): TypeScript 및 React 컴포넌트 작성 규칙
- [디자인 시스템 규칙](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/design-system.md): Shadcn UI 사용법, 테마 색상 및 고정 레이아웃 규격

### 3. 작업 프로세스 규칙
- [작업 내역 Wiki 등록 의무](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/wiki-maintenance.md): 작업 완료 후 `wiki/` 이력 관리 규칙 (★필수★)
- [강좌 제작 번들러 프로토콜](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/bundler-protocol.md): 번들 및 매니페스트 변경 시 프로토콜 최신화 규칙
- [Git 커밋 규칙](file:///C:/Workspace/Projects/OpenTutorials/.agents/rules/git-workflow.md): 커밋 메시지 컨벤션 및 관리 요령
