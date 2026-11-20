# Design

## Context

See proposal.md, Why. The facts below shape the approach.

### Cosmo's QR sign-in

These were seen with a real signed-in run on 2026-11-16. Values were redacted; the shapes are real.

1. **reCAPTCHA token.** reCAPTCHA v3, action `login`, using the site key the shop page loads.
   - A token minted on a `http://localhost` page with that key was refused: `400 {"error":{"code":"INVALID_RECAPTCHA"}}`.
   - A token minted on `https://shop.cosmo.fans/en/login/landing` in a real Chromium was accepted.
   - So the server needs a browser that loads the shop page.
2. **Ticket.** `POST https://shop.cosmo.fans/bff/v3/users/login-by-qr/ticket` with body `{"recaptcha":{"action":"login","token":…}}` returns `201 {ticket, expireAt}`. The ticket lives 180 s.
3. **QR code.** The QR encodes `cosmo://ticket-login?t=<ticket>`.
4. **Polling.** `GET …/login-by-qr/ticket?ticket=<ticket>` returns a `status`. Two were seen:
   - `wait_for_user_action`, with `ticketRemainingMs`;
   - `wait_for_certify`, with `ticketRemainingMs`, `ticketOtpRemainingMs` (about 60 s), `user.{id, nickname, profileImageUrl, profileImages}` and `profiles[]`.

   The shop's own code knows a third, `certified`. No other was seen.
5. **Certify.** `POST …/login-by-qr/certify` with body `{"otp": <number>, "ticket": …}` returns 201.
   - The body is a bare string, with no token in it.
   - The session is the `Set-Cookie: user-session=…; Domain=shop.cosmo.fans; Path=/; Expires=<about 4 years>; HttpOnly; SameSite=Strict`.
   - The code is the 2 digits the Cosmo app shows. It is sent as a number, so `07` goes as `7`.
6. **The cookie on `api.cosmo.fans`.** It works there too. `GET /bff/v4/users/me` returns `id`, `nickname` and `address`, along with `email`, `birth`, `country`, `loginChannel` and more. Those other fields are personal data.
7. **Objekt summaries.** `GET api.cosmo.fans/bff/v3/objekt-summaries?artistId=<artist>[&class[]=<class>]&order=newest&page=<n>&size=30` returns `{collectionCount, favoritedObjektCount, collections: [{collection, count, objekts}]}`.
   - It lists only the signer's own collections. There is no address parameter.
   - `collection` carries `collectionId`, `frontMedia`, `bandImageUrl` (on some), `hasVoice`, `backImage`, `accentColor`, `backgroundColor`, `textColor` and the fields the indexer already has.
   - Images come from `imagedelivery.net`. `bandImageUrl` comes from `resources.cosmo.fans`.
   - `frontMedia` was null on all 128 collections seen, since the signer holds no motion objekt.
8. **Logout.** `POST shop.cosmo.fans/bff/v3/users/logout-from-session` with the cookie returns 200. After it, `/bff/v4/users/me` returns 403.
9. **Dead endpoints.** The older owned-objekt endpoints no longer answer (`/objekt/v1/owned-by`, `/bff/v1/objekt/collection-group`).

### Our code

- **Cosmo client.** `packages/cosmo/src/server/http.ts` holds `cosmo`, an `ofetch` client on `api.cosmo.fans` with `retry: 2`, a 10 s timeout and `COSMO_PROXY`.
  - It has no cookie handling. A `Set-Cookie` is reachable only through `cosmo.raw`.
  - ofetch's `FetchError` message carries the full URL, query string included.
  - Every call leaves from the VPS's one egress, so Cosmo sees all our sessions from one IP.
- **`COSMO_KEY`.** It is Cosmo's own AES-256-CBC body key (`encryption.ts`), with no authentication tag. It is not ours to reuse.
- **`access_token`.** It holds the shared token in one row, and every reader takes `findFirst()` with no filter.
- **Indexer `collection` columns.**
  - `front_media varchar(255)`, `band_image_url varchar(255)` and `has_audio boolean NOT NULL DEFAULT false` exist. Nothing in the repo writes them, and the indexer leaves them null when it creates a row. Readers: `collection-columns.ts`, `@repo/lib/server/objekt.ts`, `objekt-sidebar.tsx` and `drawer/metadata.tsx`.
  - `handleCollection` (`apps/indexer/src/main.ts`) sets `back_image`, `accent_color`, `text_color` and `background_color` only when it creates a row.
    - Created from v3, `back_image` and `accent_color` are `""` (`normalizeV3`).
    - `text_color` is a guess from the class (`getTextColor`).
    - `background_color` is v3's real `background_color`.
  - On an existing row it assigns only `collectionFields`, and only when they changed. The batch then upserts every loaded column. A write from outside survives only because the batch runs SERIALIZABLE (`apps/indexer/AGENTS.md`, Staff colours on `collection`).
  - `collection_staff_colors` requires a lowercase `#rrggbb` `text_color` while `source_text_color` is set.
- **Image processing.** `process-collection-images` reprocesses a row once `md5(front_image|back_image)` differs from `image_sync_hash`. That is three S3 uploads, five rows at a time, under its lock. It then sets `collection:modified-at`.
  - It keeps Cosmo's URL in `front_image` and `back_image` and our WebP copy in the `processed_*` columns. The web serves `processed_front_image ?? front_image` (`overrideCollection` in `@repo/lib/server/objekt.ts`) and passes `front_media` through as stored. `band_image_url` goes through `getBandImageUrl` (`packages/lib/src/server/objekt.ts:15-37`, called at `:63`): the column when set, else a hardcoded idntt map (Special, online Unit, black offline, Welcome 200Z) on `media.objekt.top`. `ObjektSidebar` draws that value (`apps/web/src/features/objekt/objekt-sidebar.tsx:45-51`). `packages/cosmo/src/bands.ts` holds Cosmo's URLs for the first two, but nothing imports it.
  - The bucket is R2, reached through `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` and `S3_PUBLIC_URL`, which the `worker` service already has. `apps/worker/src/lib/s3.ts` can only put WebP (`putWebp`), and its `keyFromUrl` accepts only keys under `collection-images/`. Every upload carries `CACHE_CONTROL` (`@repo/lib/media`), which is immutable for a year, so the bytes behind a key must never change.
  - `script/cleanup-orphaned-collection-images.ts` is run by hand. It lists `collection-images/` and deletes every key that no `processed_*` column names, so anything else stored under that prefix would be deleted.
  - `mirror-artist-images` names each object by a hash and copies serially, catching each failure and retrying it on the next run.
  - The repo has no local bucket: the compose file has no MinIO, and `.env.local` sets no `S3_*`, so a local worker run uploads to production.
- **Colour replay.** `apps/worker/AGENTS.md` names `script/replay-collection-colours.ts`, but commit `516b2b3e` removed it from the tree. Nothing here relies on it.
- **Procedures.** `authed` (`orpc.ts`) refuses a signed-out caller with UNAUTHORIZED. Per-user data elsewhere is scoped by the session's user id inside the service (`cosmoLink.linkedPreviews`, `removeLink`). The `admin` router's `adminOnly` returns NOT_FOUND to non-staff and FORBIDDEN to moderators; the Collections tab is admin-only.
- **Account page.** `/account/<section>` routes, listed once in `SECTIONS` (`features/account/account-nav.tsx`), behind `requireSignedIn`.
- **Moderation.** A ban goes through `applyModAction` (`services/moderation/console.ts`), which calls `syncBan(tx, userId, { revokeSessions: true })` inside the sanction transaction; `syncBan` deletes the user's site sessions. A banned user cannot sign in until the ban ends. Writers lock `"user"` rows first (`packages/api/AGENTS.md`, Cosmo links); offer create and accept read both users `FOR SHARE` (`lockParties`) and refuse a deleted party.
- **Rate limits and Redis.** Rate limits (`userRateLimited`, `ipRateLimited`, `globalRateLimited`) fail open (`services/redis.ts`). `cosmo-verify.ts` keeps its short-lived claim in Redis and fails closed.
- **Worker boundary.** The worker cannot import `env.ts` or `services/redis`. Indexer writes sit under `if (indexerWrites)`. It has its own Redis client (`@/lib/redis`).

## Goals / Non-Goals

**Goals:**

- One writer of session-sourced collection data, the worker. Its result converges: running it again changes nothing, and it puts values back after an indexer re-save or rebuild.
- A Cosmo session cookie never leaves the server in plain text. It never reaches a log, an error report or a browser, and it is unreadable without its own key.
- Every stored session belongs to one site user, who alone sees and ends it.
- The total load on Cosmo stays bounded however many users connect.
- Every motion video or voice file the site shows comes from our bucket, as front images do, never from Cosmo's host. Band images stay the web's hardcoded map.
- No indexer schema change.

**Non-Goals** (design level; product scope is in the proposal):

