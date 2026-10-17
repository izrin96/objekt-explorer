## 0. Prerequisite

- [x] 0.1 Confirm `offer-from-post-list-only` is applied and archived, since this change's delta builds on its "Offer builder" text. Check that `openspec/specs/web-trade-offers/spec.md` has the "From a Market listing" scenario. If it isn't archived, stop and ask the user.

## 1. API

- [x] 1.1 `services/offer/core.ts`: `allowedEntries(addressed, slugs?, fromList?)` narrows to `fromList` when it is set and `addressed.onlyList` is null. Lint and typecheck pass for `@repo/api`.
- [x] 1.2 `services/offer/picker/theirs.ts`:
  - `resolveTheirItems(me, addressed, fromList?)` passes `fromList` through and skips kept items when it is set;
  - `theirPickerPage` reads `fromList` from its narrowing;
  - the whole theirs list (`offerCandidates` without an offset) returns `lists: PartnerList[]` (`partnerListChoices`) of the partner's `offersOnTrade` lists, empty when `addressed.onlyList` is set.

  `services/offer/picker/index.ts`: add `lists` to `CandidatesPage`. `schemas/offer.ts`: update the `fromList` doc comment to cover theirs.

  Verify read-only against real data by calling `offer.candidates` with a conversation or user target for a partner with two have/sale lists:
  - `side: "theirs"` without an offset returns both lists in `lists`;
  - `side: "theirs"` with `offset: 0, fromList: <one slug>` returns only that list's entries;
  - a want-list slug returns an empty page;
  - a scoped list target returns `lists: []` and ignores `fromList`.

  Lint, typecheck and build pass for `@repo/api`.

## 2. Web

- [x] 2.1 Add `offer_picker_from_all_theirs` ("All their lists") and `offer_picker_theirs_from_empty` ("Nothing on this list is available") to `apps/web/messages/en.json`, `ja.json` and `ko.json`. `paraglide:compile` succeeds.
- [x] 2.2 `offers/queries.ts`: `theirPickerOptions(to, filters, fromList?)` sends `fromList`.

  `offers/offer-picker.tsx`:
  - `OfferPicker` and `PickerBody` take `theirLists` and pass it to `TheirsGrid`;
  - `TheirsGrid` adds the From `SingleSelect` as `MineGrid` does, shown only when `source === "lists"` and `theirLists.length > 1`;
  - the empty state follows `design.md`.

  `offers/builder/form.tsx`: pass `theirs.data?.lists ?? []`.

  Lint, typecheck and build pass for `web`.
- [x] 2.3 Browser check with `browser-testing-with-devtools`, read-only, never pressing Send:
  - In a `/messages/$id` builder with a partner who has two or more have/sale lists, You get's picker shows From. Picking one list shows only its entries.
  - A have/sale post's builder on `/trade` shows no From under You get.
  - A partner with one list shows no From.
  - At 390 px, the picker's filter row wraps and the page doesn't scroll sideways.

## 3. Docs

- [x] 3.1 `packages/api/AGENTS.md`, in the offer get-sources paragraph: add that `fromList` narrows the theirs picker through `allowedEntries`, that the scope wins over it, and that the send check is unchanged. `bun run check` passes.

## Workflow follow-up

- Archive `offer-from-post-list-only` first, then this change, after review.
- ko/ja copy gets a native review.
