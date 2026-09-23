## 1. Read before editing

- [x] 1.1 Invoke the `start-core`, `router-core`, `tanstack-start-best-practices`, `turborepo` and `baseline-ui` skills, then read this change's `design.md`, `apps/website/{vite.config.ts,tsconfig.json,oxlint.config.ts,package.json}`, `apps/website/src/{router.tsx,client.tsx,server.ts,routes/__root.tsx}`, `apps/lab/{index.html,src/routes/root.tsx,src/store/settings.ts,src/lib/utils.ts}` and port notes 4 and 7 in `design/lab-code-review.md`; verify by noting the inline theme script from `apps/lab/index.html` and the website's `head()` links list in your working notes.

## 2. Package and toolchain

- [x] 2.1 Create `apps/web/package.json` (`name: "web"`, scripts as in `website` with port 3200 on `dev`/`preview`, dependencies per design decision 7 at the versions `apps/lab` and `apps/website` already pin), `tsconfig.json` and `oxlint.config.ts` copied from `website`, `components.json` from `lab`; run `bun install`; verify `bun pm ls` shows no new top-level version of any shared dependency.
- [x] 2.2 Create `apps/web/vite.config.ts` per design decision 3 and copy `project.inlang/settings.json` plus `messages/{en,ko,ja}.json` from `website`; add `.gitignore` entries for `src/paraglide` and `src/routeTree.gen.ts` matching `website`; verify `bun run --filter=web paraglide:compile` succeeds.
- [x] 2.3 Add the `apps/web` workspace to `knip.json` (entry `src/routes/**/*.{ts,tsx}`, `src/{client,server,router}.tsx`, `server.ts`; project `src/**/*.{ts,tsx,css}`) and `bun run dev --filter=web` to `.superset/config.json` `run`; verify `bun run knip` prints no configuration hints.

## 3. Copy the lab foundation

- [x] 3.1 Copy `apps/lab/src/styles/app.css` to `apps/web/src/styles/app.css` and append the `noto-sans-kr` and `noto-sans-sc` `@import`s the website's `app.css` carries; copy `apps/lab/src/components/ui/*` and `components/shared/*` (excluding `not-implemented.ts`) verbatim; verify `diff -r apps/lab/src/components/ui apps/web/src/components/ui` is empty.
- [x] 3.2 Copy `apps/lab/src/lib/{utils,a11y,color,address,time,dev-overflow-guard}.ts`, `hooks/{use-debounced-callback,use-element-size,use-long-press}.ts` and `store/settings.ts` → `apps/web/src/stores/settings.ts`; rewrite `@/store/` → `@/stores/` and the persist key `lab:settings` → `web:settings`; add `SITE_NAME` to `lib/utils.ts`; verify `grep -rn "lab:" apps/web/src` is empty and `bun run typecheck --filter=web` passes for these files.
- [x] 3.3 Copy `apps/website/public/*` (favicons, manifest, `assets/`) to `apps/web/public/` and `apps/website/src/lib/meta.ts` to `apps/web/src/lib/meta.ts`; copy `apps/website/src/lib/env/client.ts`; verify the files exist and `typecheck` still passes.

## 4. Entry points and routes

- [x] 4.1 Create `src/client.tsx`, `src/server.ts` and `src/router.tsx` from the website's versions (query client with the same `staleTime`, `setupRouterSsrQueryIntegration`, `defaultPreload: "intent"`, the three default components from task 4.3, `Register` declaration); verify `typecheck` passes.
- [x] 4.2 Create `src/routes/__root.tsx` per design decision 4, including the pre-paint theme/wide inline script, `ToastProvider`, the `overflow-x-clip` wrapper, the DEV-only `OverflowGuard`, and `useApplySettings`; verify a hard reload with `Dark` persisted shows no light frame (record a slow-motion screen capture or a performance trace with screenshots).
- [x] 4.3 Create `src/components/router/{error-boundary,not-found,pending}.tsx` using `EmptyState`, `Button` and `Spinner` with `m.*` strings; verify `/does-not-exist` returns 404 with the not-found surface and a link to `/`, and that throwing from a temporary test route shows the error surface (remove the test route after).
- [x] 4.4 Create `src/routes/(container)/route.tsx` with the `containerClass` `<main data-overflow-guard>` and `src/routes/(container)/index.tsx` rendering `<PageHeader title=… description=…>` from `m.*`; verify `/` renders the header inside the container at 390 px and 1280 px in both themes with no horizontal scroll and no overflow-guard console output.
- [x] 4.5 Copy `apps/website/server.ts` to `apps/web/server.ts` without the activity-WebSocket import, start and close calls; verify `bun run build --filter=web` then `bun run --filter=web start:preview` serves `/` on the configured port.

## 5. Verify

- [x] 5.1 Run `bun run lint --filter=web` (0 errors, 0 warnings), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip` (only the expected unused-export findings under `components/ui`), and `git status --short` (only `apps/web/**`, `knip.json`, `.superset/config.json`, `bun.lock`); record all in the completion envelope.
- [x] 5.2 With `PARAGLIDE_LOCALE=ko` set in the browser, reload `/does-not-exist`; verify `<html lang="ko">` and Korean not-found text, then clear the cookie and verify `lang="en"`.
- [x] 5.3 Toggle `wide` by editing `localStorage["web:settings"]` in devtools and reloading at 1920 px; verify the container spans the viewport when on and is capped at the 2xl breakpoint when off, before hydration in both cases.
