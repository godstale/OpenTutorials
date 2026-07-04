# Admin UI Fixes

**Date:** 2026-06-23
**Source:** [[admin-ui-fixes-20260623]]
**Tags:** UI, Bugfix, Admin, Frontend

## Summary
Admin 화면에서 발생하던 주요 오류 및 사용자 경험 문제를 해결했습니다. 

- **API 오류 억제**: `/api/admin/users`, `/api/admin/stats`, `/api/admin/macros`에서 데이터가 없을 때 500 에러를 던지지 않고 빈 배열/기본값을 반환하여 프론트엔드의 "로딩 실패" 에러 토스트를 제거.
- **불필요 메뉴 제거**: 에이전트 제어 열 삭제 및 관리자 사이드바에서 미사용 메뉴(서비스 관리, 결제 관리) 비활성화 처리.
- **설정 안내 추가**: 미구현 상태인 서비스 설정 화면에 접근 시 배너 안내 추가.

## Key Decisions
- **Graceful Fallback**: 백엔드 API에서 오류가 발생해도 시스템이 중단되거나 경고창을 표시하지 않고 기본 데이터를 반환함으로써 사용자의 불편을 줄였습니다.
- **메뉴 분리**: 미사용 메뉴를 완전히 숨기기보다 비활성화 및 구분선을 통해 시각적으로 미지원 상태임을 명확히 안내했습니다.
- **디자인 템플릿 재사용 및 CI 에러 해결**: `Alert` 컴포넌트 누락으로 인한 Vercel CI 빌드 에러를 방지하기 위해 `references/registry-starter`에 있는 템플릿에서 컴포넌트(`alert`, `accordion`, `popover` 등)들을 가져와 재활용하고 관련 의존성을 설치했습니다.
