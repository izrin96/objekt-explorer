## MODIFIED Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL hold one post per list its owner put on Trade through the post composer, or through Show on Market and Trade on a sale list (see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list, or a sale list open to swaps, and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The feed SHALL list each person's posts together in one row (see Trade card). The page SHALL be open to signed-out visitors.

Each post SHALL carry one or two tags:
- WTT for a have list, alone or paired with its want list, which is open to swaps (a pair can't be Buying only, see `web-lists`), and for a want list on its own open to swaps (Swaps only, or Swaps or buying);
- WTB for a post whose want list is open to buying: a want list on its own set to Buying only or Swaps or buying, or a pair whose want list is open to buying;
- WTT for a sale list open to swaps, alone or paired with its want list;
- WTS for a sale list.

A post with two tags SHALL show both, WTT first except on a sale post, which shows WTS first, and SHALL be listed under each in the Post type menu. Mutual SHALL count a post that carries WTT as a WTT post.

#### Scenario: Trades-only want list
- **WHEN** a want list on its own is open to swaps only, whether or not it is linked to a have list that is off Trade
- **THEN** its post is tagged WTT only and listed under WTT, not WTB

#### Scenario: Buying-only want list
- **WHEN** a want list on its own is set to Buying only
- **THEN** its post is tagged WTB only and listed under WTB

#### Scenario: Want list open to swaps or buying
- **WHEN** a want list on its own is open to swaps or buying, and its owner is Mutual with the viewer
- **THEN** its post is tagged WTT and WTB, listed under both WTT and WTB, and listed by Mutual, which listed it under neither before this change

#### Scenario: Have list linked to a buying-only want list
- **WHEN** the user tries to pair have list "spares" with want list "store hunt", which is set to Buying only
- **THEN** the pair is refused, so no WTT post holds a want side that matches sale lists only

#### Scenario: Pair saved before the pair rule
- **WHEN** have list "spares" is on Trade and linked to want list "store hunt", which was set to Buying only before a pair had to take swaps, and is on Trade
- **THEN** the feed shows one post tagged WTT and WTB holding both sides, and the Want side matches sale lists only

#### Scenario: Pair that would also pay
- **WHEN** have list "spares" is on Trade and linked to want list "binary hunt", which is open to swaps or buying and on Trade
- **THEN** the feed shows one post tagged WTT and WTB holding both sides, listed under WTT and under WTB, and Mutual lists it as a WTT post

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address, the shortened address when it has none, and, for a list bound to no address, the account's default profile, else the account's display name; see `web-cosmo-link`), with the avatar;
- its tags, and each list's name and description;
- up to 11 objekts per side on a post with two sides, and up to 20 on a post with one side, with the number of further objekts;
- on a WTS post, each objekt's price in the list's currency, or QYOP;
- when the post was last bumped, or last changed if that is later.

Each list in a post SHALL link to its list page.

#### Scenario: Linked pair is one post
- **WHEN** have list "spares" is linked to want list "binary hunt", open to swaps only, and both are on Trade
- **THEN** the feed shows one WTT post holding a Have side from Spares and a Want side from Binary hunt

#### Scenario: Half a pair
- **WHEN** "spares" is on Trade and its linked want list is not
- **THEN** the feed shows a WTT post with only the Have side

#### Scenario: Sale list on Market
- **WHEN** a sale list bound to a Cosmo profile has Show on Market and Trade on
- **THEN** the feed shows it as a WTS post

#### Scenario: Not on Trade
- **WHEN** a have list is in no post
- **THEN** it does not appear on `/trade`, and For you does not match it

#### Scenario: Discoverable before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 3 days before launch
- **THEN** at launch it appears on `/trade` with its time showing that change, ordered as if bumped then

#### Scenario: Long-untouched before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 60 days before launch
- **THEN** at launch it is idle: it is not listed on `/trade` and does not count toward its owner's matches until its owner bumps or changes it

#### Scenario: One side gets more
- **WHEN** a WTS post's sale list holds 30 objekts, and a WTT pair's have and want lists hold 30 each
- **THEN** the WTS post sends 20 objekts and a count of 10 more, and the pair sends 11 per side and a count of 19 more on each

#### Scenario: Want list with no profile
- **WHEN** a want list filed under no profile is on Trade, and its owner's default profile is "rin.alt"
- **THEN** its post is headed "rin.alt", the name the owner's chat partners see

