# Admin API Build Error Fix

## Prompt
현재 PR 에 올라간 코드들이 CI 과정에서 아래와 같은 에러를 발생시킨다. 하지만 배포는 가능한 상태인것 같다. (Vercel build 에서 `cookies()` rejection error 가 발생하는 상황)

## History
1. `/api/admin/stats` 및 `/api/admin/users` 등에서 빌드 시 `Error: During prerendering, cookies() rejects when the prerender is complete` 에러 발생 확인.
2. Next.js App Router 의 동적 라우팅 설정 중 `export const dynamic = 'force-dynamic'` 을 추가하여 해결을 시도함.
3. 하지만 프로젝트 설정에 `cacheComponents` 가 활성화되어 있어 `export const dynamic = 'force-dynamic'` 이 충돌함. (Next.js 15+ 캐싱 규칙)
4. 대안으로 `GET` 핸들러에 `request: NextRequest` 인자를 명시하여 Next.js 에 동적 라우팅임을 알리려고 했으나, 여전히 에러가 로깅됨.
5. 원인 분석: `cookies()` 를 호출하는 `requireAdmin` 함수가 `try...catch` 블록 안에 있었음. Next.js 는 정적 생성 과정에서 동적 함수를 마주치면 의도적으로 에러를 던져 빌드 과정에서 Bailout (동적 라우팅으로 전환)을 수행하는데, `try...catch` 가 이 에러를 삼켜버려서 비정상적인 종료 및 에러 로깅이 발생함.
6. 해결: `requireAdmin` (및 `cookies()` 호출부) 을 `try...catch` 밖으로 꺼내어 Next.js 가 Bailout 에러를 정상적으로 처리하도록 수정.
7. 빌드 성공 확인.

## Result
`app/api/admin/stats/route.ts`, `app/api/admin/users/route.ts`, `app/api/admin/macros/route.ts`, `app/api/admin/hydra-services/route.ts`, `app/api/macros/route.ts` 5개의 파일에서 `GET(request: NextRequest)` 인자를 추가하고, `requireAdmin()` 호출을 `try...catch` 블록 외부로 이동하여 Vercel build 시 발생하는 `cookies()` rejection 에러를 완벽히 해결함.

## Tags
- nextjs
- vercel
- build-error
- app-router
- cookies
- prerender
