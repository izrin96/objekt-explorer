## ADDED Requirements

### Requirement: Deleted accounts keep their evidence
On the moderator console's account page, a deleted account SHALL show a Deleted chip with when it was deleted. The page SHALL keep showing:
- the reports filed against and by it;
- its sanctions and audit entries;
- its trades;
- the Cosmo wallets it had linked, with when each was linked and unlinked, read from the address link history.

Deleting one's own account SHALL add an "Account deleted" audit entry, by the account itself, naming the reports still open against it.

Its open reports SHALL stay open. A moderator SHALL be able to Dismiss them. Warn, chat mute, trade block and ban SHALL NOT be offered for a deleted account, and the server SHALL refuse them. A user SHALL still be able to report a deleted account.

#### Scenario: Deleted after being reported
- **WHEN** spam.seller22 has 2 open reports and deletes the account
- **THEN** the console shows spam.seller22's page with the Deleted chip, both reports still open, an "Account deleted" audit entry by the account naming them, and the wallets it had linked with their link and unlink times

#### Scenario: Dismiss only
- **WHEN** a moderator opens a deleted account's page
- **THEN** only Dismiss is offered, and a sanction sent for the account anyway is refused

#### Scenario: Report a deleted account
- **WHEN** kaede.k reports the deleted partner of failed trade T-1042 through Report a problem
- **THEN** the report is filed and appears in the queue with T-1042 attached
