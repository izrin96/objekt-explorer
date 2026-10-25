# Proposal

## Why

Want-list alerts and For you decide whose lists match through two separate queries. They share the Buying only / Swaps only rule, the bound-list rule, blocks and trade blocks. The partner-list filter itself (listed, not hidden) is written twice and has already drifted: For you leaves out idle lists, alerts do not, and the hidden check lives in SQL on one side and in JS on the other. A rule added to Trade later would silently skip alerts.

Alerts also check ownership only once, when the entry is added. Someone who lists an objekt before it reaches their wallet passes the cursor unowned and never alerts, even after the objekt arrives minutes later.

## What Changes

- One shared partner-list rule in `packages/api` (on Trade, discoverable, listed and not idle, not hidden by the viewer, no block either way, no trade block). For you (`/trade/for-you` and Browse counts) and the worker's `want-alerts` job both use it, so a rule changes in one place.
- Want-list and reverse-direction alerts leave out an idle partner list, as For you does. Today this excludes nothing in practice, because adding an entry or turning a list on refreshes it. It keeps the two in step from now on.
- An entry whose have or sale owner can't trade it yet (not held, or not transferable) is re-checked on every run for 24 hours after it was added. It alerts as soon as its owner can trade it, and is dropped after that.
- Alerts stay one-sided: For you's **Any**, which is where every alert already links. The "you already own a copy" skip stays.

## Non-goals

- Mutual-only alerts or a per-user Mutual setting. Mutual counts have lists only, so it would end every alert for sale listings and Buying only want lists.
- Faster delivery (an API nudge that starts a run early). That is a follow-up, with no spec change.
- Merging For you's per-collection flag merge (`bool_or` over the viewer's want lists) into alerts, which stay per want list.
- Hiding in both directions. Both sides keep honouring only the recipient's own hide list.
- Any change to grouping, once-only dedupe, timing guarantees, links or the popover.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-notifications`: Want-list alerts take the partner rules from For you (adds not idle) and gain the 24-hour ownership re-check. Reverse-direction alerts inherit both.
- `web-trade-for-you`: Account-wide matches states that want-list alerts use the same partner-list rules.

## Impact

- `packages/api/src/services/trade-lists.ts`: the shared partner rule. `packages/api/src/services/trade-feed/query.ts`: exports the listed-lists set. `packages/api/src/services/trade-matches/candidates.ts` switches to them, with no behaviour change.
- `apps/worker/src/job/want-alerts/` (`pairs.ts`, `context.ts`, `index.ts`) and `apps/worker/src/lib/want-alert-match.ts` / `want-alert-state.ts`: the shared filter in SQL, and the re-check list kept in the `worker_progress` state.
- No schema change and no migration. No API or route change.
- Routes touched by behaviour: none directly. Alerts link to `/trade/for-you?match=any&list=<slug>`, unchanged.
