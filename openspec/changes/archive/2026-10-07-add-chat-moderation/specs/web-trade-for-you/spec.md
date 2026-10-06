## ADDED Requirements

### Requirement: Blocks and trade blocks
For you SHALL leave out partners the user blocked, partners who blocked the user, and partners under an active trade block. Not shown SHALL count the accounts the user blocked, separately from hidden partners. Each row SHALL offer Block beside Hide partner.

#### Scenario: Blocked partner
- **WHEN** the user has blocked 2 accounts
- **THEN** neither appears, and Not shown includes "2 blocked users"
