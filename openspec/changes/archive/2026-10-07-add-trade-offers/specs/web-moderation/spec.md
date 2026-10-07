## ADDED Requirements

### Requirement: Blocks and sanctions apply to offers
- **Block**: blocking an account SHALL cancel the open offers between the two accounts, and refuse new offer actions between them in either direction. The refusal reads the same as "this user isn't accepting messages".
- **Chat mute**: while it lasts, the user SHALL be unable to send or counter offers, but can still accept, decline, withdraw and cancel a trade.
- **Trade block or ban**: either one SHALL cancel the user's open offers and refuse every offer action until it ends.

None of these SHALL change a trade that was already accepted.

#### Scenario: Block cancels offers
- **WHEN** a user blocks rin.trades while O-882 between them is open
- **THEN** O-882 shows Cancelled, and neither side can send a new offer

#### Scenario: Trade block
- **WHEN** a moderator blocks spam.seller22 from trading
- **THEN** spam.seller22's open offers are cancelled and their recipients are notified
