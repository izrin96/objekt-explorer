## MODIFIED Requirements

### Requirement: The post an offer is on
An offer SHALL store its post: the Offer on choice or the post it started from, else the one list its asks fit. An offer that asks for nothing new SHALL be on the post under Offer on too, and an offer that names a Buy post and asks for nothing new SHALL be on that Buy post, for a partner with or without a have or sale list on Trade. A counter that asks only for objekts the recipient offered is on no post. An offer to a partner with no have or sale list on Trade that names no Buy post or asks for something, one from a client that named no post and asks for nothing new, and one sent across posts before every offer had to ask from one, are on no post.

After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people, naming the post as it is now: when its owner later edits the post, swapping or dropping any of its lists, or pairs a Buy post with a have list, the line SHALL name the list that leads the post now. When the post no longer exists but the list the offer was sent on still does, the line SHALL name that list. An offer on no post SHALL show no "Offer on" line and no other mark about posts, and an offer whose post and list are both deleted later SHALL drop it.

#### Scenario: Both sides see it
- **WHEN** an offer on "doubles" is sent
- **THEN** both the sender's and rin.trades's card in their conversation read "Offer on doubles"

#### Scenario: Gives only
- **WHEN** an offer to rin.trades with Offer on "doubles" gives objekts for a top-up and asks for nothing
- **THEN** both cards read "Offer on doubles"

#### Scenario: Gives only from a Buy post
- **WHEN** an offer with Offer on rin.trades's Buy post "looking for" gives objekts and asks for nothing
- **THEN** both cards read "Offer on looking for"

#### Scenario: Buy post named, with an ask
- **WHEN** a request names the Buy post "looking for" and asks for one objekt on "doubles"
- **THEN** both cards read "Offer on doubles"

#### Scenario: Gives only from a Buy post of a partner with no lists
- **WHEN** rin.trades has no have or sale list on Trade, and an offer started from their Buy post "looking for" gives objekts and asks for nothing
- **THEN** both cards read "Offer on looking for"

#### Scenario: Counter asking for nothing new
- **WHEN** the user counters rin.trades's offer, keeping only objekts rin.trades offered under You get
- **THEN** neither card reads "Offer on", whatever Offer on read in the builder

#### Scenario: Gives only from an older tab
- **WHEN** a tab loaded before every offer had to ask from one post sends an offer that asks for nothing and names no post
- **THEN** neither card reads "Offer on", and its gives are checked against every want list on Trade

#### Scenario: Partner with no lists
- **WHEN** a user asks rin.trades, who has no have or sale list on Trade and lets people ask for anything they hold, for an objekt from their collection
- **THEN** neither card reads "Offer on"

#### Scenario: Post edited
- **WHEN** an offer on rin.trades's post pairing "doubles" with the want list "hunting" was sent, and rin.trades then edits that post to swap "doubles" for the have list "spares"
- **THEN** both cards read "Offer on spares", and the offer's items still name the lists they came from

#### Scenario: Buy post paired
- **WHEN** an offer on rin.trades's Buy post "looking for" was sent, and rin.trades then pairs the have list "doubles" with it
- **THEN** both cards read "Offer on doubles"

#### Scenario: Lead deleted, post kept
- **WHEN** an offer on rin.trades's post pairing "doubles" with the want list "hunting", both on Trade, was sent, and rin.trades then deletes "doubles"
- **THEN** both cards read "Offer on hunting", the Buy post the post became

#### Scenario: Post gone, list kept
- **WHEN** an offer on "doubles" was sent, and the post ends while "doubles" still exists
- **THEN** both cards read "Offer on doubles"

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "doubles", posted alone, after the offer was sent
- **THEN** neither card reads "Offer on"

#### Scenario: Across posts
- **WHEN** an offer to rin.trades asking from "doubles" and "spares" was sent before every offer had to ask from one post
- **THEN** neither card reads "Offer on" or names rin.trades's posts, and its items, Accept, Decline and Counter are as on any offer
