## ADDED Requirements

### Requirement: Message attaches its card
Message on a Trade post, a For you match or a Market listing SHALL check its objekt card by the rules for sending one, then open the conversation with the card attached in the message box, and SHALL send nothing. The attached card SHALL be removable and SHALL be sent with the text when the user sends. Activating Message again for a conversation that already exists SHALL open it with the card attached and SHALL add no message. A card that can no longer be sent (the listing is gone, the objekt changed hands) SHALL be refused when Message is activated, saying why, and no conversation SHALL be opened for it.

Opening a conversation still counts as a start against the start limit the first time it is created; nothing counts against the per-minute message limit until a message is sent.

#### Scenario: Card attached, not sent
- **WHEN** a user activates Message on rin.trades's WTS post for SeoYeon 204Z
- **THEN** the thread opens with the SeoYeon 204Z card attached in the message box, and rin.trades has received nothing

#### Scenario: Send with a line
- **WHEN** the user types "Still available?" with the card attached and sends
- **THEN** one message carrying both the text and the card appears for both users

#### Scenario: Second click
- **WHEN** the user activates Message on the same post again after sending
- **THEN** the same thread opens with the card attached, and no new message is sent

#### Scenario: Card removed
- **WHEN** the user removes the attached card and sends "Hi"
- **THEN** only the text is sent

### Requirement: Unsend
A sender SHALL be able to unsend their own text or card message within 15 minutes of sending it. An offer message SHALL not be unsendable; offers are withdrawn instead. An unsent message SHALL show as "Message unsent" in place of its text and card for both people, keeping its place and time, and SHALL appear in the other person's open thread within 2 seconds while their socket is connected. An unsent message SHALL not count as unread.

The unsend action SHALL say that the message is removed for both people and that moderators can still see it if the conversation is reported (see `web-moderation`).

#### Scenario: Within the window
- **WHEN** a user unsends a text message they sent 5 minutes ago
- **THEN** both users see "Message unsent" in its place

#### Scenario: Too late
- **WHEN** a user opens the menu on their message sent 20 minutes ago
- **THEN** Unsend is not offered, and a direct request to unsend it is refused

#### Scenario: Not an offer
- **WHEN** a user opens the menu on an offer they sent
- **THEN** Unsend is not offered

#### Scenario: Unread unsent
- **WHEN** a user's only unread message from a partner is unsent before they open the conversation
- **THEN** the conversation no longer counts toward their Messages badge

### Requirement: Suggested first line
While a conversation has no messages and the user can send, the message box SHALL offer one-tap suggestions that fill the box without sending. One suggestion SHALL match the attached card: asking whether it is still for sale for a sale list's card, whether they would trade it for a have list's card, and offering it for a want list's card. Without a card the suggestions SHALL be general.

#### Scenario: Sale card
- **WHEN** a user opens a new conversation from a Market listing
- **THEN** the message box offers "Hi! Is this still for sale?", and tapping it fills the box without sending

#### Scenario: Not after the first message
- **WHEN** the conversation has any message
- **THEN** no suggestions are shown

### Requirement: Seen and typing
The thread SHALL show "Seen" under the user's latest message the other person has read, and "typing…" while the other person is writing a message. Both SHALL follow the Show Seen and typing switch (see Messages settings): when either person has it off, neither person's Seen nor typing SHALL be shown to the other. A person who has not accepted a request SHALL show neither Seen nor typing to its sender. Both SHALL update within 2 seconds while the viewer's socket is connected; typing SHALL clear within 6 seconds after the other person stops.

#### Scenario: Seen
- **WHEN** kaede.k opens a conversation where rin.trades's latest message is unread
- **THEN** rin.trades sees "Seen" under that message within 2 seconds

#### Scenario: Typing
- **WHEN** kaede.k types in the message box
- **THEN** rin.trades sees "typing…", and it clears within 6 seconds after she stops

#### Scenario: Switched off
- **WHEN** rin.trades turns Show Seen and typing off
- **THEN** rin.trades shows neither to anyone and sees neither from anyone

#### Scenario: Unaccepted request
- **WHEN** kaede.k reads a request from a stranger without accepting it
- **THEN** the stranger sees no "Seen"

## MODIFIED Requirements

### Requirement: Messages and objekt cards
A message SHALL be text of 1 to 2,000 characters, an objekt card, or both. An objekt card SHALL refer to:
- a collection, or a specific objekt;
- and optionally the list it came from.

The thread SHALL render the card as a live objekt card with the collection's art and name. A card for a specific objekt SHALL show its serial. A card from a list SHALL name the list and link to it, and show the list's price when the list is a sale list. Messages SHALL show their time and be ordered oldest to newest.

#### Scenario: Card from a sale list
- **WHEN** a user starts a chat from a Market drawer row for SeoYeon 204Z #537 on rin.trades's sale list priced 6,000 KRW and sends it
- **THEN** the thread shows a card with SeoYeon 204Z, serial 537, the list name and 6,000 KRW

#### Scenario: Too long
- **WHEN** a user tries to send 2,001 characters
- **THEN** the message is refused and the box says why

### Requirement: Requests
A conversation whose first message carries no objekt card SHALL appear in the recipient's Requests, not their Inbox, until they reply or accept. Request conversations SHALL not count as unread. Declining a request SHALL archive it for the recipient without telling the sender. A conversation whose first message carries a card SHALL go straight to the Inbox. A conversation with no message yet SHALL be shown only to the user who opened it.

#### Scenario: Cold message
- **WHEN** a user messages kaede.k from her profile with no card
- **THEN** the conversation appears under Requests for kaede.k, and her Messages badge does not change

#### Scenario: Accept
- **WHEN** kaede.k replies to the request
- **THEN** it moves to her Inbox

#### Scenario: Card removed before the first message
- **WHEN** a user activates Message on a Trade post, removes the attached card and sends "Hi"
- **THEN** the conversation appears under Requests for the post's owner

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed by the nickname of its Chat as profile, else by its display name;
- the latest message, a description of its card, or "Message unsent" when it was unsent;
- its time;
- an unread mark;
- a muted mark when muted.

Archiving SHALL move a conversation to Archived until a new message arrives or the user unarchives it. A signed-out visitor SHALL be sent to `/login?redirect=/messages`.

#### Scenario: Archive and new message
- **WHEN** the user archives a conversation and the other side sends a message
- **THEN** the conversation returns to the Inbox, unread

#### Scenario: Latest message unsent
- **WHEN** the latest message of a conversation is unsent
- **THEN** its row shows "Message unsent"

### Requirement: Messages settings
The Messages section of the account page (`/account/messages`) SHALL have "Who can message you" (Anyone with a linked Cosmo address, or Nobody), Chat as, and "Show Seen and typing", on by default. Changes SHALL save at once. The `/messages` header SHALL offer a settings control opening `/account/messages`.

#### Scenario: Turn off messages
- **WHEN** the user picks Nobody
- **THEN** Message buttons for their account disappear for other users on their next load

#### Scenario: From the Messages page
- **WHEN** the user activates the settings control on `/messages`
- **THEN** the URL is `/account/messages`

#### Scenario: Seen and typing off
- **WHEN** the user turns Show Seen and typing off
- **THEN** it saves at once, and their open threads stop showing Seen and typing
