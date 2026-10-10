## MODIFIED Requirements

### Requirement: Blocked users
The Blocked users section of the account page (`/account/blocked`) SHALL list every account the user blocked, headed as For you heads a partner, with Unblock. Unblocking SHALL restore messaging and feeds. A conversation that existed before SHALL return with its history.

#### Scenario: Unblock
- **WHEN** the user unblocks spam.seller22
- **THEN** spam.seller22 can message them again, and their old conversation is back in the Inbox
