## MODIFIED Requirements

### Requirement: Account-wide matches
Trade SHALL match the signed-in user, one person at a time, against the other accounts whose discoverable have, sale or want lists overlap the user's have, sale and want lists. This drives Browse's match chips, Any, Mutual, Mutual N and the person sheet (see `web-trade-browse`). A have list counts only against a want list open to swaps, and a sale list only against a want list open to buying: a want list open to swaps only never matches a sale list, and one set to buying only never matches a have list (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings. Want lists always take part. The user's own account SHALL never be matched.

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a person's discoverable lists overlap two of them
- **THEN** the person's sheet shows the matched objekts from both of the user's lists, and every post by that person shows the same chip

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a person wants it
- **THEN** SeoYeon 204Z does not count toward that person

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a person wants a collection on it
- **THEN** that collection does not count toward the person, and Compare with does not offer the list

#### Scenario: Buying-only want list in the person sheet
- **WHEN** the user's only want list is set to Buying only, and a person's have list and sale list each hold a different collection on it
- **THEN** the person's sheet counts only the sale list's collection under what they have that the user wants

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade`
- **THEN** there is no Matches control, and a line asks them for such a list with a Post a list control

#### Scenario: Opened from Browse
- **WHEN** the user activates All matches on a post
- **THEN** that person's sheet opens over Browse, with the matches from all of the user's lists, or from the lists Compare with names

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade?person=<id>`
- **THEN** no person sheet opens, and Browse shows the sign-in prompt

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed
