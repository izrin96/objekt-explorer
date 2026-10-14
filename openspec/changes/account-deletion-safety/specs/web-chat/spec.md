## MODIFIED Requirements

### Requirement: Blocks and chat mutes gate sending
Starting a conversation or sending a message SHALL be refused when either account has blocked the other, or when the other account was deleted. The refusal reason SHALL read the same as "this user isn't accepting messages", so the blocked side cannot tell. It SHALL also be refused while the sender has an active chat mute. In that case the message box SHALL be replaced by a notice with the mute's reason and end date (see `web-moderation`).

#### Scenario: Muted sender
- **WHEN** a user under a chat mute until Oct 13 opens a conversation
- **THEN** the message box shows "You can't send messages until Oct 13" and the reason, and no send is possible

#### Scenario: Deleted partner
- **WHEN** kaede.k sends a message in her conversation with an account that has since been deleted
- **THEN** the send is refused with the same reason as a block, and the earlier messages stay in the thread
