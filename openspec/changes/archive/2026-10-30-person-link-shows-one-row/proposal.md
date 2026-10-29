# Proposal

## Why

A `?person=` link is how people share their Trade posts (Your posts → Copy link) and how chat post cards and For you partner links open someone. Today it puts that person's row first and then the whole feed, filtered by the *visitor's* artist selection. Two things go wrong: a sharer whose posts sit outside the visitor's artists doesn't show at all, and a person with nothing listable is silently ignored, so the link looks broken. A link that means "look at this person" should show that person and nothing else.

## What Changes

- A `person` link on `/trade` and `/trade/for-you` lists only that person's row, with no feed below it and no further pages. The filters stay.
- Above the row, a banner reads "Showing only *name*'s posts, from a shared link", with how many of their objekts are on the visitor's lists when signed in and above zero. It carries Copy link and Show everyone, and replaces the row's own clear control.
- Under the row, a text-only "More people are on Trade" line leads back to the full feed, as Show everyone does.
- The row ignores the visitor's artist-picker selection, as a `slug` link already does, so a sharer is never filtered out by what the visitor follows. An `artist` parameter written in the link still applies, as do the link's other filters (`type`, member, season and the rest).
- When that person has no row to show (nothing listed, all idle, sold out, hidden by or blocking the visitor, trade-blocked, or no match on For you), the page says so in an empty state with Show everyone, instead of ignoring `person`. The empty state never names the person, so it reveals nothing about a hidden or blocked account.
- Your posts: Copy link (the row's button and each post's item) is also disabled while the viewer is under a trade block, with the reason shown. The row's button shows its reason when disabled, as the post item does. The idle reason line in the post menu takes the muted, top-aligned layout the trade page's ⋯ menu uses.
- **BREAKING** (behaviour, not API): existing person links, including chat post cards already sent, open to one row instead of the row plus the feed.

## Non-goals

- A page or route of its own for a person's posts, or nickname-based `person` values.
- Disabling Copy link for a post whose objekts are all sold out or no longer owned: working that out needs the feed's ownership check, which is too costly for Your posts. Such a link lands on the empty state.
- Changing how For you ranks or counts a person, or what the chat post card looks like.

## Routes

`/trade` (Browse) and `/trade/for-you` with `person`, and the Your posts row on `/trade`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: the Person link in "Matches to the signed-in viewer" becomes one row with an empty state and ignores the artist selection; "Your posts and Post a list" disables Copy link under a trade block and gives the row button's reason.

## Impact

- `packages/api`: `trade.people` (`services/trade-feed/people.ts`) returns only the led row, with no cursor, when `person` is set; `trade.myPosts` reports whether the viewer is trade-blocked.
- `apps/web`: `toBrowseInput` (`features/trade/browse-search.ts`) drops the artist selection when `person` is set; Browse and For you (`browse-view.tsx`) render the one row or the new empty state; `my-posts.tsx` disable rules and reason; new Paraglide strings in en, ko and ja.