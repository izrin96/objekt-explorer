# web-chat Specification

## Purpose
Private one-to-one chat on `apps/web` at `/messages`: one conversation per pair of accounts, with objekt cards so a deal can start from the objekt being traded and stay on the site.

## Requirements

### Requirement: One conversation per pair
Two accounts SHALL have at most one conversation between them, whoever starts it. Starting a chat with someone the user already has a conversation with SHALL reopen that conversation, adding any attached card as a new message. A user SHALL never start a conversation with themselves.

#### Scenario: Second start reopens
- **WHEN** a user messages rin.trades from a Trade post and later from rin.trades's profile
- **THEN** both lead to the same conversation, and the Trade post's card is still in it

### Requirement: Messages and objekt cards
A message SHALL be text of 1 to 2,000 characters, an objekt card, or both. An objekt card SHALL refer to:
- a collection, or a specific objekt;
- and optionally the list it came from.

The thread SHALL render the card as a live objekt card with the collection's art and name. A card for a specific objekt SHALL show its serial. A card from a list SHALL name the list and link to it, and show the list's price when the list is a sale list. Messages SHALL show their time and be ordered oldest to newest.

#### Scenario: Card from a sale list
- **WHEN** a user starts a chat from a Market drawer row for SeoYeon 204Z #537 on rin.trades's sale list priced 6,000 KRW
- **THEN** the thread opens with a card showing SeoYeon 204Z, serial 537, the list name and 6,000 KRW

#### Scenario: Too long
- **WHEN** a user tries to send 2,001 characters
- **THEN** the message is refused and the box says why

### Requirement: Who can start a conversation
To start a conversation, the sender SHALL have at least one linked Cosmo address and be signed in. A signed-out visitor using Message SHALL be sent to sign in, and then back. A sender without a linked address SHALL be offered the link flow instead.

The recipient's "Who can message you" setting SHALL decide the rest:
- Anyone with a linked Cosmo address, the default;
- Nobody: Message buttons for this account are hidden, and starting a conversation is refused.

The setting applies to new conversations only. Existing conversations stay open.

#### Scenario: No linked address
- **WHEN** a signed-in user with no linked Cosmo address activates Message on a Trade post
- **THEN** no conversation is created, and they are offered the link flow

#### Scenario: Recipient allows nobody
- **WHEN** an account's setting is Nobody
- **THEN** no Message button is shown for that account, and a direct request to start a conversation is refused

### Requirement: Lists that hide their owner
A list or profile that hides its owner's account SHALL offer Message only when the owner turned on "Allow messages on lists that hide my identity". That setting is off by default. Starting a conversation from such a list reveals the owner's account to the sender, and the setting's description SHALL say so.

#### Scenario: Hidden owner, not opted in
- **WHEN** a Market drawer row belongs to a sale list with Hide User on, and its owner has not opted in
- **THEN** that row has no Message action

#### Scenario: Hidden owner, opted in
- **WHEN** the owner turned the setting on
- **THEN** the row has a Message action, and the conversation shows the owner's account

### Requirement: Requests
A conversation started without an objekt card (from a profile) SHALL appear in the recipient's Requests, not their Inbox, until they reply or accept. Request conversations SHALL not count as unread. Declining a request SHALL archive it for the recipient without telling the sender. A conversation started with a card SHALL go straight to the Inbox.

#### Scenario: Cold message
- **WHEN** a user messages kaede.k from her profile with no card
- **THEN** the conversation appears under Requests for kaede.k, and her Messages badge does not change

#### Scenario: Accept
- **WHEN** kaede.k replies to the request
- **THEN** it moves to her Inbox

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed as For you heads a partner;
- the latest message, or a description of its card;
- its time;
- an unread mark;
- a muted mark when muted.

Archiving SHALL move a conversation to Archived until a new message arrives or the user unarchives it. A signed-out visitor SHALL be sent to `/login?redirect=/messages`.

#### Scenario: Archive and new message
- **WHEN** the user archives a conversation and the other side sends a message
- **THEN** the conversation returns to the Inbox, unread

### Requirement: Thread view
`/messages/$id` SHALL show the conversation with:
- the other account and a link to their profile;
- the messages;
- a message box with Attach objekt.

Attach objekt SHALL let the user pick an objekt from their own collection or a collection from their lists. Opening the thread SHALL mark it read for that user. On viewports below `md`, the list and the thread SHALL be separate screens with a back control. A conversation the user is not part of SHALL show the not-found surface.

#### Scenario: Not a member
- **WHEN** a user opens `/messages/<id>` for a conversation between two other accounts
- **THEN** the not-found surface is shown and no message is returned

