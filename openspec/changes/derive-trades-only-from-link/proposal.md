## Why

The want list "Match with" choice (Trades only / Trades and sales) is a second setting people have to understand on top of the have↔want link, and the tag a post gets (WTT or WTB) depends on it. Linking a have list to a want list already says "I'll trade these for those", so the link can decide it instead. The setting has never been live, since `match_sale` exists only on `feat/trade`, so nobody's saved choice is lost.

## What Changes

- A want list linked to one of its owner's have lists SHALL be **trades only**: it matches entries on have lists, never on sale lists. A want list with no link SHALL take sales: it matches have and sale lists. This applies in both directions and everywhere Trade matches: For you counts, Browse match counts and Only matches, want-list alerts and "Someone wants what you have" alerts.
- The link alone decides. A linked want list is trades only even when its have list is not on Trade, or not bound to a profile.
- Tags follow list shape only. **WTT** is a have list, alone or with its linked want list, or a linked want list shown on its own. **WTB** is an unlinked want list. **WTS** is a sale list.
- **BREAKING** (branch only): the list form loses the Match with radio. The `match_sale` column is dropped by a new migration. The `matchSale` field leaves the create and edit list inputs. A stale client that still sends it is not rejected; the field is ignored.
- The link field on the list form says that a linked want list matches trades only.
- The Browse help table and For you's Trades-only help line describe the link rule, not the setting.

Routes covered: `/trade` (Browse), `/trade/for-you`, the list create and edit dialogs (`/list` and each list page), and the worker's want-alert jobs.

## Non-goals

- No "linked, but would also buy" option. A user who wants both keeps a second, unlinked want list with the same entries.
- No change to how links are made, unlinked or mirrored, or to which list types can link.
- No change to sale lists, have lists, the offer builder or reputation.
- No data backfill: nothing reads `match_sale` after this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: the "Want list match option" requirement (added by the unarchived `trade-chrome-details`) is removed, and replaced by a requirement that a linked want list is trades only.
- `web-trade-browse`: "Posts from lists on Trade" tags a post by list shape and link, not by a Match with setting.

## Impact

- `packages/db`: `lists.match_sale` is dropped from `schema.ts`, with a new migration. Past migrations stay untouched.
- `packages/api`:
  - `services/trade-lists.ts` (`offerMatchesWantSql`);
  - `services/trade-feed/` (`query.ts` tags and match index, `viewer.ts`, `entries.ts`);
  - `services/trade-matches/candidates.ts`;
  - `lib/trade-feed.ts` (`postTag`, the match side);
  - `lib/trade-rank.ts`;
  - `schemas/list.ts`, `routers/list-crud.ts`;
  - the tests beside them.
- `apps/worker`: `job/want-alerts/pairs.ts`.
- `apps/web`:
  - `features/list/list-form.tsx` and `edit-list-dialog.tsx`;
  - `features/trade/match-help.tsx`;
  - the en, ja and ko messages (the `list_create_match_*` keys go).
- Ordering: archive `trade-chrome-details` before this change, since this change removes a requirement that one adds.
