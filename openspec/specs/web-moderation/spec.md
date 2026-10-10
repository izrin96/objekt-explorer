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

Feeds and alerts SHALL apply the block in both directions: the blocker's posts, For you row and want-list alerts also leave the blocked account's views. Either account can still open the other's public profile and lists.

#### Scenario: Blocked sender
- **WHEN** kaede.k blocks spam.seller22 and spam.seller22 then sends a message in their conversation
- **THEN** the send is refused with the generic reason, and kaede.k receives nothing

#### Scenario: Feeds
- **WHEN** kaede.k blocks rin.trades
- **THEN** rin.trades's posts and For you row no longer appear for kaede.k, and kaede.k's no longer appear for rin.trades

### Requirement: Blocked users
The Blocked users section of the account page (`/account/blocked`) SHALL list every account the user blocked, headed by its Chat as profile (see `web-chat`), with Unblock. Unblocking SHALL restore messaging and feeds. A conversation that existed before SHALL return with its history.

#### Scenario: Unblock
- **WHEN** the user unblocks spam.seller22
- **THEN** spam.seller22 can message them again, and their old conversation is back in the Inbox

### Requirement: Report a user
A signed-in user SHALL be able to report another account from a conversation's menu, a Trade post's menu or a profile, choosing:
- a reason: scam or fake offer, harassment, spam, pretending to be someone else, or something else;
- an optional note of up to 500 characters;
- "Share this conversation with moderators", on by default and offered only from a conversation;
- "Also block", off by default.

A shared excerpt SHALL be a copy of every message of that conversation at the time of the report, kept with the report; later messages, unsends or deletions SHALL not change it. A message unsent before the report SHALL be in the excerpt with its text and card, marked as unsent. The excerpt SHALL be the only way message text reaches moderators. A user SHALL be able to report the same account at most once per 24 hours.

#### Scenario: Report without sharing
- **WHEN** a user reports harassment with sharing turned off
- **THEN** the report reaches moderators with the reason and note, and no message text

#### Scenario: Report and block
- **WHEN** the user reports spam with "Also block" on
- **THEN** the report is filed and the account is blocked

#### Scenario: Long conversation
- **WHEN** a user reports from a conversation holding 450 messages with sharing on
- **THEN** the moderator sees all 450 messages in the excerpt

#### Scenario: Unsent message in the excerpt
- **WHEN** a user reports a conversation in which the other account unsent a payment request
- **THEN** the moderator sees that message's text in the excerpt, marked as unsent

### Requirement: Scam-phrase caution
A received message matching a scam pattern SHALL show the recipient an inline caution under the message. The patterns cover asking the other side to send first, and payment outside the site (payment links and app names). The sender SHALL see nothing. Each match SHALL record a flag on the sender with its category and time, without the message text. Flags SHALL never block or hide a message.

#### Scenario: Send first
- **WHEN** a recipient gets "send first pls, pay to wise"
- **THEN** the message is shown with the caution, and moderators see one "send first" and one "outside payment" flag on the sender, without the text

### Requirement: Moderator console
`/mod/reports` SHALL be reachable only by accounts with the moderator or admin role. Anyone else SHALL get the not-found surface. The account menu SHALL link to it for staff only. It SHALL list open reports grouped by reported account, newest first. Each row SHALL show:
- reason counts;
- flag counts;
- how many of its open reports carry a shared excerpt, without any message text.

Opening an account SHALL show:
- every open report's reason, note, reporter and time, and its shared excerpt;
- account signals:
  - account age;
  - linked addresses and when each was linked;
  - its verified trades: its count of completed trades, the same count its reputation shows (see `web-verified-trades`);
  - its unfinished trades: the same unfinished count its reputation shows, including trades followed through a linked wallet, shown even when it is 0;
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

**Layout.** On a wide screen the console SHALL be one screen of three panes:
- the queue on the left, with the open account's row marked as current;
- the open account's reports, excerpts and attached trades in the middle;
- its signals, actions, sanctions and audit log on the right.

Picking another row SHALL replace the middle and right panes and leave the queue where it was. With no account open, the middle and right panes SHALL show a prompt to pick one.

On a narrow screen the console SHALL be two steps: the queue alone, then the open account alone, with a way back to the queue. The signals SHALL come before the reports, and the actions after them.

