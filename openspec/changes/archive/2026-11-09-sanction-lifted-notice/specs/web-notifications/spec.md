## MODIFIED Requirements

### Requirement: Sanction notices
A warn, chat mute or trade block SHALL create a notification for the sanctioned user, with the action, the reason and the end date if any. A ban SHALL not, because the account is signed out. A sanction notification SHALL not be grouped with others.

When a moderator revokes an active chat mute or trade block, the user SHALL get a notification that it was lifted: "You can send messages again" for a chat mute, "Your lists show on Market and Trade again" for a trade block. It SHALL not show the revoke reason, which is for the audit log only, and SHALL not use the warning colour. Revoking a ban SHALL create none, and neither SHALL a chat mute that ends at its end date.

#### Scenario: Warned
- **WHEN** a moderator warns a user with reason "asking traders to send first"
- **THEN** the user's bell shows a warning with that reason

#### Scenario: Mute lifted
- **WHEN** a moderator revokes the user's 7-day chat mute after 2 days, with revoke reason "appeal accepted"
- **THEN** the user's bell shows a new unread row from moderators reading "You can send messages again", without "appeal accepted", and the mute notice stays below it

#### Scenario: Trade block lifted
- **WHEN** a moderator revokes the user's trade block
- **THEN** the user's bell shows "Your lists show on Market and Trade again"

#### Scenario: Mute runs out
- **WHEN** the user's 1-day chat mute reaches its end date
- **THEN** no notification is created

#### Scenario: Ban revoked
- **WHEN** a moderator revokes a ban
- **THEN** no notification is created
