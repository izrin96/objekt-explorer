## MODIFIED Requirements

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

## ADDED Requirements

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