**Links.** The open account SHALL be part of the URL, so a reload or a shared link opens the same account. A link MAY also name one of the account's reports. That report's excerpt SHALL then be open and scrolled into view, and the report marked as selected. A link naming a report the account doesn't have, or a malformed value, SHALL open the account with no report selected.

**Excerpts.** A shared excerpt SHALL read as a conversation. Each message is a chat bubble, with the reported account's messages on one side and the reporter's on the other, in order, each with its time. A message from the reported account whose text or offer note matches a scam pattern (see Scam-phrase caution) SHALL be outlined. It SHALL be labelled with the matched categories. The reporter's messages SHALL never be outlined. A message unsent before the report SHALL stay in the excerpt with its text, marked as unsent. Objekt cards and offers in the excerpt SHALL show as they do today. The outline SHALL only highlight: it SHALL not hide, reorder or change any message.

#### Scenario: Not a moderator
- **WHEN** a signed-in user without a moderator role opens `/mod/reports`
- **THEN** the not-found surface is shown and no report data is requested

#### Scenario: Only shared text
- **WHEN** a moderator opens an account reported twice, once with an excerpt and once without
- **THEN** only the one excerpt's messages are visible, and no other message from that account can be fetched

#### Scenario: Switching accounts on a wide screen
- **WHEN** a moderator at 1280px wide picks yyn_shop in the queue while spam.seller22 is open
- **THEN** the middle and right panes show yyn_shop, the queue stays in place with yyn_shop's row marked, and the URL names yyn_shop

#### Scenario: Phone flow
- **WHEN** a moderator at 390px wide opens spam.seller22 from the queue
- **THEN** only spam.seller22's account is shown, with signals above the reports, and going back shows the queue alone

#### Scenario: Link to one report
- **WHEN** a moderator opens a link to spam.seller22 that names the report filed by mei_collects
- **THEN** that report is marked as selected, and its excerpt is open and scrolled into view

#### Scenario: Unknown report in the link
- **WHEN** a link names a report that spam.seller22 doesn't have
- **THEN** spam.seller22's account opens with no report selected

#### Scenario: Flagged line
- **WHEN** an excerpt holds spam.seller22's message "send first pls, pay 2000 KRW to wise first"
- **THEN** that bubble is outlined and labelled "send first" and "outside payment", and the reporter's bubbles around it are not outlined

#### Scenario: Verified trades
- **WHEN** a moderator opens an account with 31 completed trades
- **THEN** its signals show 31 verified trades

#### Scenario: Unfinished trades
- **WHEN** a moderator opens an account whose reputation counts 2 unfinished trades
- **THEN** its signals show 2 unfinished trades beside its verified trades

#### Scenario: Queue row
- **WHEN** an account has three open reports, two of which shared their conversation
- **THEN** its queue row shows two shared excerpts and no message text

### Requirement: Sanctions
A moderator action SHALL resolve the account's open reports, write an audit entry (actor, action, target, reason, time) and apply its sanction:
- **Warn**: the user gets a notification with the reason.
- **Chat mute**: until it ends, the user cannot start conversations or send messages. Their message box is replaced by a notice with the reason and end date. It ends on its own.
- **Trade block**: until revoked, the user's lists are left out of Market, Trade, For you and want-list alerts for everyone else. The user is notified with the reason.
- **Ban**: the account is banned with the reason and optional end date. All its sessions are revoked, its open tabs lose their live connection, its lists leave Market, Trade, For you and want-list alerts as under a trade block, and sign-in is refused until the end date.

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
- **Trade block or ban**: either one SHALL cancel the user's open offers and, until it ends, refuse sending, countering and accepting. Declining, withdrawing and cancelling an in-progress trade SHALL stay allowed, so the other party is never left waiting.

None of these SHALL change a trade that was already accepted.

#### Scenario: Block cancels offers
- **WHEN** a user blocks rin.trades while O-882 between them is open
- **THEN** O-882 shows Cancelled, and neither side can send a new offer

#### Scenario: Trade block
- **WHEN** a moderator blocks spam.seller22 from trading
- **THEN** spam.seller22's open offers are cancelled and their recipients are notified

#### Scenario: Cancel under a trade block
- **WHEN** spam.seller22, trade blocked, cancels trade T-1050 that has no verified leg
- **THEN** T-1050 is Cancelled, as it would be without the block

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
