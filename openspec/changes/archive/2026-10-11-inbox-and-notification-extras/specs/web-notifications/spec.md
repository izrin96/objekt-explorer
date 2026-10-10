## MODIFIED Requirements

### Requirement: Notification bell and popover
A signed-in visitor SHALL see a bell in the frame with a dot while any notification is unread, and none at zero; the bell's label carries the count, and the popover's header shows it as "N unread". Activating the bell SHALL open a popover that lists the user's notifications newest first, 20 at a time with a control to load more. Each notification shows its text, how long ago it happened, and whether it is unread. It leads with an icon tile whose icon and colour say what happened:
- a transfer verified, a trade completed, or an offer accepted: a green check;
- a stall reminder: an amber clock;
- a wrong copy sent in a trade: an amber warning sign;
- an offer or trade cancelled, failed or expired: a red cross;
- an offer received or countered: an indigo arrow;
- an offer declined or withdrawn, or a wrong copy declined: a neutral arrow;
- a want-list alert: amber, the want colour; a reverse-direction alert: teal, the have colour (see `web-lists`);
- a sanction notice: a red shield.

The colour SHALL never be the only cue: the text names the event, and the icon differs by kind. The popover SHALL offer Mark all read.

**Tabs.** Under the header, the popover SHALL offer three tabs:
- All: every notification;
- Trades: offer and trade notifications;
- Want list: want-list and reverse-direction alerts.

All is selected each time the popover opens. Each tab lists its own notifications newest first, 20 at a time, filtered by the server. The unread count, the bell's dot and Mark all read SHALL stay account-wide whatever tab is shown. An empty tab SHALL say it has nothing of its kind. A request for notifications that names no tab SHALL be treated as All.

**Phones.** Below `sm`, the bell SHALL open the same contents as a full-screen sheet, with the title, the unread count, Mark all read and a close control in its header, then the tabs and the list. Closing it, or activating a notification, SHALL return focus to the bell or navigate to the notification's target. From `sm` up, it stays a popover. Activating a notification SHALL mark it read and navigate to its target. A signed-out visitor SHALL see no bell.

#### Scenario: Unread count
- **WHEN** a signed-in user has 12 unread notifications
- **THEN** the bell shows a dot, the popover's header reads "12 unread", and it lists the newest 20 with the 12 unread ones marked

#### Scenario: Open a notification
- **WHEN** the user activates an unread want-list alert in the popover
- **THEN** it is shown as read, the bell's count drops by one, and the browser is at the alert's target

#### Scenario: Mark all read
- **WHEN** the user activates Mark all read
- **THEN** no notification is unread and the bell shows no number

#### Scenario: Signed out
- **WHEN** a visitor without a session loads any page
- **THEN** no bell is rendered, and no notification request or per-user connection is made

#### Scenario: Language follows the viewer
- **WHEN** a want-list alert is created while the user browses in English, and they then switch the site to 한국어
- **THEN** the same notification reads in Korean

#### Scenario: Kinds at a glance
- **WHEN** the popover lists a verified transfer, a reminder and a cancelled offer
- **THEN** they lead with a green check, an amber clock and a red cross, each beside its own text

#### Scenario: Wrong copy sent
- **WHEN** the giver in T-1042 sends #1207 where the trade asks for #1203
- **THEN** both parties get a notification leading with an amber warning sign that names T-1042 and both serials, linking to the trade page

#### Scenario: Wrong copy declined
- **WHEN** the receiver declines that copy
- **THEN** the giver gets a notification leading with a neutral arrow that says it was declined, linking to the trade page

#### Scenario: Trades tab
- **WHEN** the user has a want-list alert, a countered offer and a verified transfer, and selects Trades
- **THEN** only the countered offer and the verified transfer are listed

#### Scenario: Mark all read from a tab
- **WHEN** the user selects Want list and activates Mark all read
- **THEN** every notification on every tab is read, and the bell shows no dot

#### Scenario: Phone sheet
- **WHEN** a signed-in user taps the bell at 390 px
- **THEN** the notifications open full screen with All, Trades and Want list tabs, and the close control returns to the page
