## ADDED Requirements

### Requirement: Chat as
Messages settings SHALL offer Chat as when the account has at least one linked Cosmo profile. It is a choice of one of those profiles, each shown by its nickname. The chosen profile SHALL name the account wherever another account sees it as a partner: conversation rows and threads, offers and trades, offer notes in a thread, and blocked lists.
- Without a choice, the first profile the account linked SHALL be used.
- Hide nickname SHALL not affect it: the chosen or default profile is shown by its nickname, or by its shortened address when Cosmo gave it none.
- A change SHALL apply to every conversation, past ones included, on the other side's next load.
- When the chosen profile is unlinked, the default SHALL apply again.
- With no linked profile, the setting SHALL not be shown and the display name SHALL be used.
- A request choosing an address not linked to the caller SHALL be refused, and the setting SHALL stay unchanged.

#### Scenario: Pick a second profile
- **WHEN** a user whose first linked profile is "rin.main" picks "rin.alt" under Chat as
- **THEN** their partners' conversation rows and threads head them as "rin.alt"

#### Scenario: Hidden nickname
- **WHEN** the user's chosen profile has Hide nickname on
- **THEN** partners still see that profile's nickname

#### Scenario: Chosen profile unlinked
- **WHEN** the user unlinks the profile chosen under Chat as
- **THEN** partners see them by their first linked remaining profile, and Chat as shows that one selected

#### Scenario: Someone else's address
- **WHEN** a request sets Chat as to an address linked to another account
- **THEN** it is refused and the setting is unchanged

## MODIFIED Requirements

### Requirement: Messages settings
The Messages section of the account page (`/account/messages`) SHALL have "Who can message you" (Anyone with a linked Cosmo address, or Nobody) and Chat as. Changes SHALL save at once. The `/messages` header SHALL offer a settings control opening `/account/messages`.

#### Scenario: Turn off messages
- **WHEN** the user picks Nobody
- **THEN** Message buttons for their account disappear for other users on their next load

#### Scenario: From the Messages page
- **WHEN** the user activates the settings control on `/messages`
- **THEN** the URL is `/account/messages`

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed by the nickname of its Chat as profile, else by its display name;
- the latest message, or a description of its card;
- its time;
- an unread mark;
- a muted mark when muted.

Archiving SHALL move a conversation to Archived until a new message arrives or the user unarchives it. A signed-out visitor SHALL be sent to `/login?redirect=/messages`.

#### Scenario: Archive and new message
- **WHEN** the user archives a conversation and the other side sends a message
- **THEN** the conversation returns to the Inbox, unread
