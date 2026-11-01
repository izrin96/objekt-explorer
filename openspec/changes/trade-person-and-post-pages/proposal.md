## Why

A Trade post has no page, and a person has only a feed filter, `/trade?person=<user id>`: an opaque id that opens a mode of the feed and can only name a whole person. People share trades on Discord and X, so a link should say who it is. The user chose variant B of a prototype (2026-11-01): the feed's row, as a page.

## What Changes

- **Person page, `/trade/@<handle>`.** It shows the person's Trade row as Browse draws it, with every kept post, under "Back to Trade". Counts are Browse's; the artist selection is ignored.
  - The handle is the account's default Cosmo profile: its nickname, else its address. Any other linked nickname or address, and any other letter case, redirects to it.
- **Post page, `/trade/@<handle>/<slug>`.** The slug is the post's anchor list. The page shows the row holding only that post, outlined, with "Show N more posts from <name>" below it. Make offer and Message address that post.
  - The other list's slug in a pair redirects to the anchor's slug.
  - A slug that names no kept post of that person shows the row with a notice that the post is no longer on Trade.
- **Who sees what.** The owner sees their own row, plus Edit post and Take down on a post page. A signed-out visitor sees no counts, and Make offer and Message lead to sign in and back.
- **Sharing.** Each page sets a title, description, canonical link and `summary` card; a post's card image is the first objekt it offers.
- **Copy link** copies the person page from Your posts and the row's ⋯ menu. It comes back per post, copying the post page. An account with no linked Cosmo profile has no page, so its Copy link is disabled and says why.
- **Old links redirect. BREAKING for the feed mode.**
  - `person=<id>` on `/trade` and `/trade/for-you`, and For you's older `partner=<id>`, go to the person page and drop their filters.
  - An unknown id, or an account with no handle, drops the parameter and stays on the feed.
  - The shared-link banner and the one-row feed mode go.
- The chat post card's link, for the sender, opens the post page.

Routes: `/trade/@<handle>`, `/trade/@<handle>/<slug>` (new); `/trade`, `/trade/for-you` (redirect `person`, `partner`).

## Non-goals

- The Make offer page (the next change); Make offer still opens the builder dialog.
- Filters, Compare with or Mutual only on the person page.
- A generated share image.
- A post id other than the anchor's slug: an edit that changes the anchor changes the address.
- Any change to the `/@<nickname>` profile pages.

## Depends on

`trade-ratio`, then `trade-post-page` (ratio chips; Edit post opens `/trade/new?edit=`). Neither modifies a requirement this one does.

## Capabilities

### New Capabilities

- `web-trade-person-pages`: the person and post pages, the handle and its redirects, who sees what, share metadata, and old `person` links.

### Modified Capabilities

- `web-trade-browse`: the Person link leaves Matches to the signed-in viewer. Copy link on Your posts and the Trade card points at the pages, and comes back per post.
- `web-trade-for-you`: the person-link scenarios, and `partner` in Old For you address.
- `web-chat`: the post card's link for the sender.

## Impact

- **API:** a pure `tradeHandle`; `handle` on `trade.people` rows and on a post card's owner; a new read, `trade.person`, from a handle or user id to `{ userId, handle }`.
- **Web:** two routes under `trade/@{$handle}`; a focused post in `PersonRow`; the person-link view goes; redirects in the Trade loaders; Copy link builds page URLs; `og:title`, `og:url` and canonical in `generateMetadata`; strings in en, ko and ja.
- **Database:** none.