- Refreshing a session through Cosmo. No refresh exists for the QR `user-session` cookie: the refresh tokens in the shop's client code belong to Privy (`auth.privy.io`), and the certify body carried no token (Context, 5). A session near its end is renewed by a fresh QR connect (Decision 7, Renew); a dead or expired one is reconnected the same way. Task 8.8 checks whether Cosmo rolls the cookie's `Expires` forward on use. Even if it does, a stored later expiry would only move Cosmo's date: the site's 180-day cap (Decision 6) still ends the session.
- Rotating keys in place. The sealed format carries a version so a later change can add rotation.
- Showing recorded band images. The owner keeps them hardcoded for now (Decision 8, Band images). Switching band images from the hardcoded map to recorded data is a follow-up; meanwhile the recorded URLs let the owner extend the map by hand.

## Decisions

### 1. Any signed-in user connects their own Cosmo account

Every signed-in site user may connect a Cosmo account by QR code to share their collections' media. `objekt-summaries` is signer-only, so coverage grows with each account that connects: crowd-sourcing is the point.

- **Ownership.** Each session row carries `user_id`, the site user who connected it. Every procedure is on `authed` and scopes by it: a list returns only the caller's rows, and a procedure taking an `id` reads `WHERE id = $1 AND user_id = <caller>`. Another user's id gets `cosmo_session_not_found`, the same answer as an id that does not exist, so ids reveal nothing.
- **Up to 3 per user.** A user may hold 3 sessions (live or signed out). One person may own a few Cosmo accounts; more would let one site account dominate the sync queue. Reconnecting one of the 3 is always allowed.
- **One row per Cosmo account** (unique `cosmo_address`). The newest connect wins: it replaces the existing row, whoever owns it, and signs the old cookie out at Cosmo after commit. Scanning the QR code in the Cosmo app and typing its code is fresh proof of control, so the newer connect is the better claim. Refusing instead would let a stale row (an account since sold, or shared) block its real holder forever. The previous owner's list simply no longer shows that account; nothing about the new owner is shown to them. Unlinking and relinking is the same path: Disconnect deletes the row, and a later connect creates a new one.
- **Linked profiles.** A QR connect neither needs nor creates a `user_address` link, and linking, unlinking or a staff move of a profile never touches a session. The connected address is not shown on profiles, in staff signals or in link history; `web-cosmo-link`'s status-message flow stays the only way to link a profile.
- **Trust.** Values come from Cosmo's API, not from what a user types. A user chooses only which Cosmo account to connect. The URL host allowlist, the colour check and the never-clear merge (Decisions 8, 9) still hold, and the merge damps disagreeing sessions.
- **Moderation.** See Decision 7: a ban ends the user's sessions; a trade block or chat mute does not, since connecting shares Cosmo's collection data, not anything the user writes or lists.

**Alternative rejected:** admin-only connect. Smaller blast radius, but coverage stays limited to the few accounts staff hold.

### 2. A Collection data section at `/account/collection-data`

The connect flow and the user's own session list live in a new account section, **Collection data**, at `/account/collection-data`, listed in the account menu right after Cosmo profiles. The reasons:

- It is the user's own setting, like every other `/account` section, and inherits its signed-out redirect and phone layout (`web-account`, Account page).
- `/account/profiles` links a profile publicly by a status message; this is a private, server-held sign-in with its own consent. Putting both in one section would blur two different promises about what is public.

The section holds:

- the consent text (Decision 14), always shown above the list;
- Connect a Cosmo account, which opens a dialog (the vendored `Dialog`);
- the user's sessions, each with Sync now and Disconnect (the vendored `AlertDialog` to confirm), plus Renew in its last 14 days (Decision 7), or Reconnect and Disconnect when signed out.

**Staff overview.** Admins get one counts-only line on the existing Collections tab (`/mod/collections`): live sessions, signed-out sessions, the latest sync time, and how many collections have recorded media. No new tab, and no nickname, address or user. It answers the one operational question (is the feature filling anything, and is it failing everywhere?) without giving staff a per-user view they do not need. One `adminOnly` procedure on the `admin` router, `cosmoMediaSummary`, with a `.output()` of three integers and one date.

### 3. reCAPTCHA through a browser container, over raw CDP

- **Service.** `docker-compose.yml` gains a `browser` service: `ghcr.io/browserless/chromium` pinned to one version tag.
  - `expose: ["3000"]` only, with no published port.
  - `TOKEN` from the env, `CONCURRENT=2`, `QUEUED=4`, `TIMEOUT=30000`. A connection refused because the queue is full is `cosmo_session_busy` (Decision 4), so a burst of users gets "try again in a minute" rather than a hang.
  - `docker-compose.override.yml` publishes it on `127.0.0.1:3001` for local work, as it does Centrifugo.
- **Env.** The web reaches it through `COSMO_BROWSER_URL` (`ws://browser:3000?token=…`). It is optional in `env.ts`. Unset, connect refuses as unavailable.
- **`mintRecaptchaToken()`** (`packages/cosmo/src/server/recaptcha.ts`) opens one WebSocket to that URL and sends CDP commands:
  1. `Target.createTarget` on `about:blank`, then `Target.attachToTarget` with `flatten`;
  2. `Page.navigate` to the fixed URL `https://shop.cosmo.fans/en/login/landing`;
  3. `Runtime.evaluate`, polled every 250 ms for at most 25 s, until `window.grecaptcha` exists;
  4. `Runtime.evaluate` with `awaitPromise`. It reads the site key from the page's own `recaptcha/api.js?render=<key>` script and runs `grecaptcha.execute(key, {action: "login"})`.
  5. It closes the target and the socket in `finally`.

  The whole call is capped at 45 s. The URL is a constant, never input, so no user value reaches the browser.
- **Why no site-key env var.** Reading the key from the page follows a key change on Cosmo's side, and we keep no copy to go stale.
- **Why raw CDP over `puppeteer-core`.** The job is one page, one navigation and two evaluates. Bun's built-in `WebSocket` and about 80 lines do it with no new dependency. `puppeteer-core` would add a large dependency tree, and its strengths (frames, auto-waiting, input) go unused. The frame encoding and the reply matching are a pure module with tests. If browserless turns out to need more than plain CDP, `puppeteer-core` through `catalog:` is the fallback, behind the same function.
- **Proxy.** When `COSMO_PROXY` is set, the browser must leave through it too: `mintRecaptchaToken` adds `--proxy-server=<COSMO_PROXY>` to the connect URL as a browserless launch argument. A proxy that needs credentials is an open question.
- **Checked on the VPS (2026-11-17, task 3.4).** Cosmo's load balancer answers the VPS's own IP with 403 on `shop.cosmo.fans` and `api.cosmo.fans`. Through the host's WARP proxy (`COSMO_PROXY`, reachable from containers on the Docker gateway), the mint took 18 s and the ticket POST returned 201 with `expireAt` 180 s ahead. Hence the 45 s cap, and browserless `TIMEOUT=60000`.

### 4. The sign-in, server side

A new `cosmoSession` router (`routers/cosmo-session.ts`), every procedure on `authed`, mounted on `/rpc` only, never `/api/v1`. Three procedures run the sign-in, with a ticket kept in Redis.

**`qrStart`** (no input):

- Limits, all checked before any browser or Cosmo call:
  - `userRateLimited("cosmo-qr-start", uid, 2, 60)` and `userRateLimited("cosmo-qr-start-day", uid, 10, 86400)`;
  - `ipRateLimited("cosmo-qr-start", headers, 5, 600)`, so a handful of accounts behind one address cannot drain the global limit alone;
  - `globalRateLimited("cosmo-qr-start", 10, 60)`, which protects the browser container (2 pages at once, 4 queued) and Cosmo's ticket endpoint.
- Steps: mint a token, `POST` the ticket, store `{ticket, expireAt, last}` at `cosmo-qr:<userId>` with TTL until `expireAt` (180 s at most).
- Returns `{qr: "cosmo://ticket-login?t=…", expiresAt}`.
- Storing fails closed, as `cosmo-verify.ts` does: with Redis down it refuses `cosmo_session_unavailable` before any browser or Cosmo call. A new start replaces the caller's previous ticket. The limits fail open, but nothing reaches the browser or Cosmo with Redis down, so the three procedures fail closed as a whole.

**`qrPoll`** (no input):

- Reads the caller's stored ticket and `GET`s its status once. The browser polls every 3 s.
- Limits: `userRateLimited("cosmo-qr-poll", uid, 30, 60)` refuses. Over `globalRateLimited("cosmo-qr-poll", 120, 60)` the poll does not refuse: it returns the state stored in the ticket's `last` with no Cosmo call, so a busy minute only slows the dialog.
- Returns `{state: "waiting", expiresAt}`, `{state: "code", nickname, codeExpiresAt}` or `{state: "expired"}`, and stores it as `last`.
- **Expired.** A missing ticket, a Cosmo 4xx, a remaining time at or below 0, and **any status other than** `wait_for_user_action`, `wait_for_certify` or `certified` all read as expired. Failing closed on an unknown status means a cancel or deny we never saw ends the attempt rather than leaving it hanging.
- **Certified is not terminal.** `certified` answers the stored `last` state (as the fallback does) and keeps the ticket, since a poll never carries the cookie and only certify ends the attempt; reading it as expired would show a successful sign-in as an expired code.

