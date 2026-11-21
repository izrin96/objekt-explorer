## MODIFIED Requirements

### Requirement: Want-list alerts skip hidden posts
No want-list alert SHALL be created for an entry on a list of a post the user has hidden (see `web-trade-for-you` Hide a post) when the entry was there before the hide, in either direction: a hidden post's have or sale list holding what the user wants, or its want list holding what the user has. A list paired into a hidden post after the hide SHALL count as a list of it. An entry on a list that is also in a post the user did not hide SHALL alert through that post. An entry added after the hide that brings the post back (see `web-trade-for-you` A hidden post comes back) SHALL alert as an entry on any post does.

#### Scenario: Entry on a hidden post
- **WHEN** rin.trades adds SeoYeon 204Z, which is on the user's want list, to a post's have list before holding it, the user then hides that post, and rin.trades receives SeoYeon 204Z an hour later
- **THEN** no alert is created for it, and the post stays hidden

#### Scenario: Entry on another post of the same person
- **WHEN** rin.trades adds SeoYeon 204Z to the have list of a post the user did not hide
- **THEN** the user is alerted as usual

#### Scenario: Entry that brings the post back
- **WHEN** the user hid rin.trades's post, has want-list alerts on Any, and rin.trades then adds Nien 205Z, which is on the user's want list and which rin.trades holds, to that post's have list
- **THEN** the post is unhidden and the user gets a want-list alert for Nien 205Z

#### Scenario: Entry on a list paired into a hidden post
- **WHEN** rin.trades adds SeoYeon 204Z, which is on the user's want list, to "Binary dupes" before holding it, the user hides rin.trades's Buy post "Looking for", rin.trades pairs "Looking for" with "Binary dupes", and then receives SeoYeon 204Z
- **THEN** no alert is created for it, and the post "Binary dupes · Looking for" stays hidden

#### Scenario: Entry on a list also in a post the user did not hide
- **WHEN** rin.trades's have list "Binary dupes" is in two posts, the user hid the first, and rin.trades then receives SeoYeon 204Z, which was already on "Binary dupes" and is on the user's want list
- **THEN** the user is alerted as usual, and the first post stays hidden
