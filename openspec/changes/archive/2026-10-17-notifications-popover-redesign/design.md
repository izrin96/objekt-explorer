# Design

## Context

See proposal.md for the problem, and the `web-notifications` delta for the behaviour. The facts that shape the approach:

- `writeNotes` (`packages/api/src/services/offer/notes.ts`) upserts into `notification` on `(user_id, group_key)` under the partial unique index `notification_unread_group_uniq` (`read_at IS NULL`). A group therefore has at most one unread row, and it is the newest: the upsert sets `created_at = now()`. After a read, the next event inserts a new row. The group keys are `offer:<conversationId>` and `trade:<tradeId>`.
- `listNotifications` (`services/notifications.ts`) pages single rows by `(created_at, id)`, 20 at a time. It already replaces `partner.name` with the account's current identity through `loadIdentities`, which also returns the `user` row, so the avatar (`user.image`) is already read and simply not returned.
- The web panel (`features/notifications/notification-panel.tsx`, `notification-items.tsx`) already draws objekt stacks from `payload.objekts`. Rows written before objekts were stored fall back to the tinted `ToneTile` (`TONE_FILL` and `TONE_INK` from `lib/tone.ts`, which `features/offers` also uses).
- `offerNotificationText` and `tradeNotificationText` (`features/offers/format.ts`) have one caller, the bell.
- The pending change `wrong-copy-auto-accept` modifies Trade notifications too. This delta copies its version of that requirement, so that change archives first.

## Goals / Non-Goals

**Goals:** group at read time with no migration and no write-path change; keep `/rpc` compatible with tabs opened before the deploy; put the pure decisions (section, Needs you, headline split) in tested modules.

**Non-Goals:** changing what `writeNotes` stores, the unique index, retention, `markRead` or `markAllRead`.

## Decisions

### 1. Group when the list is read, not when a note is written

`listNotifications` gives each row a key: its `group_key` for `offer` and `trade`, and `row:<id>` for everything else. In SQL it ranks rows within each key by `(created_at DESC, id DESC)` and keeps rank 1 as the head. It counts the rest as `updates`. A `heads` CTE applies the existing cursor, order and limit to rank 1. The one statement then joins `ranked` to `heads` and keeps ranks 1 to `EARLIER_LIMIT + 1`, so a page's heads and their earlier rows come back in a single read. Each head returns optional `updates: number` and `earlier: Notification[]`, both absent when there are none.

- The cursor stays the head's `(created_at, id)`. Heads are ordered by their newest row, so paging is unchanged.
- Read state needs no new rule: the only unread row in a group is its head, so marking the head read reads the group, and `unreadCount` already counts one per group.
- An open tab ignores the new fields and shows heads only, which is what this change asks for.
- Live arrivals go through the same read: `use-user-socket.ts` only invalidates `notificationKeys` on a `notify` event and never writes items into the cache, so a new event refetches and lands in its group.
- Kind and retention filter rows before ranking. The cursor, order and limit apply after it, to heads only, so an older row of a group whose head was on an earlier page never comes back as a head of its own.

*Alternative:* make the unique index full and upsert every event into one row, keeping the history in the payload. That needs a migration that merges existing duplicates, it rewrites what the worker writes, and it loses the per-event times. Rejected.

*Alternative:* collapse the rows in the browser. It breaks across 20-row pages (one group split over two pages) and leaves the count wrong. Rejected.

### 2. Avatar as an optional output field

`partner` in `offerPayloadSchema` and `tradePayloadSchema` gains `image: z.string().nullable().optional()`. Only `listNotifications` fills it, from the `loadIdentities` entry's `account.image`. It is null for an account with no image or a deleted one, which already reads "Deleted account". Writers never set it. List alerts carry `partnerName` and no user id; they lead with objekts and stay as they are.

### 3. Needs you from the head alone

`needsYou(item)` (pure, `features/notifications/sections.ts`) is true for a `trade` head whose event is `reminder` or `wrong_copy_due`. This is safe without a live check:

- `trade-reminders.ts` sends `reminder` only to `owingParties`.
- `copy-deadlines.ts` sends `wrong_copy_due` only to the receiver.
- Any later event on the trade (a leg verified, completed, cancelled, failed, a copy accepted) is written to both parties into the same group and becomes the head.

The gaps:

- It can miss a need. If the partner's leg verifies after the reminder, `leg_verified` becomes the head while the reader still owes.
- The verifier's few minutes of lag can leave a sent transfer in Needs you until it is verified.

One more gap: `writeNotes` writes nothing for a type the reader switched off. If the reader turns Trades off after a reminder, the trade's later events never reach the group, and the reminder would stay its head on a finished trade. So `needsYou` also requires the reader's `trade` pref to be on (`notificationPrefsOptions`, already in `queries.ts`) and the head to be under `TRADE_EXPIRE_DAYS` (14) old, the longest a trade stays open. A pref switched off and back on while a trade ended can still leave a stale reminder, bounded by those 14 days.

