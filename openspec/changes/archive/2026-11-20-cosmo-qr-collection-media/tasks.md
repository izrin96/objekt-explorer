# Tasks

## How every task is checked

- **Package checks.** A task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for each package it touches (`--filter=@repo/cosmo`, `@repo/lib`, `@repo/db`, `@repo/api`, `worker` or `web`). `@repo/cosmo` and `@repo/lib` have no build script, so a task touching them also builds the package that imports the change (`web` or `worker`).
- **Tests.** They cover pure modules only, run with `bun test` beside the code, and never touch the database, Redis, Cosmo or the browser container.
- **Production.** It is only read. A flow that writes, or that calls Cosmo, is verified up to the request boundary and recorded as "read-only verified".
- **Local rows.** Seeding a `cosmo_session` row (a dummy sealed value, never a real cookie) or a `collection_media` row on the local database needs the owner's approval first, once per task that asks for it.
- **The bucket.** The root `.env`'s `S3_*` names the production R2 bucket, and the repo has no local one (no MinIO in the compose file). An upload is verified up to the put it would send, with `S3_ENDPOINT` in `.env.local` pointed at an unreachable local port, and recorded as "read-only verified". The first real upload is an owner step (8.8).
- **Owner steps.** Tasks marked **(owner)** call Cosmo with a real account, apply a migration, or change the VPS. Only the owner runs them.
- **Wording.** Every task implements from design.md. "Decision N" means design.md, Decisions, section N.

## Built; pending owner checks

These are built. Each stays open until the owner runs the check named here, since it needs the local dev server, a seeded local row (see Local rows) or a production read:

- 5.3: start refusing `cosmo_session_unavailable`, and refusing before any Cosmo call with Redis unreachable.
- 5.4: the signed-out, empty-list, two-owner and staff-role checks, and the `x-real-ip` read on production.
- 5.5: a ban deleting a seeded row and logging its sign-out; a trade block leaving it.
- 6.1, 6.3, 6.4, 6.5: the section, dialog, list (with the expiry line and Renew, Decision 7) and summary line on the local dev server.
- 6.2: built and tested (`expiryNotice` included); left open with the dialog it drives (6.3).
- 8.2: a silent run with no rows, and a seeded row sealed under another key.
- 8.4: the seeded copy runs (a refused sniff, an off-allowlist source, a redirect).
- 9.1: a collection without media unchanged on the local dev server.

**Local live checks, 2026-11-17** (owner-approved seeded rows; worktree `.env.local` adds a throwaway `COSMO_SESSION_KEY`, `COSMO_BROWSER_URL` and `S3_ENDPOINT` on dead local ports; every seeded cookie sealed under a second throwaway key, so nothing reached Cosmo or the bucket). Passed: 5.3, 5.5, 6.1, 6.2, 6.4, 6.5, 8.2, 8.4, 9.1, 10.6. Still open:
- 5.4: every local check passed; the `x-real-ip` read on production is not run.
- 6.3: Connect sends the start request and the `unavailable` state renders; `minting` and `busy` are not rendered (suggest `/state-machine`), and a real start stays with 8.8.
- 5.5: the ban deleted the row, but no sign-out was sent, since the seeded cookie cannot open. A real sign-out is first exercised in production.
- 8.4: the redirect case used `https://shop.cosmo.fans/` (308).

## 1. Cosmo client: parsing (pure)

- [x] 1.1 Add `zod` (`"catalog:"`) to `packages/cosmo/package.json`, then create `packages/cosmo/src/session-parse.ts`:
  - `parseSessionCookie(setCookie: string[])` returns `{ value, expiresAt }` for `user-session`, or null. `expiresAt` comes from `Max-Age`, then `Expires`, and is null when neither is usable; a cookie without one still signs in, since the 180-day max age bounds it.
  - `ticketStatusSchema` maps `wait_for_user_action`, `wait_for_certify` and `certified`, and maps any other status to `{ status: "unknown" }`.
  - `sessionUserSchema` keeps only `nickname` and `address`.
  - `objektSummariesSchema` returns `{ collectionCount, collections, skipped }`. It parses each item on its own, keeping `collection.{collectionId, frontMedia, bandImageUrl, hasVoice, backImage, accentColor, textColor}` and dropping `count` and `objekts`.
  - `errorKindOf(status, body, withCookie)`: 401 or 403 with a cookie and Cosmo's JSON `error` body is `dead`; a 403 with any other body (a firewall page) is `unavailable`; 429 is `busy`; any other 4xx `refused`; 5xx or a timeout `unavailable`; anything else `unexpected`.

  `session-parse.test.ts` uses fixtures shaped like the design's Context, with made-up values:
  - a `Set-Cookie` with `Expires`, and one without `user-session`;
  - a `users/me` body carrying `email` and `birth`: both are absent after parsing;
  - an unknown status;
  - a summaries page with one malformed item (`skipped: 1`);
  - every `errorKindOf` branch, including a 403 with an HTML body.

  `bun test packages/cosmo` passes. Lint and typecheck pass for `@repo/cosmo`, and build passes for `web`.

## 2. Sealing and the scrubber (`packages/lib`)

- [x] 2.1 Create `packages/lib/src/server/sealed.ts`: `seal(plaintext, keyBase64, aad)` and `open(sealed, keyBase64, aad)` over AES-256-GCM with a random 12-byte IV, giving `v1.<iv>.<ct>.<tag>` in base64url (Decision 6). A key that does not decode to 32 bytes throws. Export `sessionAad(userId, address)`, which builds `cosmo_session:<userId>:<lowercased address>`.

  `sealed.test.ts` checks:
  - a round trip;
  - two seals of one value differ;
  - a wrong AAD fails, including the same address under another user id;
  - a wrong key fails;
  - a flipped tag byte fails;
  - an unknown version prefix fails;
  - a 16-byte key throws.

  `bun test packages/lib` passes. Lint and typecheck pass for `@repo/lib`. Build passes for `worker`.
