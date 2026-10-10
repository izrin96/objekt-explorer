## MODIFIED Requirements

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
