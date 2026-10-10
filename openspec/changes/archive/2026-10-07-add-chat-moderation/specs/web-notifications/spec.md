## ADDED Requirements

### Requirement: Sanction notices
A warn, chat mute or trade block SHALL create a notification for the sanctioned user, with the action, the reason and the end date if any. A ban SHALL not, because the account is signed out. A sanction notification SHALL not be grouped with others.

#### Scenario: Warned
- **WHEN** a moderator warns a user with reason "asking traders to send first"
- **THEN** the user's bell shows a warning with that reason

### Requirement: No alerts across blocks
Want-list alerts SHALL not be created between two accounts when either has blocked the other, or about lists of an account under an active trade block.

#### Scenario: Blocked lister
- **WHEN** an account the user blocked lists a collection on the user's want list
- **THEN** no alert is created
