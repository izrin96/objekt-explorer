## Purpose

Shareable pages for one person on Trade and for one of their posts: the person's Trade row as a page at `/trade/@<handle>`, and one post of it at `/trade/@<handle>/<slug>`, readable signed out and previewed when shared.

## ADDED Requirements

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
`/trade/@<handle>` SHALL show the person's Trade row as Browse draws it (see `web-trade-browse` Trade card), holding every post Browse keeps for them, under a Back to Trade control and with the Trade tabs hidden. Counts SHALL be taken as on Browse, against all of a signed-in viewer's lists. The visitor's artist selection and filters SHALL not hide any post. The row SHALL carry no clear control.

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
When Browse would not list the person to this viewer (hidden, blocking or blocked, trade-blocked, nothing listed, all idle, all sold out), the person page SHALL show an empty state saying the person has nothing on Trade right now, with Back to Trade, and SHALL not show their row.

#### Scenario: Hidden person
- **WHEN** the viewer opens the page of a person they hid
- **THEN** the empty state shows, with Back to Trade, and no row

#### Scenario: All idle
- **WHEN** a visitor opens the page of someone whose posts are all idle
- **THEN** the empty state shows

### Requirement: Post page
`/trade/@<handle>/<slug>`, where the slug is a post's anchor list (the have or sale list of a pair, else its only list), SHALL show the person's row holding only that post, outlined, and below it "Show N more posts from <name>", which adds the rest in the row's order. The header's counts SHALL still count the whole person. The row's Make offer SHALL open the builder addressed to that post's anchor list, with that post as its matches' post, and Message SHALL attach that post's card.

#### Scenario: One post of three
- **WHEN** a visitor opens `/trade/@rin.trades/<spares slug>`, and rin.trades has 3 kept posts
- **THEN** only the "spares" post shows, outlined, with "Show 2 more posts from rin.trades" below it

#### Scenario: Make offer on the post
- **WHEN** a signed-in viewer activates Make offer on the post page of rin.trades's "spares" post, though another post leads rin.trades's row on Browse
- **THEN** the builder opens addressed to "spares"

#### Scenario: Message on the post
- **WHEN** a signed-in viewer activates Message on that page
- **THEN** the conversation opens with a post card for "spares"

### Requirement: Post no longer on Trade
When the slug names no post Browse keeps for that person, whether taken down, idle, sold out, owned by someone else or unknown, the post page SHALL say the post is no longer on Trade above the person's row with all their kept posts, or above the empty state of Nothing to show.

#### Scenario: Taken down
- **WHEN** a visitor opens the link of a post its owner took down, and the owner has 2 other kept posts
- **THEN** the page says the post is no longer on Trade, and shows the owner's row with those 2 posts

### Requirement: Owner's view
The owner SHALL see their own row as on Browse: the "You" tag, no counts, no Make offer or Message. On a post page they SHALL also see Edit post, which opens the post composer for that post and returns to the page, and Take down, which acts as Take down in Your posts does.

#### Scenario: Owner opens their post
- **WHEN** rin.trades opens `/trade/@rin.trades/<spares slug>`
- **THEN** the row carries the "You" tag, no counts, Copy link, Edit post and Take down

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
A person page SHALL be titled "<name> on Trade" and described by its post count and tags. A post page SHALL be titled "<name>'s <tags> post" and described by its sides ("Has 4 · Wants 2"), with the first objekt of its offering side, in the list's own order, as the card image, at an absolute URL. A post with nothing to offer SHALL have no card image.

#### Scenario: Shared post
- **WHEN** a link to rin.trades's WTT post with 4 objekts on its have list and 2 on its want list is pasted into Discord
- **THEN** the preview reads "rin.trades's WTT post", "Has 4 · Wants 2", with the first objekt of the have list as its image

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
