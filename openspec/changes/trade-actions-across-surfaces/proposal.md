# Proposal

## Why

An audit of Browse, For you and the person and post pages found actions present on one surface and missing on the next. Message always attaches the lead post's card. Make offer disappears without saying why. The owner's Edit, Take off and Bump live only in Your posts. Only Copy link and chat cards lead into the person and post pages.

## What Changes

1. **Message about one post.** Each non-own post's ⋯ menu gains Message about this post. It attaches that post's card, carrying the match when the post counts one, and is left out under "Not taking messages".
2. **Make offer with no handle.** For a person with no linked Cosmo profile, the row's Make offer and each post's Make offer on this post show disabled, with the reason, instead of disappearing.
3. **Owner actions everywhere.** The owner's post menu gains Edit post and Take off Trade on every surface. The owner's person and post pages show Bump. On their own person page, an owner whose posts don't show gets an empty state that says why and offers the fix: New post, Bump or Your posts.
4. **Links into person and post pages.**
   - Your posts entries and each post's menu gain View post, and a row's ⋯ menu gains View Trade page.
   - The On Trade badge links to the list's post page when the list has a profile.
   - The name in a Trade row keeps linking to the profile.
5. **Offer from one objekt.** Opened from a have or sale strip of someone else's post, the objekt view offers Make offer for this objekt. The builder resolves that objekt to a copy the sender can ask for.
6. **"+N" sheet actions.** The sheet's footer gains Message and Make offer on this post, for the same targets as the post menu.

## Non-goals

- Composer bulk select and rule editing; reports naming the post; For you's "can't match" prompts; the tab title.
- An offer page for a person with no linked Cosmo profile.
- Any change to the objekt drawer's own files.
- Starting an offer from a want-strip objekt. It needs the sender's picks in the URL, which is forbidden.
- Rewording Copy link's reason on other people's rows, which speaks to the owner.

## Routes

`/trade`, `/trade/for-you`, `/trade/@{handle}`, `/trade/@{handle}/$slug`, `/trade/@{handle}/offer`, `/list/$slug`, `/list` and a profile's Lists tab.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: the Trade card's row menu, post menu, actions and "+N" footer; Message a post's owner; Make offer on a post; Post menu; Where Make offer on one post shows; Your posts. Added: Owner actions on a post, and Make offer for one objekt of a post.
- `web-trade-person-pages`: Nothing to show and Owner's view (Bump, the owner's empty state, the Take off Trade wording).
- `web-trade-offers`: Offer page, Offer page address and When no matches are added. A new requirement for starting from one objekt of a post.
- `web-lists`: the On Trade badge links to the list's post page.

`web-trade-for-you` gets no delta. Its Message a partner and Make offer to a partner requirements defer to `web-trade-browse`, so they change with it.

## Impact

- The work is in `apps/web` only, with no API, schema, cache or database change. The copy is resolved from the theirs candidates that the builder already loads.
- It touches `features/trade` (post, row, sheet, Your posts, person page, Browse view), `features/offers/builder` (`draft.ts`, `form.tsx`), `features/list` (header, rows, `list-link.ts`), en/ja/ko messages and `apps/web/AGENTS.md`.
- It leaves `features/objekt/drawer/*` untouched: the existing `note` slot carries the new line.
