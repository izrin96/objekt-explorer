# web-trade-browse Specification

## Purpose
The public Trade Browse feed on `apps/web` at `/trade`: posts by people who put their have, want or sale lists on Trade, kept fresh by Bump and current ownership, with matches to the signed-in viewer marked.

## Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned Show on Trade on. A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list;
- WTB for a want list on its own;
- WTS for a sale list.

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address unless hidden, otherwise the account's display name), with the avatar;
- the tag, and each list's name and description;
- up to 8 objekts per side, with the number of further objekts;
- on a WTS post, each objekt's price in the list's currency, or QYOP;
- when the post was last bumped, or last changed if that is later.

Each list in a post SHALL link to its list page.

#### Scenario: Linked pair is one post
- **WHEN** have list "spares" is linked to want list "binary hunt" and both are on Trade
- **THEN** the feed shows one WTT post holding a Have side from Spares and a Want side from Binary hunt

#### Scenario: Half a pair
- **WHEN** "spares" is on Trade and its linked want list is not
- **THEN** the feed shows a WTT post with only the Have side

#### Scenario: Not on Trade
- **WHEN** a discoverable have list has Show on Trade off
- **THEN** it does not appear on `/trade`, and For you still matches it

### Requirement: Only what is still owned
A have or sale entry SHALL be left out of a post when its owner can no longer trade it, by the same rule For you uses:
- an entry for a specific objekt is left out unless one of the owner's linked Cosmo addresses holds it and it is transferable;
- an entry for a collection is left out unless one of those addresses holds a transferable copy.

The side's further-objekts count SHALL exclude entries left out this way. A post left with no entries on any side SHALL not be listed.

#### Scenario: Sold objekt
- **WHEN** a WTS post's sale list still lists an objekt that the owner's addresses no longer hold
- **THEN** that objekt is not shown and not counted in the post

#### Scenario: Nothing left
- **WHEN** every entry of a have-only post is no longer owned
- **THEN** the post is not listed

### Requirement: Order and idle posts
Posts SHALL be ordered by their last bump, newest first. Turning Show on Trade on SHALL count as a bump, unless the post was bumped in the last 24 hours, so neither switching it off and on nor posting the second list of a pair skips the bump limit. Editing a list or its entries SHALL not move its post.

A post SHALL be idle when 30 days have passed since its last bump and since the last change to any of its lists or their entries. An idle post SHALL not be listed until it is bumped or changed. The feed SHALL load more posts as the viewer scrolls, 24 at a time.

#### Scenario: Edit does not jump the queue
- **WHEN** an owner adds an entry to a list on Trade that was bumped 3 days ago
- **THEN** the post keeps its place, and its time shows the change

#### Scenario: Idle post drops out
- **WHEN** a post was last bumped 31 days ago and none of its lists changed since
- **THEN** it is not listed on `/trade`

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Type: All, WTT, WTB or WTS (`type`). All is the default.
- The shared collection filters used by Activity (artist, member, season, class, online/offline, collection number), under the same URL names: keep posts with at least one shown objekt from a matching collection.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: From the objekt drawer
- **WHEN** the viewer opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** only posts with SeoYeon 204Z on a have, want or sale side are listed, and a removable chip names the collection

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each post SHALL show:
- how many collections on its want side are on one of the viewer's have lists and still tradeable by the viewer, by the ownership rule above;
- how many collections on its have or sale side are on one of the viewer's want lists.

Those objekts SHALL be marked with a ring. The counts SHALL open a popover naming the viewer's lists they came from: the have lists for the first count, the want lists for the second, each linking to its list.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, as For you does (see `web-trade-for-you`), so an objekt the viewer keeps off their have lists never counts as offered. Browse SHALL offer no Match filter: narrowing to matches is For you's job. A post whose owner is a Mutual only partner in the viewer's For you SHALL instead carry a "Mutual match · See in For you" link to `/trade/for-you?match=mutual&partner=<their id>`. The link SHALL show only for a partner For you lists under Mutual only.

The viewer's own posts SHALL not be listed in the feed. Posts by partners the viewer hid in For you SHALL also be left out.

#### Scenario: Default
- **WHEN** a signed-in viewer opens `/trade` with no parameters
- **THEN** posts of every type are listed with their counts and rings, and there is no Match control

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post wants two collections that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Mutual partner
- **WHEN** rin.trades is listed under Mutual only in the viewer's For you
- **THEN** each of rin.trades's posts links to For you's Mutual only view with rin.trades's row open

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the parameter is ignored and every post is listed

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match counts, no rings and no For you links

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades in For you
- **THEN** rin.trades's posts are not listed for that viewer

