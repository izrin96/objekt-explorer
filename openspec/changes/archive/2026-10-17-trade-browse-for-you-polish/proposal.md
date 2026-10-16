## Why

On For you, Any is ordered by bump, so a post with 7 matches sits under five posts with 1 match. One-way rows waste half their width on an empty side and state the match twice. Browse rows are taller than their content, and on a phone the first post is below the fold. Agreed mockup: the Design artifact "Trade Browse & For you mockup" (A7T4WgBXUmpgarpmrJiN7c).

## What Changes

Routes: `/trade` (Browse) and `/trade/for-you` (For you).

- **For you order and sections.** Under Any, For you lists in two sections, each under a heading with no count:
  - **Mutual** lists exactly what Mutual only lists, in Mutual order.
  - **One way** lists every other matching post: people with the most matches first among the 200 people matching ranks, then everyone else, newest bump first.
- **For you strips.** A side's label says who it is for ("HAVE 3 you want", "WANT 2 you have"). A side with no match becomes one muted line under the strip that matched, with no ⇄ mark.
- **"of N" on both tabs.** On a narrowed side, an "of N" link to the list replaces "+N others", and the label no longer carries "of".
- **Match chip on For you.** The chip shows only on mutual rows. On one-way rows the label carries the count, and the chip's popover of the viewer's matched lists is no longer on the row. All matches and the person sheet still show both.
- **Lists control.** It reads "2 lists" and shows only when a post holds 2 lists. With one list, the side label links to it.
- **Byline.**
  - The reputation line stays on one line.
  - The Twitter badge moves to the person sheet. Discord stays on the row.
  - The viewer's own posts on Browse carry a "You" tag.
- **Controls.**
  - Post type joins the end of the facet row on both tabs. On For you, Mutual only, Compare with and the help follow on the same row. This replaces the agreed order "Mutual only → Post type → Compare with".
  - For you's description reads "Posts that match your lists, best match first."
- **Phone (below `md`).**
  - Every facet folds into the Filters sheet, whose button counts every active facet.
  - The controls sit in one row that scrolls sideways within itself.
  - The tab description is hidden.
  - Each row has a one-line header and a full-width Make offer.
- **Your posts.** When every post can be bumped, the row reads "all ready to bump". What it counts is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Order and idle posts, Filters, Your posts and Post a list, Trade card, Matches and Compare with.
- `web-trade-for-you`: Freshness. For you's order may lag by up to 5 minutes, like Mutual's.

## Impact

- `packages/api`: For you's Any feed gains a three-phase cursor (Mutual, ranked one-way, bump order), with the phase logic tested in `lib/`. No schema change, no migration.
- `apps/web`: `features/trade`, plus an opt-in in `features/filters` that folds every facet into the sheet. Other pages are unchanged.
- Paraglide: new en/ja/ko strings. The ja and ko wording needs a native check.

## Non-goals

- A Bump button on the viewer's own rows (mockup idea, not agreed).
- Letting strips wrap: they stay on one line with a "+N" tile.
- A count on the One way heading, or any new count query.
- Changing who counts as Mutual, Mutual N, the person sheet or Browse's bump order.
