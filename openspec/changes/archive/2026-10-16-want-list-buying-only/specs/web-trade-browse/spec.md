## MODIFIED Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned its Show on Trade switch on (Show on Market on a sale list; see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list, whatever that want list's Open to choice, and for a want list on its own open to swaps only;
- WTB for a want list on its own open to swaps or buying, or set to buying only;
- WTS for a sale list.

#### Scenario: Trades-only want list
- **WHEN** a want list on its own is open to swaps only, whether or not it is linked to a have list that is off Trade
- **THEN** its post is tagged WTT and listed under WTT, not WTB

#### Scenario: Buying-only want list
- **WHEN** a want list on its own is set to Buying only
- **THEN** its post is tagged WTB and listed under WTB

#### Scenario: Have list linked to a buying-only want list
- **WHEN** have list "spares" is on Trade and linked to want list "store hunt", which is set to Buying only and on Trade
- **THEN** the feed shows one WTT post holding both sides, and the Want side matches sale lists only

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address whatever its Hide Cosmo ID setting, the shortened address when it has none, and the account's display name only for a list bound to no address; see `web-cosmo-link`), with the avatar;
- the tag, and each list's name and description;
- up to 11 objekts per side on a post with two sides, and up to 20 on a post with one side, with the number of further objekts;
- on a WTS post, each objekt's price in the list's currency, or QYOP;
- when the post was last bumped, or last changed if that is later.

Each list in a post SHALL link to its list page.

#### Scenario: Linked pair is one post
- **WHEN** have list "spares" is linked to want list "binary hunt" and both are on Trade
- **THEN** the feed shows one WTT post holding a Have side from Spares and a Want side from Binary hunt

#### Scenario: Half a pair
- **WHEN** "spares" is on Trade and its linked want list is not
- **THEN** the feed shows a WTT post with only the Have side

#### Scenario: Sale list on Market
- **WHEN** a sale list bound to a Cosmo profile has Show on Market on
- **THEN** the feed shows it as a WTS post

#### Scenario: Not on Trade
- **WHEN** a have list has Show on Trade off
- **THEN** it does not appear on `/trade`, and For you does not match it

#### Scenario: Discoverable before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 3 days before launch
- **THEN** at launch it appears on `/trade` with its time showing that change, ordered as if bumped then

#### Scenario: Long-untouched before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 60 days before launch
- **THEN** at launch it is idle and not listed on `/trade` until its owner bumps or changes it, and For you still matches it

#### Scenario: One side gets more
- **WHEN** a WTS post's sale list holds 30 objekts, and a WTT pair's have and want lists hold 30 each
- **THEN** the WTS post sends 20 objekts and a count of 10 more, and the pair sends 11 per side and a count of 19 more on each

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, every post on Browse and on For you SHALL show its owner's counts. They are taken across all of the owner's lists that matching reads (their discoverable have, sale and want lists, listed or idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the owner's have or sale lists that are on one of the viewer's want lists that can take them. A have list counts only against a want list open to swaps (Swaps only, or Swaps or buying); a sale list counts only against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the owner's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list counts only for a want list open to swaps; a sale list counts only for a want list open to buying.
- The mutual score: the smaller of the two counts above. A have or sale list, the owner's or the viewer's, counts toward it exactly as it counts toward its own count. A want list set to swaps only never counts a sale list toward either direction, and a want list set to buying only never counts a have list, so neither makes a person mutual through one.

Every post by one owner SHALL show the same counts. They SHALL be the counts that person's sheet shows for the same Compare with choice (see `web-trade-for-you` Person sheet), apart from the sheet's caching delay. The counts show in the card's match chip (see Trade card). Matched objekts SHALL be marked with a ring, judged on the post's own objekts. The chip SHALL open a popover naming the viewer's lists the counts came from, each linking to its list: the want lists for the first count, and the have and sale lists for the second.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered. A post whose chip shows SHALL also carry an All matches control after the chip, which opens the owner's person sheet.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own posts, so they can see where a bump put them. For you SHALL never list them. Posts by people the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every post is listed, with match chips and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps their have list "spares" and opens `/trade`
- **THEN** their "spares" post is listed at the top of Browse, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post's owner wants two collections, across their want lists, that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list post holding 1 collection the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** both posts' chips read "Mutual 1 · they have 1 · you have 2"

#### Scenario: A sale list and a buying want list make a person mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's posts show "Mutual 1 · they have 3 · you have 1", and jinsoul.blue is listed under Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count toward "They have", so jinsoul.blue's posts show "They have 0 you want · you have 1 they want" on a neutral surface and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is Mutual when that want list is open to swaps or buying, and is not when it is open to swaps only

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's posts count "They have 0 you want", ring none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Mutual partner
- **WHEN** the viewer activates All matches on one of rin.trades's posts
- **THEN** rin.trades's person sheet opens and the URL carries `person=<rin.trades's id>`

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists
- **THEN** rin.trades's chip counts "They have 2 you want", not 3

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Mutual only is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match chip, no rings and no All matches control, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's posts are not listed on Browse or For you for that viewer

## ADDED Requirements

### Requirement: Buying only note
A WTB post whose want list is set to Buying only SHALL show a short muted note beside its tag, "Buying only, not swapping", in the byline, the way a want-only WTT post shows "Swaps only, not buying". A WTB post whose want list is open to swaps or buying SHALL show no note. The Browse help's tag table SHALL describe WTB as a want list open to swaps or buying, or set to buying only, and its "What counts toward Mutual" table SHALL show that a have list counts against a want list open to swaps only or to swaps or buying and not against one set to buying only, and that a sale list counts against a want list open to swaps or buying or set to buying only and not against one open to swaps only.

#### Scenario: Buying-only post
- **WHEN** a want list on its own is set to Buying only and on Trade
- **THEN** its post shows the WTB tag with "Buying only, not swapping" beside it, and one WANT strip

#### Scenario: Swaps or buying post
- **WHEN** a want list on its own is open to swaps or buying and on Trade
- **THEN** its post shows the WTB tag and no note

#### Scenario: Help table
- **WHEN** the viewer opens the matching help on Browse
- **THEN** the Mutual table shows a have list counting against Swaps only and Swaps or buying but not Buying only, and a sale list counting against Swaps or buying and Buying only but not Swaps only
