# Spec Delta

## ADDED Requirements

### Requirement: Other profiles in a thread
A conversation SHALL be between two accounts, headed by the other account's default profile (see `web-cosmo-link`). When that account has other linked profiles that are not private, the thread header SHALL name them after the default ("rin.main · also rin.alt"). When the user opened the conversation from a profile that is not the account's default, an empty thread SHALL say once that this profile belongs to the account it is headed by. A private profile SHALL never be named in either place.

#### Scenario: Other profiles in the header
- **WHEN** the user opens a conversation with an account whose default is "rin.main" and which also links "rin.alt"
- **THEN** the thread header reads "rin.main · also rin.alt"

#### Scenario: Started from an alt profile
- **WHEN** the user presses Message on "rin.alt"'s profile, whose account's default is "rin.main", and has never messaged that account
- **THEN** the thread is headed "rin.main" and the empty thread says "rin.alt is one of rin.main's profiles"

#### Scenario: Existing conversation
- **WHEN** the user presses Message on "rin.alt"'s profile and already has a conversation with that account
- **THEN** that conversation opens, history included, headed "rin.main"

#### Scenario: Private profile
- **WHEN** the other account also links a private profile
- **THEN** neither the header nor the empty thread names it

## MODIFIED Requirements

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed by its default profile (see `web-cosmo-link`), else by its display name;
- the latest message, a description of its card, or "Message unsent" when it was unsent;
- its time;
- an unread mark;
- a muted mark when muted.

**Search.** Above the list, a search field SHALL filter the box being shown. On an empty Requests or Archived box with no query, the field SHALL be hidden while it is not in use. A conversation matches when the query appears, ignoring case, in:
- the other account's shown name or the Cosmo nickname of any of its linked addresses;
- the collection of any objekt card sent in the conversation and not unsent. "SeoYeon 204Z" and "seoyeon-204z" both match SeoYeon 204Z.

Message text SHALL never be searched. The query SHALL live in the URL (`q`), apply on the server, and keep the box's order and paging. Clearing the field SHALL show the whole box again and return focus to the field. With no match, the list SHALL say nothing matches the query and offer to clear it. The result SHALL be announced to assistive technology (the number of matches, or that nothing matches), and the previous results SHALL stay on screen until the new ones arrive. A conversation list request without a query SHALL behave as it does today.

Archiving SHALL move a conversation to Archived until a new message arrives or the user restores it. Restoring a declined request SHALL return it to Requests, and the action SHALL be labelled for where it goes. Archive, Decline, Accept and restore SHALL each confirm with a short notice; Archive and Decline SHALL offer Undo. After a row leaves the list, focus SHALL move to the next row, or to the list when none is left.

When the Inbox is empty and requests are waiting, the empty state SHALL say how many requests are waiting and link to Requests. A signed-out visitor SHALL be sent to `/login?redirect=/messages`.

#### Scenario: Archive and new message
- **WHEN** the user archives a conversation and the other side sends a message
- **THEN** the conversation returns to the Inbox, unread

#### Scenario: Latest message unsent
- **WHEN** the latest message of a conversation is unsent
- **THEN** its row shows "Message unsent"

#### Scenario: Search by name
- **WHEN** the user types "rin" in the Inbox search
- **THEN** the URL carries `q=rin`, and only conversations whose other account's name or nickname contains "rin" are listed, newest first

#### Scenario: Search by objekt
- **WHEN** the user searches "seoyeon 204z", and a conversation holds a SeoYeon 204Z card
- **THEN** that conversation is listed, even though its other account's name doesn't match

#### Scenario: Not message text
- **WHEN** a conversation's only mention of "wise" is in a message's text
- **THEN** searching "wise" doesn't list it

#### Scenario: Nothing matches
- **WHEN** a search matches no conversation in Archived
- **THEN** the list says nothing matches and offers to clear the search, and a screen reader announces it

#### Scenario: Restore a declined request
- **WHEN** kaede.k opens the menu of a request she declined, in Archived
- **THEN** it offers "Move to Requests", and using it puts the conversation back under Requests

#### Scenario: Undo decline
- **WHEN** kaede.k declines a request by mistake
- **THEN** a notice says it moved to Archived and offers Undo, which returns it to Requests

#### Scenario: Requests waiting
- **WHEN** a user whose only conversations are 2 requests opens the Inbox
- **THEN** the empty state says 2 requests are waiting and links to Requests

### Requirement: Messages settings
The Messages section of the account page (`/account/messages`) SHALL have "Who can message you" (Anyone with a linked Cosmo address, or Nobody), and "Show Seen and typing", on by default, and SHALL say which name partners see the account by ("People see you as <name>", its default profile; see `web-cosmo-link`), linking to `/account/profiles` when the account has two or more linked profiles. Changes SHALL save at once. The `/messages` header SHALL offer a settings control opening `/account/messages`. When the settings fail to load, the section SHALL say so and offer Retry rather than leave the controls disabled.

Partners' open threads SHALL be told about a Show Seen and typing change only when its value actually changes. A user SHALL be able to change it at most once every 10 seconds; a faster change SHALL be refused and the UI SHALL say when to try again.

#### Scenario: Turn off messages
- **WHEN** the user picks Nobody
- **THEN** Message buttons for their account disappear for other users on their next load

#### Scenario: From the Messages page
- **WHEN** the user activates the settings control on `/messages`
- **THEN** the URL is `/account/messages`

#### Scenario: Seen and typing off
- **WHEN** the user turns Show Seen and typing off
- **THEN** it saves at once, and their open threads stop showing Seen and typing

#### Scenario: Load fails
- **WHEN** the Messages settings fail to load
- **THEN** the section says they couldn't be loaded and offers Retry

#### Scenario: Same value
- **WHEN** a request sets Show Seen and typing to the value it already has
- **THEN** no partner is told about a change

#### Scenario: Name partners see
- **WHEN** a user whose default profile is "rin.alt", one of two linked profiles, opens `/account/messages`
- **THEN** the section reads "People see you as rin.alt" with a link to `/account/profiles`, and offers no profile picker

## REMOVED Requirements

### Requirement: Chat as
**Reason**: Moved to `web-cosmo-link` as Default profile, chosen on `/account/profiles`; the rule it states is unchanged.
**Migration**: The migration copies each stored Chat as choice onto that link as the default profile and drops the old setting; nothing for users to redo.
