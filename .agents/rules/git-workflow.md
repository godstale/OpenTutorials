---
description: Git 커밋 컨벤션과 브랜칭 전략. Git 명령어 실행 시 적용.
pattern: "**/*"
---

# Git Workflow

## 1. 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]
```

**Type:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `ui`: UI/스타일 변경 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `docs`: 문서 변경
- `chore`: 빌드/설정/의존성 변경
- `test`: 테스트 추가/수정

**Scope 예시:** `auth`, `dashboard`, `features`, `admin`, `layout`, `api`

```bash
# Good
feat(features): add feature detail modal with parameter form
ui(dashboard): update sidebar active state styles
fix(auth): redirect to dashboard after login

# Bad
update stuff
fix bug
```

## 2. 브랜칭 전략

- `main` — 항상 배포 가능한 상태 유지 (**Protected Branch**: 직접 커밋 절대 금지, 반드시 PR을 통해 머지)
- `develop` — 개발 통합 브랜치 (Phase 1 완료 후 main 머지)
- `feature/<name>` — 기능 개발 브랜치
- `fix/<name>` — 버그 수정 브랜치

```bash
# 작업 시작
git checkout -b feature/dashboard-layout

# 작업 완료 후
git add <specific files>
git commit -m "feat(dashboard): add sidebar navigation layout"
```

## 3. 커밋 단위

- 하나의 커밋 = 하나의 논리적 변경
- UI 컴포넌트 하나 추가 = 1 커밋
- 라우트 페이지 추가 = 1 커밋
- 더미 데이터 추가 = 관련 타입과 함께 1 커밋

## 4. 금지사항

- `main` 브랜치 직접 커밋(Direct Commit) 절대 금지. 반드시 PR을 생성하여 리뷰를 거칠 것.
- `--force` push to main/develop 금지
- `--no-verify` 금지 (훅 우회 금지)
- `.env` 파일 커밋 금지
- `node_modules` 커밋 금지
