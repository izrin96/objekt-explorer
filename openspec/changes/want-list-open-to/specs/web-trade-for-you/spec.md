## MODIFIED Requirements

### Requirement: Account-wide matches
`/trade/for-you` SHALL list the other accounts whose discoverable have, sale or want lists overlap the signed-in user's have, sale and want lists, one card per account. A sale list counts as a have list, except against a want list open to Trade only, which it never matches (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings; want lists always take part. The user's own account SHALL never appear. `/trade` SHALL open the Browse feed (see `web-trade-browse`), not For you. A signed-out visitor SHALL be sent to `/login?redirect=/trade/for-you`, keeping the search parameters.

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a partner's discoverable lists overlap two of them
- **THEN** the partner appears once, with the matched objekts from both of the user's lists

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a partner wants it
- **THEN** SeoYeon 204Z does not count toward that partner

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a partner wants a collection on it
- **THEN** that collection does not count toward the partner, and Compare with does not offer the list

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade/for-you`
- **THEN** the page asks them to create one, with a link to their lists

#### Scenario: Opened from Browse
- **WHEN** the user follows a post's See in For you link to `/trade/for-you?match=mutual&partner=<id>`
- **THEN** Mutual only is selected, and that partner's card is scrolled into view and briefly highlighted

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login?redirect=%2Ftrade%2Ffor-you%3Flist%3Dspares`

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed
