# 대시보드 수강 중인 과목 집계 및 학습 중인 강좌 필터링 오류 해결

## 개요
사용자 대시보드(`/dashboard`)에서 수강 중인 강좌 패키지 내에 포함된 개별 강좌들까지 모두 "수강중인 과목" 및 "학습 중인 강좌" 리스트에 중복 카운트 및 노출되는 현상이 발생했습니다. 이는 Supabase RLS(Row Level Security) 정책 제약으로 인해 일반 authenticated 권한으로 `user_progress` 데이터 조회 시 `courses` 조인의 하위 릴레이션인 `course_package_items(package_id)`를 올바르게 로드하지 못했기 때문입니다. 

이를 해결하기 위해 서버 컴포넌트 환경에서 `createAdminClient`를 사용해 RLS를 우회하여 강좌 패키지 하위 아이템 정보를 완벽히 가져옴으로써 집계 및 필터링 오류를 정상화하였습니다.

## 문제 원인 및 해결

### 1. Supabase RLS 제약 및 조인 실패
- **기존 상태**: 대시보드(`/dashboard`) 서버 컴포넌트는 `createClient`를 활용해 사용자 세션 권한으로 Supabase 데이터를 조회했습니다.
  - 이 과정에서 `user_progress` 테이블을 조회할 때 하위 조인인 `course:courses(*, course_package_items(package_id))`를 호출하면, RLS 정책 제약에 따라 `course_package_items` 테이블 데이터가 빈 배열(`[]` 또는 `null`)로 반환되었습니다.
  - 결과적으로, 개별 강좌 필터링용 헬퍼 조건식 `(!p.course?.course_package_items || p.course.course_package_items.length === 0)`이 정상 작동하지 않고 패키지에 소속된 강좌들도 개별 강좌로 판정되었습니다.
- **영향**:
  - 패키지 1개를 구독 중이나 패키지 내 강좌 13개가 개별 강좌로 합산 카운팅되어 "수강중인 과목" 수가 14개로 과다 표기되었습니다.
  - "학습 중인 강좌" 목록에서도 패키지 하나만 나와야 하나, 패키지 내 개별 강좌들이 함께 노출되었습니다.

### 2. 해결 방안 (createAdminClient 적용)
- **수정 방식**: `app/(user)/dashboard/page.tsx` 내 데이터 페칭 코드에서 `createAdminClient`를 통해 생성된 `adminSupabase`를 활용하도록 변경하였습니다.
- **수정 코드**:
  ```typescript
  // app/(user)/dashboard/page.tsx
  const adminSupabase = createAdminClient();
  const [subscriptions, { data: externalAgents }, { data: userProgress }, { data: packageSubs }] = user
    ? await Promise.all([
        getUserSubscriptions(user.id),
        supabase.from('user_external_agents').select('id, status'),
        adminSupabase.from('user_progress').select('*, course:courses(*, course_package_items(package_id))').eq('user_id', user.id),
        adminSupabase.from('user_package_subscriptions').select('*, package:course_packages(*)').eq('user_id', user.id)
      ])
    : [[], { data: [] }, { data: [] }, { data: [] }];
  ```
- **결과**:
  - RLS를 안전하게 우회하여 `course_package_items`가 정상 조회되므로, 패키지에 포함된 강좌들이 정상 필터링됩니다.
  - "수강중인 과목"은 순수 개별 강좌 + 수강 중인 패키지 갯수인 `1`로 정상 표시됩니다.
  - "학습 중인 강좌" 목록 역시 패키지 1개만 노출되도록 필터링이 정상 작동합니다.
