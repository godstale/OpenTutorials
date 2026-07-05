# Open Tutorials 사용자 및 강좌 작성 매뉴얼

이 문서는 Open Tutorials 플랫폼의 설치, 실행, 사용 방법(강좌 등록 및 학습)과 더불어 콘텐츠 제작자를 위한 강좌 번들 작성 가이드를 제공합니다.

---

## 🚀 1. 앱 설치 및 실행 방법

Open Tutorials는 별도의 클라우드 서버 설정 없이, 로컬 데스크탑 환경에서 즉시 실행하여 사용할 수 있습니다.

### 사전 요구사항
- **Node.js**: v18 이상 권장

### 설치 및 구동 단계
1. **패키지 설치**:
   의존성 패키지를 로컬 환경에 설치합니다.
   ```bash
   npm install
   # 또는 pnpm 환경인 경우
   pnpm install
   ```

2. **개발 서버 실행**:
   Next.js 로컬 개발 서버를 기동합니다.
   ```bash
   npm run dev
   ```

3. **브라우저 접속**:
   [http://localhost:3000](http://localhost:3000)으로 접속합니다.
   - 데스크탑 전용 로컬 모드이므로 회원가입/로그인 과정이 생략되며, `local-user-id` 세션으로 자동 대시보드로 진입합니다.

---

## 📖 2. 강좌 등록 및 학습 방법

### 강좌 등록 (업로드)
1. 사이드바 메뉴에서 **[강좌 관리]** (또는 `courses/manage`) 메뉴를 선택합니다.
2. 우측 상단의 **[새 통합 강좌 업로드]** 버튼을 클릭하여 업로드 페이지로 진입합니다.
3. 규격에 맞게 압축된 **통합 번들 ZIP 파일**을 드래그 앤 드롭하거나 파일 선택기를 통해 업로드합니다.
4. 플랫폼이 자동으로 다음 항목을 검증합니다:
   - `package-manifest.json` 존재 및 형식 검증
   - 필수 메타데이터 필드 검증
   - 하위 강좌 ZIP 압축 해제 및 `config.json` 분석
   - 최종 검증 완료 시 데이터베이스(`db.json`)에 강좌가 자동으로 등록됩니다.

### 강좌 학습 및 AI 튜터 활용
1. **[나의 강좌]** 혹은 **[강좌 검색]** 탭에서 학습하고 싶은 강좌를 클릭하고 **[수강하기]**를 진행합니다.
2. 강좌 플레이어 화면에서 카드 형식으로 구성된 강의 내용을 차례대로 학습합니다.
3. **AI 튜터와 함께 학습**:
   - 학습을 돕기 위해 **[나의 에이전트]** 메뉴에서 자체 호스팅된 에이전트(Ollama, LM Studio 등) 또는 외부 LLM API(OpenAI, DeepSeek 등)를 등록합니다.
   - 등록한 에이전트 설정에서 **[AI 튜터]** 토글을 켭니다.
   - 강좌 학습 플레이어로 돌아오면, 우측/하단의 AI 튜터 대화창을 통해 현재 학습 카드 주제에 대한 심도 있는 질문을 나누며 학습할 수 있습니다.
   - AI 튜터는 강좌 리소스 API를 통해 강좌의 전체 내용과 현재 카드의 맥락을 사전에 파악하여 맞춤 답변을 제공합니다.

---

## 🛠️ 3. 강좌 번들 작성 및 패키징 가이드

Open Tutorials에 강좌를 업로드하려면 정해진 ZIP 압축 구조를 유지해야 합니다.

### 통합 번들 ZIP 구조
```text
[통합 번들 ZIP 파일]
├── package-manifest.json           # 통합 강좌 메타데이터 (필수)
├── thumbnail.png                   # 대표 썸네일 이미지 (선택)
└── courses/                         # 하위 강좌 ZIP 디렉토리 (필수)
    ├── marketing-basic-1.zip       # 하위 강좌 1 (slug명과 파일명이 같아야 함)
    └── marketing-strategy-2.zip    # 하위 강좌 2
```

#### package-manifest.json 예시
```json
{
  "title": "마케팅 에이전트 마스터",
  "slug": "marketing-integrated-course",
  "description": "통합 마케팅 강좌입니다.",
  "thumbnail": "./thumbnail.png",
  "published": true,
  "sequential_play": false,
  "force_checkpoint": false,
  "version": "1.0.0",
  "changelog": "최초 릴리즈",
  "courses": [
    { "slug": "marketing-basic-1" },
    { "slug": "marketing-strategy-2" }
  ]
}
```

### 하위 강좌 ZIP 구조 (예: marketing-basic-1.zip 내부)
```text
[하위 강좌 ZIP 파일]
├── config.json                     # 하위 강좌 메타 및 목차(TOC) (필수)
├── wiki.md                         # AI 튜터 지식베이스용 문서 (필수)
└── cards/                          # 강의 마크다운 카드 목록 (필수)
    ├── 01_intro.md
    └── 02_practice.md
```

---

## 🤖 4. 강좌 작성용 AI 에이전트(Bundler) 활용

복잡한 번들 구조와 마크다운 카드, JSON 메타데이터를 직접 수작업으로 구성하기는 번거로울 수 있습니다. 이를 효율적으로 해결할 수 있도록 **Open Tutorials Bundler** 도구를 활용할 수 있습니다.

- **GitHub 저장소**: [OpenTutorials-Bundler](https://github.com/godstale/OpenTutorials-Bundler)

### OpenTutorials-Bundler의 장점
1. **자동 생성**: 원시 마크다운 문서나 커리큘럼 텍스트 계획만을 제공해도 AI Agent가 플랫폼 규격에 맞게 `package-manifest.json`, `config.json`, 그리고 `cards/*.md` 파일을 자동 빌드해 줍니다.
2. **패키징 자동화**: 작성 완료된 리소스를 곧바로 업로드 가능한 ZIP 통합 번들 파일로 원클릭 패키징해 줍니다.
3. **정합성 체크**: TOC(목차)와 실제 카드 파일명의 일치 여부, 필수 필드 누락 검증 등을 업로드 전에 에이전트 수준에서 미리 선검증하여 오류율을 대폭 낮춥니다.
