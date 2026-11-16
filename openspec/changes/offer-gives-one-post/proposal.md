# Proposal

## Why

Under Only offers with what I want, You give's picker showed objekts that only another of the recipient's posts wants. Once You get was empty, the builder and the server switched to every want list on Trade. The owner decided that You give is held to one post's want list, never a mix. A first fix held gives-only offers to the Offer on post. That broke Make offer from a Buy post, rows whose You give matches win, and counters that ask nothing new. It also left a post without a want list taking anything.

## What Changes

- **BREAKING (behaviour):** while the recipient has Only offers with what I want on, You give is held to one want list, chosen in this order:
  - with a new ask (one the recipient didn't offer in the countered offer), the Offer on post's;
  - for a counter asking nothing new, every want list on Trade;
  - for a gives-only offer started from a Buy post (or from a row whose You give matches came from one want list), that want list;
  - for any other gives-only offer, the Offer on post's.
- **BREAKING (behaviour):** a post without a want list takes no objekts, only a top-up, whether or not the offer asks for anything. The builder hides You give's Add there and says why.
- Every want list on Trade remains only for: a partner with no have or sale list on Trade, a counter whose asks are all kept, and a tab that sends no post.
- A row's You give matches come from one want list (most matches, a tie to the row's lead, then list order), as You get's already come from one post.
- `offer.create` gains an optional `wantList`: the start want list, validated as the partner's discoverable want list with entries.
- A gives-only offer from a Buy post, and a counter asking nothing new, are stored on no post. Their cards show no "Offer on". Every other gives-only offer is on the Offer on post.
- The theirs candidates page carries `wantLists`, and suggestions carry `wantSlug`, both optional.
- The Account › Trade description of Only offers with what I want, and the changelog line, state the new rules.
- Unchanged: countered asks stay exempt; open offers stay; Offer on still chooses where asks come from.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: MODIFIED "Recipients who take only what they want", "Builder for a want-only recipient", "The post an offer is on", "Row matches from one post", "Where Offer on opens".
- `web-account`: MODIFIED "Offer rules" (the description).

`offer-one-post-only`, not yet archived, also modifies these requirements, and the deltas here are written against its versions. Archive it first.

## Routes

`/trade/@<handle>/offer` (every Make offer and Counter), `/messages` (offer cards), `/account/trade` (the setting's description).

## Non-goals

- Flagging gives already on the side before Send, when the rule changes under them. The server's `not_wanted` refusal outlines them.
- Cutting near matches to one want list.
- Buy posts as Offer on choices, or offer rules per post.
- Relabelling offers already sent.

## Impact

- `packages/api`:
  - `schemas/offer.ts` (`wantList`), `services/offer/core.ts` (`resolveWantList`), `services/offer/index.ts`, `lib/offer-recipient-rules.ts` with its test (`givesRuleOf`);
  - `services/offer/picker/shared.ts` (`wantListWantedAmong`, `CandidatesPage.wantLists`), `picker/theirs.ts`, `picker/index.ts` (`oneListOf`, `wantSlug`);
  - `docs/offers.md`.
- `packages/db`: the comment on `offer.postListId` only.
- `apps/web`: `features/offers/builder/post-choice.ts` with its test, `builder/form.tsx`, `builder/types.ts`, `offer-builder.tsx`, `messages/{en,ko,ja}.json`, `components/layout/changelog-entries.ts`, `docs/offers.md`.
