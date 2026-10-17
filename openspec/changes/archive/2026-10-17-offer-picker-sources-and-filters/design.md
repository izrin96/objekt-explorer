## Context

`offer.candidates` serves both pickers.

- `side: "mine"`:
  - `mineCandidates` (`services/offer/picker/mine.ts`) pages the sender's objekts from the indexer by `(receivedAt, id)` cursor, at the sender's linked addresses.
  - On the first page it also sends `suggested`: their bound have and sale list entries.
- `side: "theirs"`:
  - `theirPickerPage` resolves every allowed entry (`allowedEntries`, `offersOnTrade` lists) against the partner's wallet, then pages that array by offset.
  - Hidden-serial lists become any-copy items, and `anyCopyScope` limits which copies an any-copy ask may draw on.
- `createOffer` (`services/offer/index.ts`):
  - It refuses `not_listed` for a get item that matches no allowed entry and was not kept from a countered offer.
  - `checkItems` then checks ownership against the partner's linked addresses.
- Filters:
  - `collectionWhere` (`picker/shared.ts`) already narrows by artist, member, season, class, `on_offline` and `collection`.
  - The web's `PickerFilterBar` sends only member, season and class. The same bar serves the chat attach pickers, which filter on the client through `toFilterSearch`.
- Privacy: `user_address.private_profile` hides an address's collection from everyone but its owner (`services/privacy.ts`), and `private_serial` hides its serials.

## Goals / Non-Goals

**Goals:**
- One rule decides whether a get item needs a list. The picker and the send both read it.
- Reuse the existing paging, flags and filter code rather than adding a second picker pipeline.

**Non-Goals:**
- Schema changes. An offer item from a collection keeps `list_id` null, as a kept counter item does.

## Decisions

**The partner "has lists" when `allowedEntries`'s list query returns any list (`offersOnTrade` for the partner).**
- The rule is pure: `collectionAskAllowed`, in `lib/offer-rules.ts` with tests. A specific ask needs a visible address that shows serials, and an any-copy ask needs one that hides them, so the server agrees with what the picker offers.
- `createOffer` reads the lists once, as it does today:
  - with lists, the current check applies unchanged;
  - with none, a get item that is not kept must be held at a *visible* address of the partner, meaning one that is not private to the sender. A specific objekt there must also be at an address that does not hide serials. Anything else is `not_listed`.
  - `checkItems`'s `holders` for the get side become the visible addresses that show serials, and `copyHolders` the visible ones that hide them; `getScope` becomes `null`.
- Alternative: allow collection asks always, with a mark. The user rejected it, since listing should keep protecting people who list.

**A new candidates side, `"theirs-collection"`, paged by cursor.**
- Extract the indexer query in `mineCandidates` into `ownedPage(addresses, cursor, narrowing)`. Mine and theirs-collection both call it, so both get the same flags (`itemFlags`), ordering and filters.
- Addresses:
  - specific objekts come from the partner's visible addresses that show serials;
  - on the first page, `suggested` carries one any-copy item per collection held at visible hidden-serial addresses, with `copies` counted the way `resolveTheirItems` counts spare copies.
- The server refuses this side with `not_listed` when the partner has lists, so a stale tab can't use it to bypass them.
- Alternative: make `"theirs"` switch on its own. It pages by offset over a resolved array, which does not fit a whole wallet, and old tabs would get a mixed shape. Rejected.

**The builder learns the source from `offer.candidates` `"theirs"`.**
- Its output gains `partnerLists: boolean`, optional, read as `true` when absent.
- The builder already loads `theirCandidatesOptions` to check picks. It labels You get's button from that flag and opens the matching picker.
- `listed` stays as it is for the empty-state reason.

**From on You give is a `fromList` narrowing on `"mine"`.**
- `fromList` is an optional list slug, refused unless it is one of the sender's own have, sale or general lists.
- When it is set:
  - the query adds `objekts.id IN (entry ids) OR collections.slug IN (whole-collection entry slugs)` from that list's entries;
  - `suggested` is empty.
- The web picker puts From in a `Select` at the head of the filter row, defaulting to All your objekts and listing the sender's lists by name with their type badge. The lists come from the same lists query the builder's Compare and attach flows already use. Reuse that query, don't add one.

**Filters: extend `PickerFilterBar` once.**
- Add three facets:
  - `artist`, a `SingleSelect` over `facets.artists`. Picking one limits the member options to that artist's group from `useScopedFacets().groups`.
  - `on_offline`, a two-option `SingleSelect`, rather than `OnlineFilter`, which is bound to the URL filter store.
  - `collection`, a `SingleSelect` over `facets.collectionNos`.
- `PickerFacetFilters`, `NO_PICKER_FILTERS`, `pickerFiltered`, `toFilterSearch` and the offer `toInput` all carry the three new facets.
- The chat attach pickers inherit them through `toFilterSearch`. That is intended: same bar, same filters.
- The row wraps at phone width as it does today.
- Alternative: a Filters popover. It hides the choices a sender came to set, and six selects still fit in two rows at 390 px. Rejected.

**Copy (en, ja, ko):**
- `offer_add_theirs_collection` "Add from {name}'s collection";
- `offer_picker_theirs_collection_desc` "Objekts {name} holds now, at profiles they show. They haven't listed anything, so you can ask for anything here.";
- `offer_picker_theirs_collection_empty` "{name} holds nothing you can ask for";
- `offer_picker_from` "From" and `offer_picker_from_all` "All your objekts";
- `offer_picker_any_copy_section` "Serials hidden: any copy";
- `filter_artist` exists already. Reuse it, and reuse the online and collection labels from the main filter bar.

## Risks / Trade-offs

- [A whole wallet is large.] → Cursor paging of 200, the same as mine. Search loads all pages only while the search box holds text, as today.
- [The partner lists something after the builder opens.] → The send is refused with `not_listed`, and the builder's existing refusal handling shows it. The picker shows lists on its next load.
- [The chat attach pickers are part of the uncommitted `chat-cards-and-stacked-alerts` work.] → Apply this change after that work is committed, so their diffs don't tangle.
- [Accept does not recheck the listing rule.] → That is the same as today: listing is a send-time rule, and accept rechecks ownership.

## Migration Plan

No migration. Deploy as one release. Rollback is a code revert. Offers sent from a collection stay valid, since accept never reads lists.
