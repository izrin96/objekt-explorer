# web-trade-person-pages Specification

## Purpose
Shareable pages for one person on Trade and for one of their posts: the person's Trade row as a page at `/trade/@<handle>`, and one post of it at `/trade/@<handle>/<slug>`, readable signed out and previewed when shared.

## Requirements

### Requirement: Trade handle
Each account with a linked Cosmo profile SHALL have one Trade handle: the Cosmo nickname of its default profile (see `web-cosmo-link`), else that profile's address. An account with no linked profile SHALL have no handle and no page. A handle SHALL resolve only through a profile linked to an account, matched without regard to letter case.

#### Scenario: Nickname handle
- **WHEN** rin.trades's account links profiles "rin.trades" (default) and "rin.alt"
- **THEN** the handle is `rin.trades`, and `/trade/@rin.trades` is the person page

#### Scenario: No nickname
- **WHEN** an account's default profile has no Cosmo nickname
- **THEN** the handle is that profile's address

#### Scenario: Not linked
- **WHEN** a Cosmo nickname belongs to no linked account
- **THEN** `/trade/@<that nickname>` shows a not-found page

### Requirement: Canonical address
A person or post page reached by a nickname or address other than the handle, by a letter case other than the handle's, or by the slug of a post's other list SHALL redirect to the handle and the post's anchor slug. The redirect SHALL replace the history entry.

#### Scenario: Other linked profile
- **WHEN** a visitor opens `/trade/@rin.alt`, a nickname linked to rin.trades's account
- **THEN** the browser is at `/trade/@rin.trades`

#### Scenario: Letter case
- **WHEN** a visitor opens `/trade/@Rin.Trades`
- **THEN** the browser is at `/trade/@rin.trades`

#### Scenario: Want half of a pair
- **WHEN** a visitor opens `/trade/@rin.trades/<want list slug>`, and that want list is paired with have list "spares" in one post
- **THEN** the browser is at `/trade/@rin.trades/<spares slug>`

### Requirement: Person page
`/trade/@<handle>` SHALL show the person's Trade row as Browse draws it (see `web-trade-browse` Trade card), holding every post Browse keeps for them, under a Back to Trade control and with the Trade tabs hidden. Posts the viewer hid SHALL be held and counted as if they were not hidden (see Hidden post on the person and post pages). Counts SHALL be taken as on Browse, against all of a signed-in viewer's lists. The visitor's artist selection and filters SHALL not hide any post. The row SHALL carry no clear control.

#### Scenario: Four posts
- **WHEN** a signed-in viewer opens `/trade/@rin.trades`, and rin.trades has 4 kept posts
- **THEN** the page shows rin.trades's row with all 4 posts and the counts the row would show on Browse

#### Scenario: Artist selection
- **WHEN** a visitor with only ARTMS selected opens the page of someone whose posts hold only tripleS objekts
- **THEN** every post is shown

#### Scenario: Back to Trade
- **WHEN** the viewer activates Back to Trade
- **THEN** Browse opens at `/trade`

### Requirement: Nothing to show
When Browse would not list the person to this viewer (hidden, blocking or blocked, trade-blocked, nothing listed, all idle, all sold out), the person page SHALL show an empty state saying the person has nothing on Trade right now, with Back to Trade, and SHALL not show their row. Posts the viewer hid SHALL not count toward this: a person whose every post the viewer hid SHALL still show their row. On the viewer's own page the empty state SHALL instead be the owner's (see Owner's view).

#### Scenario: Hidden person
- **WHEN** the viewer opens the page of a person they hid
- **THEN** the empty state shows, with Back to Trade, and no row

#### Scenario: Every post hidden
- **WHEN** the viewer hid both of rin.trades's posts, so Browse no longer lists rin.trades, and opens `/trade/@rin.trades`
- **THEN** the page shows rin.trades's row with both posts, each offering Unhide post

#### Scenario: All idle
- **WHEN** a visitor opens the page of someone whose posts are all idle
- **THEN** the empty state shows

#### Scenario: Own page
- **WHEN** rin.trades, whose posts are all idle, opens `/trade/@rin.trades`
- **THEN** the page shows the owner's empty state, not "rin.trades has no posts on Trade right now"

### Requirement: Hidden post on the person and post pages
The person page and the post page SHALL show a post the signed-in viewer hid as they show any other post (see `web-trade-for-you` Hide a post). Its ⋯ menu SHALL offer Unhide post in place of Hide post, and Unhide post SHALL bring it back to Browse and For you. A post the viewer has not hid SHALL offer Hide post there as on Browse.

#### Scenario: Open a hidden post's page
- **WHEN** the viewer hid rin.trades's post "Binary dupes" and opens `/trade/@rin.trades/<its slug>`
- **THEN** the post is shown, and its ⋯ menu offers Unhide post

#### Scenario: Unhide from the person page
- **WHEN** the viewer activates Unhide post on that post on `/trade/@rin.trades`
- **THEN** the post is listed again on rin.trades's row on Browse

### Requirement: Post page
`/trade/@<handle>/<slug>`, where the slug is a post's anchor list (the have or sale list of a pair, else its only list), SHALL show the person's row holding only that post, outlined, and below it "Show N more posts from <name>", which adds the rest in the row's order. The header's counts SHALL still count the whole person. The row's Make offer SHALL open the builder addressed to that post's anchor list, with that post as its matches' post, Message SHALL attach that post's card, and the row menu's Report… SHALL name that post (see `web-moderation` Reports with a Trade post attached).

#### Scenario: One post of three
- **WHEN** a visitor opens `/trade/@rin.trades/<spares slug>`, and rin.trades has 3 kept posts
- **THEN** only the "spares" post shows, outlined, with "Show 2 more posts from rin.trades" below it

#### Scenario: Make offer on the post
- **WHEN** a signed-in viewer activates Make offer on the post page of rin.trades's "spares" post, though another post leads rin.trades's row on Browse
- **THEN** the builder opens addressed to "spares"

#### Scenario: Message on the post
- **WHEN** a signed-in viewer activates Message on that page
- **THEN** the conversation opens with a post card for "spares"

#### Scenario: Report on the post
- **WHEN** a signed-in viewer chooses Report… in the row's ⋯ menu on the post page of rin.trades's "spares" post
- **THEN** the report dialog says the post "spares" goes with the report, and the report names it

### Requirement: Post no longer on Trade
When the slug names no post Browse keeps for that person, whether taken down, idle, sold out, owned by someone else or unknown, the post page SHALL say the post is no longer on Trade above the person's row with all their kept posts, or above the empty state of Nothing to show.

#### Scenario: Taken down
- **WHEN** a visitor opens the link of a post its owner took down, and the owner has 2 other kept posts
- **THEN** the page says the post is no longer on Trade, and shows the owner's row with those 2 posts

### Requirement: Owner's view
The owner SHALL see their own row as on Browse: the "You" tag, no counts, no Make offer or Message, and each post's menu with the owner's actions (see `web-trade-browse` Owner actions on a post). The person page SHALL show Bump among the row's actions; a post page SHALL show Edit post, which opens the post composer for that post and returns to the page, Copy link, Take off Trade, which acts as Take off Trade in Your posts does, and Bump. Bump SHALL act as Your posts' Bump does, disabled and saying when the next bump is allowed while it is not.

When the row would not show (see Nothing to show), the owner SHALL see an empty state that says why and offers the fix, the first that applies: no posts, with New post; a trade block hiding their posts; every post idle, with Bump and a link to Your posts; otherwise, that their posts have nothing left to show, with a link to Your posts.

#### Scenario: Owner opens their post
- **WHEN** rin.trades opens `/trade/@rin.trades/<spares slug>`
- **THEN** the row carries the "You" tag, no counts, Edit post, Copy link, Take off Trade and Bump

#### Scenario: Owner opens their person page
- **WHEN** rin.trades, who bumped an hour ago, opens `/trade/@rin.trades`
- **THEN** the row shows Bump, disabled and saying the next bump is in 23 hours, and each post's menu offers Edit post and Take off Trade

#### Scenario: Every post idle
- **WHEN** rin.trades, whose 2 posts are both idle, opens `/trade/@rin.trades`
- **THEN** the page says their posts are idle and hidden from Browse until they bump, and offers Bump and a link to Your posts; after Bump the row shows both posts

#### Scenario: No posts
- **WHEN** a viewer with no posts opens their own person page
- **THEN** the page says they have no posts on Trade and offers New post

#### Scenario: Trade block
- **WHEN** an owner under a trade block opens their own person page
- **THEN** the page says their account has a trade block, which hides their posts from Trade, and offers no Bump

#### Scenario: Listed but nothing left
- **WHEN** an owner's only listed post is a have list whose every copy has left their profile
- **THEN** the page says their posts have nothing left to show on Trade and links to Your posts

### Requirement: Signed-out view
A visitor without a session SHALL see the row with no counts or rings. Make offer and Message SHALL lead to sign in, returning to the same page.

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/@rin.trades` and activates Make offer
- **THEN** sign in opens, and after signing in the visitor is back on `/trade/@rin.trades`

### Requirement: Share preview
Each page SHALL set, in the server-rendered page, a title, a description, an Open Graph title, description and URL, a canonical link to its handle address on the site's origin, and a `summary` card. They SHALL be built from the handle and the posts' contents, never from the viewer's matches. A person or post that is not found, or a row not shown to this viewer, SHALL give the plain Trade title and no preview.

#### Scenario: Canonical
- **WHEN** the page is opened as `/trade/@Rin.Trades`
- **THEN** its canonical link and Open Graph URL are `/trade/@rin.trades` on the site's origin

#### Scenario: Same for every viewer
- **WHEN** rin.trades, a signed-in visitor whose lists match the post, and a signed-out visitor open the same post page
- **THEN** all three get the same title, description and card

#### Scenario: Hidden person
- **WHEN** a viewer who hid rin.trades opens rin.trades's page
- **THEN** the page has the plain Trade title and no preview

### Requirement: Share preview wording
A person page SHALL be titled "<name> on Trade" and described by its post count and tags. A post page SHALL be titled "<name>'s <tags> post" and described by its sides ("Has 4 · Wants 2"). Neither page SHALL have a card image.

#### Scenario: Shared post
- **WHEN** a link to rin.trades's WTT post with 4 objekts on its have list and 2 on its want list is pasted into Discord
- **THEN** the preview reads "rin.trades's WTT post" and "Has 4 · Wants 2", with no image

#### Scenario: Shared person
- **WHEN** a link to rin.trades's page is shared, and rin.trades has 3 WTT posts and 1 WTS post
- **THEN** the preview reads "rin.trades on Trade" and "4 posts · WTT, WTS"

### Requirement: Old person links
`person=<user id>` on `/trade` or `/trade/for-you`, and `partner=<user id>` on `/trade/for-you`, SHALL redirect to that person's page, dropping every other parameter and replacing the history entry. An id with no account, or an account with no handle, SHALL drop the parameter and keep the rest.

#### Scenario: Old Browse link
- **WHEN** a visitor opens `/trade?person=<rin.trades's id>&type=wtt`
- **THEN** the browser is at `/trade/@rin.trades`

#### Scenario: Old For you link
- **WHEN** a signed-in user opens `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** the browser is at `/trade/@rin.trades`

#### Scenario: Signed out on For you
- **WHEN** a visitor without a session opens `/trade/for-you?person=<rin.trades's id>`
- **THEN** the browser is at `/trade/@rin.trades`, not at sign in

#### Scenario: Unknown id
- **WHEN** a visitor opens `/trade?person=nobody&type=wts`
- **THEN** the browser is at `/trade?type=wts`