#### Scenario: Sell or swap post
- **WHEN** sale list "binary sale", open to swaps, is on Trade on its own
- **THEN** its post is tagged WTS then WTT, listed under both in the Post type menu, shows prices, and Mutual counts it as a WTT post

#### Scenario: Sale and want pair
- **WHEN** "binary sale", open to swaps, is linked to want list "binary hunt" and both are on Trade
- **THEN** the feed shows one post tagged WTS and WTT holding a Sale side with prices and a Want side

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list, and a sale list open to swaps, count against a want list open to swaps (Swaps only, or Swaps or buying); every sale list counts against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list, and a sale list open to swaps, count for a want list open to swaps; every sale list counts for a want list open to buying.
- The mutual score: what the person and the viewer can swap, the smaller of two swap counts. One is the collections on the person's have lists, and sale lists open to swaps, that are on one of the viewer's want lists open to swaps (Swaps only, or Swaps or buying); the other is the collections on the person's want lists open to swaps that are on one of the viewer's have lists, or sale lists open to swaps, bound to a Cosmo profile and still tradeable by the viewer. A sale list set to Sell only, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above: a sale is not a swap, so a person matched only through such lists is one way. A want list set to buying only never counts toward it either.

The counts show once, in the row's header sentence (see Trade card). Each list in the row SHALL also show its own count, by the same rules, taken on that list alone: on a have or sale list the collections the viewer wants ("14 you want"), on a want list the collections the viewer has ("2 you have"). Matched objekts SHALL be marked with a ring, judged on the list's own objekts. There SHALL be no match chip, no popover of matched lists and no All matches control.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own row, so they can see where a bump put them, with no header sentence and no list counts or rings. For you SHALL never list it. People the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

**Person link.** `person=<user id>` on `/trade` or `/trade/for-you` SHALL list that person's row first, with every one of their kept posts shown, followed by the feed as usual without that person. A `person` the feed would not list (hidden, blocked, nothing listed, or no match on For you) SHALL be ignored. Activating the row's clear control, or going back, SHALL remove the parameter and leave the feed where it was. For a signed-out visitor, `person` SHALL lead Browse with that person's row without counts.

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every person with a listed post is listed, with header sentences, list counts and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps and opens `/trade`
- **THEN** their row is listed at the top of Browse with no header sentence, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a person's want list wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that list or in that person's sentence

#### Scenario: Counts sit on their list
- **WHEN** nuppotoz has want lists "S24 WISHLIST", holding nothing the viewer has, and "WISHLIST", holding 3 collections on the viewer's bound have lists
- **THEN** nuppotoz's row reads "You have 3 they want", the WISHLIST strip reads "3 you have" with those 3 ringed and listed first, and the S24 WISHLIST strip shows no count

#### Scenario: Which lists matched
- **WHEN** a person's want list asks for two collections that are on the viewer's have list "spares"
- **THEN** that want list's strip reads "2 you have" with both ringed, and no popover or control names the viewer's lists

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list holding 1 collection the viewer wants and a separate want list asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** rin.trades's one row reads "You can swap 1", the have list reads "1 you want" and the want list "2 you have"

#### Scenario: A sale list never makes a person mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You have 1 they want", the sale list reads "3 you want", and jinsoul.blue is listed under One way, not Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count, so jinsoul.blue's row reads "You have 1 they want", the sale list shows no count, and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list, set to Sell only, holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is not Mutual through it, whatever that want list is open to; when it is open to buying, the collection counts in rin.trades's "You have N they want"

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's row does not count them, rings none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists, and wants nothing of the viewer's
- **THEN** rin.trades's row reads "They have 2 you want", not 3

#### Scenario: Mutual partner
- **WHEN** the viewer opens `/trade?person=<rin.trades's id>` and rin.trades has 4 listed posts
- **THEN** rin.trades's row is listed first with all 4 posts shown and no "+N more lists", the rest of the feed follows without rin.trades, and clearing it removes `person` from the URL

#### Scenario: Person link to someone hidden
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** the feed lists as if `person` were absent

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Can swap is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** rows are listed with no header sentence, no list counts and no rings, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's row is not listed on Browse or For you for that viewer

#### Scenario: A have list and a want list both ways make a swap
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps) asks for 3 collections on the viewer's bound have list, and rin.trades's sale list, set to Sell only, holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

#### Scenario: A sale list open to swaps makes a swap
- **WHEN** jinsoul.blue's sale list, open to swaps, holds 3 collections on the viewer's want list open to swaps only, and jinsoul.blue's want list (open to swaps) asks for 2 collections on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You can swap 2", the sale list reads "3 you want", and jinsoul.blue is listed under Mutual

