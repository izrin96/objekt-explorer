## Why

A want list's Open to has two choices: Swaps only and Swaps or buying. Someone who only wants to buy cannot say so. Their want list matches every have list, so they get swap matches, alerts and Mutual counts they will never act on.

The create list form also puts List type third, as a dropdown under Name and Description. A user can easily miss it, yet the type decides what the list does on Trade and which fields the form shows.

## What Changes

- Open to SHALL get a third choice, **Buying only**: the want list matches sale lists only, never have lists.
  - Swaps only matches have lists only.
  - Swaps or buying matches have lists and sale lists.
  - Buying only matches sale lists only.
- A have list's entry SHALL count against a want list only when that want list is open to swaps (Swaps only, or Swaps or buying). Today it counts against every want list.
- Matching applies the rule in both directions, wherever Trade matches lists:
  - Browse match chips, rings and the "Matches only" filter;
  - Any, Mutual, Mutual N and the person sheet;
  - want-list alerts and "Someone wants what you have" alerts.
- Tags:
  - a want list on its own set to Buying only is WTB, the same as Swaps or buying;
  - a have list linked to a Buying only want list stays one WTT post. The have side still offers swaps, and the want side matches sale lists only.
- A WTB post whose want list is Buying only SHALL show the note "Buying only, not swapping" beside its tag. This mirrors the WTT "Swaps only, not buying" note.
- The list page and list card name the choice, and the Mutual help table gains its Buying only rows.
- **List form:**
  - List type SHALL move to the top of the create list form, above Name.
  - It becomes a segmented control showing all four types at once, with the chosen type's description under it.
  - The edit form shows the type at the top as a read-only badge, since a list's type cannot change.
- Existing want lists keep their current choice. No list becomes Buying only unless its owner picks it.

Routes covered: `/trade` (Browse), `/trade/for-you`, the list create and edit dialogs (`/list` and each list page), list pages and cards, and the worker's want-alert jobs.

## Non-goals

- No Open to choice on have or sale lists.
- No refusal when a Buying only want list is linked to a have list.
- No change to the offer builder, verified trades or reputation.
- Tabs that switch between per-type forms. The form stays one form whose fields follow the type.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`:
  - "Manage lists": List type comes first, as a segmented control.
  - "Want list match option": gains Buying only, and have lists count only against want lists open to swaps.
- `web-trade-browse`:
  - "Posts from lists on Trade": tags a Buying only want list WTB.
  - "Matches to the signed-in viewer": counts a have list only against want lists open to swaps.
  - A new "Buying only note" requirement covers the byline note.
- `web-trade-for-you`: "Account-wide matches" applies the same rule.
- `web-notifications`: "Want-list alerts" and "Reverse-direction alerts" skip have lists for a Buying only want list.

## Impact

- `packages/db`: a new `lists.match_have` column (`boolean NOT NULL DEFAULT true`), with a check that `match_sale OR match_have` holds. It comes with a new generated migration.
- `packages/api`:
  - list schemas and `list-crud.ts`, plus `services/list.ts`;
  - `trade-lists.ts` (`offerMatchesWantSql`);
  - `trade-matches/candidates.ts`, `trade-matches/index.ts` and `lib/trade-rank.ts`;
  - `lib/trade-feed.ts` and `trade-feed/{entries,viewer,query}.ts`;
  - the four trade cache key versions;
  - `AGENTS.md`'s Trade matching paragraph;
  - tests in `trade-rank.test.ts` and `trade-feed.test.ts`.
- `apps/worker`: `want-alerts/pairs.ts`.
- `apps/web`:
  - `list-form.tsx`, `edit-list-dialog.tsx` and `list-type-badge.tsx`;
  - `browse-post.tsx` and `match-help.tsx`;
  - messages in en, ja and ko.
- `/rpc` stays compatible:
  - The new input field is optional.
  - An open tab's edit that sends `matchSale: false` also restores swaps, so no list ends up open to nothing.
