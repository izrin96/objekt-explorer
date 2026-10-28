# Proposal

## Why

A user with two posts reported Can swap suggestions that mixed them: a person counted as Can swap because they had what one post's want-list rule asks for and wanted what the other post offers. Today Can swap pools every list on both accounts, so it pairs halves of different posts, a swap neither post asked for. Can swap should mean one post against one post.

## What Changes

- **BREAKING (behaviour)**: the mutual score (Can swap) counts only inside one post on each side: one of the viewer's linked pairs (a have list, or a sale list open to swaps, with the want list linked to it) against one of the other person's linked pairs. A person's score is their best such pair of posts. A pair counts whether or not it is posted.
- A list with no link (a lone have, want or Sell or swap list) still matches one way and keeps its WTT tag, but never makes Can swap.
- A person who matches both ways only across posts reads as One way: no chip. "No swap · buy or sell" stays for matches through Sell only sale lists.
- The two one-way counts, list counts, rings, near matches, offer suggestions, chat post-card matches and the chat first-line suggestion are unchanged.
- Everything that reads Can swap follows: For you's Can swap and One way sections and order, the row chip on Browse and For you, the Can swap button and its count, and want-list and reverse-direction alerts on Can swap. Make offer from a row still adds every match the row counts.
- An alert on Can swap for a list with no link, which can never make Can swap, alerts on swap listings one way (no two-way check) and still never on Sell only sales; its link opens `match=any`.
- The matching help (?) gains a Post row and states that Can swap counts inside one post; the Can swap alert setting says the same.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Matches to the signed-in viewer (the mutual score is per post on both sides) and Tag help (Post row, Can swap table and Lists note).
- `web-trade-for-you`: Account-wide matches (Can swap needs linked pairs; its scenario names them).
- `web-notifications`: Notification settings (Can swap description), Want-list alerts and Reverse-direction alerts (per-post Can swap; a list with no link alerts on swap listings one way).

## Non-goals

- No change to which lists take part, to the one-way counts or to Compare with's options.
- No new post model: a post stays its linked lists.
- No change to the WTT tag or the post composer.
- No change to sale-list (Sell only) rules or to near matches.

## Routes

`/trade` (Browse), `/trade/for-you`, `/account/notifications`, and the bell's alert links into `/trade/for-you`.

## Impact

- `packages/api`: the recount and `MatchCounts` (a per-post swap score), `mutualOf` and its readers (rankings, people order, `trade.mutualCount`, `mutualPartnerIds`), candidates (each list's link), cache version bumps.
- `apps/worker`: want-alert matching treats Can swap on an unlinked list as Any.
- `apps/web`: `matchBand` and the chip, the help popover, the alert setting description; `en`, `ko`, `ja` strings.
- Tabs open before the deploy compute the chip from the old counts until reloaded.
- Mockup: https://claude.ai/artifact/Q8E4wKmQaaYb8JaWsB3QQC
