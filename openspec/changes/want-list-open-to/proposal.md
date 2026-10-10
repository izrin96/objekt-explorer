## Why

`derive-trades-only-from-link` (applied on `feat/trade`, never archived or deployed) made a want list's link decide whether it takes sales. That hid the rule behind linking, and it made pairing change who you match. The agreed model instead gives every want list one visible choice, and pairing never changes matching.

## What Changes

- Every want list, paired or not, SHALL carry **Open to**:
  - **Trade only**: it matches have lists only;
  - **Trade or buy**: it matches have lists and sale lists.
- Have lists match every want list. Sale lists match only want lists open to trade or buy. Have and sale lists carry no choice.
- Pairing a have list with a want list SHALL NOT change matching; it only joins the two lists into one post.
- Tags:
  - WTT: a have list, alone or paired, and a want list on its own set to Trade only;
  - WTB: a want list on its own set to Trade or buy;
  - WTS: a sale list.
- A new want list defaults to Trade only. An existing want list keeps matching sale lists, so it reads Trade or buy, which is what the code running in production does today.
- The setting returns as "Open to" on the list form. The link field's note about trades only goes. The Browse help table and For you's help line describe "Open to".
- The `derive-trades-only-from-link` change folder is removed, since it is superseded and was never archived. Its code is reverted. A new migration re-adds `lists.match_sale` (default `true`), because the drop migration stays as it is.

Routes covered: `/trade` (Browse), `/trade/for-you`, the list create and edit dialogs (`/list` and each list page), and the worker's want-alert jobs.

## Non-goals

- No pair/single separation: a paired list matches the same lists a single one does.
- No setting on have or sale lists, and no fourth list type.
- No change to linking, the offer builder or reputation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: "Want list match option" becomes "Open to: Trade only / Trade or buy", and states that pairing does not change matching.
- `web-trade-browse`: "Posts from lists on Trade" tags a want list on its own by its Open to choice.
- `web-trade-for-you`: "Account-wide matches" no longer says a sale list counts against every want list.
- `web-notifications`: "Want-list alerts" and "Reverse-direction alerts" count a sale list only against a want list open to Trade or buy, matching what the worker already does.

## Impact

- The code paths `e8fbf708` changed return to their state at `cd0f6269`, apart from the drop migration and the help table wording:
  - `packages/api`: `trade-lists.ts`, `trade-feed/*`, `trade-matches/candidates.ts`, `lib/trade-feed.ts`, `lib/trade-rank.ts`, list schemas and `list-crud.ts`, and their tests;
  - `apps/worker`: `want-alerts/pairs.ts`;
  - `apps/web`: `list-form.tsx` and `edit-list-dialog.tsx`.
- `packages/db`: `matchSale` returns to `schema.ts`, with a new migration that re-adds the column.
- `apps/web` messages (en, ja, ko): the Open to labels, the link field note, the Browse help table and For you's help line.