#### Scenario: Phone
- **WHEN** a user opens a conversation at 390 px
- **THEN** only the thread is shown, with a back control to the list, and the page does not scroll sideways

### Requirement: Realtime delivery
A sent message SHALL appear in the recipient's open thread and inbox within 2 seconds while their `/ws/me` socket is connected. After a reconnect, the client SHALL fetch every message newer than the newest it holds, so no message is lost while disconnected. Sending SHALL work while the socket is down.

#### Scenario: Live
- **WHEN** both users have the thread open and one sends a message
- **THEN** it appears for the other within 2 seconds without a reload

#### Scenario: Offline then back
- **WHEN** the recipient's socket was down while 3 messages arrived and then reconnects
- **THEN** all 3 appear in order

### Requirement: Unread badge
When a session exists, the frame SHALL show a Messages icon linking to `/messages`, with the number of Inbox conversations holding unread messages. Muted conversations and requests SHALL not count.

#### Scenario: Muted does not count
- **WHEN** the user has 2 unread conversations and mutes one of them
- **THEN** the badge shows 1

### Requirement: Mute
The user SHALL be able to mute a conversation for 8 hours, 1 week or until unmuted. A muted conversation SHALL still receive messages, SHALL not count toward the badge, and SHALL show a muted mark. Muting SHALL be private to the user who muted.

#### Scenario: Mute ends
- **WHEN** a mute for 8 hours ends
- **THEN** new unread messages count toward the badge again

### Requirement: Rate limits
A user SHALL be able to start at most 20 new conversations per rolling 24 hours, or 5 if their account is younger than 7 days. A user SHALL be able to send at most 30 messages per minute. Over a limit, the request SHALL be refused, and the UI SHALL say when the user can try again.

#### Scenario: New account
- **WHEN** a 2-day-old account tries to start a sixth conversation within 24 hours
- **THEN** it is refused, and the UI says when it can start another

### Requirement: Messages settings
The account dialog SHALL have a Messages section with "Who can message you" (Anyone with a linked Cosmo address, or Nobody) and "Allow messages on lists that hide my identity". Changes SHALL save at once.

#### Scenario: Turn off messages
- **WHEN** the user picks Nobody
- **THEN** Message buttons for their account disappear for other users on their next load

### Requirement: Blocks and chat mutes gate sending
Starting a conversation or sending a message SHALL be refused when either account has blocked the other. The refusal reason SHALL read the same as "this user isn't accepting messages", so the blocked side cannot tell. It SHALL also be refused while the sender has an active chat mute. In that case the message box SHALL be replaced by a notice with the mute's reason and end date (see `web-moderation`).

#### Scenario: Muted sender
- **WHEN** a user under a chat mute until Oct 13 opens a conversation
- **THEN** the message box shows "You can't send messages until Oct 13" and the reason, and no send is possible

### Requirement: Caution on suspicious messages
The thread SHALL show the scam-phrase caution (see `web-moderation`) under a received message that matches a pattern, and nothing on the sender's side.

#### Scenario: Recipient sees caution
- **WHEN** a received message asks to pay outside the site
- **THEN** a caution line appears under it in the recipient's thread only

### Requirement: Thread menu safety actions
A conversation's menu SHALL offer Block and Report… alongside mute and archive.

#### Scenario: Menu
- **WHEN** the user opens a conversation's menu
- **THEN** it lists Mute, Archive, Block and Report…

### Requirement: Offer cards in the thread
An offer SHALL appear in the thread as an offer card, in order with the other messages. The card shows:
- the O number;
- both sides, labelled from the viewer's side (You give, You get);
- the top-up and the note;
- the current status.

The newest offer card is full, and older offer cards in the conversation collapse. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card changes to Accepted, with a link to the trade

### Requirement: Offer from the composer
The thread's composer SHALL have an Offer action that opens the offer builder for this conversation. It is hidden wherever the message box is hidden or replaced by a notice. A first offer sent from outside a conversation SHALL open a new conversation under the same start rules as Message, in the Inbox rather than in Requests.

#### Scenario: Muted sender
- **WHEN** the user is under a chat mute
- **THEN** the composer, Offer included, is replaced by the mute notice

### Requirement: Trust line in the thread header
The conversation header SHALL show the other party's reputation line (see `web-verified-trades`) below their name.

#### Scenario: Header
- **WHEN** a user opens the conversation with rin.trades, who has 31 completed trades and all positive ratings
- **THEN** the header shows "31 verified · 100% · since Mar 2025"
