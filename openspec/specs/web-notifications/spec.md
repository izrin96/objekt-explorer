# web-notifications Specification

## Purpose
In-app notifications on `apps/web`: what a signed-in user is told, how they see and clear it, how open tabs stay current, and the rules that turn new listings into want-list alerts.

## Requirements

### Requirement: Notification bell and popover
A signed-in visitor SHALL see a bell in the frame with a dot while any notification is unread, and none at zero; the bell's label carries the count, and the popover's header shows it as "N unread". Activating the bell SHALL open a popover that lists the user's notifications newest first, 20 at a time with a control to load more. Each notification shows its text, how long ago it happened, and whether it is unread. It leads with an icon tile whose icon and colour say what happened:
- a transfer verified, a trade completed, or an offer accepted: a green check;
- a stall reminder: an amber clock;
- an offer or trade cancelled, failed or expired: a red cross;
- an offer received or countered: an indigo arrow;
- an offer declined or withdrawn: a neutral arrow;
- a want-list alert: amber, the want colour; a reverse-direction alert: teal, the have colour (see `web-lists`);
- a sanction notice: a red shield.

The colour SHALL never be the only cue: the text names the event, and the icon differs by kind. The popover SHALL offer Mark all read. Activating a notification SHALL mark it read and navigate to its target. A signed-out visitor SHALL see no bell.

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

### Requirement: Bell links to its settings
The bell's popover SHALL offer a Notification settings link opening `/account/notifications`.

#### Scenario: Open settings from the bell
- **WHEN** the user opens the bell and activates Notification settings
- **THEN** the URL is `/account/notifications` and the popover is closed

### Requirement: Read state is per account
Read state SHALL be stored on the server per account, so a notification read in one tab or on one device is read everywhere. A user SHALL only ever be able to list or change their own notifications.

#### Scenario: Another device
- **WHEN** the user marks all read on their phone and then focuses a desktop tab that was open the whole time
- **THEN** the desktop bell shows no number without a reload

#### Scenario: Foreign id
- **WHEN** a request asks to mark read a notification id that belongs to another account
- **THEN** nothing changes and the response reveals nothing about that notification

### Requirement: Open tabs stay current
While a signed-in page is open, a new notification or a change in read state SHALL appear in the bell within 5 seconds when the per-user live connection is open. Without the connection, it SHALL appear when the window regains focus or within 60 seconds. The live connection SHALL require a valid session and SHALL refuse a connection whose `Origin` is not the site's own origin. It SHALL only deliver events for the account whose session opened it. A dropped connection SHALL reconnect with backoff and then refetch, so nothing missed while disconnected is lost.

#### Scenario: Live arrival
- **WHEN** a want-list alert is created for a user with the site open
- **THEN** the bell's count rises within 5 seconds without user action

#### Scenario: Cross-site page
- **WHEN** a page on another origin tries to open the per-user connection with the user's cookies
- **THEN** the connection is refused and no event is delivered

#### Scenario: No session
- **WHEN** the per-user connection is requested without a valid session
- **THEN** it is refused

### Requirement: Notification settings
The Notifications section of the account page (`/account/notifications`) SHALL have one switch per notification type:
- "Someone has what you want", on by default;
- "Someone wants what you have", off by default;
- Offers, on by default;
- Trades, on by default.

Turning a type off SHALL stop new notifications of that type. Notifications already created SHALL stay.

#### Scenario: Turn off "Someone has what you want"
- **WHEN** the user turns "Someone has what you want" off and a matching objekt is listed afterwards
- **THEN** no new notification is created for it

#### Scenario: Turn off offers
- **WHEN** the user turns Offers off and then receives an offer
- **THEN** no notification is created, and the offer still appears in the conversation and in My trades

#### Scenario: Turn off trades
- **WHEN** the user turns Trades off and a leg of their trade verifies
- **THEN** no notification is created, and the trade page still shows the leg Verified