- [x] 2.2 In `packages/lib/src/error-scrub.ts`, add `ticket|otp|recaptcha|qr|user-session|cookie_?sealed` to `PRIVATE_KEY`. In `error-scrub.test.ts`, add cases showing each key's value is scrubbed from `extra`, a context and a breadcrumb's data.

  `bun test packages/lib` passes. Lint and typecheck pass for `@repo/lib`. Build passes for `web` and `worker`.

## 3. Cosmo client: calls and the reCAPTCHA browser

- [x] 3.1 Create the client calls (Decision 5):
  - `packages/cosmo/src/server/shop.ts`: `cosmoShop` and `CosmoSessionError`.
  - `qr-auth.ts`: `createLoginTicket`, `readLoginTicket` and `certifyLoginTicket`. Certify goes through `.raw` with `retry: 0`.
  - `session.ts`: `fetchSessionUser`, `logoutSession` and `fetchObjektSummaries`, each with no retry.

  Every call spreads `cosmoProxyOptions`. Every error is caught and rethrown as `CosmoSessionError` through `errorKindOf`, with no URL, body or header. Read the diff to confirm no `FetchError` escapes and no POST retries.

  Lint and typecheck pass for `@repo/cosmo`, and build passes for `web` and `worker`.
- [x] 3.2 Create `packages/cosmo/src/cdp.ts` (pure) and `src/server/recaptcha.ts` (Decision 3).
  - `cdp.ts`: a command encoder with a counter for `id`, a reply matcher by `id` and `sessionId`, and `renderKeyFrom(scriptSrcs)`, which pulls the `render=` key out of the reCAPTCHA script URLs.
  - `recaptcha.ts`: `mintRecaptchaToken(browserUrl)`, using Bun's `WebSocket`. It covers createTarget, attach, navigate to the fixed shop URL, poll for `grecaptcha` for 25 s at most, and execute with action `login`. It closes the target and the socket in `finally`, has a 45 s cap, launches the browser with `--proxy-server` from `COSMO_PROXY` when it is set, throws `CosmoSessionError` `busy` when browserless refuses the connection with 429 (queue full), and `unavailable` on any other failure.

  `cdp.test.ts` covers encoding, matching a reply among events, and `renderKeyFrom` with zero, one and two scripts.

  `bun test packages/cosmo` passes. Lint and typecheck pass for `@repo/cosmo`, and build passes for `web`.
- [x] 3.3 Add the browser service and the env vars:
  - In `docker-compose.yml`, add a `browser` service: `ghcr.io/browserless/chromium` pinned to a version tag at least two weeks old, `expose: ["3000"]`, `TOKEN=${COSMO_BROWSER_TOKEN}`, `CONCURRENT=2`, `QUEUED=4`, `TIMEOUT=60000`, `restart: always`.
  - Add `COSMO_BROWSER_URL` and `COSMO_SESSION_KEY` to the `web` environment, and `COSMO_SESSION_KEY` to the `worker` environment.
  - In `docker-compose.override.yml`, publish the browser on `127.0.0.1:3001`.
  - In `.env.example`, add `COSMO_SESSION_KEY=` (a comment above it: `openssl rand -base64 32`; never `COSMO_KEY`), `COSMO_BROWSER_TOKEN=` and `COSMO_BROWSER_URL=`.
  - In `packages/api/src/env.ts`, add `COSMO_SESSION_KEY` and `COSMO_BROWSER_URL`, both optional.

  `docker compose config` exits 0. Lint, typecheck and build pass for `@repo/api` and `web`.
- [x] 3.4 **(owner)** Tracer bullet, before any UI. Start the `browser` service where the web will run (the VPS) and run a one-off `bun -e` there. It calls `mintRecaptchaToken` and then `createLoginTicket`, and prints only the status and `expireAt`. Nothing is scanned or stored.
  - **Pass:** 201 with an `expireAt` about 180 s ahead.
  - **On `INVALID_RECAPTCHA`:** stop here. Try the proxy launch argument, or a headed image, and record the result in design.md, Decision 3, before task 5.

## 4. App schema

- [x] 4.1 In `packages/db/src/schema.ts`, add `cosmoSession` and `collectionMedia` with the columns of Decisions 6 and 8:
  - `cosmo_session.user_id` `NOT NULL` → `user.id` `ON DELETE CASCADE`, with an index;
  - a unique index on `cosmo_session.cosmo_address` (no Cosmo user id column);
  - `cookie_sealed` nullable, with a CHECK that `(dead_at IS NULL) = (cookie_sealed IS NOT NULL)`;
  - `cookie_expires_at` `NOT NULL`, `next_sync_at` `NOT NULL DEFAULT now()` with a partial index `WHERE dead_at IS NULL`, and `sync_cursor` `jsonb`;
  - a CHECK on `last_error` in `('session_dead','session_expired','cosmo_unavailable','unexpected_response','key_unreadable')`;
  - `collection_media` with `observed_at` and `confirmed_at`, and no session or user column.
  - **Reopened for Decision 9.** `collection_media.front_media` and `band_image_url` widen from `varchar(255)` to `varchar(1024)` (the source, no longer bound by the indexer column), and the table gains `front_media_copy varchar(255)` and `front_media_failed_at timestamptz`, both nullable. `band_image_url` keeps Cosmo's URL only, with no copy column (Decision 8, Band images).

  The migration `20261117022946_cosmo_session_collection_media` was never applied anywhere, so delete its folder and run `bun run --filter=@repo/db db:generate` again, rather than adding a second migration. Read the SQL: two `CREATE TABLE`s, their indexes, foreign key and CHECKs, nothing else. Do not run `db:migrate`.

  Lint, typecheck and build pass for `@repo/db` and `@repo/api`.
- [x] 4.2 **(owner)** Apply the migration locally (`.env.local` on the compose Postgres) with `db:migrate` (done 2026-11-17: both tables and `expiry_notified_at` present; production applied through Dokploy the same day). On production, apply it with `docker compose run --build --rm migrate` before the deploy that reads the tables.

## 5. API: sign-in and sessions (`packages/api`)

