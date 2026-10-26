# Design

## Context

`offerUpkeep` (`apps/worker/src/job/trade-verifier/offer-upkeep.ts`) runs on every verifier run, on the 2-minute cron and on live triggers. It already reads, for every open offer's specific objekt, the current owner and, when the owner is the other party, the transfers into that party's wallets since the earliest offer (`sentToReceivers`). `itemStillHeld` uses these to keep an early-sent offer open. That fact is used once and then thrown away. The offer card (`apps/web/src/features/offers/offer-card.tsx`, rendered in the chat thread) reads `OfferView` from `toOfferView` in `packages/api/src/services/offer/view.ts`, which reads only the app database.

## Goals / Non-Goals

**Goals:**
- Reuse the worker's existing early-send check. No new indexer reads on the web path.
- Keep the thread render on the app database alone.

**Non-Goals:**
- Changing how Accept or the verifier treats early sends. They already verify specific legs from transfers made after the offer.

## Decisions

**Store the send on the item: `offer_item.sent_at` (timestamptz, nullable).** The worker sets it to the matching transfer's timestamp the first time it sees an early send. The view then reads it with the items it already loads.
- Alternative: compute it in `toOfferView` from the indexer. That adds an indexer query to every thread render and every `chat_changed` refetch, and duplicates `itemStillHeld`'s rule on the web side. Rejected.
- Alternative: one `offer.sent_at` set only when all items are sent. That loses the per-objekt mark ("One side sent"), and the per-item column costs the same. Rejected.

**Set it in `offerUpkeep` by splitting `itemStillHeld`.** Add a pure `earlySend(item, owner, transfers)` in `offer-rules.ts` that returns the qualifying transfer or `null`. `itemStillHeld` becomes "holder, or `earlySend` is not null", with no behavior change, and its existing tests keep passing. A pure `sentChanges` (`apps/worker/src/lib/offer-sent.ts`, tested) picks the items to mark and to clear, skipping offers the same run cancels. Upkeep writes each set in one `UPDATE` joined to `offer.status = 'open'`, guarded by `sent_at IS NULL` / `IS NOT NULL`, so reruns write nothing and an offer accepted or declined meanwhile is left alone.

**Clear it when the objekt is back with its giver.** That keeps the offer open (`itemStillHeld` is true again), so the mark must go, or the hint would ask for an Accept on a swap that was undone. If the objekt instead leaves for anyone else, upkeep cancels the offer (`token_moved`) and the mark no longer shows, since marks render only on open offers.

**Refresh the card with `chat_changed`, no notification.** Upkeep returns a `Publish` with `notified: []` and the conversations whose items it marked. `publishAll` already sends `chat_changed`, and the thread refetches on it.

**Hint rule in a pure web module.** `allSent(offer)` is true when `give` and `get` are non-empty and every item has `objektId !== null && sentAt !== null`. It lives beside `next-step.ts` with a test. The card shows the hint and the per-item marks only when `status === "open"`, and picks the hint's copy by `mine`.

## Risks / Trade-offs

- [Live triggers miss about 30% of transfers (the indexer publishes only at `isHead`)] → the mark lands on the next cron run, inside the spec's 3 minutes.
- [Rows written before the deploy have no `sent_at`] → upkeep fills it for every still-open offer on its first run after the deploy, O-180 included. No backfill needed.
- [The extra `UPDATE`s each run] → at most one to mark and one to clear, and only for items whose mark changes, so most runs write nothing.

## Migration Plan

1. `bun run --filter=@repo/db db:generate` adds the nullable column. It's additive, so the old web and worker ignore it.
2. Apply it locally. Prod needs the user's approval.
3. Deploy web, then the worker.

Rollback: redeploy the previous images. The column can stay.
