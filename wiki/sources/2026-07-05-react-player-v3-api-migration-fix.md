# [2026-07-05] react-player v3 API 마이그레이션 불일치로 인한 동영상 강좌 재생 불가 문제 해결

## 1. 개요
과거 디버깅 히스토리(`docs/temp/01-debugging-history.md`)에 기록된 4가지 이슈(자동 재생 차단, 높이 0px 렌더링 붕괴, config 리렌더링으로 인한 재로드, seekTo ref 문제)에 대한 수정 코드가 이미 `client.tsx`에 반영되어 있었음에도, 다음 두 증상이 계속 재현되었습니다.
1. 비디오 카드로 진입하면 16:9 플레이어 영역은 표시되지만 내부 화면이 완전히 비어있음 (썸네일/영상 프레임 없음)
2. 재생 컨트롤을 클릭해도 영상이 재생되지 않음

## 2. 근본 원인 진단
`package.json`에는 `"react-player": "^3.4.0"`이 설치되어 있으나, 코드는 `url` prop, `config={{ youtube: { playerVars: {...} } }}`, `onProgress`에서 `playedSeconds` 추출, `seekTo(seconds, 'seconds')` 등 **react-player 2세대(v2) API**를 그대로 사용하고 있었습니다. `node_modules/react-player`의 실제 `dist/index.d.ts`, `dist/types.d.ts`를 직접 확인한 결과, v3는 iframe API를 감싸던 v2 구조를 완전히 버리고 `youtube-video-element`, `vimeo-video-element` 등 **`HTMLVideoElement`를 확장한 네이티브 커스텀 엘리먼트**로 재작성된 전혀 다른 라이브러리임이 확인되었습니다.

구체적 API 불일치:
- **`url` → `src`**: v3의 `ReactPlayerProps`에는 `url` 필드가 존재하지 않음(`PreviewProps.src`로 대체). `url`을 전달해도 무시되어 플레이어에 소스가 전혀 전달되지 않았고, 이것이 "화면이 완전히 비어있음" 증상의 직접 원인이었습니다.
- **`onReady` 시그니처 변경**: v3의 `onReady`는 `() => void`로, 인자를 받지 않습니다. 기존 코드는 `onReady={(player) => { playerRef.current = player }}`로 인스턴스를 받으려 했으나 `player`는 항상 `undefined`였고, 따라서 `playerRef.current`가 실제로는 한 번도 설정되지 않아 재생/탐색 조작이 전부 무반응이었습니다.
- **`ref` 포워딩 방식 변경**: v3의 `ReactPlayer`는 `ForwardRefExoticComponent<... RefAttributes<HTMLVideoElement>>`로, `ref`가 내부 커스텀 엘리먼트(`HTMLVideoElement`를 확장한 `<youtube-video>` 등)로 직접 포워딩됩니다. (v2 시절엔 `next/dynamic` 래퍼가 ref를 포워딩하지 못해 `onReady` 우회책을 썼지만, v3 + 최신 Next.js/React 19 조합에서는 `ref` 사용이 다시 정상 동작함을 실제 브라우저 테스트로 확인)
- **`onProgress` 미존재**: v3 `ReactPlayerProps`에는 `onProgress`가 없습니다. 표준 HTML 비디오 속성을 상속하므로 네이티브 `onProgress`(버퍼링 이벤트)로 취급되어 `{ playedSeconds }` 형태의 인자가 오지 않습니다. 재생 시간 추적은 표준 `onTimeUpdate` 이벤트와 `event.currentTarget.currentTime`으로 대체해야 합니다.
- **`config.youtube` 스키마 변경**: v3의 `Config.youtube`는 `YouTubeVideoElement['config']` 타입으로, `youtube-video-element`가 정의한 평탄한 객체(`{ cc_lang_pref?, color?, rel?, origin?, ... }`)입니다. 기존 `playerVars`로 한 겹 감싼 구조는 스키마상 무의미했고, `autoplay`/`modestbranding` 키는 해당 타입에 애초에 존재하지 않습니다.
- **`seekTo()` 부재**: v3 ref의 대상은 표준 비디오 엘리먼트이므로 `seekTo(seconds, 'seconds')` 메서드가 없습니다. 탐색은 `element.currentTime = seconds`로 직접 설정해야 합니다.

