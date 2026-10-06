# web-trade-for-you Specification

## Purpose
The account-wide trade match view on `apps/web` at `/trade/for-you`: who the user could trade with across all their have and want lists, ranked by how mutual the trade is, using current ownership.

## Requirements

### Requirement: Account-wide matches
`/trade/for-you` SHALL list the other accounts whose discoverable have, sale or want lists overlap the signed-in user's have and want lists, grouped one row per account. The user's own lists count whether or not they are discoverable. The user's own account SHALL never appear. `/trade` SHALL open the Browse feed (see `web-trade-browse`), not For you. A signed-out visitor SHALL be sent to `/login?redirect=/trade/for-you`, keeping the search parameters.

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a partner's discoverable lists overlap two of them
- **THEN** the partner appears once, with the matched objekts from both of the user's lists, each labelled with the user's list it came from

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login?redirect=%2Ftrade%2Ffor-you%3Flist%3Dspares`

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed

### Requirement: Both directions and mutual-first ranking
Each partner row SHALL show both counts: objekts they have that the user wants, and objekts the user has that they want. Rows SHALL be ordered by:
1. the smaller of the two counts (the mutual score), highest first;
2. then the sum of both counts;
3. then the partner's most recently updated matched list.

The row SHALL show the mutual score. Expanding a row SHALL show the matched objekts in each direction.

#### Scenario: Mutual beats one-sided
- **WHEN** partner A has 9 the user wants and wants 0 of the user's, and partner B has 2 and wants 2
- **THEN** under All, B is listed above A

### Requirement: Filters
The view SHALL offer the filters All, Mutual only, They have what I want and They want what I have. Mutual only is the default and keeps partners with both counts above zero. The view SHALL also offer a list filter naming one of the user's have or want lists. The named list replaces the user's side only in its own direction:
- for a have list, "they want what I have" counts only that list's entries;
- for a want list, "they have what I want" counts only that list's entries.

The other direction keeps using all of the user's lists of the other type, so a list's Mutual only partners also trade back against the user's other lists. The filters SHALL live in the URL (`filter`, `list`). A `list` value that is not one of the user's have or want lists SHALL be ignored, and all lists used.

#### Scenario: Default filter
- **WHEN** the user opens `/trade/for-you` with no parameters
- **THEN** Mutual only is selected and only partners with both counts above zero are listed

#### Scenario: One have list, still mutual
- **WHEN** the user filters to have list "spares", and a partner wants a collection on Spares and has a collection on the user's want list "binary hunt"
- **THEN** the partner is listed under Mutual only, and "they want what I have" counts only the Spares entries

#### Scenario: Foreign list slug
- **WHEN** the URL's `list` is the slug of another account's list
- **THEN** all of the user's lists are used and the list filter shows All lists

### Requirement: Current ownership
An entry on a have or sale list SHALL count toward a match only while its owner can trade it:
- an entry for a specific objekt counts only while one of the owner's linked Cosmo addresses holds that objekt and it is transferable;
- an entry for a collection counts only while one of those addresses holds a transferable copy.

This applies to both the partner's entries and the user's own. Ranking and filters SHALL use the counts after this check, and at most 50 partners SHALL be listed. Entries left out this way SHALL be summarised in a Not shown line, with counts by reason.

#### Scenario: Sold objekt
- **WHEN** a partner's have list still lists Mayu 203Z but none of their linked addresses holds a copy
- **THEN** Mayu 203Z does not count toward that partner, and Not shown includes it under "no longer owned"

#### Scenario: Not transferable
- **WHEN** the only copy a partner holds is not transferable
- **THEN** it does not count, and Not shown includes it under "not transferable"

#### Scenario: Ranked on what is still owned
- **WHEN** partner A's list overlaps 5 ⇄ 5 but only 1 ⇄ 5 is still owned, and partner B's overlaps 3 ⇄ 3, all owned
- **THEN** B is listed above A, and A's row shows a mutual score of 1

### Requirement: Idle partners rank last
A partner whose matched lists have all gone 30 days without a change to the list or its entries SHALL be listed after every active partner, whatever their score, and marked idle.

#### Scenario: Idle high scorer
- **WHEN** an idle partner has a mutual score of 3 and an active partner has 1
- **THEN** the active partner is listed first and the idle one is marked idle

### Requirement: Hide a partner
The user SHALL be able to hide a partner from the row. A hidden partner SHALL not appear in For you or in the list-header counts. Not shown SHALL count hidden partners and let the user list them and unhide each one.

#### Scenario: Hide and unhide
- **WHEN** the user hides rin.trades and later unhides them from Not shown
- **THEN** rin.trades disappears from the list at once, and returns after unhiding

### Requirement: Partner identity
A partner row SHALL be headed by the Cosmo nickname of the address their best-matching list is bound to, unless that address hides its nickname. Otherwise it SHALL use the account's display name. When the partner's matched lists are bound to more than one address, the row SHALL name the others as well. The row SHALL show the account's avatar, and Discord and Twitter badges when the partner has chosen to show socials, whatever the list's Hide User setting, as the per-list match dialog does today.

#### Scenario: Bound nickname
- **WHEN** a partner's matched list is bound to the Cosmo address with nickname "rinrin"
- **THEN** the row is headed "rinrin"

#### Scenario: No bound address
- **WHEN** a partner's matched lists are bound to no address
- **THEN** the row is headed by the account's display name

### Requirement: Freshness
The view SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear within 5 minutes.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to For you
- **THEN** partners holding that collection are counted
