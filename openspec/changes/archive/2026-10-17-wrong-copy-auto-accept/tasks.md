## 1. Schema

- [x] 1.1 In `packages/db/src/schema.ts`, add `acceptBy` (timestamptz), `remindedAt` (timestamptz) and `autoAccepted` (boolean, not null, default false) to `tradeSubstitute`. Run `bun run --filter=@repo/db db:generate`. Verify the SQL only adds the three columns, with no backfill and no default on `accept_by`. Do not apply it without approval. `@repo/db` lint and typecheck pass. Generated as `migrations/20261014232050_brown_omega_sentinel`; not applied.

## 2. Rules

- [x] 2.1 Add `COPY_ACCEPT_HOURS` and `COPY_REMIND_HOURS` to `packages/api/src/schemas/offer.ts`. Add `copyDue`, `copyReminderDue`, `copyRescue`, `dueCopy`, `reminderCopy` and `legVerifiedNoted` to `lib/trade-match.ts`, with tests covering: due exactly at the deadline, not before it, not while `seenUntil` trails it; the reminder 24 hours before; a broken leg rescued by a pending copy sent before the break but not by a declined copy; a leg due and reminded only on its earliest-sent copy; `leg_verified` noted only for a leg verified other than by an auto-accepted copy. `bun test packages/api/src/lib` passes.

## 3. One accept path

- [x] 3.1 Move the accept core from `services/offer/substitute.ts` into `services/trade-verify.ts` as `acceptCopy(tx, copy, { auto })`, setting `auto_accepted`. `acceptSubstitute` calls it. Set `accept_by` in `recordWrongCopies`. Verify `acceptSubstitute`'s refusals and order are unchanged: `offer-rules.test.ts` passes, and `@repo/api` and `worker` typecheck.

## 4. Worker

- [x] 4.1 Add `apps/worker/src/job/trade-verifier/copy-deadlines.ts`: first give each pending copy with no `accept_by` its deadline from now, then accept due copies under the trade lock, earliest per leg, skipping a spent transfer, and send each 24-hour reminder once, for the earliest copy only. Deadline, expiry and break all accept through `acceptPicked`. Call it in the run after verification and before `expireStalls`. Verify on the local database with a copy whose `accept_by` is in the past: one run accepts it and notifies both parties, and a second run changes nothing. Worker lint, typecheck and build pass. Read-only verified — needs the migration applied to run the local-database check.
- [x] 4.2 In `trade-expiry.ts`, accept each leg's earliest pending copy before deciding the outcome, and complete the trade when every leg is verified. In `settleTrade`, apply `copyRescue` to broken legs after `recordWrongCopies`. Verify locally: a trade at expiry with a pending copy on its only waiting leg completes, and a leg broken after a pending copy verifies through it. Worker lint, typecheck and build pass. Read-only verified — needs the migration applied to run the local trades.

## 5. API views and events

- [x] 5.1 Add `wrong_copy_due` and `wrong_copy_auto_accepted` to `TRADE_EVENTS`, an optional `acceptBy` to the `wrong_copy` payload and the trade view's substitutes, and an optional `autoAccepted` to the leg view and the moderator console's legs (`services/mod-reads.ts`). Verify `offer.trade` returns them for a local trade holding a pending copy. `@repo/api` lint, typecheck and build pass. Read-only verified — needs the migration applied to call `offer.trade` on a local trade.

## 6. Web

- [x] 6.1 Show "Counts as accepted on {date} unless you decline" under the leg's earliest pending copy for the receiver (later copies show no date), and its giver-side counterpart (`features/offers/wrong-copy.tsx`). Mark an auto-accepted leg in `leg-table.tsx` and in the moderator console's trades. Add both events to `offerNotificationText` and `notificationTone`, with a `tone.test.ts` case each. Update `offer_stall_body` for the 72-hour rule. All text in en, ko and ja. Verify on a local trade at 1280 and 390 px. Web lint, typecheck, test and build pass. Read-only verified — the 1280/390 px walkthrough needs the migration applied and a local trade.

## 7. Docs

- [x] 7.1 Update `apps/worker/AGENTS.md` with the `copy-deadlines` step and its due-against-`seenUntil` rule, and `packages/api/AGENTS.md` with `acceptCopy` as the one accept path. State any package whose conventions didn't change.
