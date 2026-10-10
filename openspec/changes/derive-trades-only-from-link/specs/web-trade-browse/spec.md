## MODIFIED Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned its Show on Trade switch on (Show on Market on a sale list; see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list, and for a want list on its own that is linked to one of its owner's have lists;
- WTB for a want list on its own with no link;
- WTS for a sale list.

The tag SHALL follow the lists alone; no list setting changes it (see `web-lists`).

#### Scenario: Trades-only want list
- **WHEN** want list "binary hunt" is on Trade and linked to have list "spares", which is not on Trade
- **THEN** its post holds only the Want side, is tagged WTT and is listed under WTT, not WTB

#### Scenario: Unlinked want list
- **WHEN** a want list with no link is on Trade
- **THEN** its post is tagged WTB and listed under WTB

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address whatever its Hide Cosmo ID setting, the shortened address when it has none, and the account's display name only for a list bound to no address; see `web-cosmo-link`), with the avatar;
- the tag, and each list's name and description;
- up to 11 objekts per side, with the number of further objekts;
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
