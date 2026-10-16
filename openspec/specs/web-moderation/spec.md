# web-moderation Specification

## Purpose
Safety for chat and trading on `apps/web`. Users can block and report. Moderators act on reports from `/mod/reports` through a ladder of sanctions, seeing only the message text that reporters choose to share.

## Requirements

### Requirement: Block a user
A signed-in user SHALL be able to block another account from a conversation's menu, a profile, a Trade post or a person sheet (see `web-trade-for-you`). While the block lasts:
- the blocked account SHALL not be able to start a conversation with the blocker or send messages in their conversation, and SHALL not be told why (the refusal reads the same as "this user isn't accepting messages");
- the conversation SHALL leave the blocker's Inbox, Requests and badge;
- the blocked account's posts SHALL leave the blocker's Trade feed and matches;
- the blocker SHALL get no want-list alerts from or about the blocked account.

Feeds and alerts SHALL apply the block in both directions: the blocker's posts, matches and want-list alerts also leave the blocked account's views. Either account can still open the other's public profile and lists.

No response to either account SHALL say that a block caused something: an offer cancelled by a block SHALL carry no cancel reason in any offer, trade or notification response, to either party.

#### Scenario: Blocked sender
- **WHEN** kaede.k blocks spam.seller22 and spam.seller22 then sends a message in their conversation
- **THEN** the send is refused with the generic reason, and kaede.k receives nothing

#### Scenario: Feeds
- **WHEN** kaede.k blocks rin.trades
- **THEN** rin.trades's posts no longer appear for kaede.k and rin.trades does not match kaede.k, and kaede.k's no longer appear for rin.trades

#### Scenario: Offer cancelled by a block
- **WHEN** kaede.k blocks spam.seller22 while O-882 between them is open, and spam.seller22 reads O-882 and its notification through the API
- **THEN** O-882 is Cancelled, and neither response carries a reason naming the block

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
A received message matching a scam pattern SHALL show the recipient an inline caution under the message. The patterns cover asking the other side to send first, and payment outside the site (payment links and app names). Matching SHALL see through disguises that do not change how the text reads: invisible format characters (such as zero-width spaces) are ignored, and full-width and other compatibility forms match their plain letters. The message SHALL be stored and shown as sent. The sender SHALL see nothing. Each match SHALL record a flag on the sender with its category and time, without the message text. Flags SHALL never block or hide a message.

#### Scenario: Send first
- **WHEN** a recipient gets "send first pls, pay to wise"
- **THEN** the message is shown with the caution, and moderators see one "send first" and one "outside payment" flag on the sender, without the text

#### Scenario: Disguised app name
- **WHEN** a recipient gets "pay by pay​pal" with a zero-width space, or "ｐａｙｐａｌ" in full-width letters
- **THEN** the message is shown as sent, with the outside-payment caution, and the flag is recorded

### Requirement: Moderator console
`/mod/reports` and `/mod/addresses/$address` SHALL be reachable only by accounts with the moderator or admin role. Anyone else SHALL get the not-found surface. The account menu SHALL link to it for staff only. It SHALL list open reports grouped by reported account, newest first. Each row SHALL show:
- reason counts;
- flag counts;
- how many of its open reports carry a shared excerpt, without any message text.

Opening an account SHALL show:
- every open report's reason, note, reporter and time, and its shared excerpt;
- account signals:
  - account age;
  - linked addresses and when each was linked;
  - link history: for each address the account holds or once held, each time it was linked to the account or left it, how (see `web-cosmo-link`), and the staff member for a staff action;
  - also held by: the other accounts that have held any of those addresses, each marked when it has an active trade block or ban;
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

**Addresses.** Each address in the signals SHALL link to its lookup. For an admin, each linked address SHALL also offer Move and Unlink (see Staff link moves). A moderator SHALL not see them.

`/mod/addresses/$address` SHALL show that address's link history, newest first, with each account named and linked to its console page, and the account holding it now, if any. An address with no history SHALL show that nothing is recorded. Anyone without a staff role SHALL get the not-found surface and no history SHALL be requested.

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

#### Scenario: Earlier held by a banned account
- **WHEN** a moderator opens spam.seller22, whose linked address was earlier linked to rin.trades, now banned
- **THEN** the signals list rin.trades under also held by, marked as banned, and the link history shows when the address left rin.trades and when it was linked to spam.seller22

#### Scenario: Address lookup
- **WHEN** a moderator opens `/mod/addresses/` for an address that rin.trades held and spam.seller22 holds now
- **THEN** the page lists both accounts' links and unlinks with times, names spam.seller22 as the holder now, and each account links to its console page

#### Scenario: Address lookup when not staff
- **WHEN** a signed-in user without a moderator role opens `/mod/addresses/` for any address
- **THEN** the not-found surface is shown and no history is requested

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
- each leg's objekt, direction, state, transaction hash and time;
- for a leg verified through a wrong copy, the serial received, and whether the receiver accepted it or it was accepted automatically.

Attaching a trade SHALL add no message text beyond a shared excerpt. The usual once-per-24-hours report limit SHALL apply.

#### Scenario: Moderator sees the trade
- **WHEN** a user reports binary.bin from failed trade T-1042
- **THEN** the console shows T-1042 with one leg Verified (with its hash) and one leg broken

#### Scenario: Someone else's trade
- **WHEN** a request attaches a trade the reporter isn't part of
- **THEN** the report is refused

#### Scenario: Copy accepted automatically
- **WHEN** a moderator opens a report from T-1042, whose leg verified through a wrong copy nobody answered
- **THEN** that leg shows the serial received beside the asked-for one, marked accepted automatically

### Requirement: Staff link moves
An admin SHALL be able to, from the moderator console:
- **move** a linked address from one account to another, for example when its owner lost access to the account that holds it;
- **unlink** a linked address from its account.

Each needs a reason. A move SHALL write an audit entry on both accounts, and an unlink one on the account. Both SHALL be recorded in the address's link history with the admin (see `web-cosmo-link`). A moderator SHALL not be able to move or unlink an address, and a request from one SHALL be refused.

A move or unlink SHALL be refused, with the reason shown and nothing changed, when:
- either account has an active trade block or ban;
- the address was linked to a party of an in-progress trade when the trade was accepted, and the trade still waits on a transfer;
- the address is no longer linked to the account it is taken from;
- (a move only) both sides are the same account.

A move SHALL take effect at once, without the 7-day wait. A staff unlink SHALL start the 7-day wait like a user's unlink. The address's lists SHALL stay with the account they belong to, and its verified trades SHALL stay with the account that made them (see `web-verified-trades`).

#### Scenario: Lost access
- **WHEN** an admin moves kaede.k's old account's address to kaede.k's new account with the reason "lost Discord login"
- **THEN** the address is linked to the new account at once, both accounts' audit logs show the move with the reason, and the address's lists stay with the old account

#### Scenario: Move off a trade-blocked account
- **WHEN** an admin tries to move an address off spam.seller22, who is trade blocked
- **THEN** the move is refused with the reason, and the address stays linked to spam.seller22

#### Scenario: Move during a trade
- **WHEN** an admin tries to move an address that still owes a transfer in in-progress trade T-1050
- **THEN** the move is refused with the reason, and nothing changes

#### Scenario: Moderator sees no Move
- **WHEN** a moderator who isn't an admin opens an account with a linked address
- **THEN** the address shows no Move or Unlink, and a move request from them is refused

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
