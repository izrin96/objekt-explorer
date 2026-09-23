## 1. Read before editing

- [x] 1.1 Invoke `router-core`, `tanstack-start-best-practices`, `better-auth-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`; read this change's `design.md` and `specs/web-shell/spec.md`, `openspec/config.yaml`, the lab and website files listed under "Surfaces covered" in `proposal.md`, and `packages/api/src/{orpc.ts,routers/index.ts}`; verify by writing the `@repo/api` import path for each of: router, `ApiMessages`, `auth`, `User` type, `cacheUsers`, `rateLimit`, `getAccessToken`, activity WebSocket exports.

## 2. API wiring

- [x] 2.1 Add `@orpc/client`, `@orpc/server`, `@orpc/tanstack-query`, `better-auth`, `@repo/api`, `@repo/cosmo` and `ofetch` (`catalog:`) to `apps/web/package.json` at the website's versions; `bun install`; verify `bun pm ls` shows single versions.
- [x] 2.2 Create `src/lib/api-messages.ts`, `src/lib/orpc.ts` (website `lib/orpc/client.ts` with `messages` in the server context) and `src/lib/auth-client.ts` (+ `getBaseURL` in `lib/utils.ts`); create `src/routes/rpc.$.ts`, `src/routes/api/auth.$.ts`, `src/routes/api/user.search.ts`, `src/routes/api/healthcheck.ts` from the website against `@repo/api`; verify `curl localhost:3200/api/healthcheck` is 200 and `POST /rpc/config/getArtists` returns the artists.
- [x] 2.3 Update `apps/web/server.ts` and add `apps/web/dev-websocket.ts` from the website with `@repo/api/activity`; add the `dev:ws` script; verify `bun run --filter=web dev:ws` listens on 3001 and a WebSocket to `ws://localhost:3001/ws` opens.

## 3. Data layer

- [x] 3.1 Create `features/user/{queries.ts,hooks.ts,search-store.ts}` and `features/artist/{cosmo-artist-provider.tsx,use-selected-artists.ts,artist-avatar.tsx}` per design decisions 1–3; verify `typecheck` passes and `grep -rn "useSession\|@/store/" apps/web/src` is empty.
- [x] 3.2 Edit `stores/settings.ts` per decision 4 (drop `language`, add `hideLabel`) and update the pre-paint script in `__root.tsx` only if its read of the store shape changes; verify a persisted `Dark` still applies before first paint.
- [x] 3.3 Add the root `loader` prefetching `config.getArtists`, `config.getSelectedArtists`, `user.currentUser`, wrap the tree in `CosmoArtistProvider`; verify the SSR HTML of `/` contains the nav in its signed-in or signed-out state with no client-side pending flash.

## 4. Frame

- [x] 4.1 Create placeholder routes `(container)/{market,activity,list,link,login}.tsx` (login with the `redirect` search schema) and `@{$nickname}/{route,index}.tsx` per decision 6; verify each renders its `PageHeader` and `typecheck` passes.
- [x] 4.2 Port `components/layout/{app-nav,mobile-nav}.tsx` from the lab (typed links, active state, sheet closing on navigation, status dot); verify at 1280 px the active link matches the route and at 390 px the sheet opens, navigates and closes.
- [x] 4.3 Port `components/layout/system-status.tsx` onto `orpc.status.get` with the popover rows and skeleton; verify the popover shows database and Cosmo rows with the last transfer time.
- [x] 4.4 Port `components/layout/nav-search.tsx` per decision 5 with `/api/user/search`, Recent (max 7, persisted under `web:recent-users`), Clear history, raw-address row, 429 handling; verify a search navigates to `/@<nickname>`, Recent shows it on the next open, Clear history empties it without closing, and a `0x…` query with no match offers the address row.
- [x] 4.5 Port `components/layout/user-menu.tsx` (`UserMenu` with header, Artists submenu, Settings, Sign out; `SignedOutNav`) and `features/settings/{settings-dialog,artists-menu}.tsx` per decisions 3–4; verify sign out flips the nav without reload and `/api/auth/get-session` then returns null, Sign in from `/market` links to `/login?redirect=/market`, turning an artist off survives a hard reload in the SSR HTML, the last artist cannot be turned off, and choosing 한국어 re-renders in Korean.

## 5. Verify

- [x] 5.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip` (no new findings beyond `components/ui`), `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [x] 5.2 Browser pass of `/`, `/market`, `/@<nickname>` and the search dialog at 390 px and 1280 px in both themes with the dev overflow guard silent; record what was opened.
- [x] 5.3 Comment audit: `grep -nE "^\s*(//|/\*|\*)" ` over new files under `components/layout` and `features/` shows only "why" comments; remove anything narrative.
