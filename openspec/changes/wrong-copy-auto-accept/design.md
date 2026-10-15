## Context

A wrong copy is a `trade_substitute` row (`pending`, `accepted`, `declined`) recorded by the trade verifier (`apps/worker/src/job/trade-verifier/index.ts`, `recordWrongCopies`) under the trade's row lock. Accept lives in `acceptSubstitute` (`packages/api/src/services/offer/substitute.ts`): it records the leg as the verifier does, guarded by the `trade_leg_transfer_uniq` index, marks the copy accepted, then ends the trade through `finishSettle`. A held copy (`heldCopyWhere`: pending or declined, and not spent on a leg) locks Cancel and makes expiry and breaks end Failed (`expiredOutcome`, `tradeOutcome`). Expiry (`trade-expiry.ts`) and reminders (`trade-reminders.ts`) are due against `seenUntil`.

The worker can't import `substitute.ts`: it imports `services/reputation`, which loads `env.ts` (`apps/worker/AGENTS.md`).

## Goals / Non-Goals

**Goals:** one accept path for the receiver and the deadline; every deadline due against `seenUntil`; each copy accepted, reminded and announced once, however often the worker runs.

**Non-Goals:** a scheduler other than the verifier's 2-minute run; changing the receiver's Accept or Decline routes.

## Decisions

1. **Store the deadline on the row: `accept_by`,** nullable with no default. `recordWrongCopies` sets it at insert to `now() + COPY_ACCEPT_HOURS`. At the start of each `copy-deadlines` step, the worker sets it the same way on every pending copy of an open leg in an in-progress trade that has none. This covers copies already pending at deploy and copies the old worker records between the migration and the deploy, so each gets its full window from when the new worker first sees it. A backfill in the migration would start the clock at migration time, before the code that announces it is live. A null `accept_by` is never due. A column beats computing from `created_at`: the view and notification read one value. Also add `reminded_at` (the 24-hour reminder, sent once) and `auto_accepted boolean not null default false`. `status` keeps its three values, so `HELD_COPY_STATUSES` and old tabs are untouched.
2. **Move the accept core into `services/trade-verify.ts`** as `acceptCopy(tx, copy, { auto })`. It records the leg under the trade lock, marks the copy, and returns the leg result for `finishSettle`. `acceptSubstitute` calls it with `auto: false`; the worker calls it with `auto: true`. `trade-verify.ts` is already imported by the worker and stays clear of `env.ts`. The alternative, a second copy of the logic in the worker, would drift from the receiver's path.
3. **A `copy-deadlines` step in the verifier run**, after verification and before expiry:
   - A leg is due when its earliest-sent pending copy (the one that would be accepted) has `accept_by <= seenUntil`; a later copy's own `accept_by` doesn't count. The pure `dueCopy` decides it.
   - Under each trade's row lock it re-reads that the copy is still pending and the leg open, then calls `acceptCopy`.
   - On a unique violation (the transfer verified another leg) it skips; `heldCopyWhere` already hides that copy.
   - In the same step it sends the 24-hour reminder for that same earliest copy, when its `accept_by - 24 hours <= seenUntil` and `reminded_at IS NULL` (the pure `reminderCopy`), guarded by a conditional update as `trade-reminders.ts` is. The trade page shows the "Counts as accepted" date only on that copy; later copies on the leg show none.
4. **Expiry accepts first.** `expireStalls` calls `acceptCopy` for each leg's earliest pending copy before deciding the outcome, then completes the trade if every leg is now verified. Otherwise it ends the trade with `expiredOutcome`, which is unchanged.
5. **A break with a pending copy accepts it.** In `settleTrade`, after `recordWrongCopies`, a `broken` result on a leg that holds a pending copy is replaced by accepting that copy. `nearMisses` already admits only copies sent before the break, so a copy sent after a sale never rescues it. A declined copy doesn't count, so the trade still ends Failed. The choice is a pure function in `lib/trade-match.ts` (`copyRescue`), so it can be tested.
6. **Pure due rules** in `lib/trade-match.ts`: `copyDue(acceptBy, seenUntil)` and `copyReminderDue(...)`, with tests beside `tradeOutcome`'s. Durations are constants in `schemas/offer.ts` (`COPY_ACCEPT_HOURS = 72`, `COPY_REMIND_HOURS = 24`).
7. **Events.** `TRADE_EVENTS` gains `wrong_copy_due` and `wrong_copy_auto_accepted`; `notificationTone` maps them to the amber clock and the green check. The `wrong_copy` payload gains an optional `acceptBy`. The trade view's substitute gains `acceptBy` and the leg gains `autoAccepted`, both optional, so tabs opened before the deploy still validate.

## Risks / Trade-offs

- [A tab opened before the deploy gets a notification with a new event, and `offerNotificationText` has no case for it] → it shows an empty line until reload. `notificationTone` already falls back to neutral. Accepted for one deploy.
- [The indexer stalls for days] → deadlines wait, as expiry does, and fire on catch-up after that run's verification.
- [A receiver wanted that exact serial and missed the window] → the reminder and the deadline line make the window visible, and Report a problem remains.
- [Accepting on a break changes an outcome people have seen as Failed] → only for copies sent before the break, which is the case the giver meant as the replacement.

## Migration Plan

1. Run `db:generate` for the three columns only, with no backfill and no default on `accept_by`. The user applies it locally and on staging. It is safe with the running code: the new columns are unused until the deploy, and the new worker gives each pending copy its deadline when it first sees it.
2. Deploy the API, the web app and the worker together.
3. Rollback: redeploy the previous code. The columns stay, unused.
