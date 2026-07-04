# 대시보드 패키지 달성도 undefined 해결 및 어드민 패키지 매니페스트 수정 기능 구현

## 개요
1. **대시보드 패키지 달성도 오류 해결**: 대시보드의 "학습 중인 강좌" 패널 내 강좌 패키지 하단 정보에 `총 undefined개 중 undefined개 완료`로 표시되는 현상을 해결하였습니다.
2. **어드민 패키지 매니페스트 수정 모달 구현**: 관리자 강좌 관리 화면(`/admin/courses`)의 패키지 탭에서, 등록된 패키지의 매니페스트 JSON 데이터를 직접 수정하거나 새로운 매니페스트 파일(.json, .zip)을 재등록하여 업데이트할 수 있는 편의 기능을 추가하였습니다.

## 문제 원인 및 해결

### 1. 대시보드 패키지 달성도 'undefined' 오류
- **원인**: 대시보드 서버 컴포넌트(`app/(user)/dashboard/page.tsx`)에서 `user_package_subscriptions` 데이터를 Supabase DB에서 직접 조회할 때 `total_courses`나 `completed_courses` 같은 가상 필드 값이 존재하지 않아 풋터 영역 출력 시 `undefined`가 노출되었습니다.
- **해결 방안**: 
  - `user_package_subscriptions`를 가져올 때 `items:course_package_items(course_id)` 조인을 추가하여 패키지 내 강좌 목록을 가져오도록 수정했습니다.
  - 가져온 패키지 아이템들의 `course_id`를 기반으로 `userProgress`의 `completed` 여부를 조합 연산(Map 활용)하여 `completedCourses`와 `totalCourses` 및 달성률(`percent`)을 실시간으로 계산해 풋터에 제공했습니다.

### 2. 어드민 패키지 매니페스트 수정 및 재등록
- **해결 방안**:
  - 관리자 강좌 관리 페이지([page.tsx](file:///C:/Workspace/Projects/PennyPress-FE/app/admin/courses/page.tsx)) 내 각 패키지 행에 **'매니페스트 수정'** 버튼을 추가했습니다.
  - 버튼 클릭 시 `EditManifestModal` 모달(Dialog)이 뜨며, 기존 매니페스트 설정을 JSON 형태로 자동 매핑해 텍스트 영역에 채워줍니다.
  - 관리자는 텍스트 영역의 JSON 데이터를 직접 수정하거나, **매니페스트 파일(.json 또는 .zip)**을 직접 드래그앤드롭/클릭 선택으로 업로드할 수 있습니다.
  - 수정 완료 버튼 클릭 시, 업로드용 API `/api/admin/packages/upload`를 재사용(기존 슬러그 매칭 시 upsert 업데이트 수행)하여 패키지 정보 업데이트 및 강좌 목록 재배치 처리를 손쉽게 완료할 수 있습니다.
