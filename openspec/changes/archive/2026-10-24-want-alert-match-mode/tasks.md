# Tasks

## 1. Schema and migration (packages/db)

- [x] 1.1 Add nullable `match` (`text`, `$type<"any" | "mutual">()`, CHECK `match IN ('any', 'mutual')`) to `notificationPref` in `schema.ts`. Generate a new migration with `bun run --filter=@repo/db db:generate`. The SQL adds the column and the CHECK only, with no UPDATE. Do not apply it without approval. Verify: lint and typecheck pass for `@repo/db`.

## 2. Prefs and payload (packages/api)

- [x] 2.1 In `schemas/notification.ts`:
  - set `NOTIFICATION_DEFAULTS.have_wanted` to `true`;
  - add `ALERT_TYPES`, `ALERT_MATCH_DEFAULT = "mutual"`, the `setAlertMatch` input schema (`type`, `choice: "off" | "any" | "mutual"`) and an optional `match` on `alertPayloadSchema`.

  `mergePayload` (`lib/notification-group.ts`) takes the new alert's `match`. Verify: a test in `notification-group.test.ts` shows the newest `match` wins and a missing one stays missing.
- [x] 2.2 `notificationPrefs` returns `{ enabled, match }`, with NULL or a missing row read as the defaults. Add the `setAlertMatch` procedure in `routers/notifications.ts`: one upsert writing `enabled` and `match`, where Off keeps the stored `match`. Verify: typecheck shows every `prefs` consumer moved to `.enabled`.
- [x] 2.3 Add `mutualPartnerIds(userId, partnerIds)` in a new env-free `services/trade-matches/recount.ts`, moving `recountPartners`, `resolveTradeSides` and `Sides` there from `index.ts` (re-exported), so the worker can import it (see design 3). It calls `recountPartners` over `resolveTradeSides(userId, undefined, "all")` with filter `mutual` and `ownerIds`, and keeps `mutualOf(counts) > 0`. It is not cached. Verify: lint, typecheck and test pass for `@repo/api`.

## 3. Alert job (apps/worker)

- [x] 3.1 Changes in `lib/want-alert-match.ts`:
  - prefs become `{ enabled, match }` per recipient and type;
  - new pure `mutualQuestions(input)` returns, for each Can swap recipient, the partners that pass every earlier check;
  - `selectAlerts` takes `mutual: ReadonlySet<string>`, drops sale-list pairs under Can swap without a recheck, and returns `notMutual` beside `unowned`;
  - each alert carries `match`.

  Verify, in `want-alert-match.test.ts`:
  - Any alerts on a one-sided match;
  - Can swap alerts on a mutual match and returns `notMutual` for a one-sided one;
  - a sale-list pair under Can swap is neither alerted nor rechecked;
  - Off sends nothing;
  - a missing pref row means Can swap for both types.
- [x] 3.2 Changes in the job:
  - `job/want-alerts/context.ts` reads `match`;
  - `index.ts` calls `mutualQuestions`, then `mutualPartnerIds` per recipient with a concurrency cap, then `selectAlerts`;
  - `notMutual` entry ids join `unowned` in `nextRecheck`;
  - `record.ts` writes `match` onto the payload;
  - the heartbeat counts `mutual checks`.

  Verify: lint, typecheck and test pass for `worker`.

## 4. Settings and link (apps/web)

- [x] 4.1 Changes in `features/account/sections/notifications.tsx`:
  - the two alert rows use `SegmentedChoice` (Off / Any / Can swap), and their description follows the choice;
  - the save is optimistic through `setAlertMatch`;
  - Offers and Trades keep `Switch`, reading `prefs.enabled`;
  - the control sits full width on its own line below `sm`.

  Move `notification-panel.tsx` to `prefs.enabled.trade`. Verify: typecheck passes.
- [x] 4.2 `notification-items.tsx` links list alerts with `match: payload.match ?? "any"`. Verify: by reading the code; the browser check is in 5.2.
- [x] 4.3 Strings for the choice labels and the three descriptions in `en`, `ko` and `ja`, saying that Can swap leaves out sale listings. The Can swap label matches For you's toggle from `rename-mutual-to-can-swap`: "Can swap", ko "교환 가능", ja "交換できる". Verify: lint, typecheck, test and build pass for `web`.

## 5. Verify and document

- [x] 5.1 Only with the user's approval, apply the migration on the local database and run the want-alerts job twice. Check that Can swap recipients get only matches that For you's Mutual lists for them, and that one-sided entries enter `recheck`. Compare run time and the `mutual checks` count with a run from before the change. Report the numbers.
- [x] 5.2 In the running app, on a local database:
  - `/account/notifications` shows Can swap selected by default for both alert types, and Off for a type that was off;
  - the segmented control works with arrow keys and on a phone width;
  - an alert with `match: "mutual"` opens `/trade/for-you?match=mutual&list=<slug>`, and one without `match` opens `match=any`.

  Changing the setting writes, so do it only on the local database or with approval.
- [x] 5.3 Update the `AGENTS.md` files:
  - `apps/worker/AGENTS.md`, want-alerts: Can swap calls `mutualPartnerIds` once per recipient and alert list per run; `notMutual` has its own `mutualRecheck` list;
  - `packages/api/AGENTS.md`: `prefs` shape and `setAlertMatch`.

  State that the root and `apps/web` `AGENTS.md` need no change, unless one does.

## Workflow follow-up

- Archive after 5.x. `want-buying-only-unpaired` edits the same `web-lists` requirement, so whichever archives second must take the other's text first.
- Apply the migration on staging and production only with approval, before the deploy that reads `match`.
