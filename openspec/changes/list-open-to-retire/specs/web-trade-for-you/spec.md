## MODIFIED Requirements

### Requirement: Account-wide matches
Trade SHALL match the signed-in user, one person at a time, against the other accounts whose listed have, sale or want lists (discoverable and not idle; see `web-trade-browse` Order and idle posts) overlap the user's have, sale and want lists. This drives the header sentences and list counts on Browse and For you, Any, Mutual and Mutual N (see `web-trade-browse`). An idle list SHALL not count toward its owner. A have list, and a sale list open to swaps, count against a want list open to swaps, and every sale list counts against a want list open to buying: a want list open to swaps only never matches a sale list set to Sell only, and one set to buying only never matches a have list (see `web-lists`). The user's own lists count whether or not they are discoverable. A list in more than one post SHALL count toward its owner through each of its listed posts the user has not hidden, with what any of those posts' Open to allows. The user's own list SHALL count with what any of its posts on Trade allows; on none, with what any of its posts allows; and in no post, with the defaults (Swaps or buying for a want list, Sell only for a sale list). Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings. Want lists always take part. The user's own account SHALL never be matched. Every list that takes part counts toward the one-way counts, but Can swap counts only inside one linked pair of the user's and one of the person's (see `web-trade-browse` Matches to the signed-in viewer). Want-list alerts SHALL use the same rules for which of another account's lists take part (see `web-notifications` Want-list alerts).

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a person's discoverable lists overlap two of them
- **THEN** the person's row counts the matched objekts from both of the user's lists in one header sentence

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a person wants it
- **THEN** SeoYeon 204Z does not count toward that person

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a person wants a collection on it
- **THEN** that collection does not count toward the person, and Compare with does not offer the list

#### Scenario: Buying-only want list on a row
- **WHEN** the user's only want list is set to Buying only, and a person's have list and sale list each hold a different collection on it
- **THEN** the person's row counts only the sale list's collection as one they have that the user wants

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade`
- **THEN** there is no Matches control and no line about lists (see `web-trade-browse` Matches to the signed-in viewer); the For you tab shows, and opening it says that nothing can match yet, with New want list

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

#### Scenario: A list in two posts
- **WHEN** rin.trades's want list "Looking for" is the want side of two Swap posts, one set to Swaps only and one to Swaps or buying, and the user's bound sale list, set to Sell only, holds a collection on it
- **THEN** rin.trades's row counts that collection as one the user has that rin.trades wants

#### Scenario: An own list off Trade keeps its post's Open to
- **WHEN** the user's want list "bulk buys" was posted as a Buy post and taken off Trade, and a person's have list holds a collection on it
- **THEN** that collection does not count toward the person

#### Scenario: An own list in no post
- **WHEN** the user's want list "hunt" has never been in a post, and a person's sale list set to Sell only holds a collection on it
- **THEN** that collection counts toward the person as one they have that the user wants