### Requirement: Bump
The owner of a post on Trade SHALL be able to bump it once every 24 hours. A bump moves the post to the top of the feed, and brings back an idle post. Bumping a paired post SHALL bump both of its lists. A bump within 24 hours of the post's last bump SHALL be refused, and the control SHALL show when the next bump is allowed. Only the owner SHALL be able to bump.

#### Scenario: Bump moves the post up
- **WHEN** the owner bumps a post last bumped 26 hours ago
- **THEN** other viewers see it first on `/trade` on their next load, and the Bump control shows the next bump in 24 hours

#### Scenario: Too soon
- **WHEN** the owner tries to bump a post bumped 3 hours ago
- **THEN** the bump is refused and the post keeps its place

#### Scenario: Off and on again
- **WHEN** the owner turns Show on Trade off and back on for a list bumped 3 hours ago
- **THEN** the post keeps the bump time from 3 hours ago

#### Scenario: Second half of a pair
- **WHEN** have list "spares" is on Trade, bumped 3 hours ago, and the owner turns Show on Trade on for its linked want list
- **THEN** the paired post keeps the bump time from 3 hours ago

### Requirement: Your posts and Post a list
A signed-in viewer's own posts SHALL be summarised above the feed. Each entry SHALL show:
- the lists in the post;
- whether the post is listed or idle;
- when it was last bumped;
- a Bump control.

A Post a list control SHALL open a dialog listing the viewer's have, want and sale lists, each with a Show on Trade switch that saves at once.

A have or sale list not filed under a Cosmo profile cannot be discoverable, so its switch SHALL be disabled and say why. A signed-out visitor activating Post a list SHALL be sent to `/login?redirect=/trade`.

#### Scenario: Post from the dialog
- **WHEN** the viewer turns Show on Trade on for want list "binary hunt" in the dialog
- **THEN** the list becomes discoverable and on Trade, and appears under Your posts as bumped just now

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** its switch in the dialog is disabled with the reason shown

### Requirement: Trade tabs
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar with Browse, For you and My trades, marking the current one. For a signed-out visitor, For you and My trades SHALL lead to `/login?redirect=` with their path.

#### Scenario: Switch tabs
- **WHEN** a signed-in user on `/trade` activates For you
- **THEN** the browser is at `/trade/for-you` and For you is marked current

#### Scenario: My trades signed out
- **WHEN** a signed-out visitor activates My trades
- **THEN** the browser is at `/login?redirect=/trade/mine`

### Requirement: Freshness
Show on Trade changes and bumps SHALL show on every viewer's next load of `/trade`. Changes to entries SHALL appear within 1 minute.

#### Scenario: Someone else posts
- **WHEN** another user turns Show on Trade on for a list
- **THEN** a viewer reloading `/trade` sees the post

#### Scenario: Entry added
- **WHEN** an owner adds an objekt to a list on Trade
- **THEN** viewers see it in the post within 1 minute

### Requirement: Message a post's owner
Each post not owned by the viewer SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the owner, adding a card for the post's list. A post whose owner doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address activates Message on rin.trades's WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a card for the post's have list

### Requirement: Blocks and trade blocks
The feed SHALL leave out, for each viewer:
- posts by accounts the viewer blocked;
- posts by accounts that blocked the viewer;
- posts by any account under an active trade block or ban.

The drawer's On Trade counts SHALL leave out trade-blocked and banned accounts. Each post not owned by the viewer SHALL offer Block and Report… in its menu.

#### Scenario: Trade-blocked owner
- **WHEN** rin.trades is under a trade block
- **THEN** no viewer sees rin.trades's posts on `/trade`

### Requirement: Make offer on a post
Each post that shows Message SHALL also offer Make offer. It opens the offer builder for the post's owner, with the post's list available on the You get side.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's post
- **THEN** the builder opens addressed to rin.trades, listing that post's have entries under You get

### Requirement: Owner reputation on posts
Each post SHALL show its owner's reputation line (see `web-verified-trades`) beside the owner's name.

#### Scenario: Post byline
- **WHEN** a viewer sees nakyoung.cards's post
- **THEN** the byline shows nakyoung.cards's verified count and positive share
