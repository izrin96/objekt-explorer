## Purpose

Shows signed-in people whether someone they might trade or chat with has the site open right now, as a green dot on that person's avatar, and lets anyone hide their own.

## ADDED Requirements

### Requirement: What online means
A person SHALL count as online while at least one signed-in tab of the site is open for their account, whether the tab is in front or in the background and whatever page it shows. Opening the site SHALL make them online, and closing or losing their last tab SHALL make them offline. A signed-out tab SHALL not make anyone online.

#### Scenario: Background tab
- **WHEN** rin.trades has the site open in a background tab and no other
- **THEN** rin.trades counts as online

#### Scenario: Last tab closed
- **WHEN** rin.trades closes the last tab that had the site open
- **THEN** rin.trades counts as offline

### Requirement: Online dot
While a person is online and the viewer may see it (see Who sees the dot), their avatar SHALL carry a success-coloured dot in its bottom corner, with "Online" as its text alternative, on:
- each conversation row on `/messages`;
- the open thread's header, which SHALL also say "Online" in words;
- the person row header on `/trade` and `/trade/for-you`;
- the profile header on `/@<name>` of a linked account.

No other place SHALL show it.

#### Scenario: Conversation list
- **WHEN** a viewer opens `/messages` while rin.trades, one of their conversations, is online
- **THEN** rin.trades' row has a green dot on its avatar, and a screen reader reads "Online"

#### Scenario: Thread header
- **WHEN** the viewer opens their thread with rin.trades while rin.trades is online
- **THEN** the header has the dot on the avatar and says "Online"

#### Scenario: Offline
- **WHEN** rin.trades has no tab open
- **THEN** no avatar of rin.trades carries a dot, and the thread header does not say "Online"

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
