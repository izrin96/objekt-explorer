# Spec Delta

## ADDED Requirements

### Requirement: Want-list alerts skip hidden posts
No want-list alert SHALL be created for an entry on a list of a post the user hid (see `web-trade-for-you` Hide a post), in either direction: a hidden post's have or sale list adding what the user wants, or its want list adding what the user has.

#### Scenario: Entry on a hidden post
- **WHEN** the user hid rin.trades's post, and rin.trades adds SeoYeon 204Z, which is on the user's want list, to that post's have list
- **THEN** no alert is created for it

#### Scenario: Entry on another post of the same person
- **WHEN** rin.trades adds SeoYeon 204Z to the have list of a post the user did not hide
- **THEN** the user is alerted as usual