- [x] 5.1 Create `packages/api/src/lib/cosmo-qr.ts` (pure), with `cosmo-qr.test.ts`:
  - `pollState(status, now)` returns `waiting`, `code` or `expired`. Unknown or remaining time ≤ 0 is `expired`; `certified` is `null` (keep the last state).
  - `certifyOutcome(kind, codeExpiresAt, now)` returns `wrong_code`, `expired` or `cosmo_error` (Decision 4).
  - `connectAllowed(existingAddresses, address, max = 3)`: true when the address is already among the user's, or they hold fewer than 3.

  `bun test packages/api/src/lib/cosmo-qr.test.ts` passes. Lint, typecheck and build pass for `@repo/api`.
- [x] 5.2 Create `packages/api/src/schemas/cosmo-session.ts`:
  - `COSMO_SESSION_REFUSALS` (Decision 4);
  - the certify input `{ otp: z.number().int().min(0).max(99) }`, and `{ id: z.number().int().positive() }` for sync and disconnect;
  - the list output `{ available, sessions }`: `available` is false when `COSMO_SESSION_KEY` or `COSMO_BROWSER_URL` is unset; `cosmoSessionRowSchema`, one per session: id, nickname, address, createdAt, expiresAt (`cookie_expires_at`), lastSyncedAt, lastSync counts, lastError, dead, syncRequested. It carries no cookie field and no user field;
  - `cosmoMediaSummarySchema`: `{ live, signedOut, recorded }` integers and `lastSyncedAt`, nothing else.

  Lint, typecheck and build pass for `@repo/api`.
  - *Done 2026-11-20 on the local dev server, through `/rpc` with real Better Auth sessions minted for local users (deleted afterwards): signed out, all six `cosmoSession` procedures answer 401 UNAUTHORIZED; a user with no row lists `[]`; the two seeded rows (ids 1 and 3, two owners, dummy sealed values) list only to their own owner; `requestSync` and `disconnect` on the other's id answer 404 `cosmo_session_not_found`, and the rows hash the same before and after; `cosmoMediaSummary` answers 200 to an admin, 403 FORBIDDEN to a moderator and 404 NOT_FOUND to a user. Production, read-only: the 15 live `*:rl:ip:*` keys in Valkey all carry an IP, none `unknown`, so the web's requests carry `x-real-ip`.*
- [x] 5.3 Create `packages/api/src/services/cosmo-session/`:
  - `ticket.ts`: the `cosmo-qr:<userId>` store, holding `{ticket, expireAt, last}`. It fails closed: an unreachable Redis returns `unavailable`.
  - `qr.ts`: `startQr`, `pollQr` and `certifyQr` (Decision 4).
    - Poll over the global limit returns `last` without a Cosmo call.
    - Certify runs one transaction: the caller's `"user"` row `FOR SHARE` (refuse `cosmo_session_not_allowed` when banned or deleted), `connectAllowed` (refuse `cosmo_session_limit`), then seal with `serverEnv.COSMO_SESSION_KEY` and `sessionAad(userId, address)` and upsert by `cosmo_address`, setting `user_id`, `sync_requested_at`, `cookie_expires_at` (the earlier of Cosmo's and now + 180 days), and clearing `dead_at`, `last_error` and `sync_cursor`. After commit it signs out a replaced cookie; after a refusal, the new one.
  - `sessions.ts`: `listSessions(userId)`, `requestSync(userId, id)` and `disconnectSession(userId, id)`, each filtering by `user_id`, so another user's id finds no row and refuses `cosmo_session_not_found`. Disconnect skips the Cosmo sign-out for a dead row or a cookie that fails to open, and reports it as not confirmed. It also exports `revokeSessionsOf(tx, userId)`, which deletes the user's rows and returns the cookies to sign out after commit.
  - `summary.ts`: `mediaSummary()`, one statement of counts over `cosmo_session` and `collection_media`.

  Read-only verified with the dev server on the local database and no browser running:
  - start refuses `cosmo_session_unavailable`;
  - with `REDIS_URL` in `.env.local` pointed at an unreachable local port (never by stopping the production Valkey the root `.env` names), start refuses before any Cosmo call (log the request it would send).

  Lint, typecheck and build pass for `@repo/api`.
- [x] 5.4 Add the procedures:
  - `packages/api/src/routers/cosmo-session.ts`, every procedure on `authed`, each with the limits of Decisions 4 and 10: `list` (`.output` the list schema), `qrStart`, `qrPoll`, `qrCertify`, `requestSync` and `disconnect`. Mount it as `cosmoSession` in `router` only, never `openApiRouter`.
  - `cosmoMediaSummary` on `routers/admin.ts`, `adminOnly`, `.output(cosmoMediaSummarySchema)`.

  Confirm on the local dev server:
  - a signed-out caller gets UNAUTHORIZED from every `cosmoSession` procedure;
  - a signed-in user gets an empty list;
  - with two seeded local rows owned by two local users (see Local rows), each user's `list` shows only their own row, and `requestSync` or `disconnect` naming the other's id refuses `cosmo_session_not_found` and changes nothing;
  - `cosmoMediaSummary` answers an admin, FORBIDDEN to a moderator and NOT_FOUND to a user.
  - read-only on production: the web's requests carry `x-real-ip` (log its presence, never its value, on one request), since without it `ipRateLimited` keys every caller as `unknown` and becomes a site-wide limit.

  Lint, typecheck and build pass for `@repo/api`.
- [x] 5.5 Call `revokeSessionsOf`:
  - in `services/account/anonymize.ts`, inside the scrub transaction;
  - in `syncBan` (`services/moderation/core.ts`), in the branch that revokes the user's site sessions on a new ban, and return the cookies so `applyModAction` signs them out after commit.

  Confirm every ban goes through that branch: `grep` for writes of `banned` on `user` in `packages/api` and `apps/worker` (scripts included), and check whether Better Auth's `admin` plugin ban endpoints (`services/account/auth.ts`) are reachable; hook or block any path that bypasses `syncBan`.

  Read-only verified with a seeded local row (see Local rows): banning its local owner deletes the row and logs the sign-out it would send; a trade block leaves it.

  Lint, typecheck and build pass for `@repo/api`.

## 6. Web: the Collection data section

