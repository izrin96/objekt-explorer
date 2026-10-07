# web-moderation Specification

## Purpose
Safety for chat and trading on `apps/web`. Users can block and report. Moderators act on reports from `/mod/reports` through a ladder of sanctions, seeing only the message text that reporters choose to share.

## Requirements

### Requirement: Block a user
A signed-in user SHALL be able to block another account from a conversation's menu, a profile, a Trade post or a For you row. While the block lasts:
- the blocked account SHALL not be able to start a conversation with the blocker or send messages in their conversation, and SHALL not be told why (the refusal reads the same as "this user isn't accepting messages");
- the conversation SHALL leave the blocker's Inbox, Requests and badge;
- the blocked account's posts and rows SHALL leave the blocker's Trade feed and For you;
- the blocker SHALL get no want-list alerts from or about the blocked account.

Blocking SHALL work in one direction only: the blocker can still open the blocked account's public profile and lists.

#### Scenario: Blocked sender
- **WHEN** kaede.k blocks spam.seller22 and spam.seller22 then sends a message in their conversation
- **THEN** the send is refused with the generic reason, and kaede.k receives nothing

#### Scenario: Feeds
- **WHEN** kaede.k blocks rin.trades
- **THEN** rin.trades's posts and For you row no longer appear for kaede.k

### Requirement: Blocked users
The account dialog SHALL have a Blocked users section listing every account the user blocked, headed as For you heads a partner, with Unblock. Unblocking SHALL restore messaging and feeds. A conversation that existed before SHALL return with its history.

#### Scenario: Unblock
- **WHEN** the user unblocks spam.seller22
- **THEN** spam.seller22 can message them again, and their old conversation is back in the Inbox

### Requirement: Report a user
A signed-in user SHALL be able to report another account from a conversation's menu or a profile, choosing:
- a reason: scam or fake offer, harassment, spam, pretending to be someone else, or something else;
- an optional note of up to 500 characters;
- "Share the last 20 messages with moderators", on by default and offered only from a conversation;
- "Also block", off by default.

A shared excerpt SHALL be a copy of at most the last 20 messages of that conversation at the time of the report, kept with the report. It SHALL be the only way message text reaches moderators. A user SHALL be able to report the same account at most once per 24 hours.

#### Scenario: Report without sharing
- **WHEN** a user reports harassment with sharing turned off
- **THEN** the report reaches moderators with the reason and note, and no message text

#### Scenario: Report and block
- **WHEN** the user reports spam with "Also block" on
- **THEN** the report is filed and the account is blocked

### Requirement: Scam-phrase caution
A received message matching a scam pattern SHALL show the recipient an inline caution under the message. The patterns cover asking the other side to send first, and payment outside the site (payment links and app names). The sender SHALL see nothing. Each match SHALL record a flag on the sender with its category and time, without the message text. Flags SHALL never block or hide a message.

#### Scenario: Send first
- **WHEN** a recipient gets "send first pls, pay to wise"
- **THEN** the message is shown with the caution, and moderators see one "send first" and one "outside payment" flag on the sender, without the text

### Requirement: Moderator console
`/mod/reports` SHALL be reachable only by accounts with the moderator or admin role. Anyone else SHALL get the not-found surface. It SHALL list open reports grouped by reported account, newest first, with reason counts and flag counts. Opening an account SHALL show:
- every open report's reason, note, reporter and time, and its shared excerpt;
- account signals:
  - account age;
  - linked addresses and when each was linked;
  - conversations started in the last 24 hours;
  - flag counts by category;
  - past and active sanctions;
- actions, each needing a reason that is shown to the user:
  - dismiss;
  - warn;
  - mute in chat for 1, 7 or 30 days;
  - block from trading;
  - ban, with or without an end date;
- the audit log for that account.

#### Scenario: Not a moderator
- **WHEN** a signed-in user without a moderator role opens `/mod/reports`
- **THEN** the not-found surface is shown and no report data is requested

#### Scenario: Only shared text
- **WHEN** a moderator opens an account reported twice, once with an excerpt and once without
- **THEN** only the one excerpt's messages are visible, and no other message from that account can be fetched

### Requirement: Sanctions
A moderator action SHALL resolve the account's open reports, write an audit entry (actor, action, target, reason, time) and apply its sanction:
- **Warn**: the user gets a notification with the reason.
- **Chat mute**: until it ends, the user cannot start conversations or send messages. Their message box is replaced by a notice with the reason and end date. It ends on its own.
- **Trade block**: until revoked, the user's lists are left out of Market, Trade, For you and want-list alerts for everyone else. The user is notified with the reason.
- **Ban**: the account is banned with the reason and optional end date. All its sessions are revoked, and sign-in is refused until the end date.

A moderator SHALL be able to revoke an active sanction, with an audit entry. Dismiss SHALL resolve reports with no sanction.

#### Scenario: Chat mute
- **WHEN** a moderator mutes spam.seller22 for 7 days
- **THEN** spam.seller22's message box shows the reason and end date, a send is refused, and after 7 days they can send again

#### Scenario: Trade block
- **WHEN** a moderator blocks rin.trades from trading
- **THEN** rin.trades's sale lists leave Market, and their posts and rows leave Trade and For you for every viewer

#### Scenario: Revoke
- **WHEN** a moderator revokes an active trade block
- **THEN** the lists return, and the audit log shows both entries

### Requirement: Roles
Accounts SHALL have a role of user (default), moderator or admin. A moderator SHALL be able to use the console and apply or revoke sanctions, including ban. An admin SHALL additionally be able to grant and remove the moderator role from the console. No role SHALL be able to read conversations except through shared excerpts, or to sign in as another user.

#### Scenario: Grant moderator
- **WHEN** an admin grants mod.hana the moderator role
- **THEN** mod.hana can open `/mod/reports` on the next load, and the audit log records the grant

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

### Requirement: Reports with a trade attached
A report filed through Report a problem SHALL carry its trade. It may attach only a trade between the reporter and the reported account. The moderator console's account page SHALL show each attached trade:
- its status;
- when it was accepted;
- each leg's objekt, direction, state, transaction hash and time.

Attaching a trade SHALL add no message text beyond a shared excerpt. The usual once-per-24-hours report limit SHALL apply.

#### Scenario: Moderator sees the trade
- **WHEN** a user reports binary.bin from failed trade T-1042
- **THEN** the console shows T-1042 with one leg Verified (with its hash) and one leg broken

#### Scenario: Someone else's trade
- **WHEN** a request attaches a trade the reporter isn't part of
- **THEN** the report is refused
