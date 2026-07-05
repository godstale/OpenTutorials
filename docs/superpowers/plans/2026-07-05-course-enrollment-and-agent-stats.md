# 강좌 자동 수강/삭제 정합성 + 에이전트 상세 탭/통계 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 강좌 등록 시 자동 수강 처리, 강좌 삭제 시 수강 데이터 cascade 삭제, 에이전트 상세 탭 순서/기억 개선, 통계 탭 일별 집계 및 월별 그래프 추가.

**Architecture:** 기존에 이미 존재하는 `/api/courses/subscribe` 구독 API를 강좌 업로드 성공 콜백에서 재사용해 자동 수강을 구현한다. 강좌 삭제 API(`/api/admin/packages/[id]`)에 누락된 cascade delete를 추가한다. 에이전트 상세 페이지는 `Tabs`를 비제어→제어 컴포넌트로 전환해 `localStorage`에 마지막 탭을 기억시키고, 통계 탭은 raw 채팅 로그를 로컬 날짜 기준으로 집계해 `recharts` 막대그래프로 시각화한다.

**Tech Stack:** Next.js (App Router) + TypeScript + React 19, 기존 Mock-Supabase 로컬 DB(`db.json`), 신규 의존성 `recharts`.

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 러너(jest/vitest 등)가 설치되어 있지 않다 — 각 태스크의 검증은 `npm run lint`, `next build` 타입체크, 그리고 `npm run dev` 기반 수동/브라우저 검증으로 대체한다.
- 데스크탑 전용 로컬 앱이므로 인증/로그인은 없으며 항상 `local-user-id` 세션을 사용한다(코드에서 별도 처리 불필요).
- 기존 Supabase 클라이언트 문법(`.from().select().eq()...`)을 그대로 사용하고 `lib/db/local-db-server.ts` 내부 구현은 건드리지 않는다.
- 작업 완료 후 `wiki/log.md`에 작업 내역을 등록해야 한다(CLAUDE.md 규칙, 이 플랜의 마지막 태스크에서 처리).

---

### Task 1: 강좌 업로드 성공 시 자동 수강 등록 (A-1)

**Files:**
- Modify: `app/(user)/courses/manage/upload/page.tsx:477-485` (`handleSubmit` 내 업로드 성공 직후)
- Test fixture (임시, 커밋 대상 아님): OS 임시 디렉터리에 생성하는 Node 스크립트

**Interfaces:**
- Consumes: 기존 `app/api/courses/subscribe/route.ts`의 `POST` 핸들러 (변경 없음) — `{ package_id: string }`를 body로 받아 `{ success: true }` 또는 `{ error }`를 반환.
- Produces: 없음 (터미널 UI 동작 변경만 발생).

- [ ] **Step 1: 자동 수강 호출 코드 추가**

`app/(user)/courses/manage/upload/page.tsx`의 `handleSubmit` 함수에서, 모든 하위 강좌 업로드 루프가 끝난 직후(`setProgressPercent(100);` 바로 앞)에 아래 코드를 추가한다:

```tsx
      // 자동 수강 처리: 강좌 등록이 끝나면 즉시 본인 계정을 수강 상태로 전환한다.
      // 강좌 검색 화면이 아직 없어 별도의 수강 신청 진입점이 없기 때문.
      try {
        const subscribeRes = await fetch('/api/courses/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package_id: packageId }),
        });
        if (!subscribeRes.ok) {
          console.error('[AdminCoursesUpload] Auto-subscribe failed:', await subscribeRes.text());
        }
      } catch (subscribeErr) {
        console.error('[AdminCoursesUpload] Auto-subscribe request error:', subscribeErr);
      }

      setProgressPercent(100);
```

실패해도 등록 자체는 이미 완료된 상태이므로 `catch` 블록에서 사용자에게 별도 에러를 보여주지 않고 콘솔 로그만 남긴다(등록 성공 흐름은 그대로 유지).

- [ ] **Step 2: 테스트용 강좌 번들 zip 생성 스크립트 작성 및 실행**

프로젝트 루트에 임시 스크립트 `scripts/tmp-build-test-bundle.js`를 만든다(검증 후 Step 5에서 삭제):

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');

