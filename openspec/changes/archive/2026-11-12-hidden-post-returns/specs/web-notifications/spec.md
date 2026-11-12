# Spec Delta

## MODIFIED Requirements

### Requirement: Want-list alerts skip hidden posts
No want-list alert SHALL be created for an entry that was on a list of a post when the user hid it (see `web-trade-for-you` Hide a post), in either direction: a hidden post's have or sale list holding what the user wants, or its want list holding what the user has. An entry added after the hide that brings the post back (see `web-trade-for-you` A hidden post comes back) SHALL alert as an entry on any post does.

#### Scenario: Entry on a hidden post
- **WHEN** rin.trades adds SeoYeon 204Z, which is on the user's want list, to a post's have list before holding it, the user then hides that post, and rin.trades receives SeoYeon 204Z an hour later
- **THEN** no alert is created for it, and the post stays hidden

#### Scenario: Entry on another post of the same person
- **WHEN** rin.trades adds SeoYeon 204Z to the have list of a post the user did not hide
- **THEN** the user is alerted as usual

#### Scenario: Entry that brings the post back
- **WHEN** the user hid rin.trades's post, has want-list alerts on Any, and rin.trades then adds Nien 205Z, which is on the user's want list and which rin.trades holds, to that post's have list
- **THEN** the post is unhidden and the user gets a want-list alert for Nien 205Z