### Requirement: Want-list alerts
For each of a user's want lists, whether or not it is on Trade, the system SHALL notify the user when an entry for a collection on that want list is newly added to another account's discoverable sale or have list bound to a Cosmo profile. It SHALL also notify when such a list becomes discoverable. The alert SHALL arrive within 10 minutes, including when entries are committed out of order. Alerts SHALL be grouped as one unread notification per want list per day. While that notification is unread, further matches SHALL update its count and the latest objekts instead of creating new ones. Its target SHALL be `/trade/for-you?list=<want-list-slug>`. A given want list, source list and collection SHALL alert at most once, even if the entry is removed and added again.

No alert SHALL be created for:
- the user's own lists;
- a hidden partner;
- an entry whose objekt the source list's owner no longer owns, or which is not transferable;
- a collection the user already owns a copy of.

#### Scenario: New sale listing matches a want list
- **WHEN** another account adds SeoYeon 204Z to a sale list shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt"
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt" naming that objekt and seller, linking to `/trade/for-you?list=<slug>`

#### Scenario: Grouped while unread
- **WHEN** three more matches for "Binary hunt" arrive the same day before the user opens the first notification
- **THEN** the user still has one unread notification for "Binary hunt", and it now counts four matches

#### Scenario: Re-added entry
- **WHEN** the seller removes the matched entry and adds it again
- **THEN** no new alert is created for it

#### Scenario: Already owned
- **WHEN** a matching objekt is listed but the user already owns a copy of that collection
- **THEN** no alert is created

### Requirement: Reverse-direction alerts
When the user has "Someone wants what you have" turned on, the system SHALL notify them when another account adds, to a discoverable want list, a collection that is on one of the user's have or sale lists bound to a Cosmo profile. The same grouping, once-only, timing and exclusion rules as want-list alerts SHALL apply, grouped per the user's list. The target SHALL be `/trade/for-you?list=<that-list-slug>`.

#### Scenario: Off by default
- **WHEN** a user has never changed the setting and someone wants a collection on their have list
- **THEN** no notification is created

### Requirement: Retention
Read notifications SHALL be removed 90 days after they were created. Unread notifications SHALL be kept.

#### Scenario: Old read notification
- **WHEN** a notification was read and created more than 90 days ago
- **THEN** it no longer appears in the popover

### Requirement: Sanction notices
A warn, chat mute or trade block SHALL create a notification for the sanctioned user, with the action, the reason and the end date if any. A ban SHALL not, because the account is signed out. A sanction notification SHALL not be grouped with others.

#### Scenario: Warned
- **WHEN** a moderator warns a user with reason "asking traders to send first"
- **THEN** the user's bell shows a warning with that reason

### Requirement: No alerts across blocks
Want-list alerts SHALL not be created between two accounts when either has blocked the other, or about lists of an account under an active trade block.

#### Scenario: Blocked lister
- **WHEN** an account the user blocked lists a collection on the user's want list
- **THEN** no alert is created

### Requirement: Offer notifications
A user SHALL be notified when an offer:
- is received;
- is countered;
- they sent is accepted or declined;
- sent to them is withdrawn;
- expires;
- either way is cancelled, with the reason.

Notifications for one conversation SHALL group into a single unread row. Opening one SHALL go to the conversation, or to the trade page once the offer is accepted.

#### Scenario: Countered
- **WHEN** rin.trades counters the user's offer
- **THEN** the bell shows "rin.trades countered your offer O-881", which opens the conversation

#### Scenario: Expired
- **WHEN** an offer the user sent goes unanswered for 7 days
- **THEN** both parties are notified that it expired

### Requirement: Trade notifications
Each party SHALL be notified when, in one of their trades:
- a leg verifies;
- the trade completes, with a prompt to leave feedback;
- the trade is cancelled or fails, with the reason;
- a stall reminder is due.

Notifications for one trade SHALL group into a single unread row, and opening one SHALL go to the trade page.

#### Scenario: Leg verified
- **WHEN** binary.bin's transfer of HyeRin 301Z #1203 to the user is verified
- **THEN** the bell shows "Transfer verified · T-1042 1 of 2", which opens the trade page
