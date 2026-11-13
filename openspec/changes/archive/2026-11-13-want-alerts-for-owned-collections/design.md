# Design

## Context

`job/want-alerts` reads new entries, pairs them with matching lists (`fetchPairs`), and `judge` (`lib/want-alert-match.ts`) decides each group. `tradable`, shared by `judge` and `selectUnhides`, first returns `skip` when any address of the want list's owner holds a copy of the collection, transferable or not (`wanterHolds`), then asks `collectionVerdict` whether the offer's owner can trade one. It runs in both directions, so a reverse alert is skipped when the partner who wants the collection already holds it. `loadContext` reads those copies through one want-side copy pair per pair.

For you never reads the wanter's copies. `fetchTradeCandidates` matches on `collection_slug`, and `recountPartners` fetches holdings only for the offering sides (the viewer's have entries and each partner's `theyHave`), so both "they have what you want" and "they want what you have" count a collection the wanting side owns. `mutualPartnerIds`, which Can swap alerts ask, is the same read.

Other differences between the two stay as they are: an alert is judged once (with a 24-hour recheck) and sent once per want list, source list and collection, while For you is live; the alert judges an offer list's entries together, while For you splits a Sell or swap list's swap part from its sale part; the alert also drops a trade-blocked recipient.

## Goals / Non-Goals

**Goals:** the alert and For you agree on the wanter's copies, in both directions; a hidden post's return keeps matching its alert.

**Non-Goals:** a per-entry quantity; the other differences above; re-sending past skips.

## Decisions

### 1. Remove the check from `tradable`, so alerts and unhides change together

`judge` never reads `pair.hidden`: a pair from a hidden post alerts exactly when `selectUnhides` brings the post back, because both call `tradable`. `recordRun` relies on that, deleting the hide before inserting the alert. Keeping the check for unhides only would alert under Any for a post that stays hidden, and leave a Can swap pair unable to become mutual (For you skips hidden posts) until it ages out of `mutualRecheck`. So `tradable` loses the check and its `want` parameter, and both callers follow.

The user who hid a post and holds no copy sees no change. The one who holds a copy still keeps that collection on a want list, and a rule with Skip owned on drops owned collections by itself, so the want is deliberate; the owner added it after the hide, the new matching content the hide promises to bring back. The Hidden copy says "an objekt that matches your lists", with no condition on holdings.

Alternative kept for the owner: keep the test for hidden pairs only, in both `judge` and `selectUnhides`, so such a pair neither alerts nor unhides. It must never sit in `selectUnhides` alone. This reverses the "Already held" scenario approved on 2026-11-12, so the owner confirms it before the change is applied to main.

### 2. Stop reading the wanter's copies

With no reader left, `loadContext` passes only the offer side to `fetchHoldings`, which saves one (address, collection) pair per pair and address. `fetchHoldings`, `copyPairsOf` and `AlertInput.addresses` stay, for the offer side.

### 3. Nothing new against repeats

`want_alert_sent` keys on want list, source list and collection, and is pruned only when a list is deleted, so each key alerts once, ever, and the bell groups one unread notification per list per day. Pairs skipped before wrote no key and never entered `recheck`, so the deploy sends none of them; only pairs read afterwards (new entries, the 10-minute overlap, the recheck, lists that become discoverable later) can alert.

What this leaves open for a quantity per entry: `fetchHoldings` returns one boolean per (address, collection), not a count, so a quantity would need a count read for the want side again, and For you would need the same rule to stay in agreement.

## Risks / Trade-offs

- [More alerts for users who keep owned collections on want lists] → Accepted: that is the match For you shows. Still once per key, grouped per list per day, and each type can be turned Off.
- [A post the user hid returns for a collection they already hold] → Accepted (Decision 1); hiding the person stays permanent.
- [A rule entry with Skip owned on can alert in the up to 10 minutes before the rule refresh removes it once the copy arrives] → Accepted: rare, and once per key.
- [More Can swap questions and recheck entries per run] → Bounded by the existing 4-at-a-time `mutualPartnerIds` and the 20,000 and 5,000 recheck caps, with their `warn`s.

## Migration Plan

Deploy the worker. No migration and no data change. Rollback is a revert: keys sent meanwhile stay in `want_alert_sent`.

## Open Questions

- Whether the changelog names the change (proposed line: "Want list alerts now also come for objekts you already own a copy of, as For you shows them.").