**`qrCertify`**, input `{otp: z.number().int().min(0).max(99)}`:

- Limits: `userRateLimited("cosmo-qr-certify", uid, 10, 60)` and `globalRateLimited("cosmo-qr-certify", 30, 60)`.
- Reads the stored ticket, then `POST`s certify once, with no retry.
- **On 201:**
  1. Read `user-session` and its `Expires` from `Set-Cookie`.
  2. Call `users/me`, keeping only `nickname` and `address`.
  3. In one app transaction:
     - lock the caller's `"user"` row `FOR SHARE`, the first lock in the order `packages/api/AGENTS.md` sets, and refuse `cosmo_session_not_allowed` when the account is banned or deleted. A ban or scrub that committed during the sign-in is seen here; one that starts later waits for this commit and then deletes the row (Decision 7);
     - take a per-user advisory lock (`cosmo_session_user:<userId>`) after the user row and before the address lock, so two connects by one user for different addresses take turns and cannot both pass the limit;
     - refuse `cosmo_session_limit` when the caller already holds 3 rows and none has this address;
     - seal the cookie and upsert the row by `cosmo_address`, setting `user_id` to the caller, `sync_requested_at = now()`, `created_at = now()` and a new `cookie_expires_at`, so the 180 days run from this connect, and clearing `dead_at`, `last_error`, `sync_cursor` and `expiry_notified_at`. A new owner also starts with no `last_sync` or `last_synced_at`; the same owner keeps them;
     - mark read the caller's unread expiry notice for this row (Decision 15), so a renew clears the bell's request for it.
  4. Delete the ticket.
  5. After commit, sign out the cookie the row held before, if any, and publish `notifications_changed` to the caller when a notice was marked read. On a refusal in step 3, sign the new cookie out instead, so no session is left behind at Cosmo.
  6. Return `{nickname}`.
- **On a 4xx while the code time remains:** `cosmo_session_wrong_code`, and the ticket is kept. Before any poll has seen the code step, the ticket's own expiry stands in for the code time. The ticket counts wrong codes (an atomic compare-and-swap in Redis): the third ends the attempt, deleting the ticket and refusing `cosmo_session_expired`, so the 100 possible codes cannot be tried.
- **On a 4xx once the time has passed:** `cosmo_session_expired`.
- **On a 5xx, a timeout or a 201 without the cookie:** `cosmo_session_cosmo_error`, and the ticket is deleted. After a timeout we cannot tell whether Cosmo made a session (Risks).

**What Redis buys.** The QR code is the ticket, so the user's browser sees it. Keeping it server-side buys one thing: poll and certify act only on the ticket this server issued to this user, never on a ticket a client sends. No procedure takes a ticket as input.

**Sign-in load on Cosmo.** At most 10 tickets, 120 status checks and 30 certifies a minute reach `shop.cosmo.fans`, whatever the number of users. This budget is separate from the worker's (Decision 10), since it is interactive.

**The other procedures.** `list` (`{available, sessions}`: `available` is false when `COSMO_SESSION_KEY` or `COSMO_BROWSER_URL` is unset, the rows carry no cookie field, and each carries `expiresAt` from `cookie_expires_at` for Renew, Decision 7), `requestSync {id}` (Decision 10) and `disconnect {id}` (Decision 7, `userRateLimited("cosmo-disconnect", uid, 10, 60)`).

**Refusals.** The codes go in `COSMO_SESSION_REFUSALS` (`schemas/cosmo-session.ts`), with `api_errors_*` strings in en, ko and ja: `cosmo_session_unavailable`, `cosmo_session_busy` (the browser's queue is full), `cosmo_session_captcha` (the browser or Cosmo refused the token), `cosmo_session_expired`, `cosmo_session_wrong_code`, `cosmo_session_cosmo_error`, `cosmo_session_limit`, `cosmo_session_not_allowed`, `cosmo_session_dead`, `cosmo_session_not_found`, plus the shared `user_rate_limit`.

### 5. Cosmo client changes (`packages/cosmo/src/server/`)

**`shop.ts`.** A `cosmoShop` client:

- `ofetch.create` on `https://shop.cosmo.fans`, with `Origin: https://shop.cosmo.fans`, the client's default headers, `COSMO_PROXY` and a 10 s timeout;
- `retry: 0` by default. A ticket `POST` or certify `POST` is one-shot: a retried certify would send the same code twice.

**`qr-auth.ts`.**

- `createLoginTicket(token)`, `readLoginTicket(ticket)` and `certifyLoginTicket(ticket, otp)`. Certify goes through `cosmoShop.raw`, so the response's `headers.getSetCookie()` is readable.
- `readLoginTicket` is a GET and may retry once.

**`session.ts`.** Each takes the cookie value and sends `Cookie: user-session=<value>`:

- `fetchSessionUser(cookie)`, on api `GET /bff/v4/users/me`;
- `logoutSession(cookie)`, on shop `POST /bff/v3/users/logout-from-session`, with no retry;
- `fetchObjektSummaries(cookie, {artistId, page, size, className?})`, on api, with no retry: the worker's backoff (Decision 10) decides when to try again, so one call is one request against its budget.

**Parsing.** The pure parts sit in `src/session-parse.ts`, beside tests. Each response is parsed with Zod (`zod` added to `packages/cosmo` as `catalog:`):

- `parseSessionCookie(setCookie[])` returns `{value, expiresAt}` or null.
- `ticketStatusSchema` is a discriminated union, with a catch-all that maps any other status to `unknown`.
- `sessionUserSchema` picks `nickname` and `address` and strips every other key, the numeric id included.
- `objektSummariesSchema` parses each item on its own, so one malformed collection is skipped and counted rather than failing the page. It keeps only the collection fields; `count` and `objekts[]` are dropped.

**Errors.** Every function throws `CosmoSessionError {kind: "refused" | "dead" | "unavailable" | "busy" | "unexpected", status}`. It has no URL, body or header in it. ofetch's `FetchError` message carries `?ticket=…`, so it is caught and never rethrown. `busy` is a 429 (from Cosmo, or browserless's full queue).

**Dead versus blocked.** A 401 or 403 from a call with a cookie is `dead` only when its body is Cosmo's JSON error (`{"error": {"code", …}}`, the shape its 400s carry). `http.ts` notes that Cosmo's firewall blocks some server IPs, and such a block may also answer 403 with an HTML page. That, and any other 403, is `unavailable`, so one bad egress never kills every session. The probe recorded only the status of the post-logout 403, not its body (Open questions).

### 6. Session storage: `cosmo_session` (app DB)

| Column                                   | Type                                          | Note                                                                                                     |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                                     | `serial` PK                                   |                                                                                                          |
| `user_id`                                | `text NOT NULL` → `user.id`, `ON DELETE CASCADE`, indexed | the owner; every procedure filters by it. Cleanup is still explicit (7), since `user` rows are scrubbed, not deleted |
| `cosmo_address`                          | `citext NOT NULL`, unique                     | one row per Cosmo account; Cosmo's numeric user id is not stored                                         |
| `cosmo_nickname`                         | `text NOT NULL`                               | refreshed on each sync                                                                                   |
| `cookie_sealed`                          | `text`                                        | `v1.<iv>.<ciphertext>.<tag>`, base64url; null once the session is dead                                   |
| `cookie_expires_at`                      | `timestamptz NOT NULL`                        | the earlier of Cosmo's `Expires` and 180 days after connect (max age, below)                             |
| `created_at`                             | `timestamptz NOT NULL DEFAULT now()`          |                                                                                                          |
| `next_sync_at`                           | `timestamptz NOT NULL DEFAULT now()`          | the due time (Decision 10); partial index `WHERE dead_at IS NULL`                                         |
| `sync_cursor`                            | `jsonb`                                       | `{artist, page}` of an unfinished sync, else null                                                        |
| `last_used_at`, `last_attempt_at`, `last_synced_at`, `sync_requested_at`, `dead_at` | `timestamptz`                                 |                                                                                                          |
| `last_error`                             | `text`, CHECK in a fixed set                  | `session_dead`, `session_expired`, `cosmo_unavailable`, `unexpected_response`, `key_unreadable`; a code, never a message |
| `last_sync`                              | `jsonb`                                       | counts only: `{seen, recorded, applied, skipped}`                                                        |
| `expiry_notified_at`                     | `timestamptz`                                 | when the expiry notice went out (Decision 15); null until then, and cleared by every connect or renew    |

A CHECK keeps `(dead_at IS NULL) = (cookie_sealed IS NOT NULL)`: a live row has a cookie, a dead row has none.

- **Where the code lives.** The table is in `packages/db/src/schema.ts`, and the migration comes from `db:generate`. Applying it is an owner step.
- **Personal data.** No email, birth date, country or any other `users/me` field is parsed, stored or logged. The nickname and address are public on Cosmo already. They are shown only to the row's owner, in their Collection data section; staff see counts only (Decision 2), and no public page, profile, staff signal or `/api/v1` response carries them.
- **Sealing.** `@repo/lib/server/sealed.ts` (env-free) holds `seal(plaintext, key, aad)` and `open(sealed, key, aad)`:
  - AES-256-GCM through `node:crypto`, with a random 12-byte IV and a 16-byte tag;
  - AAD `cosmo_session:<user_id>:<lowercased cosmo_address>`, so a ciphertext copied onto another row, or onto another owner, fails to open. A replacement re-seals for the new owner;
  - a key that is 32 bytes decoded from base64, else it throws at load.

  Callers pass `COSMO_SESSION_KEY`. The web reads it through `env.ts` (optional; unset, connect is unavailable). The worker reads `process.env` directly, as it reads `COSMO_KEY`.