Offers are excluded: accepting, declining or countering writes no note to the person who answered, so a `received` head can be stale. `wrong_copy` goes to both parties with no reader role, so it is excluded too. So is `stuck`: the verifier writes it to both parties when an objekt in an open trade can no longer be sent, so it is no stall reminder. It keeps the reminder's clock glyph, which the spec now lists.

### 4. Sections are computed in the browser

`sectionOf(item, now)` (pure, same module): Needs you first, then the viewer's local day for Today, the 7 days before for This week, and Earlier. It runs over the pages loaded so far. Needs you rows are recent (a reminder fires a few days into a trade), so they land on the first page in practice.

### 5. Headlines without the reference, partner in bold

The existing offer and trade strings in `en`, `ko` and `ja` are rewritten into headlines that leave out `{offer}` and `{trade}`, which move to the chip. `notification_trade_leg_verified` gains `{partner}`. To bold the partner in any word order, the formatter passes a sentinel as `{partner}`, and `splitAround(text, sentinel)` (pure, tested) returns the text before and after it, rendered around a `<strong>`. The chip shows `offerNo`/`tradeNo`, and the progress segments come from `payload.progress`.

### 6. Reuse what exists

- `Avatar`, `AvatarImage` and `AvatarFallback` (`components/ui/avatar`) for the avatar lead, as `features/chat/conversation-list.tsx` does.
- `NotificationStack` keeps the objekt stack. Its badge and `ToneTile` drop `TONE_FILL` and `TONE_INK` for one neutral surface. `lib/tone.ts` stays as it is for `features/offers`, and `notificationTone` keeps the `want`/`have` tones for alert frames.
- `EmptyState` (`components/shared/empty-state.tsx`) gains an optional `preview` slot for the dimmed example row, rather than a second empty-state component.
- "N updates" is a disclosure `Button` (`aria-expanded`) placed beside the row's `Link`, never inside it, since a link cannot hold another interactive element. Earlier events render as plain list items.
- The verb label is text inside the row's link, not a separate control. It leads where the row does.
- Settings becomes an icon `Button` with `aria-label` in the header, and the footer goes. The popover width becomes `w-100`, clamped as today.

### 7. The T-89 repeats: a test reset, not a double write

T-89 lives in the local database: `.env.local` points `DATABASE_URL` at localhost, and that is what the dev server read. The data:

- Leg 106 verified once, with a transfer stamped 2026-10-07 16:09:46. Leg 107 is still open.
- The reader's `leg_verified` "1 of 2" rows were written at 19:06, 00:15 and 00:50. The partner's single unread row was upserted each time.
- An earlier Claude session's transcript holds, at 2026-10-08 00:15:10, `update trade_leg set open=true, verified_at=null, tx_hash=null, verified_objekt_id=null, transfer_id=null where id=106 and trade_id=89`. The verifier re-verified the leg at 00:15:22.
- At 00:50 the same session was fixing and re-running the verifier (commit ddc71e7b, "the trade verifier records its run before publishing"). A "1 of 2" note at 00:50 means leg 106 was open again. No reset in that exact form appears in the transcript, but no app path reopens a leg, so the reset came from outside the app, most likely the same test written another way.
- Trades 80 to 89 and their notes were all seeded at 19:05:01.

No code path reopens a leg. The verifier skips legs that are not open under the trade's row lock (`openIds` in `apps/worker/src/job/trade-verifier/index.ts`). So nothing needs fixing, and there is no fix task. Decision 1 shows such repeats as one row anyway.

## Risks / Trade-offs

- [The window query scans every row a user has within retention] → It is bounded by `notification_user_created_idx` and the 90-day prune, and per-user counts are small. Plan of the single statement on the local database (2026-10-17, 58 rows for the busiest account): `CTE ranked -> WindowAgg (actual rows=58)`, computed once and scanned twice (by `heads` under a top-N heapsort, and by the merge join on `rank <= 11`); execution about 8.8 ms. The table is too small for the planner to choose an index, so this is no reading of the plan at scale.
- [Would `(user_id, group_key, created_at DESC)` help?] → No index is added in this change. The window partitions on a `CASE` over `type`, `group_key` and `id`, not on `group_key` alone, so that index could not supply the partition order: the plan would still sort the account's rows. `notification_user_created_idx` already narrows the scan to one account. Recommendation for the user to decide: none for now; measure again once an account holds thousands of rows within retention.
- [Needs you misses a need when the partner's verification lands after the reminder] → The head still links to the trade, under Today. A live check is a non-goal.
- [Strings lose the T-/O- reference] → The chip shows it beside the headline. Screen readers read the chip as part of the row's link.
- [`markAllRead` clears only the open tab's kind, while the spec's "Mark all read from a tab" scenario says every tab] → This drift already exists and is out of scope. It is left as is and flagged for a later change.

## Migration Plan

No database migration. The API and web deploy together (the web image serves `/rpc`). Rollback is a redeploy: no stored data changes shape.
