# Proposal

## Why

A want-list alert is skipped when any of the wanter's linked addresses holds a copy of the collection (`wanterHolds` in `apps/worker/src/lib/want-alert-match.ts`). For you never reads the wanter's copies, so it counts the same match, and the page and the alert disagree. People want more than one copy: a collection still on a want list while its owner holds one is mostly there on purpose, since a rule with Skip owned on (the default) already drops owned collections. The skip hides real matches, and it also overrides a rule whose owner turned Skip owned off. Noted in `design/backlog.md` (Want alerts for a collection the wanter already owns), first raised 2026-11-09.

## What Changes

- A want-list alert no longer checks whether the wanter holds a copy. It follows For you: the offering side must still be able to trade a copy, as today.
- The same holds in reverse: "Someone wants what you have" alerts even when the other account already holds a copy of what it wants, as For you's "they want" side counts it.
- A hidden post comes back on the same test: an entry the user already holds a copy of brings the post back, and its alert goes out with it, so an alert never points at a post that is still hidden.
- The worker stops reading the wanter's copies for alerts (one copy pair less per pair in `loadContext`).
- `want_alert_sent` is unchanged: each want list, source list and collection still alerts at most once. Matches skipped before this change are not sent afterwards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-notifications`: Want-list alerts (the "already owns a copy" exclusion and its scenario). Reverse-direction alerts inherits the exclusions and follows without its own edit.
- `web-trade-for-you`: A hidden post comes back (the "wanting side holds none" condition and the "Already held" scenario).

## Impact

- **Routes:** `/trade/for-you` (the alert's target, unchanged), `/trade` Browse and For you (where a returning post shows again), `/account/hidden` and the Hidden dialog (their copy already fits), `/account/notifications` (no change).
- **Worker:** `apps/worker/src/lib/want-alert-match.ts` and its test, `apps/worker/src/job/want-alerts/context.ts`, `apps/worker/AGENTS.md`.
- **API, web, email:** no change. No string changes in en, ko or ja.
- **Database:** no schema change, no migration.
- **Volume:** more alerts for users who keep owned collections on want lists, still at most one per want list, source list and collection, grouped one unread notification per list per day.

## Non-goals

- A quantity per want entry (alert until the wanter holds N copies). This change leaves room for it (design.md, Decision 3).
- The other differences between the alert's match and For you's (design.md, Context): one-time judging, the swap-or-sale split of a Sell or swap list, the recipient's own trade block.
- Re-sending matches the old skip dropped.
- A setting to bring the skip back.
