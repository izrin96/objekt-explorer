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
- **WHEN** a user starts a chat from a Market drawer row for SeoYeon 204Z #537 on rin.trades's sale list priced 6,000 KRW and sends it
- **THEN** the thread shows a card with SeoYeon 204Z, serial 537, the list name and 6,000 KRW

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

### Requirement: No Hide User
Lists and linked Cosmo profiles SHALL have no Hide User setting: a list's page and a profile always show the linked account, and Message follows only "Who can message you" and blocks. A save from an older tab that still sends Hide User SHALL succeed and ignore it.

#### Scenario: A sale list shows its owner
- **WHEN** a visitor opens a sale list whose owner accepts messages from anyone
- **THEN** the page shows the owner's account and offers Message

#### Scenario: Older tab sends Hide User
- **WHEN** a tab loaded before the setting was removed saves a list with Hide User on
- **THEN** the save succeeds and nothing about the list hides its owner

### Requirement: Message from a list page
A list's page SHALL offer Message in its header, so a list reached from a shared link can start a chat with its owner. It SHALL not be offered on the viewer's own list, between accounts where either blocked the other, or where the rules above hide it. It attaches no card, so the conversation starts as a request, as from a profile.

#### Scenario: List shared on Discord
- **WHEN** a signed-out visitor opens rin.trades's list from a Discord link and activates Message
- **THEN** they sign in, come back to the list, and Message opens a conversation with rin.trades

#### Scenario: Own list
- **WHEN** rin.trades opens their own list
- **THEN** the header has no Message button

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
