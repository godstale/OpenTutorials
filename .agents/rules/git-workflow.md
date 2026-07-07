---
description: Git 커밋 컨벤션과 커밋 단위 규칙. Git 명령어 실행 시 적용.
pattern: "**/*"
---

# Git Workflow

## 1. 커밋 메시지 형식
```
<type>(<scope>): <subject>
```

**Type 종류:**
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `ui`: UI 및 스타일 코드 수정 (로직 변경 없음)
- `refactor`: 코드 리팩토링
- `docs`: 문서 수정
- `chore`: 설정, 패키지 매니저, 의존성 변경

**Scope 예시**: `db`, `courses`, `agent`, `layout`, `api`, `wiki`

## 2. 커밋 단위 규칙
- 하나의 커밋은 하나의 논리적 변경사항만을 포함해야 합니다.
- `.env` 파일 및 `node_modules` 폴더 등 보안/의존성 파일이 커밋에 포함되지 않도록 관리합니다.
