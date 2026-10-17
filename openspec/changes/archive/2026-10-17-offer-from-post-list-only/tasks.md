## 0. Prerequisite

- [x] 0.1 Confirm `offer-picker-sources-and-filters` is archived, since this change's `web-trade-offers` delta builds on its text. Verify `openspec/specs/web-trade-offers/spec.md` has the "Ask from a collection with no lists" scenario. If it is not archived, stop and ask the user before archiving it.

## 1. API: a have or sale list target scopes the offer

- [x] 1.1 `services/offer/core.ts`:
  - `Addressed` gains `onlyList: string | null`. For a `list` target, `resolveAddressed` sets it to the slug only when that list is one of the partner's `offersOnTrade` lists. It is null otherwise, and for a conversation id or any other target.
  - `allowedEntries` narrows its list query to that slug when it is set.
  - `picker/shared.ts`: add `keptGives(addressed, me)`, which skips `counteredGives` for a scoped offer.

  Lint, typecheck and build pass for `@repo/api`.
- [x] 1.2 `picker/index.ts`: the candidates output type (`CandidatesPage`) gains optional `scopedList: boolean`; the router has no output schema. An open tab's input and output still validate. Typecheck passes for `@repo/api`.
- [x] 1.3 `services/offer/picker/theirs.ts`:
  - `resolveTheirItems` reads kept items through `keptGives`, so a scoped offer has none;
  - `theirCandidates` and `theirPickerPage` return `scopedList`;
  - `theirCollectionPage` refuses `not_listed` for a scoped offer as for a partner with lists.

  Verify read-only against real posts by calling `offer.candidates`:
  - with `target: { kind: "list", slug }` of a have list, for a partner with two have/sale lists on Trade: only that list's `listSlug` comes back, with `partnerLists: true` and `scopedList: true`;
  - with a want list's slug: every have/sale list comes back, with `scopedList: false`.

  Lint, typecheck and build pass for `@repo/api`.
- [x] 1.4 `services/offer/index.ts` (`createOffer`): read kept items through `keptGives`. A scoped offer always has lists, so `partnerHasLists` stays as is. A scoped get item off the target list is then refused as `not_listed` with its objekt id, and `collectionAddresses` is never read.

  Verify up to the request boundary only, with nothing sent: the validation path refuses an item from the partner's other list. Record it as "read-only verified". Lint, typecheck and build pass for `@repo/api`.

## 2. Web: the post source

- [x] 2.1 Add messages to `apps/web/messages/en.json`, `ja.json` and `ko.json`:
  - `offer_add_theirs_scoped`: "Add from {name}'s list";
  - `offer_picker_theirs_scoped_desc`: entries on this list of {name}'s that you can see, checked against what they own now.

  Follow the wording of the neighbouring `offer_add_theirs*` keys. `paraglide:compile` succeeds.
- [x] 2.2 `offers/get-source.ts`: add `scoped` to `GetSource`, and `sourceOf` to choose it, with its add label and description. `offers/offer-picker.tsx`: treat `scoped` like `lists` for the picker body and empty states. Typecheck passes for `web`.
- [x] 2.3 `offers/builder/form.tsx`: `source` comes from `sourceOf`: `"scoped"` when `theirs.data.scopedList` is true, and otherwise keeps today's `lists` / `collection` choice. Lint, typecheck and build pass for `web`.
- [x] 2.4 Browser check with `browser-testing-with-devtools`, read-only, never pressing Send:
  - On `/trade`, Make offer on a WTT post whose owner has two have/sale lists shows "Add from {name}'s list", and the picker lists only the post's list.
  - Make offer on a WTB post, or a want-only WTT post, shows "Add from {name}'s lists" (or "…'s collection" when they have none), as in chat.
  - Make offer on a listing in an objekt drawer's Market tab shows "Add from {name}'s list", with only that sale list.
  - Make offer in `/messages/$id` still shows "Add from {name}'s lists", with all lists.
  - At 390 px, the builder doesn't scroll sideways.

## 3. Docs

- [x] 3.1 `packages/api/AGENTS.md`, in the paragraph on `partnerHasLists` and the collection fallback: add that a target list that is have or sale on Trade (`Addressed.onlyList`) scopes the get side to that one list: it never falls back to the collection, and `keptGives` skips kept items. A want list target is unscoped. `apps/web/AGENTS.md` needs no change. `bun run check` passes.

## Workflow follow-up

- Archive `offer-picker-sources-and-filters` first, then this change, after review.
- ko/ja wording gets a native review, as with the other trade copy.
