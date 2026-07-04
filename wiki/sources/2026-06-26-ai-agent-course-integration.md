# PennyPress AI Agent 강좌 서비스 연동 (Vivo Academy 마이그레이션)

**작업일자:** 2026-06-26

## 1. 개요
기존 Vivo Academy의 AI 기반 강좌 학습 서비스(검색, 학습, AI QnA 및 관리자 기능)를 PennyPress로 성공적으로 포팅하였습니다.
학습자는 `next-mdx-remote`로 구성된 카드를 학습하고, 각 체크포인트에서 AI 에이전트(External Agent 연동)와 질의응답을 할 수 있습니다.

## 2. 주요 구현 내용

### 2.1. 데이터 모델 및 타입 추가
`lib/types/index.ts`에 강좌 관리를 위한 인터페이스 추가.
- `Course`: 강좌 메타데이터 (제목, 썸네일, 게시 상태 등)
- `UserProgress`: 사용자별 진도율 및 마지막 학습 카드 상태

### 2.2. 관리자(Admin) 기능
기존 작가 포털을 관리자용 권한 페이지로 이관했습니다.
- `/admin/courses`: 전체 강좌 조회, 상태 변경, 삭제 및 수정 기능. (Shadcn UI Card, Table 뷰)
- `/admin/courses/upload`: ZIP 번들(MDX 콘텐츠 + JSON 메타데이터)을 업로드할 수 있는 폼 제공.

### 2.3. 사용자(User) 학습 기능
- `/courses`: 등록된 강좌를 검색하고 썸네일과 설명을 조회하여 수강 신청(미리보기)을 할 수 있는 탐색 페이지.
- `/my-courses`: 사용자가 수강 중인 강좌의 진도율(Progress Bar)을 추적하고 이어서 학습할 수 있는 관리 대시보드.
- `/learn/[slug]`: 실제 강의 학습 플레이어. 좌측에는 `next-mdx-remote`를 활용해 강의 본문이 렌더링되며, 우측에는 **AgentChatArea**가 고정되어 실시간으로 질문을 던지거나 체크포인트 QnA를 진행할 수 있습니다.

### 2.4. 외부 에이전트(UserExternalAgent) 연동
- `/learn/[slug]`의 AI 튜터 채팅창은 현재 PennyPress의 `UserExternalAgent` 기능을 활용하도록 더미 연동(Stub) 및 UI 통합이 완료되었습니다. 향후 백엔드 API 완비 시, Agent Plugin을 통해 LLM 컨텍스트 연동이 활성화될 예정입니다.