- [x] 6.1 Add the section (load `vercel-react-best-practices` first):
  - Add `/account/collection-data` to `SECTIONS` in `features/account/account-nav.tsx`, after `/account/profiles`.
  - Add `routes/(container)/account/collection-data.tsx`, with a loader on `cosmoSessionsOptions` and a `head` title.
  - Create `features/cosmo-session/queries.ts`.
  - Add the section label, title, the consent text of Decision 14 and the refusal strings (`api_errors_cosmo_session_*`, one per code in `COSMO_SESSION_REFUSALS`) to `messages/en.json`, `ko.json` and `ja.json` (ko 합니다체, ja full-width ？).

  On the local dev server: a signed-in user sees the section with the consent text and the empty state; with `COSMO_SESSION_KEY` unset in `.env.local` it says Cosmo sign-in is not set up; a signed-out visitor lands on `/login?redirect=/account/collection-data`. Lint, typecheck and build pass for `web`.
- [x] 6.2 Create `features/cosmo-session/connect-flow.ts` (pure) and `connect-flow.test.ts`:
  - the dialog's states: `minting`, `qr`, `code`, `submitting`, `connected`, `expired`, `wrongCode`, `cosmoError`, `unavailable`, `busy`, `limit`, `notAllowed`, `rateLimited`;
  - transitions from each procedure result and refusal code;
  - `remaining(expiresAt, now)` as `m:ss`, clamped at `0:00`;
  - `codeInput(raw)`, which keeps digits only, at most 2;
  - `expiryNotice(expiresAt, now)`: whole days left while fewer than `RENEW_NOTICE_DAYS` (14) remain, null outside that window or once past (Decision 7, Renew).

  `bun run test --filter=web` passes. Lint, typecheck and build pass for `web`.
- [x] 6.3 Build the connect dialog (load `vercel-react-best-practices` first):
  - Add `qrcode.react` to the root catalog and `apps/web`.
  - Create `features/cosmo-session/connect-dialog.tsx`, using the vendored `Dialog`:
    - `QRCodeSVG` on a white tile with a quiet zone, the countdown in `tabular-nums`, and an `Open Cosmo` link;
    - polling through `useQuery` with `refetchInterval: 3000` only in `qr`;
    - the code through the vendored `Input` (`inputMode="numeric"`, `autocomplete="one-time-code"`);
    - errors through `refusalText`;
    - strings in en, ko and ja.

  Read-only verified on the local dev server:
  - with the local browser container up (from 3.3), Connect is clicked up to the start request it sends;
  - the `minting`, `unavailable` and `busy` states render.

  Suggest the user run `/state-machine` on the dialog. Lint, typecheck and build pass for `web`.
  - *Done 2026-11-20 on the local dev server, with a throwaway `COSMO_SESSION_KEY` and an unreachable `COSMO_BROWSER_URL` (no browser container, so nothing reached Cosmo): Connect sent the start request (2 sent across the run); minting showed "Getting a code from Cosmo…" while the request was held 4 s in the page; the server's real refusal rendered the unavailable state with Try again; a `cosmo_session_busy` answer injected in the page rendered "Many people are connecting. Please try again in a minute."*
- [x] 6.4 Build the list in `features/cosmo-session/sessions-view.tsx` (load `vercel-react-best-practices` first):
  - the consent text above it;
  - each row as `web-cosmo-session`'s Connected account list requirement says, with a line in en, ko and ja for each `last_error` code (`key_unreadable` says to reconnect);
  - Sync now, with the list refetching every 10 s while any row has `syncRequested`;
  - the expiry date on a live row, and in its last 14 days "Expires in N days" (1 day and "Expires today" their own strings) with Renew, which opens the connect dialog (Decision 7, Renew);
  - Reconnect, which opens the connect dialog;
  - Disconnect behind the vendored `AlertDialog`, then a toast saying Cosmo did not confirm when the procedure reports it;
  - `font-mono` for addresses.

  Read-only verified with a seeded local row (see Local rows): Sync now and Disconnect are checked up to the request they send. Lint, typecheck and build pass for `web`.
- [x] 6.5 Add the Cosmo media summary line to the Collections tab (load `vercel-react-best-practices` first): a query on `admin.cosmoMediaSummary` in `features/moderation/` beside the collections queries, drawn as a " · " line above the table, with en, ko and ja strings. On the local dev server an admin sees the line with zeros, or "no Cosmo account is connected". Lint, typecheck and build pass for `web`.

## 7. Collection media planning (pure, `packages/lib`)

- [x] 7.1 Create `packages/lib/src/collection-media.ts` and `collection-media.test.ts`:
  - `observe(collections)` returns records keyed by `slugifyObjekt(collectionId)`.
  - `mergeRecord(stored, observed, now)` (Decision 8): an empty field takes the first non-empty value; an empty or null value never clears; a report whose non-empty fields all match, or that fills or replaces a value, sets `confirmedAt`; a different value replaces only when `confirmedAt` is more than 7 days old; `hasVoice` false never clears true.
  - `acceptMediaUrl(url)`: https, a host in the allowlist, at most 1,024 characters.
  - `planMediaWrite(row, record, budget, copyPrefix)` follows every row of the table in Decision 8: `has_audio` only from false to true; the back image and accent colour only when `""`; the text colour to `text_color` only while `source_text_color` is null, never to `source_text_color`; the background never; `backImageBudget` decremented.

  **Reopened for Decision 9** (`observe` and `mergeRecord` stay as built):
  - `MAX_URL_LENGTH` becomes 1,024 and its comment names the record's column, not the indexer's.
  - `planMediaWrite` takes the record with `frontMediaCopy` (a `MediaCopies` type beside `MediaRecord`, which the merge never sees) and a `copyPrefix`. It writes `front_media` from `frontMediaCopy` only when the copy starts with `copyPrefix`, is at most 255 characters, and differs from the row. It never writes `record.frontMedia`, and a null copy writes nothing. It never writes `band_image_url`, whatever the record holds (Decision 8, Band images).
  - Export `acceptCopyUrl(url, copyPrefix)` for that check.

  Tests cover each table row, two sessions alternating different values (the record stays), a value unconfirmed for 8 days (replaced), a differing report right after a replace (the new value stays), a malformed colour, an http URL, a 1,024- and a 1,025-character URL, an unknown host, and a budget of 0. The reopened part adds: a record with Cosmo's URL and no copy writes no `front_media`; a copy under the prefix writes our URL; a copy outside the prefix, or over 255 characters, writes nothing; an unchanged copy writes nothing; a record with a `bandImageUrl` and a row with none writes no `band_image_url`. The existing `front_media` tests change to give the record a copy, and the existing `band_image_url` write test becomes that no-write test.

  `bun test packages/lib` passes. Lint and typecheck pass for `@repo/lib`. Build passes for `worker`.
- [x] 7.2 Create `packages/lib/src/server/collection-media.ts` (env-free):
  - `lockMediaRow(tx, slug)`: `SET LOCAL lock_timeout = '5s'`, then `FOR UPDATE` of the media and colour columns;
  - `writeMediaSet(tx, slug, set)`, which updates only the planned columns.

  Move the Spin `held-by` key builder to a pure module that `services/objekt/owned.ts` and the worker both import.

  Lint and typecheck pass for `@repo/lib`. Build passes for `@repo/api` and `worker`.

## 8. Worker: the sync job

- [x] 8.1 Create `apps/worker/src/lib/media-sync.ts` (pure) and its test (Decision 10):
  - `nextPage({ page, received, collectionCount, pageLength })`, which stops at the count, on a short page, or at 40 pages;
  - `orderDue(sessions, now)`: due when requested or `next_sync_at` or `cookie_expires_at` has passed, ordered cursor first, then requested by request time, then by `next_sync_at`;
  - `nextSyncAt(id, completedAt)`: 72 hours plus the id hashed to 0 to 360 minutes, the same for the same id;
  - `nextBackoff(previousMinutes)`: 5, then doubling, capped at 120;
  - `RunBudget`: 50 requests and 4 minutes, with `canStartSession()` false below 2 requests left.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.
- [x] 8.2 Create `apps/worker/src/job/collection-media.ts` (Decision 10):
  - **Sync phase**, skipped while `collection-media:backoff` (through `@/lib/redis`, with an in-process copy when Redis is unreachable) is in the future:
    - Read due sessions with `db` and `orderDue`; open each cookie with `process.env.COSMO_SESSION_KEY` and `sessionAad`. A failure to open skips that session with no Cosmo call: `last_error = key_unreadable`, `next_sync_at = now + 6 hours`, `dead_at` and the cookie unchanged; one `warn` per run carries the count.
    - An expired session (`cookie_expires_at` passed): sign out, set `dead_at`, `last_error = session_expired`, `cookie_sealed = null`.
    - Otherwise call `users/me`, then page every artist from `sync_cursor`, one request at a time, at least 1 s plus 0 to 500 ms apart, each counted against `RunBudget`. Merge each page into `collection_media` with `mergeRecord`. Out of budget, store the cursor and stop.
    - Stamp the session's times, `last_sync`, `last_error`, `next_sync_at` and dead state as Decision 10 says. A dead session's `cookie_sealed` becomes null.
    - On `busy` or `unavailable`, stop the phase and store `nextBackoff`; after a run whose Cosmo calls all succeeded, clear it.
  - **Retention**: delete rows whose `dead_at` is more than 30 days old.
  - **Apply phase**, always: apply every record, its copy columns included, onto the indexer with `lockMediaRow` → `planMediaWrite` (with `copyPrefix` built from `S3_PUBLIC_URL`, `objectUrl("collection-media/")`) → `writeMediaSet`, one transaction per changed slug, 50 back images per run. The job makes no bucket call and deletes no object (Decision 9, Orphans). After any write, bump `collection:modified-at` with `nextModifiedAt` and delete Spin's `held-by` key, through `@/lib/redis`.
  - Log one `info` summary with counts per column and the requests sent, one `warn` on failures (session id only) or backoff, and nothing on a run that changed nothing.

  Register it in `src/index.ts` as `safeRun("collection-media")`, every 5 minutes and at startup, inside `if (indexerWrites)`. Without the key it gives one `warn` and skips.

  Checks:
  - `import-boundary.test.ts` passes.
  - Locally, with no session rows, a run is silent and writes nothing.
  - Locally, with a seeded row (see Local rows) holding a value sealed under another key, a run warns once, sends nothing for it, sets `key_unreadable` and leaves `dead_at` and the cookie unchanged.
  - Lint, typecheck and build pass for `worker`.
- [x] 8.3 Create `apps/worker/src/lib/media-copy.ts` (pure) and `media-copy.test.ts` (Decision 9):
  - `copyKey(sourceUrl, ext, folder)`: `collection-media/<motion|voice>/<first 32 hex of sha256(sourceUrl)>.<ext>`, with no other input reaching the key (`voice/` added 2026-11-17 for voice collections);
  - `copyIsCurrent(copyUrl, sourceUrl, copyPrefix)`: true when the copy's key carries the source's hash;
  - `sniffVideo(bytes)` (Decision 9, Downloading safely): `video/mp4` (`mp4`) for `ftyp` with an allowed MP4 major brand, `audio/mp4` (`m4a`) for the brand `M4A `, `video/webm` (`webm`) for `1A 45 DF A3`, `audio/ogg` (`ogg`) for `OggS`, `audio/mpeg` (`mp3`) for an `ID3` tag or an MPEG layer III frame sync, else null. Voice files share the key folder, cap and budget;
  - `isPublicAddress(ip)`: false for loopback, private, link-local, unique-local and other reserved IPv4 and IPv6 addresses;
  - `dueCopies(records, indexerSlugs, now)`: the motion sources that pass `acceptMediaUrl`, whose copy is missing or not current, whose `front_media_failed_at` is null or over 6 hours old, and whose record's slug is in `indexerSlugs`, grouped by source with the slugs that share it, oldest `observed_at` first, and sources already copied for another record returned as reuses;
  - `createCopyBudget(now)`: 20 objects, 300 MB (raised from 200 MB on 2026-11-17) and 5 minutes, and a stop after 3 downloads in a row fail with a 429, a 5xx or a timeout;
  - `MAX_BYTES`: 64 MB (raised from 30 MB on 2026-11-17, with the QuickTime brand accepted as `video/mp4`, after sample voice files of 47 MB and in QuickTime).

  Tests cover: one source always gives one key, and two sources two keys; a slug or URL path never appears in a key; a changed source makes a copy not current; MP4, M4A, WebM, Ogg, MP3 with an ID3 tag and MP3 from a frame sync, an HTML body and a 3-byte body; a QuickTime header (stored as `video/mp4`), a HEIC, an AVIF and an ADTS AAC header (refused); `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, `::1` and `fd00::1` (not public) and a public address; a source failed 5 hours ago (not due) and 7 hours ago (due); a record with only a band image (nothing due); a slug missing from the indexer (not due); two records with one motion source (one download); the budget stopping at 20 objects, at 300 MB and after 3 failures in a row.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.
- [x] 8.4 Create the copy job (Decision 9):
  - In `src/lib/s3.ts`, add `putObject(key, body, contentType)`, which carries `CACHE_CONTROL` (`putWebp` now calls it), and `mediaKeyFromUrl(url)`, which returns a key only under `collection-media/`. `keyFromUrl` stays limited to `collection-images/`.
  - Create `job/copy-collection-media.ts`. It reads `collection_media` with `db` and the matching indexer slugs (`slug = ANY($1)`, read only), then runs `dueCopies`. For each due record, one at a time:
    - check the source with `acceptMediaUrl` again, resolve its host (every address, IPv4 and IPv6) and refuse unless each passes `isPublicAddress`;
    - `fetch` it with `redirect: "manual"`, no cookie and no proxy, under a 60 s `AbortSignal.timeout`. A 3xx fails; a `Content-Length` over `MAX_BYTES` aborts; the body is read as a stream and aborted past `MAX_BYTES`;
    - `sniffVideo` sets the content type, and anything else fails;
    - `putObject(copyKey(…), bytes, contentType)`, then, for each slug sharing the source, an update that sets `front_media_copy` and clears `front_media_failed_at` `WHERE slug = $1 AND <source column> = <the source copied>`.
    - A failure sets `front_media_failed_at = now()` on every record with that source, leaves `front_media_copy`, and is counted by reason and host.
  - Log one `info` with counts and bytes, one `warn` with failures by reason and host (never a URL), and nothing on a run with nothing due.
  - Register it in `src/index.ts` as `safeRun("media-copy")`, `2-59/10` and at startup, inside `if (indexerWrites)`. Unless `S3_BUCKET` and `S3_PUBLIC_URL` are both set, it gives one `warn` per start and skips.
  - Extend `script/cleanup-orphaned-collection-images.ts` to sweep `collection-media/` too. It keeps every key named by an indexer `front_media` or a record's `front_media_copy`, read with `db`. It refuses to delete when either holds a URL outside `S3_PUBLIC_URL`, as it does for `processed_*`. Running it stays an owner step.

  Checks (see The bucket, above):
  - `import-boundary.test.ts` passes.
  - Locally, with `S3_ENDPOINT` in `.env.local` pointed at an unreachable local port (never by changing the root `.env`) and a seeded `collection_media` row (see Local rows) whose `front_media` source is a real public file on `resources.cosmo.fans` (a band image URL from `packages/cosmo/src/bands.ts`): a run downloads it (a public read), `sniffVideo` refuses it, nothing is put, and `front_media_failed_at` is set. Read-only verified; the put itself is first exercised in 8.8.
  - Locally, a seeded row whose source is off the allowlist, and one that redirects, download nothing.
  - `process-collection-images.ts` is unchanged, and `putWebp` still puts `image/webp` with `CACHE_CONTROL` through `putObject`.
  - Read the cleanup script's diff: it lists both prefixes and never deletes a key the two columns name. Do not run it.
  - Lint, typecheck and build pass for `worker`.
- [x] 8.5 Before the deploy, review the branch: run `/code-review` and the `security-auditor` agent on the diff, against Decision 6's threat model, Decision 4's limits and Decision 9's download rules. Fix what they find, or record why not in design.md, Risks. Lint, typecheck and build pass for every package the fixes touch.
  Done 2026-11-17. Fixed: certify tries reserved atomically under a per-user lock (3 per ticket); QR polls limited per user, not site-wide; a session's repeated busy/unavailable page parks that session instead of backing off every session; a motion copy is applied only while it matches the current source; download hosts exactly `resources.cosmo.fans` and `imagedelivery.net`; worker session writes guarded by the cookie they read; `last_sync` totals carried across runs in `sync_cursor`; quiet runs feed the heartbeat; late dialog results from an earlier attempt are dropped; `COSMO_BROWSER_TOKEN` required by compose. Waiting on 8.8: audio-only MP4 voice files, per-account back-image URLs, `x-real-ip` (5.4).
- [x] 8.6 **(owner)** On production, read-only, count the rows with `back_image = ''`, the rows with `accent_color = ''`, the rows whose `text_color` would change once a sync records, and the Motion collections (for the bucket's size, Decision 9). Voice collections cannot be counted yet, since nothing has filled `has_audio`: the first syncs size them (8.8). Record the numbers in design.md, Open questions.
  Done 2026-11-18, after 4 sessions synced 2,532 records. Numbers recorded in design.md, Open Questions, Settled, Sizing. 12 voice Doubles observed so far (`has_voice` from syncs); total unknown (only connected accounts' collections are seen). Bucket so far: 793 MB (27 motion + 12 voice). Projected motion at full coverage: ~4.1 GB.
- [x] 8.7 **(owner)** On the VPS: set `COSMO_SESSION_KEY` (`openssl rand -base64 32`, never `COSMO_KEY`), `COSMO_BROWSER_TOKEN` and `COSMO_BROWSER_URL` for `web` and `worker`; start `browser`; apply the migration (4.2); deploy the web and the worker. Check: `/account/collection-data` shows the consent text and Connect (not "not set up"), and the worker logs neither the missing-key nor the missing-bucket `warn`.

  Done 2026-11-17, checked read-only: both tables on production (empty); `web` and `worker` carry `COSMO_SESSION_KEY`, `COSMO_BROWSER_URL`, `COSMO_PROXY` and `S3_PUBLIC_URL`; the web reaches the `browser` container with its token; `/account/collection-data` redirects a signed-out visitor to `/login`; the worker logs neither warning.
- [x] 8.8 **(owner)** After the deploy:
  1. Connect a real Cosmo account on `/account/collection-data` (the first real scan, and the first real upload to the bucket).
  2. Press Sync now.
  3. Read the job's `info` summary.
  4. Within 20 minutes, open one motion, one voice and one idntt Special collection in the drawer. The video loads from `S3_PUBLIC_URL` under `collection-media/`, not from a Cosmo host; the band image is still the hardcoded one; the copy job's `info` shows the uploads.
  5. Record `frontMedia`'s host and length, the first copied video's container and size, a voice Double's `frontMedia` format (audio or video, and the sniffed type, or the reason it was refused), whether Motion collections came back without a class filter, and how `order=newest` sorts, in design.md. Add the host to the allowlist if it is new. If voice media is audio, open the Metadata label follow-up (Decision 12, Voice copies).
  6. Check the Collections tab's summary counts the session.
  7. Session renewal (design.md, Non-Goals and Open questions). Record, never a value: the certify response's content type and body shape; and whether a call made with the stored cookie (`users/me` or a summaries page) answers with a `Set-Cookie: user-session` carrying a later `Expires` than the stored one (rolling renewal). If it does, open a follow-up that stores the new cookie; the 180-day cap stays.
  8. Objekt keys (for the transferability and serial follow-ups). From one summaries page, record the key names and value types of an `objekts[]` entry, never a value: whether it carries the token id, the serial (`objektNo` or similar), the mint time, and anything else per objekt. Record them in design.md, Open questions.

  **Status 2026-11-18:**
  **Done 2026-11-20** (read-only except the owner-approved `users/me` and one summaries page with the owner's session):
  - 3: the job's `info` summary reads `46 Cosmo requests; recorded 359 collections; objekts recorded 4553; wrote 76 collections (backImage 50, accentColor 76, textColor 14)…; 0 sessions marked dead`. The copy job's earlier upload lines went with the 2026-11-20 redeploy; `collection_media` holds 181 copies.
  - 4: on objekt.top, the drawer of Motion `binary02-yeonji-503z` and voice `cream02-joobin-342z` plays from `media.objekt.top` under `collection-media/` (`readyState` 4), and the voice one shows Play sound. No idntt Special has a copy yet, so none was opened; the band image was not checked.
  - 5: Motion comes back unfiltered, and `order=newest` sorts by acquisition (design.md, Settled).
  - 6: `/mod/collections` reads "12 connected · 7 signed out · last sync 17 minutes ago · 10,126 collections with media", matching `cosmo_session` (12 live, 7 dead).
  - 7: no rolling renewal (design.md, Settled).
 steps 1–2 done (4 sessions connected and syncing since 2026-11-17). Step 5 partly answered from production data and recorded in design.md, Open Questions, Settled: `frontMedia` on `resources.cosmo.fans` (~89 chars, no query params, not signed per account); all copies `video/mp4` (motion mean 15.4 MB, voice mean 31.4 MB); voice Doubles are video with sound, not audio-only; unfiltered listing works across all classes. Step 5 class-filter and `order=newest` parts not yet answered. Step 8 answered in `cosmo-objekt-ownership-data` design.md. Step 7 (rolling renewal) not yet checked. Steps 3, 4, 6 not yet confirmed by the owner.

## 9. Web: media in the drawer

- [x] 9.1 Load `vercel-react-best-practices` first, then:
  - In `apps/web/src/features/objekt/objekt-flip.tsx`, give the front face a `<video muted loop playsInline preload="metadata" poster={frontImage}>` when `frontMedia` is set, with the band still drawn over it. Under `useMediaQuery("(prefers-reduced-motion: reduce)")`, show `ObjektArtwork` instead.
  - In `drawer/metadata.tsx`, add a Motion row (`MetaLink` to `frontMedia`, when set) and a Voice row (Yes or No).
  - Add the strings in en, ko and ja.

  Read-only check on the local dev server: a collection without media looks as before. Suggest the user run `/state-machine` on `ObjektFlip` with a fixture `frontMedia`, since production has none until 8.8. Lint, typecheck and build pass for `web`.

## 10. Expiry notice (Decision 15)

- [x] 10.1 Schema and migration:
  - In `packages/db/src/schema.ts`, add `expiryNotifiedAt` (`expiry_notified_at timestamptz`, nullable) to `cosmoSession`, and `"cosmo_session_expiry"` to the `$type` union of `notification.type`. The column has no CHECK, so the type needs no SQL.
  - The migration `20261117044522_cosmo_session_collection_media` is unapplied while 4.2 is open. The owner confirmed on 2026-11-17 that it was applied nowhere (the local database was checked read-only too); it was regenerated with `expiry_notified_at`. Confirmed: delete its folder and run `bun run --filter=@repo/db db:generate` again, rather than adding a second migration, then read the SQL: the same two `CREATE TABLE`s, indexes, foreign key and CHECKs as before, plus the one column. Applied anywhere: generate a second migration instead, and read that it holds only `ALTER TABLE "cosmo_session" ADD COLUMN "expiry_notified_at"`. Do not run `db:migrate`.

  Lint, typecheck and build pass for `@repo/db` and `@repo/api`.
- [x] 10.2 Shared pieces (pure):
  - Move `RENEW_NOTICE_DAYS` from `apps/web/src/features/cosmo-session/connect-flow.ts` to `packages/api/src/schemas/cosmo-session.ts`; `connect-flow.ts` imports it.
  - In the same schema file, `expiryGroupKey(sessionId, expiresAt)`: `cosmo_session_expiry:<id>:<epoch seconds>`.
  - In `schemas/notification.ts`, `cosmoSessionExpiryPayloadSchema` (`{ expiresAt }`, an ISO string, nothing else), added to `LISTED_NOTIFICATION_TYPES` and the `notificationSchema` union. `NOTIFICATION_TYPES`, `NOTIFICATION_DEFAULTS` and `KIND_TYPES` stay as they are (always on, All only).

  A test beside the schema covers `expiryGroupKey`: two expiries of one session give two keys, and the same session and expiry one. `connect-flow.test.ts` still passes. `bun test packages/api` and `bun run test --filter=web` pass. Lint, typecheck and build pass for `@repo/api` and `web`.
- [x] 10.3 Certify (`services/cosmo-session/qr.ts`): the upsert also clears `expiry_notified_at`, and the same transaction marks read the caller's unread `cosmo_session_expiry` notifications whose `group_key` starts with `cosmo_session_expiry:<this row's id>:`. After commit, `publishNotify(userId)` when any was marked. Read the diff: the user-row lock stays first, and nothing else in certify changes. Lint, typecheck and build pass for `@repo/api`.
- [x] 10.4 Worker (`job/collection-media.ts`): a `sendExpiryNotices(now)` step in the apply phase, beside retention. One app transaction claims the due rows (`UPDATE cosmo_session SET expiry_notified_at = now() WHERE dead_at IS NULL AND expiry_notified_at IS NULL AND cookie_expires_at > now() AND cookie_expires_at < now() + RENEW_NOTICE_DAYS days RETURNING id, user_id, cookie_expires_at`) and inserts one notification per row with `expiryGroupKey`, `ON CONFLICT DO NOTHING`. After commit, `publishUsers(userIds, { type: "notifications_changed" })` (`@repo/api/realtime`). One `info` with the count when it is above 0, logging session ids only.

  Checks: `import-boundary.test.ts` passes; read the SQL: the claim and the insert share one transaction, and a dead row, a row already notified or a row 14 days or more out is never claimed. Lint, typecheck and build pass for `worker`.
