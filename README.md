# Open Tutorials

Open Tutorials는 사용자가 로컬 환경에서 다양한 AI 에이전트와 상호작용하며 여러 강좌를 효과적으로 학습할 수 있도록 돕는 **데스크탑 친화형 AI 학습 오픈소스 플랫폼**입니다.

기존 클라우드 인프라(Supabase Auth, Database, Storage)에 의존하는 복잡한 요금제 모델을 완전히 걷어내고, **로컬 파일 시스템 (`db.json` 및 `public/courses/`)을 데이터베이스 및 스토리지로 활용**하여 보안성이 뛰어나고 네트워크 연결이 불필요한 온디바이스 전용 애플리케이션으로 전환되었습니다.

---

## 📖 주요 문서 및 매뉴얼

상세 가이드는 `docs/` 및 `wiki/` 폴더에서 확인할 수 있습니다.
- 🏗️ **아키텍처 문서**: [Application Architecture](file:///docs/architecture/README.md) - 앱의 전반적인 로컬 구현 패턴 및 데이터 흐름 설명
- 📘 **사용자 & 제작자 매뉴얼**: [User & Creator Manual](file:///docs/manual/README.md) - 앱 설치, 실행, 강좌 업로드, AI 튜터 활용, 강좌 패키지 직접 번들링하는 방법 가이드
- 🤖 **강좌 작성용 AI 에이전트 프로젝트**: [OpenTutorials-Bundler GitHub](https://github.com/godstale/OpenTutorials-Bundler) - 복잡한 강좌 패키지 구조를 손쉽게 마크다운과 메타데이터로 구성하고 ZIP 번들링해 주는 전용 빌더 도구

---

## 🚀 로컬 실행 방법

Node.js 환경이 세팅되어 있다면 단 2단계로 즉시 구동 가능합니다.

### 1. 의존성 패키지 설치
프로젝트 루트 폴더에서 패키지를 설치합니다.
```bash
npm install
# 또는 pnpm 환경인 경우
pnpm install
```

### 2. 로컬 개발 서버 기동
```bash
npm run dev
```

### 3. 브라우저 접속
- **접속 주소**: [http://localhost:3000](http://localhost:3000)
- **자동 로그인**: 로컬 모드에서는 별도의 가입이나 로그인이 불필요합니다. 기본 세션(`local-user-id`)으로 즉시 대시보드에 진입합니다.

---

## 📁 주요 폴더 구조 및 역할

- `app/`: Next.js App Router 기반의 UI 페이지, 라우팅 및 Local DB 중계 API 라우트
- `components/`: Shadcn UI 및 Tailwind CSS 기반의 반응형 UI 컴포넌트 모음
- `lib/`:
  - `db/local-db-server.ts`: Node.js `fs` 모듈 기반으로 `db.json` 파일에 쓰기/읽기를 처리하는 로컬 DB 서버
  - `supabase/mock-client.ts`: Supabase JS Client 문법을 에뮬레이트하여 내부 로컬 DB로 중계해 주는 Mock 클라이언트
  - `types/`: 공유 TypeScript 타입 정의
- `docs/`: 배포에 포함되는 아키텍처 및 사용 설명 문서 (`docs/architecture/`, `docs/manual/`)
- `wiki/`: AI 에이전트들이 작업 내역과 기술 스택 히스토리를 추적하는 데 필요한 장기 기억/지식 베이스 폴더
- `public/courses/`: 사용자가 업로드한 강좌의 정적 에셋(이미지, 카드 마크다운 등)이 보관 및 서빙되는 로컬 스토리지 경로

---

## 🛠️ 핵심 기능 및 구현 상황

- **나의 강좌 & 학습 플레이어**: 카드 뒤집기 형태로 쉽고 세련된 UI로 강좌를 수강하며, 학습 진행 상황(진행률)이 로컬 DB에 자동으로 저장 및 복원됩니다.
- **강좌 업로드 & 유효성 검증**: zip 번들 형식의 강의 매니페스트 및 콘텐츠 카드를 직접 업로드하면 자동으로 정합성 및 구조를 검증하여 로컬 스토리지에 배포 및 적재합니다.
- **AI 튜터링 및 컨텍스트 주입**:
  - Ollama, LM Studio 등 로컬 호스팅 에이전트 혹은 OpenAI/DeepSeek 등의 API 에이전트를 자유롭게 등록하고 AI 튜터로 활성화할 수 있습니다.
  - 학습 시 튜터가 전체 강좌 내용과 현재 학습 진도를 기반으로 맞춤 지도를 제공하도록 숨김 컨텍스트 프롬프트를 최적화 구현하였습니다.
