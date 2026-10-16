# Tasks

## 1. API: one row per trade and conversation, with the partner's avatar

- [x] 1.1 In `packages/api/src/schemas/offer.ts`, add `image: z.string().nullable().optional()` to `partner` in `offerPayloadSchema` and `tradePayloadSchema`, with a comment that only the list read fills it. In `packages/api/src/schemas/notification.ts`, give the offer and trade notification variants optional `updates: z.number().int().positive()` and `earlier`, an array of the same notification variant with no `updates` or `earlier` of its own, at most 10 long. Lint, typecheck and build pass for `@repo/api` and `web`, and an item without the new fields still parses.
- [x] 1.2 In `listNotifications` (`services/notifications.ts`), select heads per design decision 1:
  - the key is `group_key` for `offer` and `trade`, and `'row:' || id` otherwise;
  - `row_number()` and `count(*)` over that key, ordered `created_at DESC, id DESC`;
  - kind and retention filter inside the ranked subquery; the outer query keeps rank 1, then applies the cursor, the same order and the limit, so the cursor never filters before ranking;
  - one more query for ranks 2 to 11 of the page's offer and trade keys.

  Run both through `shown` so every item gets the current name. Fill `partner.image` from the `loadIdentities` entry's `account.image`, and leave `updates`/`earlier` out when a head has none. Load `collections` for the earlier items' objekts too. Run `EXPLAIN ANALYZE` read-only against the local database for the account with the most notifications, and note the plan in this task. Lint, typecheck and build pass for `@repo/api`.

  Plan (2026-10-17, read-only): on the local DB, 58 rows for the top account: a seq scan, sort, two WindowAggs (`row_number` with a run condition `<= 1`), then a top-N heapsort; 9.6 ms. On the root `.env` DB, 111 rows over 80 accounts, 6 for the top one; 0.3 ms. Both tables are too small for the planner to pick `notification_user_created_idx`, so a plan at scale is still unmeasured.
- [x] 1.3 Move the head-selection rule (which key a row groups under, and splitting a ranked set into heads and earlier) into a pure module beside `services/notifications.ts`, under `src/lib/`, with a `*.test.ts`. Cover:
  - a trade with three read rows and one unread: one head, the unread one, with `updates: 3`;
  - two sanction notices: two heads;
  - an alert and an offer in the same second: two heads, in id order;
  - a group whose newest row is on page 1 and older rows fall past the cursor: page 2 holds no head for it.

  `bun run test` passes for `@repo/api`; lint, typecheck and build pass.

  Done as `lib/notification-groups.ts` (`GROUPED_TYPES`, `attachEarlier`) with its test. The grouping key, the ranking and the cursor live in SQL, so a TS copy of them would be test-only code. The SQL-only cases (two sanctions, the same-second order, the group split by the cursor) are checked against the local database in 1.4 instead.
- [x] 1.4 Read-only check against the local database: `notifications.list` for the account that holds T-89 returns one T-89 head with `updates: 2` and two `earlier`, and `unreadCount` is unchanged from before the change. Lint, typecheck and build pass for `@repo/api`.

  Result (2026-10-17, via `/rpc` from a signed-in tab): All gave 54 heads over 3 pages, against 55 group keys in SQL; the one missing is a `future_type` row the parser drops, as before. T-89 is one head (764) with `updates: 2` and `earlier` 762, 757; offer conversation 359 is one head with one earlier row. The 3 sanctions stay 3 heads. No group's older row returned as a head on a later page. `unreadCount` is 0, matching SQL. The seeded rows 712–725 carry hand-made `seed:…` group keys, so each stays its own row.

## 2. Web: pure rules and strings