- [x] 10.5 The bell row (load `vercel-react-best-practices` first):
  - `features/notifications/row-text.ts`: `expiryText(payload, createdAt)`, using `expiryNotice(expiresAt, createdAt)`: 0 is today, 1 is one day, else N days.
  - The row in `notification-items.tsx` with the clock tile (`tone.ts`) and the verb label Renew (`m.cosmo_session_renew()`); `sections.ts` accepts it; `notification-panel.tsx` marks it read and opens `/account/collection-data`.
  - The three strings of Decision 15 in `messages/en.json`, `ko.json` and `ja.json`.

  Tests: `row-text.test.ts` for 13 days, 1 day and today; `tone.test.ts` for the clock; `sections.test.ts` placing it under Today, never Needs you. `bun run test --filter=web` passes. Lint, typecheck and build pass for `web`.
- [x] 10.6 **(owner)** With approval for the seeded rows (see Local rows), on the local database: a live row 10 days and 12 hours from expiry gets one notice in its owner's bell on the next worker run, reading "expires in 10 days", and a second run adds none; a row 20 days out and a dead row get none; activating the notice opens `/account/collection-data`. The renew path is first exercised at the first renew on production.

## 11. Docs

- [x] 11.1 Update the agent docs for this change:
  - **`apps/indexer/AGENTS.md`** (Staff colours on `collection`): `front_media`, `has_audio`, and `back_image`, `accent_color` and `text_color` on existing rows are also written from outside, by the worker's `collection-media` job. `front_media` holds only our bucket's URL. `band_image_url` stays unwritten, so the web's hardcoded band map shows. Never add them to `collectionFields`.
  - **`apps/worker/AGENTS.md`**: a Collection media section covering the two phases (the expiry notices in the apply phase, claimed through `expiry_notified_at`), the due order, the request budget and backoff, the merge rule, apply rules, the back image budget, what dead means and the 30-day deletion, a key that fails to open (skipped, never dead), the job as the only writer, and no replay script needed. Beside it, the copy job: `collection-media/` keys named by the source's hash, never Cosmo's URL on a collection, the download rules and budget, `front_media_failed_at`, band images recorded but never copied, no inline delete, and the cleanup script sweeping both prefixes.
  - **`packages/db/AGENTS.md`**: Cosmo sessions (owned by `user_id`, sealed cookie with the owner in its AAD, null once dead, never `access_token`, cleanup paths, `expiry_notified_at` cleared by every connect) and Collection media (the record as the source after a rebuild, with no session or user column; Cosmo's URL as the source and our copy's URL beside it; `band_image_url` recorded for later, never copied or shown).
  - **`packages/api/AGENTS.md`**: a Cosmo sessions section (the `cosmoSession` router on `authed`, every read and write filtered by `user_id`, `/rpc` only, `CosmoSessionError`, the fail-closed ticket, certify's user-row lock, and revocation in `anonymizeUser` and `syncBan`); the Staff procedures list gains `cosmoMediaSummary`. In `packages/api/docs/notifications.md`, the `cosmo_session_expiry` type: always on like `sanction`, All only, one key per connect, marked read by a renew.
  - **`apps/web/AGENTS.md`**: no change; the section follows the existing account pattern.
  - **Root `AGENTS.md`**: the Environment list gains `COSMO_SESSION_KEY` and `COSMO_BROWSER_URL`, and Docker gains the `browser` service.
  - **`packages/cosmo/README.md`**: the QR sign-in, session and summaries calls.

  `bun run check` and `bun run build` pass at the root, and `bun run format` leaves no diff. Also tell the user that `apps/worker/AGENTS.md` and the `web-admin` spec still name `script/replay-collection-colours.ts`, which commit `516b2b3e` removed; this change does not fix that.

## Workflow follow-up

- Archive the change with `/opsx:archive` once 8.8 and 10.6 are done.
- Follow-ups: transferability and grid locks from `objekts[]`; confirmed serials from `objekts[]` (token id and serial, if 8.8 step 8 finds both) stored as serial anchors, so a connected owner's serials count as confirmed, not estimated; linking a profile by QR code, sound on voice objekts, and, depending on 8.8, a Metadata label for audio voice copies and storing a rolling cookie.
