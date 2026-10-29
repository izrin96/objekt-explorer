## MODIFIED Requirements

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

## ADDED Requirements

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
