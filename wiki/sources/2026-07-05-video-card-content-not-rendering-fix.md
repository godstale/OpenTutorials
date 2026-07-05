# [2026-07-05] 비디오 카드 컨텐츠 영역에 원본 JSON 텍스트가 출력되던 문제 근본 해결

## 1. 개요
`/learn/glm52-video-course?package=glm52-video-package` 학습 화면에서 카드 컨텐츠 영역에 영상이 표시되지 않고, 카드 JSON 파일(`01_introduction.json`)의 원본 텍스트가 그대로 화면에 출력되는 문제가 보고되었습니다.

## 2. 근본 원인 진단
기존 위키 문서 `2026-07-05-video-playback-and-sidebar-hydration-fix.md`, `2026-07-05-react-player-v3-api-migration-fix.md`는 `app/(user)/learn/[slug]/client.tsx`에 `ReactPlayer` 기반 비디오 카드 렌더링 분기가 이미 구현·검증되었다고 기록하고 있었습니다. 그러나 실제 코드를 확인한 결과:

- `client.tsx`에는 `ReactPlayer`, `playerRef`, `isPlaying` 등 관련 코드가 **전혀 존재하지 않았습니다** (`git log -p -S "ReactPlayer"` 전체 커밋 이력에서도 0건).
- 실제로 반영된 것은 `LearnPageClientProps`의 `cards` 배열 타입에 `type`/`videoInfo` 필드를 추가한 인터페이스 변경뿐이었습니다.
- 카드 컨텐츠 렌더링부(`{cards[currentCardIndex]?.mdxSource ? <MDXRemote .../> : <div>{...content}</div>}`)는 `type === 'video'`를 전혀 분기하지 않아, `page.tsx`가 비디오 카드에 대해 채워주는 `content`(카드 JSON 원본 텍스트, `page.tsx:203`)가 그대로 화면에 출력되고 있었습니다.
- `scripts/extract_changes.py`로 별도 AI 코딩 툴(Antigravity CLI)의 트랜스크립트 로그를 추출해본 결과(`scripts/extracted_changes.txt`), 동일한 JSX 교체 편집이 여러 차례 시도되었으나(StartLine/EndLine이 매번 달라짐 — 파일 오프셋 불일치로 반복 재시도한 정황) 실제 파일에는 한 번도 반영되지 않았음을 확인했습니다. 즉, 과거 위키 문서들은 **적용되지 않은 계획을 이미 완료된 작업으로 잘못 기록**한 것이었습니다.

## 3. 해결 방안
`app/(user)/learn/[slug]/client.tsx`에 최소 범위로 다음을 구현했습니다 (과거 문서가 계획했던 좌측 목차/자막 탭 전면 개편은 범위 밖으로 제외하고, 카드 컨텐츠 영역 렌더링만 수정):

- `next/dynamic(() => import('react-player'), { ssr: false })`로 `ReactPlayer`를 동적 임포트 (내부 커스텀 엘리먼트가 모듈 로드 시 `document`를 참조하므로 SSR 비활성 필요).
- `node_modules/react-player@3.4.0`의 실제 `dist/types.d.ts`를 직접 확인하여 v3 API로 구현: `src`(⛔`url` 아님), `ref`(HTMLVideoElement로 직접 포워딩), 표준 `onPlay`/`onPause`/`onTimeUpdate`, `config.youtube`는 `{ rel, origin }` 평탄한 객체(⛔`playerVars` 래핑 아님).
- 카드 전환 시 자동재생 정책 위반을 피하기 위해 `lastPlayedCardIndex` ref로 "최초 로드"와 "카드 이동"을 구분하여, 최초 로드 시에는 재생을 시작하지 않고 실제 카드 이동 시에만 자동재생.
- `playerConfig`는 `useMemo`로 메모이제이션하여 리렌더링마다 플레이어가 재초기화되지 않도록 함.
- 자막 목록을 카드 하단에 클릭 가능한 목록으로 렌더링하고, 클릭 시 `playerRef.current.currentTime = sub.start`로 탐색(v3 ref는 네이티브 비디오 엘리먼트이므로 `seekTo()` 메서드 없음).

## 4. 검증
Playwright로 `http://localhost:3000/learn/glm52-video-course?package=glm52-video-package`에 접속하여 확인:
- 스크린샷으로 유튜브 썸네일/재생 버튼 프레임이 정상 렌더링됨을 확인 (이전에는 JSON 텍스트만 출력).
- `document.querySelector('youtube-video')` 클릭 후 `paused: false`, `currentTime` 증가 확인 → 실제 재생 확인.
- 자막 라인 클릭 후 `currentTime`이 해당 자막의 `start` 지점 부근으로 이동함을 확인 → seek 정상 동작.
- 콘솔 에러/경고 0건.
- 회귀 확인: 별도 MDX 텍스트 강좌(`iot-communication-ch01`)도 정상 렌더링됨. 단, `next-mdx-remote` + React 19 조합의 기존 SSR Hydration 에러(`Cannot read properties of null (reading 'useState')`)가 여전히 콘솔에 나타나나, 이는 본 작업 범위와 무관한 기존 이슈로 클라이언트 렌더링 폴백에 의해 콘텐츠 표시에는 지장이 없음 (기존에도 별도 추적 필요로 문서화되어 있던 이슈).

## 5. 참고
- 강좌 번들 프로토콜(`video_info` JSON 스키마)은 변경되지 않았으므로 `docs/bundler/protocol.md` 동기화는 해당 없음.
- 과거 위키 문서(`2026-07-05-video-playback-and-sidebar-hydration-fix.md`, `2026-07-05-react-player-v3-api-migration-fix.md`)는 미적용 상태였던 계획을 완료로 잘못 기록한 것이므로, 향후 유사 작업 시 위키 기록만으로 "이미 해결됨"이라 판단하지 말고 반드시 실제 코드(`git log -p -S`, 대상 심볼 grep)로 재확인이 필요합니다.
