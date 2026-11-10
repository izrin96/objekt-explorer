## Why

Traders get offers that make no sense to them: gives they never wanted, asks from lists other than the post the offer came from, and, for people with no have or sale list on Trade, asks for anything in their wallet. Data from 2026-11-10: unwanted gives show up in about 51% of declined offers against about 12% of open ones, and 13% of first offers ask from a collection. Recipients should be able to tighten offers, and collection asks should be opt-in.

## What Changes

- **Three switches in Account › General**, checked by the server when an offer is sent:
  - **"Only offers with what I want"** (You give): on a post paired with a want list, every objekt given must be on that list, or the send is refused (`not_wanted`); a post without one takes anything, and no post means any of their want lists on Trade. Off by default. Cash-only offers, and objekts the recipient asked for in a counter, pass.
  - **"Let people ask for anything I hold"**: off by default. **BREAKING**: a recipient with no have or sale list on Trade can no longer be asked for objekts from their collection unless they turn this on.
  - **"Let people ask from more than one post"**: on by default, so nothing changes on deploy. Off, every ask comes from one of the recipient's posts, or it's refused (`other_post`).
- Offers already open stay as they are.
- **A one-time Messages notice** introduces "Only offers with what I want", with Turn on.
- **A nudge after declining** an offer with a "Not on your wants" item, while that rule is off, once per browser.
- **The builder follows the rules.** For a one-post recipient, "Offer on [post ▾]" (or No post) sets the one post You get's picker shows, with no List choice, and a Trade row's matches come from one post. "Only what they want" locks on where the wanted rule filters. Failing picks name why.
- **"Offer on {post}"** shows on the card for both people. The offer stores it (`post_list_id`).
- **A recipient-only label**: "Not on your wants".

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `web-trade-offers`: the two rules and one post per offer, the builder's post choice, the post line, the label, the nudge and notice, and the collection-ask default.
- `web-account`: General settings gains the three switches with their defaults.
- `web-chat`: the Requests scenario for a collection ask needs the recipient to allow it.
- `web-trade-browse`: Make offer on a post opens on one post and names the collection-ask condition.

## Routes

`/account/general`, `/trade/@<handle>/offer`, `/messages`, `/trade/mine`, `/trade` and Make offer on an objekt's Market tab.

## Non-goals

- One post per offer on by default: 26% of senders asked across posts in 17 days. Recheck with `post_list_id`.
- Reputation scores or automatic declines.
- Changing Requests (`firstListed`).
- A Trade section of Account. If `trade-active-hours` ships `/account/trade` first, the switches move there.

## Impact

- `packages/db`: migrations adding `user.only_wanted_offers` and `user.allow_collection_asks` (default false), and `offer.post_list_id` with its index; a later one drops `user.one_post_offers`, which no release read, and one adds `user.multi_post_asks` (default true). Applying them needs approval.
- `packages/api`: `createOffer` (three gates, `post`), `OFFER_REFUSALS`, `user.update` and Better Auth fields, the candidates pages, `suggestOffer`, the offer view.
- `apps/web`: General settings, the builder, the offer card, the nudge, the Messages notice, `en`/`ko`/`ja`.
- `/rpc`: every new input is optional. A tab from before the deploy that breaks a rule shows the generic refusal.
