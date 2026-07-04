# Vivo Academy 강의 생성 및 AI Agent 가이드라인

**원본 위치:** `docs/vivo/lecture` 디렉토리 (필요 시 직접 참고 요망)

이 문서는 PennyPress 플랫폼에 AI Agent와 함께 동작하는 강좌(Lecture)를 기획하고 템플릿화하기 위해 `docs/vivo/lecture`에 저장된 가이드라인들을 정리한 문서입니다.

## 1. Course Creator Agent 지침 (AGENT_INSTRUCTIONS.md)
Course Creator Agent는 작가를 대신해 강좌의 기획을 구체화하고, 시스템이 요구하는 규격화된 ZIP 번들 파일을 생성해주는 역할을 합니다.

**강좌 생성 워크플로우:**
1. **기획 (Planning):** 주제, 대상, 카드(페이지) 수량 결정, AI 체크포인트 위치 기획.
2. **초안 작성 (Drafting):** 배경지식(`wiki.md`) 및 각 페이지 콘텐츠(`cards/*.mdx`) 작성.
3. **설정 구성 (Configuring):** 메타데이터 및 AI 프롬프트 설정(`config.json`) 생성.
4. **패키징 (Review & Packaging):** ZIP 압축 후 로컬 업로드 안내.

## 2. 강좌 번들 구조 가이드 (COURSE_STRUCTURE_GUIDE.md)
PennyPress (및 구 Vivo Academy)에 강좌를 업로드하려면 정해진 파일 시스템 구조를 따라야 합니다.

```text
my-course/
├── config.json         # 강좌 제목, 작성자, 렌더링 순서(cards), 체크포인트(checkpoints) 정의
├── wiki.md             # AI 튜터가 참고할 배경 지식, 맥락, 핵심 용어 사전
├── cards/              # 사용자에게 표시될 학습용 마크다운 컴포넌트 페이지들
│   ├── 01-intro.mdx
│   └── 02-core-concept.mdx
└── images/             # 정적 이미지 리소스 폴더
```

- **MDX 작성:** 일반 마크다운 기반으로 작성하며, 이미지 경로는 `../images/파일명.png`로 지정.
- **config.json 체크포인트:** 특정 카드 학습 직후 AI 튜터가 퀴즈를 내거나 질문을 던지도록 설정할 수 있습니다.