async function main() {
  const childZip = new JSZip();
  childZip.file('config.json', JSON.stringify({
    cards: ['lesson1.mdx'],
    toc: [
      { type: 'chapter', title: '테스트 챕터', description: '자동화 테스트용 챕터입니다.', filename: 'lesson1.mdx' }
    ]
  }, null, 2));
  childZip.file('wiki.md', '# 테스트 강좌\n\n자동화 테스트용 강좌입니다.');
  childZip.file('cards/lesson1.mdx', '# Lesson 1\n\nTest content.');
  const childZipBuffer = await childZip.generateAsync({ type: 'nodebuffer' });

  const outerZip = new JSZip();
  outerZip.file('package-manifest.json', JSON.stringify({
    title: '자동수강 테스트 패키지',
    slug: 'auto-enroll-test-package',
    courses: [
      { slug: 'auto-enroll-test-course', title: '자동수강 테스트 강좌', tags: [] }
    ]
  }, null, 2));
  outerZip.file('courses/auto-enroll-test-course.zip', childZipBuffer);
  const outerZipBuffer = await outerZip.generateAsync({ type: 'nodebuffer' });

  const outPath = path.join(os.tmpdir(), 'auto-enroll-test-bundle.zip');
  fs.writeFileSync(outPath, outerZipBuffer);
  console.log('Wrote', outPath);
}

main();
```

Run: `node scripts/tmp-build-test-bundle.js`
Expected: `Wrote <임시경로>/auto-enroll-test-bundle.zip` 출력. (프로젝트에 `jszip`이 이미 의존성으로 설치되어 있어 별도 설치 불필요.)

- [ ] **Step 3: 개발 서버 기동 및 브라우저로 업로드 실행**

Run: `npm run dev` (백그라운드로 실행, 포트 3000 확인)

브라우저 자동화 도구로 `http://localhost:3000/courses/manage/upload` 접속 후:
1. 숨겨진 `<input type="file" accept=".zip">`에 Step 2에서 생성한 zip 파일 경로를 설정한다.
2. 우측 "번들 사전 유효성 검증" 카드에 5개 항목이 모두 초록색(success)으로 표시될 때까지 대기한다.
3. "강좌 등록" 버튼을 클릭한다.
4. "모든 강좌 패키지 및 하위 강좌들이 성공적으로 등록되었습니다!" 문구가 뜨고 `/courses/manage`로 리다이렉트될 때까지 대기한다.

- [ ] **Step 4: db.json에서 자동 수강 결과 확인**

Run:
```bash
node -e "
const db = JSON.parse(require('fs').readFileSync('db.json','utf8'));
const pkg = db.course_packages.find(p => p.slug === 'auto-enroll-test-package');
console.log('package:', pkg && pkg.id);
const sub = db.user_package_subscriptions.find(s => s.package_id === pkg.id);
console.log('subscription:', sub);
const items = db.course_package_items.filter(i => i.package_id === pkg.id);
const progress = db.user_progress.filter(p => items.some(i => i.course_id === p.course_id));
console.log('progress rows:', progress.length, 'expected:', items.length);
"
```
Expected: `package:` 에 UUID 출력, `subscription:` 에 `user_id: 'local-user-id'`를 포함한 객체 출력(undefined 아님), `progress rows: 1 expected: 1`.

- [ ] **Step 5: 임시 스크립트 정리**

Run: `rm scripts/tmp-build-test-bundle.js` (디렉터리가 비면 함께 정리)

