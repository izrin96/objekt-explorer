# Tasks

## 1. Centrifugo and data

- [x] 1.1 Add `"presence": true` to the `user` namespace in `centrifugo/config.json` (design decision 1). Restart the local Centrifugo with `docker compose --env-file .env --env-file .env.local restart centrifugo` (`up -d` leaves a running container on its old config). With a signed-in tab open against the local dev server, `curl -X POST -H "X-API-Key: …" -d '{"commands":[{"presence_stats":{"channel":"user:#<id>"}}]}' http://127.0.0.1:8000/api/batch` must answer `{"replies":[{"presence_stats":{"num_clients":1,…}}]}`. Record the exact reply shape in the 2.1 test fixtures. If batch rejects `presence_stats`, switch 2.2 to the single-call fallback in design decision 1.
- [x] 1.2 Add `showOnline: boolean("show_online").notNull().default(true)` to `user` in `packages/db/src/auth-schema.ts`, beside `showSocial`. Generate the migration with `bun run --filter=@repo/db db:generate`, and do not apply it; ask the user before applying it anywhere. The generated SQL must only add the column, and typecheck must pass for `@repo/db`.

## 2. Server

- [x] 2.1 Add the pure `packages/api/src/lib/presence.ts`:
  - `presenceStatsRequest(userIds)`, the `ApiRequest` for one batch;
  - `onlineFromReplies(userIds, replies)`, where an error, a missing reply or `num_clients: 0` means offline;
  - `showsOnlineTo({ viewerShows, shownShows, blocked, self })`.

  Add `presence.test.ts`, covering reply order, an error reply, a short `replies` array, a malformed body, the self case, a block, and each switch off. `bun test packages/api/src/lib/presence.test.ts` must pass.
- [x] 2.2 Add `query(request)` to `packages/api/src/realtime.ts`: one attempt, the same timeout, the parsed JSON, or `null` on unset, timeout or non-2xx, logged like `attempt`. Then add `services/presence.ts` `onlineAmong(viewerId, userIds)` (design decision 2): one rule query for `show_online` plus `notBlockedEither`; return `[]` when the viewer is off, without calling Centrifugo; return `[]` on a `null` reply. Lint and typecheck must pass for `@repo/api`.
- [x] 2.3 Add `routers/presence.ts` with `online`: authed; input `{ userIds: z.array(z.string()).max(100) }`, de-duplicated; output `{ online: string[] }`; `userRateLimited("presence", …, 60, 60)` refusing over the limit. Register it in `routers/index.ts`. Do not expose it in the public OpenAPI (`/api/v1`). Lint and typecheck must pass for `@repo/api`, and a local call with the dev server signed in must return an id that is online in another browser profile.
- [x] 2.4 Declare `showOnline` in Better Auth's `additionalFields` (`services/auth.ts`: `type: "boolean"`, `defaultValue: true`, `returned: true`, `input: false`). Add `showOnline: z.boolean().optional()` to `updateAccountInputSchema` (`schemas/user.ts`), and have `user.updateAccount` set the column only when it is present (design decision 4). An input without `showOnline`, as an open tab from before the deploy sends, must still validate and leave the column unchanged; the current user must carry `showOnline: true` for an account that never changed it. Lint and typecheck must pass for `@repo/api`.

## 3. Client presence

- [x] 3.1 Add the pure `apps/web/src/features/presence/watch.ts` (refcounted watch and unwatch, `dueIds`, chunking into groups of 100) with `watch.test.ts`. `bun test` must pass for it.
- [x] 3.2 Add `stores/presence.ts`, plus `useOnline`, `usePresencePoller` and `OnlineAvatar` in `features/presence/` (design decision 3): a 30 s tick while the tab is visible, a 300 ms debounce for newly watched ids, a full check on `visibilitychange` to visible, a refusal or error kept as no change, and false before hydration. Mount `usePresencePoller()` beside `useUserSocket()` in `components/layout/app-nav.tsx`, for signed-in users only. Add the `presence_online` ("Online") message in en, ja and ko. Lint, typecheck and build must pass for `web`.

## 4. Surfaces

- [x] 4.1 Use `OnlineAvatar` on the conversation rows in `features/chat/conversation-list.tsx`, and in `features/chat/thread/thread-header.tsx` with a visible "Online" on the secondary line. In the browser on the local dev server, with two signed-in profiles, the dot must appear within 60 s of the partner opening the site and go within 60 s of them closing it, and a screen reader must read "Online".
- [x] 4.2 Use `OnlineAvatar` in `features/trade/trade-header.tsx`, but not on the `you` row, and in `features/profile/profile-header.tsx`, only when `profile.userId` is set and it is not the viewer's own profile. In the browser: scroll Browse, and an online person's row must show the dot within 2 s; a signed-out visitor must see no dots on `/trade`. Lint, typecheck and build must pass for `web`.
- [x] 4.3 Add the Show when I'm online switch under the show-social switch in `features/account/sections/general.tsx`, as form state sent with Save, with en/ja/ko label and description text saying that off hides the user's own dot and still shows others'. Verify read-only against production data, or for real on a local account: Save sends `user.updateAccount` with `showOnline`, and after a local save other people's dots stay. Lint, typecheck and build must pass for `web`.

## 5. Integration and docs

- [x] 5.1 Check the visibility rules end to end on the local stack with two local accounts: the viewer off still sees others' dots and shows none; the person off shows none; a block either way hides both; a pending request still shows the dot. Also check failure: with Centrifugo stopped, `/messages` loads with no dots and no error toast. `bun run check` must pass.
- [x] 5.2 Update `AGENTS.md` docs:
  - `packages/api/AGENTS.md`: presence is read through `query()` and the batch builder in `lib/presence.ts`, and fails closed; `presence.online` is the only way out.
  - `apps/web/AGENTS.md`: show presence with `OnlineAvatar` and `useOnline`, never `PersonAvatar` plus a hand-made dot; the poller is one per tab.
  - Root `AGENTS.md`, Docker section: the `user` namespace has presence, and changing `centrifugo/config.json` needs a Centrifugo restart.

  The changed docs must read correctly against the code.

## Workflow follow-up

- Restart prod Centrifugo with the new config (`docker compose … restart centrifugo`, not `up -d`), then apply the `user.show_online` migration on staging and prod (user approval), then deploy web.
- Archive the change after review with `/opsx:archive`.
