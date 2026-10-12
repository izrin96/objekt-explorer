## MODIFIED Requirements

### Requirement: Block a user
A signed-in user SHALL be able to block another account from a conversation's menu, a profile, a Trade post or a person sheet (see `web-trade-for-you`). While the block lasts:
- the blocked account SHALL not be able to start a conversation with the blocker or send messages in their conversation, and SHALL not be told why (the refusal reads the same as "this user isn't accepting messages");
- the conversation SHALL leave the blocker's Inbox, Requests and badge;
- the blocked account's posts SHALL leave the blocker's Trade feed and matches;
- the blocker SHALL get no want-list alerts from or about the blocked account.

Feeds and alerts SHALL apply the block in both directions: the blocker's posts, matches and want-list alerts also leave the blocked account's views. Either account can still open the other's public profile and lists.

#### Scenario: Blocked sender
- **WHEN** kaede.k blocks spam.seller22 and spam.seller22 then sends a message in their conversation
- **THEN** the send is refused with the generic reason, and kaede.k receives nothing

#### Scenario: Feeds
- **WHEN** kaede.k blocks rin.trades
- **THEN** rin.trades's posts no longer appear for kaede.k and rin.trades does not match kaede.k, and kaede.k's no longer appear for rin.trades

### Requirement: Sanctions
A moderator action SHALL resolve the account's open reports, write an audit entry (actor, action, target, reason, time) and apply its sanction:
- **Warn**: the user gets a notification with the reason.
- **Chat mute**: until it ends, the user cannot start conversations or send messages. Their message box is replaced by a notice with the reason and end date. It ends on its own.
- **Trade block**: until revoked, the user's lists are left out of Market, Trade, matches and want-list alerts for everyone else. The user is notified with the reason.
- **Ban**: the account is banned with the reason and optional end date. All its sessions are revoked, its open tabs lose their live connection, its lists leave Market, Trade, matches and want-list alerts as under a trade block, and sign-in is refused until the end date.

A moderator SHALL be able to revoke an active sanction, with an audit entry. Dismiss SHALL resolve reports with no sanction.

#### Scenario: Chat mute
- **WHEN** a moderator mutes spam.seller22 for 7 days
- **THEN** spam.seller22's message box shows the reason and end date, a send is refused, and after 7 days they can send again

#### Scenario: Trade block
- **WHEN** a moderator blocks rin.trades from trading
- **THEN** rin.trades's sale lists leave Market, and their posts leave Trade and matching for every viewer

#### Scenario: Revoke
- **WHEN** a moderator revokes an active trade block
- **THEN** the lists return, and the audit log shows both entries
