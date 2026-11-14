## MODIFIED Requirements

### Requirement: Hide a post
A signed-in user SHALL be able to hide one of another person's posts through Hide post in that post's ⋯ menu on Browse and For you, without hiding the person. The post SHALL leave the feed at once, and a toast SHALL offer Undo. Their own posts SHALL offer no Hide post. A hide SHALL follow the post through pairing, unpairing and Take off Trade, and SHALL last until the user unhides it, the owner deletes the list it was hidden by, or it comes back (see A hidden post comes back).

#### Scenario: Hide one post
- **WHEN** rin.trades has two posts on Browse and the user activates Hide post on the first
- **THEN** that post leaves rin.trades's row at once, the second post stays and becomes the row's lead post, and a toast offers Undo

#### Scenario: Undo a post hide
- **WHEN** the user hides a post and activates Undo on the toast
- **THEN** the post is listed again in its place

#### Scenario: Own post
- **WHEN** the user opens the ⋯ menu on one of their own posts
- **THEN** it offers no Hide post

#### Scenario: Hidden Buy post is paired
- **WHEN** the user hid rin.trades's Buy post "Looking for", and rin.trades then pairs "Looking for" with their have list "Binary dupes"
- **THEN** the post "Binary dupes · Looking for" is hidden on Browse and For you

#### Scenario: Hidden pair is unpaired
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades then unpairs it
- **THEN** the post "Binary dupes" stays hidden, and the Buy post "Looking for" is listed on Browse

#### Scenario: One half of a hidden pair leaves Trade
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and later only "Looking for" is on Trade, still paired with "Binary dupes"
- **THEN** "Looking for" stays hidden on Browse and For you

#### Scenario: The hidden list is deleted
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", which a hide makes by its have list "Binary dupes", and rin.trades deletes "Binary dupes"
- **THEN** the hide ends, and "Looking for", while on Trade, is listed again on Browse

#### Scenario: The other list is deleted
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades deletes "Looking for"
- **THEN** "Binary dupes" stays hidden

### Requirement: Hidden posts leave matching
A post the user hid SHALL take no part in the user's Trade. Its lists SHALL not count toward the header sentences, list counts, Any, Mutual or Mutual N, and SHALL not be shown on Browse or For you. Browse and For you SHALL leave out exactly the posts whose lists matching leaves out. When every post of a person is hidden, the person's row SHALL leave both feeds. Hiding a post SHALL not hide its owner's other posts, unless the owner pairs one with it, and unhiding the owner SHALL not unhide the post.

#### Scenario: Only the hidden post stops counting
- **WHEN** rin.trades's two posts each match the user's want list, and the user hides one
- **THEN** rin.trades's row counts only the other post's matches, and Mutual and Mutual N count rin.trades by that post alone

#### Scenario: Last post hidden
- **WHEN** the user hides rin.trades's only post
- **THEN** rin.trades's row leaves Browse and For you

#### Scenario: Person hidden and unhidden
- **WHEN** the user hides a post of rin.trades, then hides rin.trades and later unhides them
- **THEN** rin.trades's row returns without the hidden post

#### Scenario: Feed and matching agree after a pair
- **WHEN** the user hid rin.trades's Buy post "Looking for", and rin.trades then pairs it with "Binary dupes", whose entries match the user's want list
- **THEN** the post "Binary dupes · Looking for" is not shown on Browse or For you, and neither list counts toward the user's counts, Any, Mutual or Mutual N

#### Scenario: Feed and matching agree with one half on Trade
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and only "Looking for" is on Trade again, still paired with "Binary dupes"
- **THEN** "Looking for" is neither shown on Browse nor counted in matching, and its ⋯ menu on rin.trades's person page offers Unhide post

### Requirement: Hidden posts list
The Hidden dialog and Account's Hidden page SHALL list the posts the user hid, newest hide first, once each however many of a post's lists the user hid. Each SHALL name the lists paired in the post now, on Trade or off, and its owner as a partner card names them (see Partner identity), link to the post page, and offer Unhide. Unhide SHALL bring the post back to Browse and For you. With no hidden post, the list SHALL say so and say that Hide post is in a post's ⋯ menu.

#### Scenario: Unhide from Account
- **WHEN** the user opens `/account/hidden` and activates Unhide on a hidden post of rin.trades
- **THEN** the post leaves the list, and is listed again on rin.trades's row on Browse

#### Scenario: No hidden posts
- **WHEN** the user has hidden no post and opens `/account/hidden`
- **THEN** the Hidden posts section says no post is hidden and that Hide post is in a post's ⋯ menu

#### Scenario: A hidden post that was paired since
- **WHEN** the user hid rin.trades's Buy post "Looking for", rin.trades then paired it with "Binary dupes", and the user opens `/account/hidden`
- **THEN** the entry is named "Binary dupes · Looking for" by the profile "Binary dupes" is bound to, its link opens that post's page, and Unhide lists the post again on Browse

#### Scenario: Two hides on one post
- **WHEN** the user hid rin.trades's Buy post "Looking for" and their post "Binary dupes", and rin.trades then pairs the two
- **THEN** `/account/hidden` lists "Binary dupes · Looking for" once, and its Unhide lists the post again on Browse

#### Scenario: A hidden post off Trade
- **WHEN** rin.trades takes every list of a post the user hid off Trade
- **THEN** the entry stays in the list, and Unhide removes it

### Requirement: A hidden post comes back
A hidden post SHALL be unhidden, within the time a want-list alert takes, when its owner adds an entry by hand after the hide that matches a list of the user who hid it, in either direction, by the rules a want-list alert pairs lists with. The match SHALL be real when it is read: the offering side can trade a copy, whether or not the wanting side already holds one. The user's alert settings SHALL not change this. The Hidden dialog and Account's Hidden page SHALL say so.

#### Scenario: A new objekt the user wants
- **WHEN** the user hid rin.trades's post, and rin.trades then adds SeoYeon 204Z, which is on the user's want list and which rin.trades holds, to that post's have list
- **THEN** the post is no longer hidden, and is listed again on Browse and For you

#### Scenario: A new want the user has
- **WHEN** the user hid rin.trades's post, and rin.trades then adds Nien 205Z, which is on the user's bound have list and held by the user, to that post's want list
- **THEN** the post is no longer hidden

#### Scenario: Entries from before the hide
- **WHEN** the user hides a post that already holds SeoYeon 204Z, which is on their want list
- **THEN** the post stays hidden

#### Scenario: Nothing that matches
- **WHEN** the owner of a hidden post adds an objekt that is on none of the user's lists
- **THEN** the post stays hidden

#### Scenario: An entry a rule adds
- **WHEN** a rule on the hidden post's want list starts to want a collection the user offers, with nothing added by the owner
- **THEN** the post stays hidden

#### Scenario: Alerts switched off
- **WHEN** the user has want-list alerts off, and the owner of a post they hid adds an objekt on their want list
- **THEN** the post is no longer hidden, and no alert is created

#### Scenario: Already held
- **WHEN** the owner of a hidden post adds an objekt on the user's want list of which the user already holds a copy
- **THEN** the post is no longer hidden, as for an objekt the user does not hold yet

#### Scenario: Not owned yet
- **WHEN** the owner of a hidden post adds an objekt on the user's want list that the owner does not hold, and receives it 3 hours later
- **THEN** the post is unhidden once the owner holds it, within 24 hours of the entry

#### Scenario: An entry on the list the user did not hide
- **WHEN** the user hid rin.trades's Buy post "Looking for", rin.trades then paired it with "Binary dupes", and later adds SeoYeon 204Z, which is on the user's want list and which rin.trades holds, to "Binary dupes"
- **THEN** the post "Binary dupes · Looking for" is no longer hidden, and is listed again on Browse and For you
