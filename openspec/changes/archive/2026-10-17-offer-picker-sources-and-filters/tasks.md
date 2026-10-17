## 1. Rule

- [x] 1.1 Add the pure check for a collection ask (`collectionAskAllowed`) to `packages/api/src/lib/offer-rules.ts`; callers branch on the partner having lists directly. A collection ask is allowed when the item is held at a visible address that:
  - shows serials, for a specific objekt;
  - hides serials, for any copy.

  Add `offer-rules.test.ts` cases for:
  - lists versus no lists;
  - a private address;
  - a hidden-serial address with a specific ask versus an any-copy ask.

  `bun test` passes, and lint and typecheck pass for `@repo/api`.

## 2. API

- [x] 2.1 `schemas/offer.ts`:
  - `side` gains `"theirs-collection"`;
  - the narrowing gains optional `fromList` (a list slug);
  - the candidates output gains optional `partnerLists`.

  Confirm that an open tab's `{ side: "mine" | "theirs", … }` input still validates unchanged. Typecheck passes.
- [x] 2.2 Extract `ownedPage(addresses, cursor, narrowing)` from `mineCandidates` (`picker/mine.ts`). Mine calls it.
  - Add `fromList`:
    - only the sender's own have, sale or general list is accepted, otherwise `not_listed`;
    - the query narrows by the list's entry ids or whole-collection slugs;
    - `suggested` stays empty while it is set.
  - Done when lint, typecheck and build pass for `@repo/api`.
- [x] 2.3 Add `theirCollectionPage` in `picker/theirs.ts`:
  - it refuses `not_listed` when the partner has lists;
  - visible addresses that show serials go through `ownedPage`;
  - on the first page, `suggested` holds any-copy items for visible hidden-serial addresses.

  Wire it in `picker/index.ts`. `"theirs"` returns `partnerLists`. Lint, typecheck and build pass.
- [x] 2.4 `services/offer/index.ts` `createOffer`:
  - with no partner lists, check each non-kept get item with the rule from 1.1;
  - pass the visible addresses as the get side's `holders` and `copyHolders`, with `getScope: null`;
  - with lists, behaviour is unchanged.

  Verify with a direct script that calls the check functions (no offer is written):
  - an ask at a private address is refused;
  - a specific ask at a hidden-serial address is refused;
  - an any-copy ask there passes.

  Lint, typecheck and build pass.

## 3. Web: filters

- [x] 3.1 `filters/picker-filter-bar.tsx`:
  - add artist (member choices limited to the picked artist's group), online/offline and collection number;
  - extend `PickerFacetFilters`, `NO_PICKER_FILTERS`, `pickerFiltered` and `toFilterSearch`;
  - `offers/queries.ts` `toInput` sends all six facets.

  Done when the offer pickers and both chat attach pickers filter by each new facet, the bar wraps at 390 px with no sideways scroll, and the dev overflow guard stays quiet. Lint, typecheck and build pass for `web`.

## 4. Web: sources

- [x] 4.1 `offers/offer-picker.tsx`: You give gets a From `Select`, with All your objekts and the sender's have, sale and general lists from the existing lists query. It sends `fromList` and hides the list-first section while a list is picked.
  - Done when picking a list shows only its held objekts.
  - Lint, typecheck and build pass.
- [x] 4.2 The builder (`builder/side-column.tsx`, `offer-picker.tsx`, `queries.ts`) reads `partnerLists` from the theirs candidates. When it is false:
  - You get's button reads "Add from {name}'s collection";
  - it opens a `TheirCollectionGrid`, which uses `theirCollectionOptions` (cursor paging, `side: "theirs-collection"`);
  - the any-copy section shows first;
  - the empty state follows the design copy.

  Done when the builder against a partner with no lists shows their collection, and against a partner with a list shows lists as before. Verify at the request boundary only; never send an offer on production. Lint, typecheck and build pass.
- [x] 4.3 Add the design.md copy to `en`, `ja` and `ko`. Done when `paraglide:compile` succeeds and the three files have the same keys.

## 5. Checks and docs

- [x] 5.1 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build`, and confirm they all pass. Then run `openspec validate offer-picker-sources-and-filters --strict`.
- [x] 5.2 Update `packages/api/AGENTS.md` with a short "Offer get sources" note:
  - lists win while the partner has any;
  - otherwise the get side may draw on visible, serial-showing addresses, and on any copy at hidden-serial ones, all checked at send.

  Confirm that `apps/web/AGENTS.md` needs no change.
