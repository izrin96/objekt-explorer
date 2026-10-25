# Spec Delta

## MODIFIED Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL hold one post per list its owner put on Trade through the post composer, or through Show on Market and Trade on a sale list (see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The feed SHALL list each person's posts together in one row (see Trade card). The page SHALL be open to signed-out visitors.

Each post SHALL carry one or two tags:
- WTT for a have list, alone or paired with its want list, which is open to swaps (a pair can't be Buying only, see `web-lists`), and for a want list on its own open to swaps (Swaps only, or Swaps or buying);
- WTB for a post whose want list is open to buying: a want list on its own set to Buying only or Swaps or buying, or a pair whose want list is open to buying;
- WTS for a sale list.

A post with two tags SHALL show both, WTT first, and SHALL be listed under each in the Post type menu. Mutual SHALL count a post that carries WTT as a WTT post.

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