- **A cookie that fails to open is a configuration fault, not a dead session.** A wrong key would fail every row at once, and marking them dead would erase every user's cookie with no way to sign them out at Cosmo. So the worker skips such a session for the run, before any Cosmo call with it: `dead_at` and the cookie stay, `last_error = key_unreadable`, and `next_sync_at = now + 6 hours`, so it never blocks the queue. Other sessions sync as usual. One `warn` per run carries the count. The row shows that it needs reconnecting, and a reconnect re-seals it under the current key. Disconnect of such a row deletes it and reports that Cosmo did not confirm the sign-out.
- **Why not `access_token`.** Every reader of `access_token` takes `findFirst()`, and the refresh job would rotate the wrong row. Better Auth's `account` stores tokens in plain text. Neither fits.

**Threat model.** The asset is a set of long-lived Cosmo sign-ins, one per connected account; with many users the blast radius of a leak grows, so:

- **Who can read the table.** The web and the worker, through the app database role; no route returns `cookie_sealed`, and every `.output()` on the router omits it. A database dump or backup holds only ciphertext: `COSMO_SESSION_KEY` lives in the VPS env of `web` and `worker`, never in the database, a backup, the repo or a log.
- **Max age 180 days.** A session expires 180 days after its latest connect or renew, whatever Cosmo's 4-year `Expires` says; the worker then signs it out at Cosmo and erases the cookie (Decision 7). A leaked backup or key therefore exposes at most half a year of sign-ins, abandoned accounts age out, and each user re-confirms their consent twice a year. Cost: coverage dips until users reconnect, which the record (Decision 8) absorbs, since recorded values stay.
- **Dead rows hold no cookie.** A refused or expired session's cookie is erased, not kept.
- **Logs and reports.** Decision 11.
- **Never to the client.** No procedure returns a cookie, sealed or not, a code or a reCAPTCHA token. The ticket reaches only the user who started it, inside the QR code and its link.
- **Leaked key.** Rotate it by setting a new one: every older row then fails to open and is skipped, and its owner sees that it needs reconnecting; a reconnect re-seals it under the new key. The owner may also delete the old rows (with approval). Signing them out at Cosmo is impossible without the old key, which is why the key is held only by two containers.
- **Retention.** A dead row keeps only the nickname, address and times, and the worker deletes it 30 days after `dead_at`, so a site user is not tied to a wallet longer than the consent text says.

### 7. Session lifecycle

