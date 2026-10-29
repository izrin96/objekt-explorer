# web-presence Specification

## Purpose
Shows signed-in people whether someone they might trade or chat with has the site open right now, as a dot on that person's avatar, and lets anyone hide their own.

## Requirements

### Requirement: What online means
A person SHALL count as online while at least one signed-in tab of the site is open for their account, whether the tab is in front or in the background and whatever page it shows. Opening the site SHALL make them online, and closing or losing their last tab SHALL make them offline. A signed-out tab SHALL not make anyone online.

#### Scenario: Background tab
- **WHEN** rin.trades has the site open in a background tab and no other
- **THEN** rin.trades counts as online

#### Scenario: Last tab closed
- **WHEN** rin.trades closes the last tab that had the site open
- **THEN** rin.trades counts as offline

### Requirement: Online dot
While a person is online and not idle (see Idle) and the viewer may see it (see Who sees the dot), their avatar SHALL carry a success-coloured dot in its bottom corner, with "Online" as its text alternative; while they are idle it SHALL carry the idle crescent in the same place instead. The dot and crescent SHALL appear on:
- each conversation row on `/messages`;
- the open thread's header, which SHALL also say "Online" or "Idle" in words;
- the person row header on `/trade` and `/trade/for-you`;
- the profile header on `/@<name>` of a linked account.

No other place SHALL show them.

#### Scenario: Conversation list
- **WHEN** a viewer opens `/messages` while rin.trades, one of their conversations, is online and not idle
- **THEN** rin.trades' row has a green dot on its avatar, and a screen reader reads "Online"

#### Scenario: Thread header
- **WHEN** the viewer opens their thread with rin.trades while rin.trades is online and not idle
- **THEN** the header has the dot on the avatar and says "Online"

#### Scenario: Offline
- **WHEN** rin.trades has no tab open
- **THEN** no avatar of rin.trades carries a dot or crescent, and the thread header says neither "Online" nor "Idle"

#### Scenario: Unlinked profile
- **WHEN** the viewer opens the profile of an address that no account has linked
- **THEN** the profile header shows no dot

### Requirement: Who sees the dot
A viewer SHALL see a person's dot only when all of these hold: the viewer is signed in; the person has Show when I'm online on; neither has blocked the other; and the person is not the viewer. The server SHALL apply these rules, and SHALL return only whether each asked-about person is online for that viewer. It SHALL not reveal who is connected otherwise. The viewer's own switch SHALL not change what they see.

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade` while rin.trades is online
- **THEN** rin.trades' row shows no dot

#### Scenario: Person hides
- **WHEN** rin.trades has Show when I'm online off
- **THEN** no viewer sees a dot on rin.trades' avatar

#### Scenario: Viewer hides
- **WHEN** a viewer with Show when I'm online off opens `/messages` while rin.trades is online with it on
- **THEN** the viewer still sees rin.trades' dot, and nobody sees the viewer's

#### Scenario: Blocked
- **WHEN** either the viewer or rin.trades has blocked the other
- **THEN** neither sees the other's dot

#### Scenario: Own row
- **WHEN** a signed-in viewer sees their own row on `/trade` or their own profile
- **THEN** their own avatar shows no dot

#### Scenario: Chat request
- **WHEN** rin.trades has sent the viewer a message request that the viewer has not accepted, and both are online with the switch on
- **THEN** each sees the other's dot, as they would on `/trade`

### Requirement: How fast the dot follows
While a viewer's tab is in front, a person's dot SHALL appear within 60 seconds of them coming online and disappear within 60 seconds of them going offline or turning the switch off. A dot that newly comes on screen, such as a row scrolled into view or a newly opened thread, SHALL show its state within 2 seconds. A tab in the background SHALL not ask for presence, and SHALL catch up within 2 seconds of coming to the front.

#### Scenario: Comes online
- **WHEN** rin.trades opens the site while the viewer has `/messages` open in front
- **THEN** rin.trades' row gains the dot within 60 seconds, without a reload

#### Scenario: Scrolled into view
- **WHEN** the viewer scrolls Browse to a person who is online
- **THEN** that person's row shows the dot within 2 seconds

#### Scenario: Back to the tab
- **WHEN** the viewer returns to a background `/messages` tab after 10 minutes
- **THEN** the dots are brought up to date within 2 seconds

### Requirement: Presence failures stay quiet
When presence can't be read because the real-time server is down or unconfigured, or the viewer is over the request limit, the site SHALL show no dots rather than an error, and SHALL keep the rest of each page working. It SHALL try again on the next check.

#### Scenario: Real-time server down
- **WHEN** the real-time server is unreachable while a viewer opens `/messages`
- **THEN** the conversation list loads with no dots and no error message

### Requirement: Idle
A person SHALL count as idle while they are online (see What online means) but none of their tabs has seen activity for 10 minutes. Activity SHALL be a click, tap, key press, mouse wheel or pointer movement in a tab that is in front, opening the site in a tab that is in front, or bringing a tab to the front. A scroll the site makes by itself SHALL not count. An idle person's dot SHALL be a warning-coloured crescent, with "Idle" as its text alternative (see Online dot).

#### Scenario: Tab left open
- **WHEN** rin.trades leaves the site open in a background tab and does nothing for 10 minutes
- **THEN** a viewer sees an amber crescent on rin.trades' avatar, and a screen reader reads "Idle"

#### Scenario: Thread header
- **WHEN** the viewer opens their thread with rin.trades while rin.trades is idle
- **THEN** the header shows the amber crescent and says "Idle"

#### Scenario: Any tab keeps them online
- **WHEN** rin.trades has one tab idle in the background and is clicking around in another
- **THEN** rin.trades shows as online, not idle

#### Scenario: Thread follows a new message
- **WHEN** rin.trades is idle with a thread open in front, and a new message scrolls it
- **THEN** rin.trades stays idle

#### Scenario: Hidden
- **WHEN** rin.trades has Show when I'm online off
- **THEN** no viewer sees an idle dot on rin.trades' avatar

### Requirement: How fast idle follows
A person SHALL show as idle to a viewer whose tab is in front within 2 minutes of passing 10 minutes without activity, and SHALL show as online again within 60 seconds of their next activity. A dot that comes on screen SHALL show its online, idle or offline state within 2 seconds, as the online dot does.

#### Scenario: Comes back
- **WHEN** rin.trades has been idle for an hour and then clicks in their open tab
- **THEN** a viewer with `/messages` open in front sees rin.trades' amber crescent turn into a green dot within 60 seconds

### Requirement: Idle fails toward online
When activity can't be read, or there is no record of a person's activity (only tabs opened before idle existed, or records lost), an online person SHALL show as online, not idle. A failed activity report SHALL not show an error to the person whose activity it was.

#### Scenario: Activity store down
- **WHEN** the store that holds activity is unreachable while rin.trades is online
- **THEN** viewers see rin.trades' dot as online, and rin.trades sees no error

#### Scenario: Tab from before the deploy
- **WHEN** rin.trades is clicking around in a tab opened before idle was deployed, and has no other
- **THEN** viewers see rin.trades as online, not idle
