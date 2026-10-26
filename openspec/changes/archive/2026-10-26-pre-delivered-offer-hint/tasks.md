# Tasks

## 1. Early-send rule (packages/api, pure)

- [x] 1.1 In `offer-rules.test.ts`, add failing tests for `earlySend(item, owner, transfers)`: returns the qualifying transfer for a giver→receiver send after `since`; `null` for a send before `since`, a send from a non-holder, an owner still with the giver, or an unknown owner. `bun test packages/api/src/lib/offer-rules.test.ts` fails on the new cases only
- [x] 1.2 Add `earlySend` to `packages/api/src/lib/offer-rules.ts` and rewrite `itemStillHeld` as "holder, or `earlySend` is not null". Every existing `itemStillHeld` test still passes, and the 1.1 tests pass. Lint, typecheck and build pass for `@repo/api`

## 2. Data (packages/db, packages/api)

- [x] 2.1 Add nullable `sentAt: timestamp("sent_at", { withTimezone: true })` to `offerItem` in `packages/db/src/schema.ts`, and generate the migration with `bun run --filter=@repo/db db:generate`. The SQL adds one nullable column and nothing else. Apply it to the local database only. Lint, typecheck and build pass for `@repo/db`
- [x] 2.2 `fetchOffers` reads `i.sent_at` into each item tuple, `itemViews` passes it on, and `offerItemViewSchema` gains `sentAt: z.string().nullable()` (ISO via `iso`). Every other `OfferItemView` producer, such as the trade and offer fixtures, sets `sentAt: null`. Typecheck passes across the repo

## 3. Worker (apps/worker)

- [x] 3.1 In `offer-upkeep.ts`, have the held query also return `offer_item.id`, `sent_at` and `conversation_id`. For each item with `sent_at` null where `earlySend` finds a transfer, set `sent_at` to that transfer's timestamp with `WHERE id = … AND sent_at IS NULL`, in one transaction. Return a `Publish` with `notified: []` and the conversations of the offers it marked, with both party ids. A run that finds nothing new writes and publishes nothing. Lint, typecheck and build pass for `worker`

## 4. Web (apps/web)

- [x] 4.1 Add a pure `allSent(offer)` beside `next-step.ts`, with tests: true only when both sides are non-empty and every item has an `objektId` and a `sentAt`; false with any any-copy item, any unsent item, or an empty side. `bun test` passes for it
- [x] 4.2 Add en/ko/ja messages: the per-item "Already sent" mark, the recipient's hint ("Both sides are already delivered. Press Accept to record the trade."), and the sender's hint ("Both sides are already delivered. The trade is recorded once {name} accepts."). `bun run --filter=web typecheck` passes
- [x] 4.3 In the offer card, show the mark on each item with `sentAt`, and show the hint above the actions when `status === "open"` and `allSent`, picking the copy by `mine`. Lint, typecheck and `bun run build --filter=web` pass
- [x] 4.4 On the local dev server, check `/messages/$id` against a local open offer whose items have `sent_at` set (local database only), at 1280 px and 390 px, as recipient and as sender, in en, ko and ja. The mark and the matching hint show, and nothing shows once the offer is declined

## 5. Wrap-up

- [x] 5.1 Run `bun run check` and `bunx oxfmt --check` at the root. Both pass
- [x] 5.2 Update `apps/worker/AGENTS.md` ("Trade verifier"): `offerUpkeep` sets `offer_item.sent_at` from the same early send `itemStillHeld` counts, and never clears it. No other package's `AGENTS.md` changes

## Workflow follow-up

- Prod migration of `offer_item.sent_at` only with the user's approval; then deploy web before the worker.