### Requirement: Post composer
New post SHALL open a composer in two steps. First the viewer picks what the post is for: Swap (WTT), Sell (WTS) or Buy (WTB). Then they pick its lists:
- Swap: a have list, a want list, or both, and "I'd also pay for what I'm looking for", available only with a want list;
- Sell: one sale list, and "Also open to swaps"; with it ticked, optionally one want list for what the viewer would swap for;
- Buy: one want list.

Post SHALL stay disabled until the kind's lists are picked. Before posting, the composer SHALL show the tags the post will carry and who it matches.

#### Scenario: Swap with both lists
- **WHEN** the viewer picks Swap, have list "spares" and want list "binary hunt", leaves "also pay" off and posts
- **THEN** one WTT post holds both lists, "spares" is linked to "binary hunt", "binary hunt" is open to swaps only, and both are on Trade

#### Scenario: Swap that would also pay
- **WHEN** the viewer picks Swap, want list "binary hunt" and ticks "also pay"
- **THEN** the composer shows WTT and WTB, says sellers with what they look for match them too, and posting saves "binary hunt" open to swaps or buying

#### Scenario: Also pay needs a want list
- **WHEN** the viewer picks Swap and only have list "spares"
- **THEN** "also pay" is disabled and says to pick a want list first

#### Scenario: Buy post
- **WHEN** the viewer picks Buy and want list "store hunt" and posts
- **THEN** "store hunt" is on Trade set to Buying only, and its post is tagged WTB

#### Scenario: Sell post
- **WHEN** the viewer picks Sell and sale list "binary sale" and posts
- **THEN** "binary sale" is on Trade and on Market, tagged WTS

#### Scenario: Nothing picked
- **WHEN** the viewer picks Swap and no list
- **THEN** Post is disabled

#### Scenario: Signed out
- **WHEN** a signed-out visitor activates New post
- **THEN** the browser is at `/login?redirect=/trade`

#### Scenario: Sell, open to swaps
- **WHEN** the viewer picks Sell, sale list "binary sale", ticks "Also open to swaps" and posts
- **THEN** the composer showed WTS and WTT before posting, and "binary sale" is on Trade and on Market, open to swaps

#### Scenario: Sell with a want list
- **WHEN** the viewer also picks want list "binary hunt" and posts
- **THEN** one post holds both lists, "binary sale" is linked to "binary hunt", and "binary hunt" is open to swaps only

#### Scenario: A want list needs swaps
- **WHEN** the viewer picks Sell with "Also open to swaps" off
- **THEN** no want list can be picked, and the composer says to tick "Also open to swaps" first

#### Scenario: Back to Sell only
- **WHEN** the viewer edits that post and unticks "Also open to swaps"
- **THEN** the composer asks to unpair "binary hunt" first, and after posting "binary sale" is Sell only and unlinked

### Requirement: Tag help
The matching help (the ? beside Mutual only) SHALL be tables only, with no bulleted sentences, in four sections: Post tags, What matches your want list, What counts toward Mutual, and Good to know. A yes or no cell SHALL show a mark, with its word for screen readers.

#### Scenario: Post tags
- **WHEN** the viewer opens the matching help
- **THEN** the tag table describes WTT as a Swap post, WTB as a Buy post or a Swap post that would also pay, and WTS as a Sell post, each with what it matches, and notes that a Swap post that would also pay carries WTT and WTB

#### Scenario: Open to grid
- **WHEN** the viewer reads What matches your want list
- **THEN** their have list is marked for Swaps only and Swaps or buying and not for Buying only, their sale list for Swaps or buying and Buying only and not for Swaps only, their sale list open to swaps for all three, and a note says it works the same the other way

#### Scenario: Mutual table
- **WHEN** the viewer reads What counts toward Mutual
- **THEN** a have list against a want list open to swaps is marked yes, a sale list open to swaps against a want list open to swaps is marked yes, a sale list set to Sell only on either side and a want list set to Buying only are marked no, and a note says the score is the smaller of the two sides

#### Scenario: Good to know
- **WHEN** the viewer reads Good to know
- **THEN** labelled rows say that all of a person's lists count together, what Compare with narrows to, that only objekts still owned and transferable count, that hidden and blocked people never show, and that a want list's rule counts like the objekts it covers, once per collection, and shows on a post as one RULE tile with how many of the viewer's it takes, and no bulleted sentences follow
