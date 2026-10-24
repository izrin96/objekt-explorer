# Proposal

## Why

Trade is the product's focus now, and trading needs people to see each other's holdings, serials and transfers. That data is public on the blockchain anyway, so hiding it on this site protects little and costs a lot.

The four privacy toggles in the profile edit dialog are Hide Cosmo ID, Hide from Serial Lookup, Hide Activity History and Private Profile. Each one adds a rule that every read path must apply. Between them they spread exceptions across holders, Serial Lookup, Activity History, Compare, the offer picker, chat cards, Market, list pages, `/api/v1` and the new Trade and chat naming. This change removes the settings and their rules. Every linked profile is then shown in full to every viewer.

**This exposes data people chose to hide.** On staging (root `.env`, 2026-10-24), 2,412 profiles are linked. Of those:
- 327 have Private Profile on;
- 468 hide from Serial Lookup;
- 514 hide Activity History;
- 323 hide their Cosmo ID.

On deploy, their holdings, serial owners, transfers and nicknames become visible on the site and through `/api/v1`. They are told through a dismissible notice on `/account/profiles` (design decision 7).

## What Changes

- **BREAKING (behaviour):** profiles are no longer private:
  - no private guard on `/@<nickname>`;
  - no "Private collector" holder rows;
  - Compare, held-by, pins, locked objekts and the offer collection picker all read every address.
- **BREAKING (behaviour):** Serial Lookup always names the owner, and a holder row always shows its lowest serial. The offer collection picker offers specific copies at every address.
- **BREAKING (behaviour):** Activity History lists transfers to every visitor.
- Hide Cosmo ID is removed. A profile is always named by its nickname, else its shortened address.
- `/account/profiles` shows a dismissible notice that the settings were removed and why, until the column-drop change removes it.
- The edit dialog drops the four toggles. `profile.update` still accepts the four fields so open tabs validate, and ignores them.
- The **per-list** "hide serial" setting (`lists.hide_serial`) is **not** changed. A list that hides serials still offers only "any copy" and shows no serial on cards.
- The columns stay. `user_address.hide_nickname`, `private_serial`, `hide_transfer` and `private_profile` are left in the database, and nothing reads or writes them. A later change drops them once this is live, as was done for `hide_user`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: Profile privacy on public reads is removed. Held-by drops the hidden-address case.
- `web-collection-holders`: Holder privacy is removed. Holder data freshness loses its privacy clause.
- `web-cosmo-link`: Hide Cosmo ID is removed. Edit profile has no privacy toggles. Default profile loses its Hide Cosmo ID note.
- `web-profile`: no private guard, and no hidden transfers.
- `web-compare`: a private target is compared like any other.
- `web-objekt-browser`: the Serials tab has no private notice.
- `web-trade-offers`: the collection picker and the send check read every address. List-level hidden serials stay.
- `web-trade-for-you`, `web-trade-browse` and `web-chat`: the private exceptions added by `default-profile-setting` go away.

## Sequencing

`default-profile-setting` must be archived first, because this change modifies requirements it adds (`Default profile`, `Other profiles in a thread`) and blocks it rewrites (`Partner identity`, `Posts from lists on Trade`).

## Non-goals

- Dropping the four columns. That is a later migration, once nothing live reads them.
- The per-list hide-serial setting.
- Hide socials (`showSocial`) and the Messages "Who can message you" setting.

## Routes

`/@<nickname>` and its tabs, the objekt drawer (Serials and Holders), `/list/$slug` compare, offer builder, `/trade`, `/trade/for-you`, `/messages`, `/account/profiles` (edit dialog), and `/api/v1` profile, pins, locked-objekts, holders and held-by.

## Impact

- `packages/api`: `services/privacy.ts` (removed), `holders.ts`, `profile.ts`, `list.ts`, `collection.ts`, `owned.ts`, `transfers.ts`, `pins.ts`, `locked-objekts.ts`, `chat/start.ts`, `chat/cards.ts`, `offer/*` and `lib/offer-rules.ts` (the address path only), `routers/profile.ts`, `compare.ts`, `market.ts`, and `schemas/profile.ts`.
- `packages/lib`: `server/user.ts` (nickname display).
- `apps/web`: `edit-cosmo-dialog.tsx`, `profile-guard.tsx`, `profile-hover-card.tsx`, `routes/@{$nickname}/route.tsx`, `profile/trades/trades-view.tsx`, `objekt/drawer/timeline.tsx` and `holders.tsx`, and messages in en, ko and ja.
- `packages/api/AGENTS.md`: the Privacy and Trade and Offer get sources sections.
- `packages/db`: no migration.