이 시점에는 아직 db.json에 테스트 픽스처(`auto-enroll-test-package` 등)가 남아있다 — Task 2에서 삭제 cascade를 검증할 때 그대로 재사용하고, Task 2 완료 시점에 완전히 제거한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(user)/courses/manage/upload/page.tsx"
git commit -m "feat: auto-enroll user when a new course package is registered"
```

---

### Task 2: 강좌 패키지 삭제 시 수강/진행 데이터 cascade 삭제 (A-2)

**Files:**
- Modify: `app/api/admin/packages/[id]/route.ts:87-128` (`DELETE` 핸들러, 기존 courses/storage 정리 블록 뒤)

**Interfaces:**
- Consumes: Task 1에서 생성된 `auto-enroll-test-package` 픽스처 데이터(있으면 재사용, 없으면 Task 1의 Step 2-4를 다시 실행해 만든다).
- Produces: 없음 (API 동작 변경만 발생).

- [ ] **Step 1: cascade delete 코드 추가**

`app/api/admin/packages/[id]/route.ts`의 기존 courses 삭제 블록(`if (courseIds.length > 0) { ... }`, storage 정리까지 포함) 바로 뒤, `return NextResponse.json({ success: true });` 앞에 추가한다:

```ts
    // 5. 패키지-강좌 매핑, 수강 구독, 진행 기록을 함께 정리한다.
    //    (안내 문구는 이미 "진행 정보가 완전히 삭제됩니다"라고 안내하고 있었으나
    //     실제로는 정리되지 않던 버그를 수정한다.)
    const { error: itemsDelError } = await supabaseAdmin
      .from('course_package_items')
      .delete()
      .eq('package_id', id);
    if (itemsDelError) {
      console.error('Failed to delete course_package_items:', itemsDelError);
    }

    const { error: subsDelError } = await supabaseAdmin
      .from('user_package_subscriptions')
      .delete()
      .eq('package_id', id);
    if (subsDelError) {
      console.error('Failed to delete user_package_subscriptions:', subsDelError);
    }

    if (courseIds.length > 0) {
      const { error: progressDelError } = await supabaseAdmin
        .from('user_progress')
        .delete()
        .in('course_id', courseIds);
      if (progressDelError) {
        console.error('Failed to delete user_progress:', progressDelError);
      }
    }
```

- [ ] **Step 2: 개발 서버로 삭제 API 직접 호출 (curl)**

`npm run dev`가 실행 중인 상태에서, Task 1에서 남겨둔 `auto-enroll-test-package`의 id를 조회한다:

```bash
node -e "
const db = JSON.parse(require('fs').readFileSync('db.json','utf8'));
const pkg = db.course_packages.find(p => p.slug === 'auto-enroll-test-package');
console.log(pkg.id);
"
```

출력된 id를 사용해 강제 삭제를 호출한다(수강자가 있으므로 `force=true` 필요):

```bash
curl -i -X DELETE "http://localhost:3000/api/admin/packages/<위에서_출력된_id>?force=true"
```

Expected: HTTP 200, body `{"success":true}`.

- [ ] **Step 3: db.json에서 완전 삭제 확인**

Run:
```bash
node -e "
const db = JSON.parse(require('fs').readFileSync('db.json','utf8'));
console.log('package:', db.course_packages.some(p => p.slug === 'auto-enroll-test-package'));
console.log('items:', db.course_package_items.some(i => i.package_id === undefined));
console.log('subs:', db.user_package_subscriptions.some(s => s.package_id === undefined));
console.log('has orphan course:', db.courses.some(c => c.slug === 'auto-enroll-test-course'));
"
```
Expected: `package: false`, `has orphan course: false` — 즉 `auto-enroll-test-package`, 그 하위 강좌, 관련 구독/진행 기록이 모두 사라져야 한다. (위 스크립트의 `items`/`subs` 라인은 예시일 뿐이며, 실제로는 `db.course_package_items`와 `db.user_package_subscriptions`에 삭제된 `package_id`를 가진 row가 하나도 없는지 `filter(...).length === 0`로 직접 확인한다.)

더 정확한 확인:
```bash
node -e "
const db = JSON.parse(require('fs').readFileSync('db.json','utf8'));
const deletedId = '<위에서_사용한_id>';
console.log('remaining items:', db.course_package_items.filter(i => i.package_id === deletedId).length);
console.log('remaining subs:', db.user_package_subscriptions.filter(s => s.package_id === deletedId).length);
"
```
Expected: 둘 다 `0`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/packages/\[id\]/route.ts
git commit -m "fix: cascade delete enrollment records when a course package is deleted"
```

---

### Task 3: 에이전트 상세 탭 순서 변경 + 마지막 탭 기억 (B)

**Files:**
- Modify: `app/(user)/my-agents/[id]/page.tsx:157-164` (상태 선언부)
- Modify: `app/(user)/my-agents/[id]/page.tsx:437-462` (`Tabs` 렌더 블록)