- **Dead.** A session is dead when either holds:
  - a call with it returns 401 or 403 carrying Cosmo's JSON error body (Decision 5): `last_error = session_dead`;
  - its `cookie_expires_at` has passed (max age or Cosmo's `Expires`): `last_error = session_expired`. The worker signs it out at Cosmo first, best effort, since the cookie may still work there.

  The worker sets `dead_at`, sets `cookie_sealed` to null, and stops using it. The section shows it as signed out, with Reconnect. A dead row stays until its owner disconnects or reconnects it, or for 30 days (Decision 6, Retention).
- **Disconnect** (`disconnect {id}`, the owner only):
  1. Delete the row (`WHERE id AND user_id`).
  2. After commit, `logoutSession` once, best effort, with a 403 counting as done. A dead row has no cookie and skips this.
  3. When Cosmo did not confirm, the section says Cosmo did not confirm the sign-out. The session at Cosmo outlives our copy until Cosmo ends it after 45 to 60 minutes unused; the Cosmo app offers no way to end it.

  No `mod_audit` entry is written: connecting and disconnecting are a user's choices about their own data, like linking a provider, not staff actions, and the values written come from Cosmo, so provenance has nothing to prove.
- **Replaced.** A connect of the same Cosmo account by anyone replaces the row and signs the old cookie out (Decision 1).
- **Renew.** Every live row shows its expiry date. With fewer than 14 days left (`RENEW_NOTICE_DAYS`), it also shows "Expires in N days", with its own strings for 1 day and "Expires today", and a Renew button. `expiryNotice(expiresAt, now)` (`features/cosmo-session/connect-flow.ts`, tested) gives the whole days left, or null outside that window or once past; the row counts from the viewer's clock, so it prints only once hydrated. Renew opens the same connect dialog as Connect. The dialog is not bound to the row: signing in as the same Cosmo account takes the Replaced path above, which re-seals the cookie on the same row and resets `created_at` and `cookie_expires_at`, so the 180 days start again (Decision 4, certify). Signing in as another account is an ordinary connect, under the limit of 3. A renew needs no procedure of its own, since a fresh QR scan is also fresh consent. The owner also gets one notice in the bell before the end (Decision 15).
- **Account deletion.** `anonymizeUser` deletes the user's sessions inside its transaction, and signs them out after commit. It does not rely on the foreign key.
- **Ban.** `syncBan`'s revoking branch (a new ban, through `applyModAction`) also deletes the user's sessions inside the sanction transaction, and the caller signs them out after commit. A banned user cannot sign in, so cannot connect until the ban ends; a certify racing the ban is refused under the user-row lock (Decision 4). The reason: a ban is the moderation model's "this account may not act on the site", and a server-held session acting for it every 3 days contradicts that. When the ban ends, the user may reconnect. A ban's end or revoke (`revokeSessions: false`) touches nothing.
- **Trade block, chat mute, warning.** No effect. They limit trading and messaging; sharing Cosmo's collection data is neither.
- **Role changes.** No effect: connecting is not a staff power.

### 8. Where the data lands

**The record: `collection_media` (app DB).**

- Columns: `slug` (PK), `front_media`, `band_image_url`, `has_voice`, `back_image`, `accent_color`, `text_color`, `observed_at` (last change) and `confirmed_at` (last time a session reported the stored values). `front_media` and `band_image_url` hold Cosmo's URL: `front_media` is the source of the copy, and `band_image_url` is kept for later only (Band images, below).
- Copy columns (Decision 9): `front_media_copy` (`varchar(255)`, our public URL, null until copied) and `front_media_failed_at` (`timestamptz`, the last failed copy of its source, null after a success). The merge never reads or writes them.
- No column links a record to a session or a user: the site keeps no record of which account shared which collection.
- Why a record at all: summaries are signer-only and sessions die, so the indexer row alone would lose a value after a rebuild once nobody connected holds the collection. The colour fix has `mod_audit` for the same reason.

**When sessions disagree** (`mergeRecord(stored, observed, now)`, pure). Collection fields are the same for every holder, so a disagreement is either a Cosmo change or noise, and a plain "latest wins" would flip the row, and bump the collection list, every time two sessions alternate. So:

- An empty field in the record takes the first non-empty value seen. A null or empty value never clears one.
- A report whose non-empty fields all equal the stored ones sets `confirmed_at = now`, and so does a report that fills an empty field or replaces a value, so a fresh value is never replaced at once by the next differing report.
- A different non-empty value replaces the stored one only when `confirmed_at` is more than 7 days old. With sessions syncing every 3 days, a value any holder still reports stays put; a value Cosmo changed for everyone is replaced within about 10 days.
- `has_voice` counts `false` as empty: once a session reports `true`, it stays `true`.

The rule depends only on the stored record, the report and the time, so the same reports in the same order give the same record.

**The apply.** Each run reads every record and the matching indexer rows (`slug = ANY($1)`, chunked) and plans with the pure `planMediaWrite(row, record, budget, copyPrefix)` (`@repo/lib/collection-media.ts`). `copyPrefix` is `<S3_PUBLIC_URL>/collection-media/`; the library stays env-free.

| Indexer column      | Written when                                                     | Why                                                                                                                         |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `front_media`       | the record's `front_media_copy` is set, starts with `copyPrefix`, is at most 255 characters, and differs | nothing else writes it. Cosmo's URL is never written (Decision 9); with no copy yet, the column keeps what it holds |
| `has_audio`         | the record's `has_voice` is true and the row's is false          | same; the record never holds a voice that was taken back                                                                    |
| `back_image`        | the row's is `""` and the record has one                         | v3 rows have none. A row with a back image keeps it, so no back image is reprocessed for a URL change alone                 |
| `accent_color`      | the row's is `""` and the record has one                         | v3 rows have none. Nothing on the web reads it yet; filling it costs nothing extra                                          |
| `text_color`        | the record's is `#rrggbb`, `source_text_color` is null (no staff override), and it differs | v3's is a guess by class                                                                          |
| `source_text_color` | never                                                            | see Staff text colours below                                                                                                |
| `background_color`  | never                                                            | v3 already carries Cosmo's value: redundant                                                                                 |

The apply reads only the app and indexer databases, so it runs on every run, including while the sync phase backs off from Cosmo (Decision 10).

**Staff text colours.** Under a staff override the session changes nothing: `text_color` keeps the staff colour and `source_text_color` keeps the colour kept when staff first changed it, as `web-admin` (Colour values, Reset to the source colour) requires. After a Reset, `source_text_color` is null, so the next run (within 5 minutes) writes Cosmo's colour onto `text_color` if it differs from the restored one. A staff colour set after a sync keeps Cosmo's colour as its source, since `planColourWrite` takes the row's colour then. Writing `source_text_color` from the session was rejected: it would change what Reset restores, which needs a `web-admin` change of its own.

**Band images.** The owner's decision: band images stay hardcoded on the web for now. `planMediaWrite` never writes the indexer's `band_image_url`, since `getBandImageUrl` returns the column before its map, so a write would replace the hardcoded image. The record keeps Cosmo's URL, uncopied, for the follow-up (Non-Goals).

**The write.** Each changed row is one indexer transaction:

1. `SET LOCAL lock_timeout = '5s'`;
2. `SELECT … FOR UPDATE` of the media and colour columns;
3. plan again under the lock;
4. `UPDATE` of only the planned columns.

A lock timeout skips the row and counts it, and the next run retries it.

**Why this survives the indexer.** None of these columns is in `collectionFields`, so the indexer never sets them on an existing row. A write landing during a batch fails that batch with 40001, and the rerun reloads it. That is the staff-colour rule, unchanged. After a rebuild, rows come back with `""` and guesses, and the next run writes the record onto them again, our copies included, with no new download. No replay script is needed.

**Back images and S3.** A filled `back_image` changes `md5(front|back)`, so `process-collection-images` reprocesses that row (three uploads) on its next run, and the web serves its `processed_back_image`. That is the front image's own path, so the back image needs no copy of its own (Decision 9). A run fills at most 50 back images, and later runs take the rest. Those 50 then drain through the image job five at a time. Motion videos are copied by `copy-collection-media` (Decision 9); band images are recorded only, and colours and the voice flag are not media.

**Caches.** After a run that wrote any row, the worker:

- writes `collection:modified-at` with `nextModifiedAt` (`@repo/api/lib/collection-bump`, env-free) through its own Redis client;
- deletes Spin's `held-by:v3:<spin address>`. The key builder moves to a pure module both sides import, so the worker never builds the key by hand.

### 9. Media URLs: copy into our bucket, serve our copy

The owner's decision: media gathered from sessions is copied into our bucket (R2), and the site serves our copy, as it does front images.

**What is copied.**

| Field                                  | Copy                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Motion video or voice (`frontMedia`)   | the bytes as served, with no transcoding, once they are sniffed as an allowed video or audio type (below) |
| Band image (`bandImageUrl`)            | none: recorded only, never shown (Decision 8, Band images)                                            |
| Back image (`backImage`)               | no copy here: the apply fills `back_image`, and `process-collection-images` copies it (Decision 8)    |
| Voice flag, accent and text colour     | none: they are not media                                                                              |

**Voice.** A voice Double carries its media in `frontMedia` as a Motion collection does, so it takes the same path: the same record columns, 64 MB cap, budget and download rules. Only the sniff tells video from audio. Sample voice files seen before the first sync were videos with a sound track, not audio-only: MP4 (`mp42`, about 47 MB) and QuickTime (`qt  `, about 14 MB). The QuickTime brand is accepted and stored as `video/mp4`, and the cap was raised from 30 MB to 64 MB for them. Task 8.8 confirms this on Cosmo's own files.

**Where the URL lives.** The indexer's `front_media` holds **our** URL and nothing else. Cosmo's URL, the source, stays in the record (`collection_media.front_media`), beside our copy's URL (`front_media_copy`). The reasons:

- **No indexer schema change.** Separate `processed_front_media`-style columns would need `schema.graphql`, the Subsquid model and an indexer migration.
- **No read change.** `overrideCollection` passes the column through as stored, so the API and the web serve our copy with no change.
- **The indexer rule holds.** The column is not in `collectionFields`, and a created row leaves it null, so only the worker's apply writes them, under the lock of Decision 8.
- **A rebuild costs no download.** The record keeps our URL, so the apply writes it back.

**No fallback to Cosmo's URL.** Until a copy exists, or after one fails, the column keeps what it holds: nothing for a new value, or the previous copy when the source changed. Front images fall back to Cosmo's URL because the indexer always has one. Here the reasons go the other way:

- Cosmo's media URLs may be signed per account (Open questions), and publishing one would show which account shared the collection, which the consent text (Decision 14) rules out.
- One write per value, not a Cosmo URL followed by ours, and so one bump of the collection list.
- Every value in the column is under our prefix, so the orphan sweep can trust it.

The delay is one copy run, normally within 10 minutes of the sync.

**The job.** A separate job, `job/copy-collection-media.ts`, registered as `safeRun("media-copy")` every 10 minutes (`2-59/10`) and at startup, inside `if (indexerWrites)`, beside `process-collection-images`. Unless `S3_BUCKET` and `S3_PUBLIC_URL` are both set, it gives one `warn` per process start and returns; `s3.ts`'s fallback of the public URL to the endpoint is not enough, since the URL is stored. It reuses the image jobs' machinery:

- `@/lib/s3`, which gains `putObject(key, body, contentType)` (`putWebp` calls it) and `mediaKeyFromUrl(url)` for the `collection-media/` prefix;
- `mirror-artist-images`' serial loop, with each failure caught, counted and retried later.

It is not a phase of `collection-media`, nor part of `process-collection-images`:

- `collection-media` spends its 4-minute run on the Cosmo budget (Decision 10), and a video download must not eat into it or wait on Cosmo's backoff. The downloads go to media hosts, not the API.
- `process-collection-images` picks rows by an indexer hash and converts five at a time. The copy's sources live in the app database, and videos are megabytes, so mixing the two would change that job's budget and selection.

The copy job writes only the bucket and the record. The apply (Decision 8) stays the one writer of the indexer.

**Which copies.** A record's `frontMedia` (motion or voice) is due when all of these hold:

- its source passes `acceptMediaUrl`;
- its copy is missing, or was made from another source (the key below no longer matches);
- its `front_media_failed_at` is null or more than 6 hours old;
- the record's slug is an indexer collection, so a made-up `collectionId` from a session never fills the bucket.

Due copies are grouped by source, so one source is downloaded once a run however many records share it, and the oldest `observed_at` goes first. A source already copied for another record is reused with no download, since the key is the same. A failure is written to every record with that source.

**Keys.** `collection-media/<motion|voice>/<slug>-<h>.<mp4|webm|m4a|mp3|ogg>` (`voice/` when any record sharing the source has voice, else `motion/`; the folder never decides whether a copy is current), the extension from the sniff, where `<slug>` is the collection's slug and `<h>` is the first 8 hex digits of the SHA-256 of the source URL:

- The slug makes keys human-readable in bucket listings. The short hash keeps them unique when a source changes.
- The same slug and source always give the same key, so a retry after a crash overwrites the same object (no orphan).
- A key's bytes never change under `CACHE_CONTROL`'s immutable year, as long as Cosmo never changes the bytes behind a URL. Media URLs carry their own ids, and the front image's `image_sync_hash` makes the same bet.
- The prefix sits outside `collection-images/`, so the existing orphan sweep never sees these objects.

**Budget per run.**

| Limit                      | Value                                                       |
| -------------------------- | ----------------------------------------------------------- |
| Downloads                  | one at a time; at most 20 objects and 300 MB per run        |
| Size                       | 64 MB, video or audio                                       |
| Timeout                    | 60 s per video, with no retry within a run                  |
| Wall time                  | no new download starts after 5 minutes                      |
| Repeated failures          | the run stops after 3 downloads in a row fail with a 429, a 5xx or a timeout |

That is up to 2,880 objects a day, enough to drain a first sync's backlog within a day. The sizes are guesses until a real `frontMedia` is seen (Open questions).

**Downloading safely.**

- The source is checked with `acceptMediaUrl` again just before the fetch, so a record edited by hand cannot point the job elsewhere.
- The host is resolved first, and every address it resolves to must be public: a loopback, private, link-local, unique-local or other reserved address, IPv4 or IPv6, refuses the copy. The `*.cosmo.fans` wildcard trusts Cosmo's DNS, and this keeps a stray record from reaching the VPS's own network. The gap between the lookup and the fetch's own lookup is accepted, since every host is on the allowlist.
- `fetch` with `redirect: "manual"`: any 3xx is a failure, counted by host, so the job never follows a redirect off the allowlist.
- No cookie, session or Cosmo header is sent. The fetch is a plain public GET, with no proxy, as the image job's are.
- A `Content-Length` over the cap aborts before the body. The body is read as a stream with a running count and aborted past the cap, since the header may be absent or wrong. It is held in memory, at most 64 MB, one at a time, so the put can carry its length.
- The content type comes from the bytes, never from the response header:
  - `video/mp4` needs `ftyp` at bytes 4 to 7 and a major brand of `isom`, `iso2` to `iso6`, `mp41`, `mp42`, `avc1`, `M4V ` or `qt  ` (QuickTime, which voice Doubles use) at bytes 8 to 11. That refuses HEIC and AVIF, which share `ftyp`.
  - `audio/mp4` (`.m4a`) needs `ftyp` with the major brand `M4A `.
  - `video/webm` needs `1A 45 DF A3` first.
  - `audio/ogg` needs `OggS` first.
  - `audio/mpeg` (`.mp3`) needs an `ID3` tag first, or an MPEG layer III frame sync (`FF` then a byte with the sync bits, a defined version and layer III). ADTS AAC shares the first byte and is refused.
  - Anything else is refused. The object's `Content-Type` is set from that allowlist.
- Every put carries `CACHE_CONTROL`. R2 answers range requests, which Safari needs to play a video.

**On a failure,** `front_media_failed_at` is set on every record with the same source, and the copy column keeps its value. One `warn` per run carries the counts by reason and the hosts, never a URL, since a source may be signed.

**On a success,** the job writes the copy's URL and clears `front_media_failed_at` in one update per record. That update is guarded by the source the copy was made from, so a merge that replaced the source in the meantime is not overwritten. The next apply writes the copy onto the indexer and bumps the collection list.

**A changed source.** When the merge replaces a source (Decision 8), the key no longer matches, so the record is due again. Until the new copy lands, the row keeps showing the old one. The apply then writes the new URL, and the old object becomes an orphan.

**Orphans.** Nothing deletes an object inline. A key may be shared by several records, and the indexer row points at the old object until the apply runs, so an inline delete could remove media still on show. Instead, `script/cleanup-orphaned-collection-images.ts`, still run by the owner, also lists `collection-media/`. It keeps every key that an indexer `front_media` or a record's `front_media_copy` names. Like the image sweep, it refuses to delete anything when either column holds a URL outside `S3_PUBLIC_URL`.

**Accepted sources.** A source URL is copied only when all three hold:

- it is `https`, with no user, password or port;
- its host is in an allowlist (`imagedelivery.net`, `resources.cosmo.fans` and any `*.cosmo.fans`);
- it is at most 1,024 characters. The indexer column holds only our URL now, so its 255 no longer bounds the source; the record's source columns widen to `varchar(1024)`.

Anything else is skipped and counted as `skipped`, with one `warn` per run naming the host, never the URL. The first real motion sync shows `frontMedia`'s host, and adding it to the allowlist is a one-line change.

**The cost this takes.** Storage grows by one file per motion or voice collection that any connected account holds. The owner counts the Motion collections before the first sync and reads the first copied files' sizes after it, which together size the total; voice collections are counted only once syncs fill `has_audio` (Open questions).

### 10. Sync: one worker job

**Job.** `job/collection-media.ts` is registered as `safeRun("collection-media")` every 5 minutes and at startup.

- It runs only `if (indexerWrites)` and only with `COSMO_SESSION_KEY` set. Without the key it logs one `warn` per process start and returns.
- The worker is the only writer of session data and indexer media. The web never calls Cosmo with a stored session, except to sign one out.
- `safeRun`'s lock keeps one run at a time, so every Cosmo call the job makes is serial.
- It makes no bucket call. Copying media is `copy-collection-media`'s job, under its own lock and budget (Decision 9).

**Each run** has two phases:

1. **Sync phase**, skipped while backing off (below).
2. **Apply phase**, always: apply the records to the indexer (Decision 8), delete rows dead for more than 30 days (Decision 6, Retention), and send due expiry notices (Decision 15). None of these calls Cosmo, so a backoff delays none of them.

**Which sessions.** A live session is due when `sync_requested_at` is set, or `next_sync_at` or `cookie_expires_at` has passed. The order:

1. a session with a `sync_cursor` (finish what was started);
2. requested ones, oldest request first;
3. scheduled ones, by `next_sync_at`.

**Budget.** All sessions leave from one IP, so the limits are global, not per session:

| Limit                   | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Requests per run        | 50, counting `users/me`, every page and sign-outs  |
| Wall time per run       | 4 minutes, so a run ends before the next is due    |
| Spacing                 | one request at a time, at least 1 s apart plus 0 to 500 ms of random jitter |
| Hourly ceiling          | 600 requests (50 × 12 runs)                        |
| Pages per artist        | 40 at most                                         |

A run stops starting sessions once fewer than 2 requests remain in its budget.

**Cadence.** After a sync completes, `next_sync_at = now + 72 hours + jitter`, where the jitter is the session's `id` hashed to 0 to 360 minutes, so accounts connected together drift apart. A connect sets `sync_requested_at`, so a new account syncs on the first run with budget. A typical account costs about 10 requests (1 `users/me`, about 7 pages for 180 collections, 1 for each artist it holds nothing of), so 600 an hour is about 1,400 syncs a day: about 4,300 live sessions at a 72-hour cadence. Beyond that, scheduled syncs queue in `next_sync_at` order and the cadence stretches evenly, while requested syncs still go first.

**Syncing one session:**

1. Open the cookie (a failure skips this session, Decision 6), and stamp `last_attempt_at` and `last_used_at`.
2. When `cookie_expires_at` has passed, sign out, mark it `session_expired`, and move on.
3. Call `users/me`. A `dead` answer (Decision 5) marks the session dead. Otherwise refresh the nickname.
4. For each artist in `validArtists`, from the cursor if one is set, page `objekt-summaries` with no class filter, `order=newest`, `size=30`. Stop when the collected count reaches `collectionCount`, when a page returns fewer than 30, or at 40 pages.
5. Map each `collectionId` through `slugifyObjekt`, the indexer's own mapping, and merge it into the record (Decision 8) as each page arrives.
6. When the run's budget or time runs out mid-session, store `{artist, page}` in `sync_cursor` and stop; the next run resumes there.
7. On completion, set `last_synced_at`, `last_sync`, `next_sync_at`; clear `last_error`, `sync_cursor` and `sync_requested_at`.

There is no early stop within a sync. Stopping at a page whose collections are all recorded would be safe only if `order=newest` sorts by acquisition, which is unverified (Open questions); the budget, not an early stop, bounds the load.

**Failures and backoff.**

- `dead` (401 or 403 with Cosmo's JSON error) → dead (Decision 7). Any other 403 is `unavailable`, below.
- **429, 5xx, a timeout or a firewall 403** is Cosmo-wide, not the session's fault. The sync phase stops for this run, the session keeps its cursor and due time, and `last_error = cosmo_unavailable`. The job backs off: 5 minutes after the first failing run, doubling with each consecutive one up to 2 hours, reset by the first run whose Cosmo calls all succeed. The backoff is stored in Redis (`collection-media:backoff`, `{until, minutes}`, through the worker's own client) so a restart, which runs the job at once, does not reset it; with Redis unreachable the job keeps an in-process copy.
- **An unparseable page** is the session's own: it keeps its cursor, `last_error = unexpected_response`, and `next_sync_at = now + 6 hours`.
- What a session already recorded stays recorded.
- One `warn` per run carries the counts and the backoff.

**Idempotency.** The record is merged by slug and the apply writes only differences, so running it twice, or a Sync now overlapping a scheduled sync, changes nothing more.

**Sync now** (`requestSync {id}`, the owner only) sets `sync_requested_at = now()`, which is idempotent. It is refused for a dead session (`cosmo_session_dead`) and limited by `userRateLimited("cosmo-sync", uid, 3, 3600)`, so pressing it cannot spend the shared budget. The section polls the list every 10 s while a request is pending. A web-side sync would make two writers and run a minute of Cosmo calls inside a request.

**Class filters.** The pager takes an optional class, so if a real Motion holder shows that the unfiltered listing leaves Motion or Special out, a filtered pass is a small change (Open questions).

### 11. Logs and error reports

- **Scrubber.** `PRIVATE_KEY` in `@repo/lib/error-scrub` gains `ticket`, `otp`, `recaptcha`, `qr`, `user-session` and `cookie_?sealed`, with tests. `cookie`, `set-cookie` and `token` are already there.
- **Errors.** Cosmo calls throw `CosmoSessionError` without URLs (Decision 5).
- **Logs.** The worker logs a session by its `id` only, never the nickname, the address or the owner's user id. The web logs nothing from certify or `users/me`. The copy job logs a source by its host only, never its URL (Decision 9).
- **Reporting.** Refusals are under 500, so `isExpectedError` never reports them.

### 12. Showing the media on the web

- **Drawer card.** `ObjektFlip`'s front face shows `<video muted loop playsInline preload="metadata" poster={frontImage}>` when `frontMedia` is set, with the band (`ObjektSidebar`) still drawn over it. `frontMedia` is our bucket's copy (Decision 9), so the video plays from `S3_PUBLIC_URL`, as the front image does.
  - It autoplays unless the viewer prefers reduced motion. Then the still image stays, and Metadata's link opens the video.
  - It stays muted. Sound on voice objekts is a follow-up, since the whole card is the flip button and cannot hold a second control.
- **Voice copies.** The card and Metadata read `frontMedia` without its type, so a voice Double whose copy is audio plays it, muted, in the `<video>`: the card shows the poster (the front image), and Metadata's Motion row links to the audio file. Nothing breaks, but the label is wrong. Whether voice media is audio at all is settled by task 8.8 (Open questions); if it is, a follow-up labels the row by the copy's extension.
- **Grid cards.** They keep the still image: a video per card in a virtual grid would cost too much.
- **Metadata.** It gains a Motion row (a `MetaLink` to `frontMedia`) and a Voice row (Yes or No). The spec already says Metadata shows every collection field.
- **Back images.** They already render (`ObjektFlip`'s back face), so a filled column shows with no web change.
- **Band images.** `ObjektSidebar` keeps drawing `getBandImageUrl`'s hardcoded map, since the apply never writes `band_image_url` (Decision 8).

### 13. Dependencies

- **`qrcode.react`** (`catalog:`, MIT, no runtime dependencies) draws the QR code with `QRCodeSVG`. Only a transitive `qrcode-generator` is in the lockfile, and the web cannot import it.
  - The code is drawn dark on a white tile with a quiet zone in both themes, since scanners need that contrast.
  - Under it sits an `Open Cosmo` link to the same `cosmo://` URL, for a user on the phone that holds the Cosmo app, who cannot scan their own screen.
- **`zod`** is added to `packages/cosmo` (`catalog:`).
- No `puppeteer`, `puppeteer-core` or Playwright (Decision 3).
- **The code field.** It is a plain vendored `Input`: `inputMode="numeric"`, `maxLength={2}`, digits only, with `autocomplete="one-time-code"`. There is no OTP component in the kit, and 2 digits do not need one.

### 14. Consent text

The Collection data section shows this above its list, before Connect, every time; pressing Connect is the consent, and `created_at` records when it was given. The en text, with ko (합니다체 statements, 하세요 instructions) and ja (です/ます, full-width colon) drafts for the owner to review:

| Key | en | ko | ja |
| --- | --- | --- | --- |
| title | Share collection data | 컬렉션 데이터 공유 | コレクションデータの共有 |
| intro | Connect your Cosmo account to help fill in motion videos, voice and colours for the collections you hold. Everyone on the site sees the media. Nobody sees whose account it came from. | Cosmo 계정을 연결하면 보유한 컬렉션의 모션 영상, 보이스, 색상을 채우는 데 도움이 됩니다. 미디어는 사이트의 모든 사람에게 보입니다. 어느 계정에서 왔는지는 아무도 볼 수 없습니다. | Cosmoアカウントを接続すると、保有しているコレクションのモーション動画、ボイス、カラーの補完に協力できます。メディアはサイトの全員に表示されます。どのアカウントから取得したかは誰にも表示されません。 |
| stored | What we store: an encrypted Cosmo sign-in, and your Cosmo nickname and wallet address. The sign-in is kept until you disconnect, for 180 days at most. Once it ends, the rest is deleted within 30 days. | 저장하는 정보: 암호화된 Cosmo 로그인, Cosmo 닉네임과 지갑 주소입니다. 로그인은 연결을 해제할 때까지, 최대 180일 동안 보관합니다. 로그인이 끝나면 나머지 정보는 30일 이내에 삭제합니다. | 保存する情報：暗号化されたCosmoのログイン、Cosmoのニックネームとウォレットアドレスです。ログインは接続を解除するまで、最長180日間保存します。ログインの終了後、そのほかの情報は30日以内に削除します。 |
| read | What we read: the collections you hold, for their media and colours. We keep only that media, not a list of what you hold or anything else from your Cosmo account, such as your email. | 읽는 정보: 보유한 컬렉션의 미디어와 색상입니다. 그 미디어만 보관하며, 보유 목록이나 이메일 등 Cosmo 계정의 다른 정보는 보관하지 않습니다. | 読み取る情報：保有しているコレクションのメディアとカラーです。保存するのはそのメディアのみで、保有リストやメールアドレスなど、Cosmoアカウントのその他の情報は保存しません。 |
| shown | What others see: the media, with no link to you. Your Cosmo nickname and address show only to you, here. | 다른 사람에게 보이는 정보: 회원님과 연결되지 않은 미디어만 보입니다. Cosmo 닉네임과 주소는 이 화면에서 회원님에게만 보입니다. | ほかの人に表示される情報：あなたと結び付かないメディアのみです。Cosmoのニックネームとアドレスは、この画面であなたにのみ表示されます。 |
| stop | To stop, press Disconnect at any time. We sign out of Cosmo and delete the sign-in. | 중단하려면 언제든지 연결 해제를 누르세요. Cosmo에서 로그아웃하고 로그인을 삭제합니다. | 停止するには、いつでも「接続を解除」を押してください。Cosmoからログアウトし、ログインを削除します。|

The copy never says what a user holds is private: profiles already show holdings, as on chain.

### 15. Expiry notice in the bell

When a live session has fewer than 14 days left before its `cookie_expires_at`, its owner gets one in-app notification that the Cosmo connection expires in N days, leading to `/account/collection-data`, where the row's Renew button waits (Decision 7). It uses the existing notification system (`web-notifications`), with no new table.

- **Type.** A new `notification.type`, `cosmo_session_expiry`. The column is `text` with no CHECK (the type list is the TypeScript `$type` union in `schema.ts`), so the type itself needs no migration. It joins `LISTED_NOTIFICATION_TYPES` and `notificationSchema` (`schemas/notification.ts`), or `listNotifications` filters it out, but not `NOTIFICATION_TYPES`, which are the types with a setting.
- **Always on, like `sanction`.** No row in Notifications, no `notification_pref` value. The user asked for the connection by connecting, the notice comes at most once per 180 days per session, and turning it off would only let sessions lapse unseen. A user who wants none can disconnect.
- **Payload.** `{ expiresAt }`, data only, as every payload is. It carries no nickname or address: those show only to the owner on the section (Decision 6, `web-cosmo-session` Not tied to linked profiles), the consent text says so, and an unread notice is kept for good while a dead row's nickname is deleted within 30 days. With up to 3 accounts, the link leads to the section, whose row says which one expires.
- **Wording.** The client words it, as for every type: whole days from the notice's `created_at` to `expiresAt`, through the same `expiryNotice` the row uses, so the notice and the page agree on the day it is sent. "Your Cosmo connection expires in N days. Renew it", with its own strings for 1 day and today. Counting from `created_at`, not from now, keeps an old notice true as of its own time, which the row's time shows beside it; counting from now would turn a renewed session's read notice into "expired". The row leads with the clock tile, carries the verb label Renew, and is listed under All only: it is neither a trade nor a list alert, so the Trades and Lists tabs and `KIND_TYPES` stay as they are. It is never grouped (`row:<id>`, as `listNotifications` keys every type but offers and trades). Activating it marks it read and opens `/account/collection-data`.
- **Sender.** `collection-media`'s apply phase, beside retention (Decision 10). It needs no Cosmo call, no cookie and no key, so a backoff never delays it. It inherits the job's gates (`indexerWrites` and `COSMO_SESSION_KEY`): without them the job does not run, so no session syncs, expires or is notified, whatever the web allows. A separate job would add a lock and a schedule for one cheap query every 5 minutes.
- **Once per session per connect.** `cosmo_session.expiry_notified_at` holds the rule; `group_key` cannot, since `notification_unread_group_uniq` dedupes only while a notice is unread. In one app transaction:
  1. `UPDATE cosmo_session SET expiry_notified_at = now() WHERE dead_at IS NULL AND expiry_notified_at IS NULL AND cookie_expires_at > now() AND cookie_expires_at < now() + RENEW_NOTICE_DAYS RETURNING id, user_id, cookie_expires_at`, which claims each row once even if two runs overlapped;
  2. insert one notification per claimed row, `group_key = cosmo_session_expiry:<id>:<cookie_expires_at as epoch seconds>`, `ON CONFLICT DO NOTHING`. The key names this connect's expiry, so an unread notice from an earlier connect of the same row never blocks the next one.

  After commit, `publishUsers(userIds, { type: "notifications_changed" })` (`@repo/api/realtime`), as `want-alerts` does. A connect or renew clears `expiry_notified_at` (Decision 4, certify), so the next cycle notifies again; a new owner's row starts cleared too. A session that dies first is never notified, and one connected with less than 14 days of Cosmo's own expiry left is notified on the next run.
- **Renew and disconnect.** A renew marks the session's unread notice read in certify's transaction (Decision 4), so the bell stops asking for a renew already done. Disconnect leaves it: the notice still leads to the section, and the 90-day retention for read notices applies as for every type.
- **The threshold.** `RENEW_NOTICE_DAYS` (14) moves from `apps/web` to `packages/api/src/schemas/cosmo-session.ts`, which both the web and the worker import, so the row, the notice's wording and the worker's query use one number.
- **Strings.** en, ko (합니다체, 하세요 for the instruction) and ja (です/ます, full-width ？ if a question is ever added), for N days, 1 day and today; the verb label reuses `cosmo_session_renew`:

| Key | en | ko | ja |
| --- | --- | --- | --- |
| days | Your Cosmo connection expires in {count} days. Renew it to keep sharing. | Cosmo 연결이 {count}일 후 만료됩니다. 계속 공유하려면 갱신하세요. | Cosmoの接続はあと{count}日で期限が切れます。共有を続けるには更新してください。 |
| one day | Your Cosmo connection expires in 1 day. Renew it to keep sharing. | Cosmo 연결이 1일 후 만료됩니다. 계속 공유하려면 갱신하세요. | Cosmoの接続はあと1日で期限が切れます。共有を続けるには更新してください。 |
| today | Your Cosmo connection expires today. Renew it to keep sharing. | Cosmo 연결이 오늘 만료됩니다. 계속 공유하려면 갱신하세요. | Cosmoの接続は本日期限が切れます。共有を続けるには更新してください。 |

## Risks / Trade-offs

- **reCAPTCHA scores.** A headless container on the VPS may score too low. The probe used a real Chromium elsewhere. → The first task after the container lands is an owner-run mint and ticket call from the VPS, before any UI is built (task 3.4). If it fails, the fallback is a headed Chromium image or the proxy. Nothing else in the change depends on which.
- **The browser as a shared resource.** Any signed-in user can make the server open a page. → Per-user, per-IP and global start limits, a container that runs 2 pages and queues 4, and a 20 s cap per page. Many accounts on many addresses can still use up the global limit for a minute; that denies sign-in only, never the site, and the global limit exists to protect the container and Cosmo.
- **One IP for every session.** Cosmo may limit or block our egress as sessions grow. → The worker's global budget (600 requests an hour), serial requests, jitter and persistent backoff; a firewall 403 never marks a session dead.
- **More stored sign-ins.** → Decision 6, Threat model: ciphertext only at rest, a key outside the database, a 180-day max age, no cookie on dead rows.
- **Bucket growth.** Every motion or voice collection any account holds adds one file to R2. → 64 MB per file and 300 MB per run at most (Decision 9). The owner counts the motion collections before the first sync (task 8.6) and reads the first copied video's size after it (task 8.8).
- **Media hosts refuse the worker.** Cosmo's media hosts may block our egress, as its API firewall does. → A copy that fails leaves the row as it was and is retried 6 hours later; three failures in a row end the run. Nothing shows Cosmo's URL meanwhile, so a block delays media and exposes nothing.
- **Bytes changed behind a URL.** Our key is named by the source URL, so a change Cosmo makes under the same URL is never copied. → The front image makes the same bet with `image_sync_hash`, and a media URL carries its own id.
- **Certify timeout.** After a timeout, a session may exist at Cosmo that we never saw. → It is harmless to us. It appears in the account holder's Cosmo sessions, and they can end it there. The dialog tells the user to start again.
- **Text colour changes.** A text colour change is visible on cards. → Only where the record's colour differs from the row and no staff override exists. The first run's `info` summary counts them per column, so the owner sees the size.
- **A Reset that changes again.** After a staff Reset, the next run may replace the restored guess with Cosmo's colour. → That is the intended source; the collections table shows the new colour once the run writes it.
- **Back image load.** A large back-image backlog loads S3. → 50 per run, drained five at a time by the image job.
- **A changed value is slow to land.** The merge holds a value for 7 days after its last confirmation. → It trades a few days' delay on a real Cosmo change for no flapping; a stuck value can be cleared from the record by hand.
- **Coverage.** It depends on which accounts connect, and expired sessions drop out. → Stated in the proposal. Recorded values stay after a session ends.
- **One key for every session.** → Held only by the web and the worker, never logged. A changed key stops the sync without harming rows (Decision 6).

## Migration Plan

1. Generate the app migration (`cosmo_session`, `collection_media`) with `db:generate`. The owner runs `docker compose run --build --rm migrate` before the deploy. It is expand-only, since no live code reads the tables.
2. The owner adds `COSMO_SESSION_KEY` (`openssl rand -base64 32`), `COSMO_BROWSER_TOKEN` and `COSMO_BROWSER_URL` on the VPS, to the `web` and `worker` environments, and starts the `browser` service.
3. Deploy the web and the worker. With no session connected, neither job does anything. The copy job uses the bucket env the `worker` service already has.
4. The owner connects their own Cosmo account on `/account/collection-data` and presses Sync now.
5. **Rollback.** Expiry notices already sent stay as ordinary notifications; the bell lists a `cosmo_session_expiry` row only while its type is in `LISTED_NOTIFICATION_TYPES`. Delete every session row, after signing each out (a one-off script run by the owner, with approval). The written columns stay valid data. To undo them, clear `front_media` and `has_audio` from rows the record names, then delete the `collection-media/` prefix from the bucket, each by hand with approval.

## Open Questions

### Settled

Settled by production data after 4 sessions synced (2026-11-18). Values are counts and types, never credentials or URLs.

- **`frontMedia`.** A plain URL string on `resources.cosmo.fans`, ~89 characters, no query parameters. No signed or per-account URLs observed across 39 records and 4 sessions (see Per-account URLs below).
- **Motion files.** All 27 copied Motion files are `video/mp4`. Mean: 15.4 MB; range: 6.5–35.3 MB.
- **Voice files.** All 12 copied voice Doubles are `video/mp4` (video with sound), not audio-only. Mean: 31.4 MB; range: 9.8–46.9 MB. The Metadata label follow-up for audio voice copies (Decision 12) does not apply.
- **Certify body.** Certify returns 201 with a bare string body and the `Set-Cookie: user-session` (Context item 5). No refresh token exists.
- **Redirects.** `resources.cosmo.fans` answers a plain GET directly with no redirect. The copy job's no-redirect policy works as built.
- **Per-account URLs.** No query parameters on any `front_media`, `back_image` or `band_image_url` across all records and 4 sessions. URLs appear to be static and not signed per account. No key-hashing change needed; if a future session shows query parameters, revisit.
- **Unfiltered listing.** The job fetches without a `class[]` filter, and 2,532 records were observed across all classes (Motion, Double, and others). Paging works: 4 sessions completed full syncs (cursors null), which at size 30 means 80+ pages per session. Settled.
- **`objekts[]`.** Keys documented in `cosmo-objekt-ownership-data` design.md (Decision 2): `metadata.tokenId`, `metadata.objektNo` (serial), `transferable`, `usedForGrid`, `nonTransferableReason`, `tokenAddress`, `collectionId`, and others per objekt.
- **Headless reCAPTCHA from the VPS.** Passed (task 3.4): a token minted in the headless container through `COSMO_PROXY` was accepted.
- **Proxy.** The browser container needs `COSMO_PROXY` to reach Cosmo through WARP; no credentials needed beyond the proxy URL.
- **Sizing (8.6, 2026-11-18).** After 4 sessions synced 2,532 collection_media records (all matched to indexer rows; 0 unmatched):
  - Indexer `back_image = ''`: 2,773 (all are collections no connected account holds; every observed record's back image was applied).
  - Indexer `accent_color = ''`: 2,773 (same unobserved set; every observed accent was applied).
  - `text_color` differs case-sensitively (record lowercase vs indexer uppercase, `source_text_color IS NULL`): 433. Case-insensitive: 0. The apply phase normalizes these to lowercase; the values are semantically the same.
  - Motion collections on the indexer: 268. Voice Doubles observed so far (`has_voice`): 12 (total unknown — only collections held by connected accounts are seen).
  - Copies in the bucket: 27 motion (416 MB) + 12 voice (377 MB) = 39 files, 793 MB total, all `video/mp4`.
  - Projected bucket at full Motion coverage: 268 × 15.4 MB ≈ 4.1 GB. Voice total unknown (12 seen = 377 MB; grows as more accounts connect).

- **Rolling renewal (8.8 step 7, 2026-11-20).** None. A `users/me` call with the owner's stored cookie, 2.5 days after connect, answered 200 `application/json` with no `Set-Cookie` header at all. The stored cookie is the only one; the 180-day cap and Renew stand, and no follow-up to store a new cookie is needed.
- **`order=newest` (2026-11-20).** Sorts by when the account last received an objekt of the collection, not by release. On one `tripleS` page of 30 for the owner's account, ordered by the latest `received_at` of the listed tokens: 0 inversions of 435 pairs; by collection `created_at`: 35. An early stop at an all-recorded page would therefore be safe; the sync still has none (Decision on paging).
- **Motion without a class filter (2026-11-20).** 162 Motion collections are recorded in `collection_media` among 10,126, so the unfiltered listing returns Motion. A filtered pass is not needed.
- **Refused-session body (2026-11-20).** Seven sessions were marked `session_dead`, and `errorKindOf` reads `dead` only from Cosmo's JSON error body, so a signed-out cookie gets that body as Decision 5 assumes.

### Still open

- **Special band images.** Does `class[]=Unit` also return Special collections? This matters only if a filtered pass is needed.
- **Wrong codes.** What status and body does a wrong code get, and how many attempts are allowed before the ticket dies?
- **Other statuses.** Does Cosmo ever return a status beyond the two seen (`certified`, a cancel or deny)? The design treats any unknown one as expired.
- **Rate limits.** What are Cosmo's limits on `objekt-summaries` and the sign-in endpoints, per IP? The 1 s spacing and the 600-an-hour ceiling are guesses.
