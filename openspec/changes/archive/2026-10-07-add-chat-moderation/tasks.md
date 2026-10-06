## 1. Auth roles and schema

- [x] 1.1 Check the installed Better Auth admin plugin options with `ctx7` and the `better-auth-best-practices` skill. Add `admin()` with custom access control (design D1): no role gets any plugin permission, so every `/api/auth/admin/*` endpoint is refused for everyone. Add the plugin's columns to `auth-schema.ts` and the client plugin to the web auth client. A normal session gets 403 from each `/api/auth/admin/*` endpoint. Lint and typecheck pass for `@repo/api`, `@repo/db` and `web`.

  Server side done: `packages/api/src/permissions.ts` holds `ac` and `roles` for the web client's `adminClient({ ac, roles })`, which the web half of the change adds. Verified 2026-10-07: a normal session gets 403 from all 13 admin endpoints, and impersonation is 403 for moderator and admin.
- [x] 1.2 Add `user_block`, `report`, `message_flag`, `user_sanction`, `mod_audit` and `message.caution` to `schema.ts` (design D3), with the stated foreign keys and indexes. Run `db:generate` after `add-chat`'s migration exists. Read the SQL to confirm it only adds these and the auth columns. Check that `DATABASE_URL` is localhost, then apply it locally. Never apply it to production.
- [x] 1.3 Add `packages/api/scripts/set-role.ts` with a `set-role` script (design D9). It prints the host, asks for confirmation, and refuses a non-localhost host without `--production`. On local, set the smoke account to admin.

## 2. Pure modules

- [x] 2.1 Add `lib/scam-patterns.ts` (design D5) and `scam-patterns.test.ts`. The tests cover English, Korean and Japanese "send first", payment app names and links, and some false-positive guards (for example "first class", "sent it first thing"). `bun test` passes.
- [x] 2.2 Add `lib/sanctions.ts` with the pure rules:
  - whether a sanction is active at time t;
  - the ladder durations;
  - the 24 h report limit;
  - excerpt shaping, at most 20 entries with `fromTarget`.

  Add tests. `bun test` passes, and lint and typecheck pass for `@repo/api`.

## 3. Enforcement

- [x] 3.1 Add `services/safety.ts` with `notBlockedEither`, `notTradeBlocked` and `activeChatMute` (design D4). Apply them at every call site:
  - `trade-feed.ts` stage 1 and `collectionPostCounts`;
  - `trade-matches.ts` stage 1 (count blocked partners in Not shown separately);
  - the `market.ts` summary, listings and stats;
  - `chat.start`, `chat.send` and the `chat.list` blocker filter;
  - `want-alerts.ts` pair selection.

  Fold a `market:v` version into Market's cache keys, and bump it and the trade versions on block, unblock, sanction and revoke. Grep proves every list read in those files uses the fragment. On local, a trade block removes a seller from Market, Trade and For you on the next load. Lint, typecheck and build pass for `@repo/api`, `worker` and `web`.
- [x] 3.2 In `chat.send`, run the scam patterns, then store `message.caution` and the `message_flag` rows in the same transaction. In `chat.thread`, return `caution` only on received messages, and `sendBlocked` for an active chat mute (design D5, D8). Verify over local `/rpc`. Lint and typecheck pass for `@repo/api`.

## 4. Moderation API

- [x] 4.1 Add `routers/moderation.ts` (design D6, D7) and register it outside `openApiRouter`:
  - `block`, `unblock`, `blocked`, `report` (excerpt copy and also-block in one transaction), `banNotice`;
  - behind the moderator middleware (NOT_FOUND for others): `queue`, `account`, `act`, `revoke`, and the admin-only `setRole`.

  Bans, unbans and role changes go through the internal adapter (design D1), never the plugin endpoints. Every action writes `mod_audit` and resolves open reports. Warn, chat mute and trade block create a `sanction` notification. Over local `/rpc`:
  - a normal user gets NOT_FOUND from `queue`;
  - `account` never returns text that isn't in an excerpt;
  - a 7-day mute blocks `chat.send` and expires;
  - a ban revokes the sessions and refuses sign-in;
  - a second report within 24 h is refused.

  Lint and typecheck pass for `@repo/api`.
- [x] 4.2 Implement the ban notice (design D2). Use `bannedUserMessage` as a function if the installed version supports it, otherwise the signed-token follow-up. On local, signing in as a banned test account shows the reason and end date, and a wrong password shows the normal error with no ban information. Lint and typecheck pass for `@repo/api` and `web`.

  1.7.7 takes `bannedUserMessage` as a function, so there is no token and no `banNotice` call. The `BANNED_USER` error's message is JSON `{ reason, until }` (`parseBanNotice` in `schemas/moderation.ts`) for the web to word. Verified on local over `/api/auth/sign-in/email`; the sign-in UI is the web half.

## 5. Web

- [x] 5.1 Add Block and Report… to:
  - the conversation menu;
  - the profile header menu;
  - the Trade post menu (Block);
  - the For you row (Block, beside Hide partner).

  Report… opens `features/moderation/report-dialog.tsx` with the reasons, the note, share-last-20 (on, conversation only) and also-block. Add the Blocked users section to the account dialog. Add the caution line under received flagged messages and the mute notice in place of the composer. Add the `sanction` notification rendering in the bell. In the browser at 1280 and 390 px, with two local test sessions, block, unblock, report and caution behave as specified. Lint, typecheck and build pass for `web`.
- [x] 5.2 Add `routes/(container)/mod/reports.tsx` and `mod/reports/$userId.tsx`, guarded by role in `beforeLoad`, showing:
  - the queue;
  - the account page with signals, reports and excerpts, flags, sanctions and audit;
  - the action form with a required reason;
  - revoke;
  - for admins, grant or remove moderator.

  In the browser as the local admin: act on a seeded report, see the audit entry, revoke it. As a normal user, the not-found surface. Lint, typecheck and build pass for `web`. Use `better-interface` to review the console and fix what it finds.

## 6. Whole-change checks

- [x] 6.1 `bun run check` and `bun run build --filter=web` pass. The format check is clean, and `bun run knip` reports no new unused exports.
- [x] 6.2 Walk every `web-moderation` scenario and every delta scenario in the browser against local, recording each as passed or read-only verified. Remove all local test accounts, sessions, reports, sanctions and audit rows created for testing, and reset the smoke account's role if it was changed only for testing. Confirm production was never written.
