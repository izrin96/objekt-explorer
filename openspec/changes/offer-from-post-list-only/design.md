## Context

Make offer on a post already addresses the builder to the post's list. `browse-post.tsx` builds `target: { kind: "list", slug: anchor.list.slug }`, where the anchor is the have list of a pair or the post's only list, and that is a want list on a want-only post. The builder sends that `to` on both `offer.candidates` and `offer.create`. The server uses the target only to find the partner (`resolveAddressed` → `prepareStart`) and then drops it, so:

- `allowedEntries` returns entries from every `offersOnTrade` list of the partner;
- `partnerHasLists` decides the collection fallback, both in the picker (`theirCandidates` / `theirCollectionPage`) and in `createOffer`.

The builder picks its You get source in `builder/form.tsx` from `theirs.data.partnerLists`. Labels and descriptions come from `get-source.ts`.

The person sheet addresses a `user` target and a conversation a `conversationId`. A `list` target comes from two places: a Trade post, and Make offer in a listing's row menu in the objekt drawer's Market tab (`objekt/drawer/market.tsx`). The Market one pre-fills the listed objekt from the seller's sale list. The scope fits both, since each offer is about that list.

## Goals / Non-Goals

**Goals:**
- One server-side scope that the picker, the full candidate list and the create check all read, so the three cannot drift apart.
- Only additive schema changes, so open tabs and `/rpc` stay compatible.

**Non-Goals:**
- Scoping counters or later offers in the conversation.
- Showing the "From this post" strips again (`FocusStrip` and `focusList` stay unused).

## Decisions

### A have or sale list target scopes the offer

`resolveAddressed` returns `onlyList: string | null` on `Addressed`. For a `{ kind: "list" }` target it looks the list up among the partner's lists that are `offersOnTrade` (have or sale, profile-bound). It sets the slug when the list is found and null otherwise. It is also null for a conversation, a profile or a user target.

So a want list target, which is a want-only post, is unscoped and follows today's rules. A conversation id never scopes: what the conversation was started from is not stored, and counters keep today's rules.

Alternatives:
- A new `fromPost` input on `candidates` and `create`. Rejected: the target already says this, and a second field could disagree with it.
- Scoping every list target and giving a want list nothing to ask. Rejected: the owner of a want-only WTT post wants a swap, so the sender needs the owner's have lists.

### Narrow at `allowedEntries`; the scope replaces "has lists"

- `allowedEntries(addressed)` adds `eq(lists.slug, addressed.onlyList)` to its `offersOnTrade` query when the slug is set.
- `partnerHasLists` keeps deciding the collection fallback. A scoped list is itself one of the partner's have or sale lists, so a scoped offer always counts as having lists, and `createOffer` refuses anything that matches no entry. `theirCollectionPage` also refuses a scoped offer up front, without the query.
- A scoped offer ignores kept counter items, so `keptGives` (`picker/shared.ts`) skips `counteredGives` when `onlyList` is set. A post offer is not a counter from the offer card, and the create path already refuses kept items outside a counter of that very offer.

Hidden-serial and any-copy rules need nothing new: they run on the narrowed entries.

### Builder: a third `GetSource`, `scoped`, chosen by the server

- The candidates output gains optional `scopedList: boolean`, set from `addressed.onlyList !== null`, on the `CandidatesPage` type, since the router has no output schema. Only the server knows whether a list target is a have or sale list on Trade, so the web reads this flag instead of guessing from the post's role.
- `get-source.ts` gains `scoped` with `m.offer_add_theirs_scoped({ name })`, reading "Add from {name}'s list", and a picker description.
- `sourceOf` in `get-source.ts` returns `"scoped"` when `theirs.data.scopedList` is true, and otherwise keeps today's `lists` / `collection` choice.
- `OfferPicker` treats `scoped` like `lists`: the same body and empty states, with only the title and description changed. `SideColumn` already switches on `source`, so no new component is needed.

## Risks / Trade-offs

- [The post's list is emptied while the builder is open] → the send is refused as `not_listed`, naming the items, as when a partner adds a list today.
- [The post's list leaves Trade or becomes a want list while the builder is open] → the next request is unscoped and accepts any of the partner's lists. The builder still shows only what it loaded, so the sender asks for nothing they didn't see.
- [The Market drawer's Make offer is scoped too: it can then ask only from that seller's sale list] → this is intended. A later `list` target, such as a list page, gets the same scope, so the code comment on `onlyList` says "a have or sale list target", not "a post".
- [The partner's candidates fail to load (a refusal shows its own screen; this is a network or server error)] → the builder falls back to the `lists` label, as it did before, so a scoped builder reads "…'s lists" until a retry. The server still holds the scope, and the picker loads from the same failing source.
- [An open tab from before the deploy shows all lists] → its sends are still checked by the new server. An item from another list is refused, and reopening the builder fixes the picker.

## Migration Plan

Ship web and api together. There is no data change. Rolling back the api restores the old behaviour. The web change on its own does nothing, since `scopedList` is absent.
