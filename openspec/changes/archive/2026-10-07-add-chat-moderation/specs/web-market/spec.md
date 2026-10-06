## ADDED Requirements

### Requirement: Trade-blocked sellers
Market's collection grid, floor prices, listing counts and the drawer's Market tab SHALL leave out sale lists owned by accounts under an active trade block.

#### Scenario: Floor without the blocked seller
- **WHEN** the cheapest listing of a collection belongs to a trade-blocked account
- **THEN** the collection's floor is the next cheapest listing, and the blocked listing does not appear