- [x] 2.1 Add `apps/web/src/features/notifications/sections.ts` with `needsYou(item)` (a `trade` head whose event is `reminder` or `wrong_copy_due`) and `sectionOf(item, now)` (`needs-you`, `today` by the viewer's local day, `week` for the 7 days before, `earlier`), plus `sections.test.ts`. Cover: a reminder head, a `leg_verified` head, an offer `received` head (never Needs you), a reminder with the `trade` pref off, a reminder 14 days old, local midnight, and exactly 7 days. `needsYou` takes the pref and `now` as arguments. `bun run test` passes; lint, typecheck and build pass for `web`.
- [x] 2.2 Add `splitAround(text, token)` to a pure module in `features/notifications/` with a test: the token at the start, in the middle (as `ko` and `ja` place it), absent, and twice (only the first is split). `bun run test` passes; lint, typecheck and build pass for `web`.
- [x] 2.3 In `apps/web/messages/en.json`, `ko.json` and `ja.json`, rewrite every `notification_offer_*` and `notification_trade_*` string into a headline. Each keeps `{partner}` where it names the partner and drops `{offer}` and `{trade}`. Add `{partner}` to `notification_trade_leg_verified` ("{partner}'s transfer is verified"). Add:
  - `notification_new_count` ("{count} new");
  - `notification_updates` ("{count} updates", plural-aware);
  - `notification_section_needs_you`, `_today`, `_week` and `_earlier`;
  - `notification_action_send`, `_review`, `_feedback` and `_matches`;
  - `notification_caught_up`;
  - `notification_go_to_trades` ("Browse trades") and `notification_make_want_list`.

  Change `notification_tab_alerts` nowhere: it already reads "Lists". `bun run --filter=web paraglide:compile`, lint, typecheck and build pass for `web`.

  No message in the project uses plural syntax; singular and plural are separate keys, as with `notification_want_match_single`. So "updates" is `notification_updates_one` plus `notification_updates`. `offerNotificationText` and `tradeNotificationText` take an optional `partner`, so the row can pass the bolding token. The `ko` and `ja` wording needs a native check.

## 3. Web: the popover and the sheet

- [x] 3.1 Rework the rows in `notification-items.tsx` per the `web-notifications` delta and design decision 6:
  - the lead (stack, or the `Avatar` with an initial fallback, badged with the event's glyph on a neutral surface; `ToneTile` with no `TONE_FILL`/`TONE_INK`, frames kept for alerts);
  - the headline from `offerNotificationText`/`tradeNotificationText`, with the partner in `<strong>` through `splitAround`;
  - the monospace objekt line from `collectionName` over `payload.objekts` or the alert's `latest`;
  - the monospace `offerNo`/`tradeNo` chip and the progress segments from `payload.progress`;
  - the verb label as text inside the link;
  - unread as a leading dot, a raised background and full-contrast text, with read rows dimmed.

  Lint, typecheck and build pass for `web`, and `tone.test.ts` and `stack.test.ts` still pass.
- [x] 3.2 Add the "N updates" disclosure: a `Button` beside the row's `Link`, never inside it, with `aria-expanded`. It lists `earlier` under the row, newest first, each with its headline and time, as plain items. Opening the row still marks only the head read. Lint, typecheck and build pass for `web`.
- [x] 3.3 In `notification-panel.tsx`:
  - read `notificationPrefsOptions()` and group the loaded items with `sectionOf` under `h3` headings, in the delta's order, without counts;
  - show "N new" in the header, and move Notification settings into it as an icon `Button` with `aria-label`;
  - remove the footer bar;
  - show `notification_caught_up` above All's rows when `unread === 0`.

  Set the popover to `w-100` in `notification-bell.tsx`, clamped to the viewport as today. Lint, typecheck and build pass for `web`.
- [x] 3.4 Add an optional `preview` slot to `components/shared/empty-state.tsx`. Use it on each empty tab with a dimmed, `aria-hidden` example row, and the next step: Go to Lists on All, Browse trades (`/trade`) on Trades, Make a want list (`/list`) on Lists. Lint, typecheck and build pass for `web`.
- [x] 3.5 On the sheet below `sm`: rows at least 44 px tall, the verb label on its own line under the text, and settings and Mark all read as icon buttons in the header with the close control. Lint, typecheck and build pass for `web`.
- [x] 3.6 Verify in the running app against the local database, at 1440 and 390 px. Read-only: read the DOM and never click a row or Mark all read.
  - T-89 shows as one row with its disclosure;
  - the sections and headings appear in the delta's order;
  - read and unread rows differ;
  - the partner avatars and initials appear;
  - the monochrome badges and the alert frames match the mockup;
  - an empty tab shows its preview and next step, checked on whichever tab this account has nothing in;
  - `lib/dev-overflow-guard.ts` reports nothing at 390 px.

  Record anything that was only verified read-only. Lint, typecheck and build pass for `web`.

  Result (2026-10-17, local database, read-only; no row, Mark all read or settings link clicked):
  - At 1440 the popover is 400 px. T-89 is one row with "2 updates", and at 390 expanding it lists its two earlier rows. That expand button is local state, not a write.
  - The headings are Needs you (T-87's reminder, with Send now) and then Earlier, since every row on this account is over 7 days old. Today and This week did not appear for lack of data.
  - Read rows are dimmed. This account has no unread row, so the unread styling was not seen live.
  - Partners show their initial ("0" for `0x9ca6…8b0d`); none has an image, so `AvatarImage` was not seen.
  - Badges compute to `bg-muted` with foreground ink; alert frames compute to want `oklch(0.84 0.135 78)` and have `oklch(0.8 0.12 182)`. "You're all caught up" shows.
  - At 390 the sheet's rows are 68 to 134 px tall, the header icon buttons 40 px (44 px hit area on coarse pointers), and the verb label sits on its own line. `scrollWidth` equals 390, and the overflow guard logged no `console.error` across a reopen and an expand.
  - No tab is empty for this account, so the empty-state preview was not seen.

## 4. Docs

- [x] 4.1 Update `packages/api/AGENTS.md`, or state that nothing in it changed: in the "Notification objekts" section or a new "Notification groups" one, record that `listNotifications` groups offer and trade rows by `group_key` when the list is read, that a group's only unread row is its head, and that `partner.image` is filled on read only. Check `apps/web/AGENTS.md` and the root `AGENTS.md`, and change them only if their conventions changed. Lint, typecheck and build pass for every touched package.

  Added "Notification groups" to `packages/api/AGENTS.md`. Nothing changed in `apps/web/AGENTS.md` or the root `AGENTS.md`: their conventions still hold.

## 5. Review fixes

- [x] 5.1 Spec: wrong-copy headlines name the partner (`{partner}` in the five wrong-copy strings, en/ko/ja), bold like the other rows. Offer and trade rows with objekts keep the stack and carry the partner's avatar on its other corner; the delta says both. The unread mark is the one accent-coloured thing, and the header's "N new" is neutral. `stuck` gets the clock glyph in the spec and stays out of Needs you. `validate --strict` passes.
- [x] 5.2 `listNotifications` reads a page's heads and their earlier rows in one statement (`ranked` and `heads` CTEs, `rank <= EARLIER_LIMIT + 1`). The plan and the index question are in design.md; no index or migration was added.
- [x] 5.3 Tidy-ups:
  - one `Link` (`linkOptions`) per offer row;
  - one `openRow` in the panel;
  - `NotificationRow` is the single per-type dispatch;
  - `rowAction` and `needsYou` live together in `sections.ts`;
  - `withCurrentPartner`, `groupFields`, `eventText(note, partner)`;
  - `RankedNote` for the grouped rows, and `withGroup` builds typed heads with no cast;
  - `sections.ts` takes `Notification`;
  - the headline is formatted once per row.

  `bun run check` and `bun run build --filter=web` pass.

## Workflow follow-up

- Archive `wrong-copy-auto-accept` before this change. This change's Trade notifications delta copies that change's version of the requirement.
- Archive this change and sync `web-notifications` after review.
- Mark all read clears only the open tab's kind, while the spec's scenario says every tab. Raise that drift as its own change.
