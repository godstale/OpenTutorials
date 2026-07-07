---
description: 강좌 제작 Bundler 프로토콜 수정 규칙. 번들 스펙이나 메타데이터 변경 시 적용.
pattern: "docs/bundler/**/*"
---

# Bundler Protocol

강좌 번들 구조 및 유효성 검증 프로토콜을 관리하기 위한 지침입니다.

## 1. 프로토콜 수정 규칙
- 강좌 번들 구조, JSON 매니페스트/메타데이터 스펙, 유효성 검증 로직 등 **Bundler 프로토콜과 관련된 모든 변경사항이 발생할 경우, 반드시 [protocol.md](file:///C:/Workspace/Projects/OpenTutorials/docs/bundler/protocol.md) 및 하위 지침 문서들을 즉시 최신화**해야 합니다.
- 이는 외부 강좌 제작 프로젝트에서 최신 프로토콜에 맞게 강좌 파일을 정상적으로 빌드할 수 있도록 공조 체계를 유지하기 위함입니다.
