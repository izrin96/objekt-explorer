## Context

- **You give's From.** `MineGrid` (`offers/offer-picker.tsx`) reads the sender's lists from `useUserLists()`, keeps `from` in local state, and passes `fromList` into `myCandidatesOptions`. The server narrows in `mineCandidates` through `listWhere`.
- **You get's picker.** `TheirsGrid` calls `theirPickerOptions(to, filters)`, which reaches `theirPickerPage`. That runs `resolveTheirItems`, built on `allowedEntries(addressed)`, and then filters and pages the result in memory.
- **The input.** `pickerNarrowingSchema.fromList` is already accepted on every side and is ignored by theirs today.
- **What the builder already loads.** It fetches the partner's full candidate list once (`theirCandidatesOptions`, served by `theirCandidates`) and passes `source` down to `OfferPicker`.
- **The scope.** After `offer-from-post-list-only`, `Addressed.onlyList` scopes an offer to one have or sale list, and `scopedList` tells the web.

## Goals / Non-Goals

**Goals:**
- Reuse You give's From pieces: `SingleSelect`, the `offer_picker_from*` messages and `LIST_TYPE_LABEL`.
- No new endpoint and no input schema change.

**Non-Goals:**
- Narrowing the full candidate list the builder checks picks against. It stays whole, so a pick made under From is checked like any other.

## Decisions

### Narrow at `allowedEntries`, as the post scope does

- `allowedEntries(addressed, slugs?, fromList?)` adds `eq(lists.slug, fromList)` when `fromList` is set and `addressed.onlyList` is null. The scope wins over From.
- A slug that isn't one of the partner's `offersOnTrade` lists matches nothing, so the page is empty. No refusal is needed, because From only narrows a view.
- `resolveTheirItems(me, addressed, fromList?)` passes it through and skips kept items when `fromList` is set: kept items sit on no list, so they belong only under All.
- `theirPickerPage` takes `fromList` from the narrowing.

Alternative: filter the resolved items by `item.listSlug`. Rejected: an objekt on two lists carries only the first list's slug, so it would go missing under the second. Hidden-serial any-copy counts would also stay computed over every list.

### List choices come with the builder's full candidate list

- the whole theirs list (`offerCandidates` without an offset) returns `lists: PartnerList[]` (`partnerListChoices`): the partner's `offersOnTrade` lists, in `lists.id` order. It is empty when the offer is scoped.
- `form.tsx` already holds this query, and passes `theirs.data?.lists` to `OfferPicker` as `theirLists`. `OfferPicker` passes it to `TheirsGrid`.
- Putting it on the full candidate list, not on each picker page, keeps the select steady while the grid refetches for a new From value.

Alternative: a separate `offer.partnerLists` procedure. Rejected: it means a new endpoint, a second request, and a duplicate of the start-verdict gate.

### Web: `TheirsGrid` mirrors `MineGrid`

- `const [from, setFrom] = useState(ALL_LISTS)`. `fromList` is `from` only when it is in `theirLists`. `theirPickerOptions(to, filters, fromList)` sends it.
- The select renders when `source === "lists"` and `theirLists.length > 1`. It never renders for `scoped` or `collection`, and since the server returns no lists when scoped, both checks agree.
- Option labels:
  - "All their lists": new `offer_picker_from_all_theirs`;
  - each list: the existing `offer_picker_from_list({ name, type })`.
- Empty state with a list picked:
  - `offer_picker_filtered` when filters narrow;
  - otherwise the new `offer_picker_theirs_from_empty` ("Nothing on this list is available").
- The `!listed` reason applies only under All, because a picked list being empty doesn't mean the partner listed nothing.

## Risks / Trade-offs

- [A list is removed from Trade while the picker is open] → its From value no longer matches `theirLists` after a refetch, and `fromList` falls back to All, as `MineGrid` does.
- [Lists share a name] → the type in the label usually tells them apart. Two lists with the same name and type stay ambiguous, as on You give today.

## Migration Plan

Ship web and api together. There is no data change. An old web build never sends `fromList` for theirs and ignores `lists`. Rolling back the api leaves the select narrowing nothing until the web is rolled back too.
