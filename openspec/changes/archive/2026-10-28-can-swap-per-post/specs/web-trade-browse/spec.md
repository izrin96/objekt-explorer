## MODIFIED Requirements

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list, and a sale list open to swaps, count against a want list open to swaps (Swaps only, or Swaps or buying); every sale list counts against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list, and a sale list open to swaps, count for a want list open to swaps; every sale list counts for a want list open to buying.
- The mutual score: what the person and the viewer can swap within one post on each side. A post here is a linked pair: a have list, or a sale list open to swaps, and the want list linked to it, posted or not on the viewer's side. For each pairing of one of the viewer's posts with one of the person's posts there are two swap counts: the collections on the person's post's have list, or sale list open to swaps, that are on the viewer's post's want list when it is open to swaps (Swaps only, or Swaps or buying); and the collections on the person's post's want list, when it is open to swaps, that are on the viewer's post's have list, or sale list open to swaps, bound to a Cosmo profile and still tradeable by the viewer. A pairing scores the smaller of the two, and the person's mutual score is the highest score of any pairing. A list with no link, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above. A sale list set to Sell only, the person's or the viewer's, SHALL never count toward the mutual score either: a sale is not a swap, so a person matched only through such lists is one way. A want list set to buying only never counts toward it.

The counts show once, in the row's header sentence (see Trade card). Each list in the row SHALL also show its own count, by the same rules, taken on that list alone: on a have or sale list the collections the viewer wants ("14 you want"), on a want list the collections the viewer has ("2 you have"). Matched objekts SHALL be marked with a ring, judged on the list's own objekts. There SHALL be no match chip, no popover of matched lists and no All matches control.

A person with both counts above zero and a mutual score of zero SHALL read as one way, with no Can swap mark, when that is only because the swaps cross posts or run through lists with no link; "No swap · buy or sell" SHALL stay for a person whose both-way matches run only through sale lists set to Sell only or want lists set to buying only.

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
- **WHEN** rin.trades has a have list holding 1 collection the viewer wants and a separate want list, not linked to it, asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** rin.trades's row reads "They have 1 you want" and "You have 2 they want" with no Can swap mark, the have list reads "1 you want", the want list "2 you have", and rin.trades is listed under One way

#### Scenario: Swaps across the viewer's posts
- **WHEN** the viewer's post P1 pairs have list "jiwoo spares" with want list "doubles hunt", their post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", and mina.k's post holds 2 collections on "doubles hunt" and wants 1 collection on "yooyeon spares"
- **THEN** mina.k's row reads "They have 2 you want" and "You have 1 they want" with no Can swap mark, and mina.k is listed under One way, not Can swap

#### Scenario: A rule inside one post
- **WHEN** the viewer's post P1 pairs "jiwoo spares" with "doubles hunt", whose rule wants every Double, and rae.s's post holds a Double and wants a collection on "jiwoo spares"
- **THEN** rae.s's row reads "You can swap 1", and rae.s is listed under Can swap

#### Scenario: The viewer's unlinked want list
- **WHEN** the viewer's want list "wishlist" has no link, sora.p's post holds 1 collection on "wishlist" and wants 1 collection on the viewer's have list "jiwoo spares", whose post pairs it with "doubles hunt", which wants nothing sora.p has
- **THEN** sora.p's row reads "They have 1 you want" and "You have 1 they want" with no Can swap mark, and sora.p is listed under One way

#### Scenario: The person's posts are counted one at a time
- **WHEN** the viewer's single post pairs "spares" with "binary hunt", and rin.trades has two posts: the first holds 2 collections on "binary hunt" and wants nothing of the viewer's, the second holds nothing the viewer wants and wants 1 collection on "spares"
- **THEN** rin.trades has no Can swap mark and is listed under One way

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
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps), linked to that have list, asks for 3 collections on the viewer's bound have list, which is linked to that want list, and rin.trades's sale list, set to Sell only, holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

#### Scenario: A sale list open to swaps makes a swap
- **WHEN** jinsoul.blue's sale list, open to swaps, holds 3 collections on the viewer's want list open to swaps only, and jinsoul.blue's want list (open to swaps), linked to that sale list, asks for 2 collections on the viewer's bound have list, which is linked to that want list
- **THEN** jinsoul.blue's row reads "You can swap 2", the sale list reads "3 you want", and jinsoul.blue is listed under Mutual

### Requirement: Tag help
The matching help (the ? beside Mutual only) SHALL be tables only, with no bulleted sentences, in four sections: Post tags, What matches your want list, What counts toward Mutual, and Good to know. A yes or no cell SHALL show a mark, with its word for screen readers.

#### Scenario: Post tags
- **WHEN** the viewer opens the matching help
- **THEN** the tag table describes WTT as a Swap post, WTB as a Buy post or a Swap or Sell post that would also pay, and WTS as a Sell post, each with what it matches, and notes that a Swap post that would also pay carries WTT and WTB

#### Scenario: Open to grid
- **WHEN** the viewer reads What matches your want list
- **THEN** their have list is marked for Swaps only and Swaps or buying and not for Buying only, their sale list for Swaps or buying and Buying only and not for Swaps only, their sale list open to swaps for all three, and a note says it works the same the other way

#### Scenario: Mutual table
- **WHEN** the viewer reads What counts toward Mutual
- **THEN** a have list against the want list linked to it, open to swaps, is marked yes, a sale list open to swaps against the want list linked to it, open to swaps, is marked yes, have and want lists on different posts or with no link are marked no, a sale list set to Sell only on either side and a want list set to Buying only are marked no, and a note says the score is the smaller of the two sides

#### Scenario: Good to know
- **WHEN** the viewer reads Good to know
- **THEN** labelled rows say that a post is a have or sale list and the want list linked to it, that all of a person's lists count toward one-way matches while Can swap counts inside one post of each person, what Compare with narrows to, that only objekts still owned and transferable count, that hidden and blocked people never show, and that a want list's rule counts like the objekts it covers, once per collection, and shows on a post as one RULE tile with how many of the viewer's it takes, and no bulleted sentences follow
