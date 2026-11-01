## MODIFIED Requirements

### Requirement: Account-wide matches
Trade SHALL match the signed-in user, one person at a time, against the other accounts whose listed have, sale or want lists (discoverable and not idle; see `web-trade-browse` Order and idle posts) overlap the user's have, sale and want lists. This drives the header sentences and list counts on Browse and For you, Any, Mutual and Mutual N (see `web-trade-browse`). An idle list SHALL not count toward its owner. A have list, and a sale list open to swaps, count against a want list open to swaps, and every sale list counts against a want list open to buying: a want list open to swaps only never matches a sale list set to Sell only, and one set to buying only never matches a have list (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings. Want lists always take part. The user's own account SHALL never be matched. Every list that takes part counts toward the one-way counts, but Can swap counts only inside one linked pair of the user's and one of the person's (see `web-trade-browse` Matches to the signed-in viewer). Want-list alerts SHALL use the same rules for which of another account's lists take part (see `web-notifications` Want-list alerts).

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a person's discoverable lists overlap two of them
- **THEN** the person's row counts the matched objekts from both of the user's lists in one header sentence

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a person wants it
- **THEN** SeoYeon 204Z does not count toward that person

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a person wants a collection on it
- **THEN** that collection does not count toward the person, and Compare with does not offer the list

#### Scenario: Buying-only want list in the person sheet
- **WHEN** the user's only want list is set to Buying only, and a person's have list and sale list each hold a different collection on it
- **THEN** the person's row counts only the sale list's collection as one they have that the user wants

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade`
- **THEN** there is no Matches control, and a line asks them for such a list with a Post a list control

#### Scenario: Opened from Browse
- **WHEN** the user follows a link to `/trade?person=<id>`, which leads to that person's page
- **THEN** that person's row shows with every post, counted against all of the user's lists

#### Scenario: Idle list
- **WHEN** a person's only have list overlapping the user's wants is idle
- **THEN** it does not count toward that person, and the person is not listed on For you through it

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/@<handle>`
- **THEN** that person's row shows with no counts

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed

#### Scenario: Alerts follow the same lists
- **WHEN** a person's have list holding a collection on the user's want list is left out of For you because the user hid that person
- **THEN** a new entry on that have list creates no want-list alert for the user

#### Scenario: Sell or swap counts both ways
- **WHEN** the user's want list is open to swaps only and linked to their bound have list, and a person's sale list, open to swaps, holds 2 collections on it while the person's want list, linked to that sale list, asks for 1 on the user's bound have list
- **THEN** the person's row reads "You can swap 1", and the person is listed under Can swap

#### Scenario: Can swap stays inside one post
- **WHEN** a person's have list holds a collection on the user's want list "doubles hunt", linked to have list "jiwoo spares", and the person wants a collection on the user's have list "yooyeon spares", linked to a different want list
- **THEN** the person's row counts both directions, and the person is listed under One way, not Can swap

### Requirement: Blocks and trade blocks
Matching SHALL leave out people the user blocked, people who blocked the user, and people under an active trade block. Their posts SHALL not be listed on Browse, and they SHALL not count toward Mutual N. Each post's ⋯ menu and the person sheet's ⋯ menu SHALL offer Block and Report.

#### Scenario: Blocked partner
- **WHEN** the user has blocked kaede.k
- **THEN** kaede.k's posts are not listed, kaede.k is not counted in Mutual N, and kaede.k's person page shows that they have nothing on Trade right now

### Requirement: Old For you address
`/trade/for-you` is the For you tab (see `web-trade-browse` Matches and Compare with). It SHALL also accept the parameters of For you links from before the merge into Browse, mapping them in place:
- `match=mutual` stays `match=mutual`;
- `match=they_have` or `match=they_want` becomes `match=any`;
- `list` is kept as `list`;
- `partner`, like `person`, leads to that person's page (see `web-trade-person-pages` Old person links).

Unknown or unparsable values SHALL be dropped. The For you rules then apply: a signed-out visitor is sent to sign in, a signed-in viewer without a list that takes part in Trade is sent to `/trade`, and a `list` the viewer can't use reads as All my lists.

#### Scenario: Notification link
- **WHEN** a signed-in user with want list "binary hunt" opens `/trade/for-you?list=binary-hunt` from an older notification
- **THEN** For you opens on Any, and Compare with names "binary hunt"

#### Scenario: One-way view
- **WHEN** a signed-in user opens `/trade/for-you?match=they_want&list=spares`
- **THEN** the browser is at `/trade/for-you?match=any&list=spares`

#### Scenario: Partner link
- **WHEN** a signed-in user opens `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** the browser is at `/trade/@rin.trades`

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login`, which returns them to `/trade/for-you?list=spares` after signing in
