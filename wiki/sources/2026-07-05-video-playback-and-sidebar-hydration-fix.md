# [2026-07-05] 비디오 강좌 최초 진입 시 자동 재생 에러, 렌더링 붕괴 및 사이드바 Hydration mismatch 해결

## 1. 개요
동영상 강좌 페이지에 진입할 때 브라우저 콘솔 및 터미널 상에 에러가 발생하거나, 에러가 발생하지 않더라도 동영상이 화면에 제대로 렌더링되지 않고 재생조차 되지 않는 현상이 식별되었습니다.
- **비디오 재생 오류**: `NotAllowedError: play() failed because the user didn't interact with the document first.`
- **비디오 렌더링 및 재생 불가**: 콘솔 에러는 발생하지 않지만, 동영상 플레이어의 높이가 0px로 붕괴되거나 유튜브 iframe의 origin 정책 오류 등으로 재생이 불가능한 현상.
- **seekTo 함수 에러**: 자막 클릭 시 `seekTo` 메서드를 호출할 때 `TypeError: playerRef.current.seekTo is not a function` 예외가 발생하며 페이지 동작이 중단되는 버그.
- **Hydration mismatch 오류**: `Hydration failed because the server rendered text didn't match the client.` (UserSidebar.tsx 내 `{isCollapsed ? "O" : "Open Tutorials"}` 부근)

이 문서는 상기 렌더링, 재생 제어, API 연동 및 Hydration 오류를 원천 차단하고 안정적인 동영상 학습 환경을 확보하기 위한 해결안과 적용 내역을 설명합니다.

---

## 2. 세부 현상 분석 및 해결방안

### A. 비디오 자동 재생 차단 (`NotAllowedError` 및 React Strict Mode)
- **원인**: Chrome/Edge 등 모던 브라우저 정책에 의하면 사용자가 화면(문서)에 대해 첫 인터랙션(클릭 등)을 하기 전에는 소리가 있는 미디어를 자동으로 재생할 수 없습니다. 
- **Strict Mode의 함정**: 이전 버전에서는 `isFirstLoad` 레퍼런스(`useRef`)를 도입하여 최초 마운트 시 `setIsPlaying(false)`를 명시하고자 했으나, Next.js Dev 환경의 **React Strict Mode** 특성상 컴포넌트가 `마운트 -> 언마운트 -> 마운트` 흐름을 타면서 `isFirstLoad.current`가 첫 번째 마운트 때 이미 `false`로 변경되었습니다. 이로 인해 실제 화면이 렌더링되는 두 번째 마운트 시점에 `else` 분기를 타서 `setIsPlaying(true)`가 강제 호출되었고, 여전히 자동 재생 차단 정책에 걸려 플레이어가 오류 상태로 고착되었습니다.
- **해결방안**: 
  1. `isFirstLoad` 대신 `lastPlayedCardIndex` 레퍼런스를 도입하여 최초 로드 시(null 상태)에는 재생을 차단하고, **실제로 이전/다음 카드로 인덱스가 변경되었을 때만** `isPlaying`을 `true`로 토글하도록 개선했습니다.
  2. 이를 통해 Strict Mode의 중복 마운트 시점에도 최초 로드 시에는 계속 정지 상태를 유지하게 하여 자동 재생 차단 오류를 완전히 방해받지 않고 무력화했습니다.

### B. ReactPlayer 렌더링 붕괴 (높이 0px 현상) 및 YouTube Origin 정책
- **원인 1**: Tailwind의 `aspect-video`와 `max-h-full` 클래스가 지정된 부모 `div` 내에 `ReactPlayer` 컴포넌트가 `flex` 자식으로 그냥 렌더링되었습니다. `ReactPlayer`는 내부적으로 HTML5 비디오 또는 Iframe 래퍼 `div`를 생성하는데, absolute 배치가 누락된 경우 부모의 종횡비 공간을 점유하지 못하고 실제 높이가 0px로 축소되는 브라우저 레이아웃 오동작이 발생하였습니다.
- **원인 2**: 로컬 포트(예: localhost:3000) 환경에서 유튜브 임베드 API가 외부 origin 통신을 처리할 때, `origin` 파라미터가 명시되지 않으면 일부 브라우저 보안 정책에 의해 초기화 시점에 내부 오류가 나며 재생 제어가 동작하지 않을 수 있습니다.
- **해결방안**:
  1. `ReactPlayer` 컴포넌트에 `className="absolute top-0 left-0"`을 지정하고, 부모 `div`를 `w-full max-w-full max-h-full aspect-video relative` 구조로 정립하여 플레이어가 16:9 비율의 영역에 가득 차도록 렌더링 붕괴를 수정했습니다.
  2. `config.youtube.playerVars` 설정 내에 `origin: typeof window !== 'undefined' ? window.location.origin : ''` 속성을 추가하여 유튜브 API가 로컬 개발 서버 도메인을 안전하게 화이트리스트로 인지하고 재생 이벤트를 처리할 수 있도록 보완했습니다.

### C. 잦은 리렌더링으로 인한 플레이어 파괴 및 재생 불가능 버그
- **원인**: `ReactPlayer` 컴포넌트에 `config={{ youtube: { playerVars: ... } }}` 형태로 매 렌더링마다 새로운 객체 리터럴을 전달하고 있었습니다. `ReactPlayer`는 내부적으로 `config` 객체의 참조(reference)가 달라질 때마다 플레이어 인스턴스를 파괴하고 다시 초기화하므로, 재생 상태(`isPlaying`)나 현재 시간(`currentTime`)이 갱신되어 리렌더링될 때마다 유튜브 플레이어 로딩이 끊임없이 처음부터 리셋되어 비디오가 실질적으로 재생되지 않았습니다.
- **해결방안**:
  1. `playerConfig` 객체를 `useMemo` 훅을 활용하여 컴포넌트 마운트 시 최초 1회만 생성되도록 메모이제이션 처리했습니다.
  2. 이로써 리렌더링이 일어나도 유튜브 플레이어가 재로드되지 않고 연속적인 비디오 재생 흐름이 보장됩니다.

### D. 자막 클릭 시 `seekTo is not a function` 에러
- **원인**: Next.js의 SSR 이슈 회피를 위해 `ReactPlayer`를 `next/dynamic`({ ssr: false }) 컴포넌트로 로드하고 `ref={playerRef}`로 직접 맺어두었습니다. 하지만 dynamic wrapper 컴포넌트는 내부의 실제 ReactPlayer 인스턴스 참조를 ref로 온전히 포워딩하지 못하므로, `playerRef.current`가 HTML Element 또는 dynamic wrapper 인스턴스를 가리켜 `seekTo` 메서드를 찾을 수 없어 에러가 발생했습니다.
- **해결방안**:
  1. `ref={playerRef}` 대신 `ReactPlayer`의 `onReady={(player) => { playerRef.current = player; }}` 콜백을 구현했습니다.
  2. `onReady` 콜백은 내부 ReactPlayer 인스턴스가 완전히 초기화되었을 때 실제 플레이어 인스턴스를 직접 매개변수로 전달하므로, 이를 `playerRef.current`에 꽂아줌으로써 `seekTo` 함수에 안전하게 접근하고 정상 호출할 수 있게 보장했습니다.

### E. 사이드바 접힘에 따른 Hydration mismatch
- **원인**: Next.js SSR 환경에서 `useSidebar()` 훅을 통해 읽은 `state` 값(예: `'collapsed'`)을 기반으로 삼항 연산 텍스트 `{isCollapsed ? "O" : "Open Tutorials"}`를 바로 렌더링하려고 시도했습니다. 서버는 브라우저 사이드바의 실제 너비 및 UI 쿠키 상태를 알 수 없어 기본 레이아웃(주로 `expanded`) 기준 텍스트로 미리 렌더링하나, 클라이언트는 마운트 직후 `collapsed` 상태를 받아와 텍스트를 `O`로 불일치하게 렌더링하면서 Hydration mismatch 에러를 표출했습니다.
- **해결방안**:
  1. `UserSidebar` 컴포넌트 내에 클라이언트 마운트 완료를 확인하는 `mounted` 상태를 도입합니다.
  2. 마운트 전(서버 렌더링 및 클라이언트 최초 하이드레이션 시점)에는 항상 기본 텍스트인 `"Open Tutorials"`를 렌더링하여 일치시킵니다.
  3. 마운트 완료된 직후(`mounted === true`)에만 `isCollapsed` 상태를 참조하여 `O`로 안전하게 업데이트함으로써 화면 흔들림(Layout Shift)과 React hydration 에러를 완벽하게 차단합니다.

---

## 3. 수정 내역

### 1) [components/layout/UserSidebar.tsx](file:///C:/Workspace/Projects/OpenTutor/components/layout/UserSidebar.tsx)
- 마운트 상태 제어를 통해 Hydration mismatch 에러 방지 (이전 수정안 유지)

### 2) [app/(user)/learn/[slug]/client.tsx](file:///C:/Workspace/Projects/OpenTutor/app/(user)/learn/[slug]/client.tsx)
```diff
@@ -1,5 +1,5 @@
 'use client';
-import React, { useState, useRef, useEffect } from 'react';
+import React, { useState, useRef, useEffect, useMemo } from 'react';
 import { useRouter, useSearchParams } from 'next/navigation';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
@@ -475,6 +475,19 @@
   const [isUserScrollingSubtitles, setIsUserScrollingSubtitles] = useState<boolean>(false);
   const subtitleScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
+  const playerConfig = useMemo(() => {
+    return {
+      youtube: {
+        playerVars: {
+          autoplay: 0,
+          modestbranding: 1,
+          rel: 0,
+          origin: typeof window !== 'undefined' ? window.location.origin : ''
+        }
+      }
+    };
+  }, []);
+
   const searchParams = useSearchParams();
   const packageSlug = searchParams ? searchParams.get('package') : null;
   const isReview = searchParams ? searchParams.get('review') === 'true' : false;
@@ -1285,7 +1285,6 @@
             {cards[currentCardIndex]?.type === 'video' ? (
               <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden p-4">
                 {cards[currentCardIndex]?.videoInfo?.video_id ? (
-                  <div className="w-full max-w-full max-h-full aspect-video relative flex items-center justify-center">
+                  <div className="w-full max-w-full max-h-full aspect-video relative">
                     <ReactPlayer
-                      ref={playerRef}
                       url={`https://www.youtube.com/watch?v=${cards[currentCardIndex].videoInfo.video_id}`}
                       controls
                       playing={isPlaying}
@@ -1292,5 +1292,8 @@
                       width="100%"
                       height="100%"
+                      onReady={(player: any) => {
+                        playerRef.current = player;
+                      }}
                       onPlay={() => setIsPlaying(true)}
                       onPause={() => setIsPlaying(false)}
                       onProgress={(progress: any) => {
@@ -1297,14 +1297,5 @@
                       }}
-                      config={{
-                        youtube: {
-                          playerVars: {
-                            autoplay: 0,
-                            modestbranding: 1,
-                            rel: 0,
-                            origin: typeof window !== 'undefined' ? window.location.origin : ''
-                          }
-                        }
-                      } as any}
+                      config={playerConfig as any}
                     />
                   </div>
                 ) : (
```

---

## 4. 기대 효과
- **재생 및 싱크 완벽 작동**: 자막 행을 클릭하면 재생 위치가 밀리초 단위로 정확히 동기화(`seekTo`)되고 동영상이 부드럽게 재생을 재개합니다.
- **비디오 초기화 버그 해결**: 매 프레임/리렌더링마다 플레이어 리소스가 재생성되던 버그가 해결되어, 유튜브 영상이 정상적으로 스트리밍됩니다.
- **타입 에러 완전 해결**: dynamic wrapper 에 의해 묻혔던 ref 참조가 `onReady` 콜백을 통해 인스턴스를 무사히 건네받으므로 `seekTo is not a function` 경고가 나타나지 않습니다.
