## MODIFIED Requirements

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed by the nickname of its Chat as profile, else by its display name;
- the latest message, a description of its card, or "Message unsent" when it was unsent;
- its time;
- an unread mark;
- a muted mark when muted.

**Search.** Above the list, a search field SHALL filter the box being shown. A conversation matches when the query appears, ignoring case, in:
- the other account's shown name or the Cosmo nickname of any of its linked addresses;
- the collection of any objekt card sent in the conversation and not unsent. "SeoYeon 204Z" and "seoyeon-204z" both match SeoYeon 204Z.

Message text SHALL never be searched. The query SHALL live in the URL (`q`), apply on the server, and keep the box's order and paging. Clearing the field SHALL show the whole box again. With no match, the list SHALL say nothing matches the query and offer to clear it. A conversation list request without a query SHALL behave as it does today.

Archiving SHALL move a conversation to Archived until a new message arrives or the user unarchives it. A signed-out visitor SHALL be sent to `/login?redirect=/messages`.

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
- **THEN** the list says nothing matches and offers to clear the search
