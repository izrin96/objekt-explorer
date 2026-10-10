## ADDED Requirements

### Requirement: A linked want list matches trades only
Whether a want list takes sales SHALL follow from its link, with no setting of its own:
- a want list linked to one of its owner's have lists is **trades only**: it matches entries on have lists, never on sale lists;
- a want list with no link **takes sales**: it matches entries on have lists and on sale lists.

The link alone SHALL decide, whether or not the linked have list is on Trade or bound to a Cosmo profile. Linking, unlinking, or deleting the have list SHALL change the want list's matching on the next load, with nothing else to save.

This SHALL apply wherever Trade matches a want list against a have or sale list, in both directions:
- For you counts;
- Browse match counts and Only matches;
- want-list alerts;
- "Someone wants what you have" alerts.

When the list form edits a have or want list, the link field SHALL say that a linked want list matches trades only. The form SHALL offer no Match with choice for any list type. A create or edit request that still carries a `matchSale` field SHALL be accepted, and the field SHALL be ignored.

#### Scenario: Linked want list skips a sale list
- **WHEN** the user's want list "binary hunt" is linked to their have list "spares", and a partner's sale list holds a collection on "binary hunt"
- **THEN** that collection does not count toward the partner in For you or Browse, and no want-list alert is sent for it

#### Scenario: Unlinked want list takes sales
- **WHEN** the user unlinks "binary hunt" from "spares"
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: The other direction
- **WHEN** a partner's want list is linked to one of their have lists, and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner, and no "Someone wants what you have" alert is sent for it

#### Scenario: Have list off Trade
- **WHEN** "binary hunt" is linked to have list "spares", which is not bound to a Cosmo profile and so not on Trade
- **THEN** "binary hunt" still matches trades only

#### Scenario: Deleted have list
- **WHEN** the user deletes "spares"
- **THEN** "binary hunt" has no link and takes sales

#### Scenario: Old client sends matchSale
- **WHEN** a tab opened before this change saves a want list with `matchSale: true`
- **THEN** the save succeeds, and the list's matching still follows its link

## REMOVED Requirements

### Requirement: Want list match option
**Reason**: The link between a have list and a want list now decides whether the want list takes sales (see "A linked want list matches trades only"). A separate Match with choice was a second setting to understand, and it never reached production.
**Migration**: None for users. The choice was never live, so no saved value is lost. Code reads the want list's link instead of `match_sale`, and a new migration drops the column.
