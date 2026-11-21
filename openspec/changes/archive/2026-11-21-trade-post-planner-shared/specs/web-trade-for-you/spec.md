## MODIFIED Requirements

### Requirement: Hide a post
A signed-in user SHALL be able to hide one of another person's posts through Hide post in that post's ⋯ menu on Browse and For you, without hiding the person. The post SHALL leave the feed at once, and a toast SHALL offer Undo. Their own posts SHALL offer no Hide post. A hide SHALL follow the post through pairing, unpairing, editing and Take off Trade:

- when two posts become one, it SHALL hide the post they form;
- when the owner edits the post, it SHALL stay with the edited post, whichever of its lists the edit swaps or drops, and a list the edit takes out SHALL not be hidden when it is posted again on its own;
- when the post's want list is paired with another list, it SHALL stay with the post of the have or sale list, and the want list's new post SHALL not be hidden;
- when the post's have or sale list moves into another post, it SHALL go with that list;
- when the post's have or sale list is deleted while its want list is on Trade, it SHALL stay with the want list's post.

A hide SHALL last until the user unhides it, the post ends, or it comes back (see A hidden post comes back). A post ends when every list in it is deleted, or when its have or sale list is deleted while its want list is off Trade. A list posted again after its hidden post ended SHALL not be hidden.

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
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades edits it to take "Looking for" out, then posts "Looking for" as a Buy post of its own
- **THEN** the post "Binary dupes" stays hidden, and the Buy post "Looking for" is listed on Browse

#### Scenario: Hidden Buy post is paired, then unpaired
- **WHEN** the user hid rin.trades's Buy post "Looking for", rin.trades paired it with "Binary dupes", and later edits that post to take "Looking for" out and posts "Looking for" as a Buy post again
- **THEN** the post "Binary dupes" stays hidden, "Looking for" is listed on Browse, and `/account/hidden` names "Binary dupes"

#### Scenario: Hidden post joins another post
- **WHEN** the user hid rin.trades's post "Binary dupes", rin.trades takes it off Trade, and then edits their Buy post "Looking for" on Browse into a Swap post with "Binary dupes"
- **THEN** the post "Binary dupes · Looking for" is hidden on Browse and For you, and `/account/hidden` lists it once

#### Scenario: Have list of a hidden post moves to another post
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades's later edits leave "Looking for" a post of its own on Trade and "Binary dupes" paired with their want list "Wishlist"
- **THEN** the post "Binary dupes · Wishlist" is hidden, and "Looking for" is listed on Browse

#### Scenario: Edit post swaps the have list of a hidden post
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades edits that post to swap "Binary dupes" for their have list "Extras"
- **THEN** the post "Extras · Looking for" stays hidden on Browse and For you, and `/account/hidden` lists it once

#### Scenario: Edit post drops the have list of a hidden post
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades edits that post into a Buy post of "Looking for" alone
- **THEN** the Buy post "Looking for" stays hidden on Browse and For you, and "Binary dupes" is not hidden when rin.trades posts it again on its own

#### Scenario: The want list is paired elsewhere
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades creates have list "Extras" paired with "Looking for"
- **THEN** the post "Binary dupes" stays hidden, and the post "Extras · Looking for" is listed on Browse once on Trade

#### Scenario: A list taken out by an edit is posted again
- **WHEN** rin.trades swapped "Binary dupes" out of a post the user hid, and later posts "Binary dupes" on its own
- **THEN** the post "Binary dupes" is listed on Browse with Hide post in its menu

#### Scenario: One half of a hidden pair leaves Trade
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and later only "Looking for" is on Trade, still paired with "Binary dupes"
- **THEN** "Looking for" stays hidden on Browse and For you

#### Scenario: The hidden list is deleted
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", "Looking for" is on Trade, and rin.trades deletes "Binary dupes"
- **THEN** the Buy post "Looking for" stays hidden on Browse and For you, and `/account/hidden` names it "Looking for"

#### Scenario: The have list is deleted with the want list off Trade
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", "Looking for" is off Trade, rin.trades deletes "Binary dupes", and later posts "Looking for" as a Buy post
- **THEN** the hide ends, it leaves `/account/hidden`, and "Looking for" is listed on Browse

#### Scenario: The other list is deleted
- **WHEN** the user hid rin.trades's post "Binary dupes · Looking for", and rin.trades deletes "Looking for"
- **THEN** "Binary dupes" stays hidden