**Interfaces:**
- Consumes: 없음 (자체 완결).
- Produces: `activeTab` state, `handleTabChange` 핸들러 — Task 4에서는 사용하지 않지만 동일 컴포넌트 내에 존재하게 됨.

- [ ] **Step 1: 탭 상태를 제어 컴포넌트로 전환**

`app/(user)/my-agents/[id]/page.tsx:157-164`를 다음과 같이 수정한다 (기존 5줄 뒤에 2개 선언 추가):

```tsx
  const { id } = use(params);
  const [agent, setAgent] = useState<UserExternalAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);
  const [isIdleDisconnected, setIsIdleDisconnected] = useState(false);
  const [assignedCoursesCount, setAssignedCoursesCount] = useState(0);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'statistics';
    return window.localStorage.getItem(`agent-tab-${id}`) || 'statistics';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.localStorage.setItem(`agent-tab-${id}`, value);
  };
```

- [ ] **Step 2: 탭 순서 재배치 및 제어 컴포넌트로 연결**

`app/(user)/my-agents/[id]/page.tsx:437-462`의 기존 블록을 다음으로 교체한다:

```tsx
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
        <TabsList className="w-full sm:max-w-md grid grid-cols-3">
          <TabsTrigger value="statistics">
            통계
          </TabsTrigger>
          <TabsTrigger value="chat">
            대화 (Chat)
          </TabsTrigger>
          <TabsTrigger value="settings">
            설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentStatisticsTab agent={agent} coursesCount={assignedCoursesCount} />
        </TabsContent>

        <TabsContent value="chat" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentChatTab agent={agent} />
        </TabsContent>

        <TabsContent value="settings" className="border-none p-0 outline-none focus-visible:ring-0">
          <AgentSettingsTab agent={agent} />
        </TabsContent>
      </Tabs>
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (기존에 에러가 있었다면 그 목록과 동일해야 함 — 이 변경으로 새 에러가 추가되지 않아야 한다).

- [ ] **Step 4: 브라우저로 순서/기억 동작 확인**

`npm run dev` 실행 중, 브라우저 자동화 도구로:
1. `http://localhost:3000/my-agents`에서 아무 에이전트나 클릭해 상세 페이지로 이동.
2. 탭 순서가 [통계, 대화 (Chat), 설정] 인지 확인.
3. "설정" 탭을 클릭.
4. 브라우저를 새로고침(reload).
5. "설정" 탭이 그대로 선택되어 있는지 확인 (활성 탭 트리거에 강조 스타일이 적용되는지 확인).

- [ ] **Step 5: Commit**

```bash
git add "app/(user)/my-agents/[id]/page.tsx"
git commit -m "feat: reorder agent detail tabs and remember last selected tab"
```

---

### Task 4: recharts 추가 + 통계 탭 일별 집계/월별 그래프 (C)

**Files:**
- Modify: `package.json` (recharts 추가)
- Modify: `app/(user)/my-agents/[id]/page.tsx:5` (아이콘 import 추가)
- Modify: `app/(user)/my-agents/[id]/page.tsx:26-148` (`AgentStatisticsTab` 전체 교체)

**Interfaces:**
- Consumes: Task 3에서 만들어진 `activeTab`/`handleTabChange`는 사용하지 않음(무관). 기존 `ChatLog` 인터페이스(`app/(user)/my-agents/[id]/page.tsx:17-24`)는 변경 없이 그대로 사용.
- Produces: 없음 (터미널 UI 컴포넌트).

- [ ] **Step 1: recharts 설치**

Run: `npm install recharts@^2.15.0`
Expected: `package.json`의 `dependencies`에 `"recharts": "^2.15.0"`(또는 설치된 정확한 버전)가 추가됨.

- [ ] **Step 2: 아이콘 import 추가**

`app/(user)/my-agents/[id]/page.tsx:5`를 다음으로 교체한다:

```tsx
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
```

그리고 파일 상단 import 블록(9번째 줄 `import { Card, ...`) 아래에 recharts import를 추가한다:

```tsx
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
```

- [ ] **Step 3: `AgentStatisticsTab`을 일별 집계 + 월별 그래프 포함 버전으로 교체**

`app/(user)/my-agents/[id]/page.tsx:26-148`(기존 `function AgentStatisticsTab(...) { ... }` 전체)를 다음으로 교체한다:

```tsx
function toDailyBuckets(logs: ChatLog[]): Map<string, { ms: number; tokens: number }> {
  const map = new Map<string, { ms: number; tokens: number }>();
  for (const log of logs) {
    const d = new Date(log.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const bucket = map.get(dateKey) || { ms: 0, tokens: 0 };
    bucket.ms += log.duration_ms || 0;
    bucket.tokens += (log.input_token_size || 0) + (log.output_token_size || 0);
    map.set(dateKey, bucket);
  }
  return map;
}

interface DailySeriesPoint {
  day: number;
  ms: number;
  minutes: number;
  tokens: number;
}

function buildMonthSeries(
  dailyBuckets: Map<string, { ms: number; tokens: number }>,
  year: number,
  month: number
): DailySeriesPoint[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const series: DailySeriesPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const bucket = dailyBuckets.get(dateKey) || { ms: 0, tokens: 0 };
    series.push({
      day,
      ms: bucket.ms,
      minutes: Math.round((bucket.ms / 60000) * 10) / 10,
      tokens: bucket.tokens,
    });
  }
  return series;
}

function AgentStatisticsTab({ agent, coursesCount }: { agent: UserExternalAgent; coursesCount: number }) {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/external-agents/${agent.id}/chat`);
        if (res.ok) {
          const data = await res.json();
          setChatLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch chat logs for stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [agent.id]);

  const dailyBuckets = toDailyBuckets(chatLogs);
  const totalMs = Array.from(dailyBuckets.values()).reduce((acc, b) => acc + b.ms, 0);
  const totalTokens = Array.from(dailyBuckets.values()).reduce((acc, b) => acc + b.tokens, 0);
  const totalLogs = chatLogs.length;
  const avgMs = totalLogs > 0 ? totalMs / totalLogs : 0;
  const avgTokens = totalLogs > 0 ? Math.round(totalTokens / totalLogs) : 0;

  const formatTotalDuration = (ms: number) => {
    if (ms <= 0) return '0초';
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) {
      return `${totalSeconds.toFixed(1)}초`;
    }
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      return `${minutes}분 ${seconds}초`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  const formatAvgResponse = (ms: number) => {
    if (ms <= 0) return '0초';
    return `${(ms / 1000).toFixed(1)}초`;
  };

  const stats = {
    totalHours: formatTotalDuration(totalMs),
    avgResponse: formatAvgResponse(avgMs),
    totalTokens: `${totalTokens.toLocaleString()} 토큰`,
    avgTokens: `${avgTokens.toLocaleString()} 토큰`
  };

  const monthSeries = buildMonthSeries(dailyBuckets, viewYear, viewMonth);
  const hasDataInMonth = monthSeries.some((d) => d.ms > 0 || d.tokens > 0);
  const isCurrentOrFutureMonth =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">에이전트 사용량 통계</CardTitle>
            <CardDescription className="text-xs">
              현재 에이전트 인스턴스의 누적 및 평균 학습 지원 메트릭을 모니터링합니다. (챗 요청부터 응답까지의 누적 시간 기준)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">누적 사용 시간</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalHours}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">평균 응답 시간</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.avgResponse}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">누적 사용 토큰</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.totalTokens}</span>
              )}
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border flex flex-col justify-center h-24">
              <span className="text-xs text-muted-foreground font-semibold">회당 평균 사용 토큰</span>
              {isLoading ? (
                <span className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{stats.avgTokens}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">강좌 할당 통계</CardTitle>
            <CardDescription className="text-xs">
              현재 튜터가 전담하여 관리하는 로컬 강좌 개수입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="size-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{coursesCount}</span>
            </div>
            <span className="text-sm font-semibold mt-2">할당 강좌 수</span>
            <span className="text-xs text-muted-foreground text-center">
              {coursesCount > 0
                ? `현재 ${coursesCount}개의 강좌에 학습 튜터로 활성화되어 활동 중입니다.`
                : '현재 이 튜터가 할당된 강좌가 없습니다. 강좌 상세 화면에서 튜터를 지정할 수 있습니다.'}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold">일별 사용 현황</CardTitle>
            <CardDescription className="text-xs">선택한 달의 일별 사용 시간과 토큰 사용량입니다.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={goPrevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[92px] text-center">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={goNextMonth}
              disabled={isCurrentOrFutureMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-zinc-100 dark:bg-zinc-900/40 animate-pulse rounded-lg" />
          ) : !hasDataInMonth ? (
            <div className="py-12 text-center text-sm text-muted-foreground">이 달에는 기록된 대화가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">일별 사용 시간 (분)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}분`, '사용 시간']}
                      labelFormatter={(day) => `${viewMonth + 1}월 ${day}일`}
                    />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <p className="text-xs font-semibold text-muted-foreground mb-2">일별 사용 토큰</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} 토큰`, '토큰']}
                      labelFormatter={(day) => `${viewMonth + 1}월 ${day}일`}
                    />
                    <Bar dataKey="tokens" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. recharts의 `Tooltip formatter`/`labelFormatter` 타입 관련 에러가 발생하면, 해당 인자에 `(value: any)` / `(day: any)`로 완화해 타입 에러만 해소한다(런타임 동작은 위 코드와 동일하게 유지).

- [ ] **Step 5: 브라우저로 그래프 동작 확인**

`npm run dev` 실행 중, 브라우저 자동화 도구로 대화 기록이 있는 에이전트(예: 기존에 채팅 로그가 쌓여 있는 에이전트)의 상세 페이지 → "통계" 탭에서:
1. 4개 통계 카드(누적 사용 시간/평균 응답 시간/누적 사용 토큰/회당 평균 토큰)와 "강좌 할당 통계" 카드가 정상 표시되는지 확인.
2. 그 아래 "일별 사용 현황" 카드에 이번 달 라벨과 막대그래프 2개(사용 시간/토큰)가 표시되는지 확인.
3. "◀" 버튼으로 이전 달 이동이 되는지, 데이터가 없는 달은 "이 달에는 기록된 대화가 없습니다" 문구가 뜨는지 확인.
4. 현재 달에서 "▶" 버튼이 비활성화(disabled)되어 있는지 확인.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json "app/(user)/my-agents/[id]/page.tsx"
git commit -m "feat: add daily-aggregated usage charts to agent statistics tab"
```

---

### Task 5: Wiki 작업 내역 등록

**Files:**
- Modify: `wiki/log.md`
- Create: `wiki/sources/2026-07-05-course-enrollment-and-agent-stats-chart.md`

**Interfaces:** 없음 (문서 작업).

- [ ] **Step 1: 상세 작업 로그 파일 작성**

`wiki/log.md`와 기존 `wiki/sources/*.md` 문서들의 포맷을 참고하여, `wiki/sources/2026-07-05-course-enrollment-and-agent-stats-chart.md`에 Task 1~4에서 수행한 변경 사항(자동 수강, cascade 삭제, 탭 순서/기억, 일별 통계 그래프)을 정리한다.

- [ ] **Step 2: `wiki/log.md`에 항목 추가**

기존 `wiki/log.md`의 최신 항목 포맷(날짜, 한 줄 요약, 상세 문서 링크)을 그대로 따라 최상단(또는 해당 날짜 섹션)에 이번 작업 항목을 추가한다.

- [ ] **Step 3: Commit**

```bash
git add wiki/log.md wiki/sources/2026-07-05-course-enrollment-and-agent-stats-chart.md
git commit -m "docs: log course enrollment and agent stats chart work in wiki"
```

---

## Self-Review Notes

- **Spec coverage:** A-1(Task 1), A-2(Task 2), B(Task 3), C(Task 4), wiki 등록 의무(Task 5) 모두 태스크로 커버됨.
- **Placeholder scan:** 모든 코드 블록이 완전한 형태로 제공됨. "TODO"/"add appropriate" 류 표현 없음.
- **Type consistency:** `ChatLog` 인터페이스, `formatTotalDuration`/`formatAvgResponse` 헬퍼, `activeTab`/`handleTabChange` 네이밍이 Task 3~4에 걸쳐 동일하게 유지됨. `DailySeriesPoint`의 `day`/`ms`/`minutes`/`tokens` 필드명이 `buildMonthSeries` 반환값과 JSX의 `dataKey` 참조에서 일치함.