## 3. 해결방안
`app/(user)/learn/[slug]/client.tsx`에서 다음과 같이 수정했습니다. (과거 디버깅 히스토리의 4가지 수정 — Strict Mode 자동재생 차단 로직, `absolute` 배치, `useMemo` 메모이제이션 —은 그대로 유지)

```diff
-  const playerConfig = useMemo(() => {
-    return {
-      youtube: {
-        playerVars: {
-          autoplay: 0,
-          modestbranding: 1,
-          rel: 0,
-          origin: typeof window !== 'undefined' ? window.location.origin : ''
-        }
-      }
-    };
-  }, []);
+  const playerConfig = useMemo(() => {
+    return {
+      youtube: {
+        rel: 0,
+        origin: typeof window !== 'undefined' ? window.location.origin : ''
+      }
+    };
+  }, []);
```

```diff
                 <ReactPlayer
-                  url={`https://www.youtube.com/watch?v=${cards[currentCardIndex].videoInfo.video_id}`}
+                  ref={playerRef}
+                  src={`https://www.youtube.com/watch?v=${cards[currentCardIndex].videoInfo.video_id}`}
                   controls
                   playing={isPlaying}
                   className="absolute top-0 left-0"
                   width="100%"
                   height="100%"
-                  onReady={(player: any) => {
-                    playerRef.current = player;
-                  }}
                   onPlay={() => setIsPlaying(true)}
                   onPause={() => setIsPlaying(false)}
-                  onProgress={(progress: any) => {
-                    setCurrentTime(progress.playedSeconds);
-                  }}
+                  onTimeUpdate={(event: any) => {
+                    setCurrentTime(event.currentTarget.currentTime);
+                  }}
                   config={playerConfig as any}
                 />
```

```diff
                         onClick={() => {
                           if (playerRef.current) {
-                            playerRef.current.seekTo(sub.start, 'seconds');
+                            playerRef.current.currentTime = sub.start;
                             setCurrentTime(sub.start);
                             setIsPlaying(true);
                           }
                         }}
```

## 4. 검증
Playwright로 `npm run dev` 서버(`http://localhost:3000/learn/glm52-video-course`)에 접속하여 실제 브라우저 동작을 확인했습니다.
- 페이지 진입 시 유튜브 썸네일/재생 버튼 프레임이 정상 렌더링됨을 스크린샷으로 확인.
- 재생 버튼 클릭 후 `document.querySelector('youtube-video')`의 `paused: false`, `currentTime` 증가를 확인하여 실제 재생 중임을 검증.
- 자막 탭에서 특정 자막(`00:45.1`)을 클릭하여 `currentTime`이 해당 시점으로 점프하고 재생이 이어짐을 확인.
- 콘솔에 react-player 관련 에러/경고 없음 (YouTube 자체 위젯 스크립트의 `postMessage` origin 경고는 유튜브 임베드 자체의 기존 동작이며 앱 코드와 무관).
- 별도 MDX 텍스트 강좌(`iot-communication-ch01`)에 접속하여 카드 렌더링, 목차, AI 튜터 탭 등 기존 기능에 회귀가 없음을 확인. 단, 해당 강좌에서 `next-mdx-remote`와 React 19 간의 SSR Hydration 에러(`Cannot read properties of null (reading 'useState')`)가 발견되었으나 클라이언트 렌더링으로 정상 폴백되며, 본 작업의 변경 범위(비디오 카드 렌더링 분기)와는 무관한 기존 이슈로 별도 추적이 필요합니다.

## 5. 참고
- 강좌 번들 프로토콜(카드 JSON 스키마, `video_info` 필드 등)은 이번 수정으로 변경되지 않았으므로 `docs/bundler/protocol.md` 동기화는 해당 없음. 이번 변경은 순수 프론트엔드 플레이어 라이브러리 API 호출부에 국한됩니다.
- `package.json`/`pnpm-lock.yaml`은 변경하지 않았습니다. `react-player` 버전을 다운그레이드하지 않고, v3 API에 맞춰 호출 코드만 교정하는 방향으로 해결했습니다.
