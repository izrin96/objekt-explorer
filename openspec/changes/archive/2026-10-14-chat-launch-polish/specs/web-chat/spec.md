## MODIFIED Requirements

### Requirement: Who can start a conversation
To start a conversation, the sender SHALL have at least one linked Cosmo address and be signed in. A signed-out visitor using Message SHALL be sent to sign in, and then back. A sender without a linked address SHALL be offered the link flow instead. A sender who has since unlinked every Cosmo address SHALL be refused a send in any conversation, and SHALL be offered the link flow.

The recipient's "Who can message you" setting SHALL decide the rest:
- Anyone with a linked Cosmo address, the default;
- Nobody: Message buttons for this account are hidden, and starting a conversation is refused.

A banned account SHALL be treated as Nobody: no Message button is shown for it, and a start or send to it SHALL be refused with the "isn't accepting messages" reason.

The setting applies to new conversations only. A conversation is new until its first message or offer: the setting SHALL be checked again when that first message or offer is sent, so a conversation opened before the recipient chose Nobody cannot carry a first message past it. Conversations that already hold a message stay open.

#### Scenario: No linked address
- **WHEN** a signed-in user with no linked Cosmo address activates Message on a Trade post
- **THEN** no conversation is created, and they are offered the link flow

#### Scenario: Recipient allows nobody
- **WHEN** an account's setting is Nobody
- **THEN** no Message button is shown for that account, and a direct request to start a conversation is refused

#### Scenario: Nobody chosen after Message was opened
- **WHEN** rin.trades opens Message on kaede.k's profile without sending, kaede.k then switches to Nobody, and rin.trades sends "Hi" a day later
- **THEN** the send is refused as "this user isn't accepting messages", and kaede.k receives nothing

#### Scenario: Banned account
- **WHEN** a visitor opens the profile of an account under an active ban
- **THEN** no Message button is shown, and a direct request to start or send to it is refused with the "isn't accepting messages" reason

#### Scenario: All profiles unlinked
- **WHEN** a user unlinks their only Cosmo profile and then tries to send in an existing conversation
- **THEN** the send is refused, and they are offered the link flow

### Requirement: Requests
A conversation whose first message carries no objekt card SHALL appear in the recipient's Requests, not their Inbox, until they reply or accept. The recipient is whoever did not send the first message, whoever opened the conversation. Request conversations SHALL not count as unread. Declining a request SHALL archive it for the recipient without telling the sender. A conversation whose first message carries a card SHALL go straight to the Inbox.

A conversation with no message yet SHALL be shown only to a member who opened it with Message: a member who did not SHALL get the not-found surface for it, and every request about it from that member (thread, mark read, accept, decline, archive, mute) SHALL be refused as not found.

The request bar SHALL say that declining moves the conversation to Archived without telling the sender, that it comes back if they write again, and that Block stops them.

#### Scenario: Cold message
- **WHEN** a user messages kaede.k from her profile with no card
- **THEN** the conversation appears under Requests for kaede.k, and her Messages badge does not change

#### Scenario: Accept
- **WHEN** kaede.k replies to the request
- **THEN** it moves to her Inbox

#### Scenario: Card removed before the first message
- **WHEN** a user activates Message on a Trade post, removes the attached card and sends "Hi"
- **THEN** the conversation appears under Requests for the post's owner

#### Scenario: The other side writes first
- **WHEN** rin.trades opens Message on kaede.k's profile and never writes, and kaede.k later messages rin.trades with no card
- **THEN** the conversation appears under Requests for rin.trades, not in the Inbox

#### Scenario: Empty conversation by id
- **WHEN** kaede.k opens `/messages/<id>` for a conversation rin.trades opened with her but has not written in
- **THEN** the not-found surface is shown

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

### Requirement: Thread view
`/messages/$id` SHALL show the conversation with:
- the other account and a link to their profile;
- the messages;
- a message box with Attach objekt.

Attach objekt SHALL let the user pick an objekt from their own collection or a collection from their lists. On viewports below `md`, the list and the thread SHALL be separate screens with a back control; the back control SHALL also be there while the thread loads and when it fails to load. A conversation the user is not part of SHALL show the not-found surface.

**Read state.** A message SHALL be marked read only once the user can see it: the page is visible and focused, and the thread is scrolled to the newest message. While the user is scrolled up, newer messages SHALL show a "New messages" control that scrolls to them, and reaching the newest message marks them read.

**Message box.** After a send, focus SHALL stay in the message box. Removing the attached card SHALL move focus to the message box. Text that was not sent SHALL be kept per conversation for the session: switching to another conversation and back keeps it, and a send that fails after the user has left the thread puts the text back in that conversation's box. Loading older messages SHALL not be read out by assistive technology as new messages.

#### Scenario: Not a member
- **WHEN** a user opens `/messages/<id>` for a conversation between two other accounts
- **THEN** the not-found surface is shown and no message is returned

#### Scenario: Phone
- **WHEN** a user opens a conversation at 390 px
- **THEN** only the thread is shown, with a back control to the list, and the page does not scroll sideways

#### Scenario: Load fails on a phone
- **WHEN** a conversation fails to load at 390 px
- **THEN** the screen offers Retry and a back control to the list

#### Scenario: Reading history
- **WHEN** the user is scrolled up reading older messages and the partner sends a message
- **THEN** it is not marked read, the partner sees no "Seen", and a "New messages" control appears; scrolling to it marks it read

#### Scenario: Draft kept
- **WHEN** the user types half a reply, opens another conversation, and comes back
- **THEN** the half-written reply is still in the box

### Requirement: Realtime delivery
A sent message SHALL appear in the recipient's open thread and inbox within 2 seconds while their live connection is open, carrying its content as the recipient sees it, so showing it needs no further request. The sender's other open tabs SHALL show it the same way. A message's content SHALL reach only the two members of its conversation. A live message that arrives while the thread is still loading SHALL appear once the load finishes.

After a drop of up to 5 minutes, the client SHALL receive every event it missed, in order, without refetching. After a longer drop, or when missed events can no longer be replayed, the client SHALL fetch every message newer than the newest it holds, so no message is lost while disconnected. When a live message arrives and the client holds the thread but not the message before it, the client SHALL fetch the messages it is missing instead of only adding the new one, so a live event that was never delivered can't leave a permanent gap. A catch-up fetch that fails SHALL be retried until it succeeds.

Sending SHALL work while the live connection is down. While the browser is offline, a send SHALL fail at once and keep the text in the box with a message saying so. Sending the same message again after a failure whose outcome the client cannot know SHALL never create a second copy.

#### Scenario: Live
- **WHEN** both users have the thread open and one sends a message
- **THEN** it appears for the other within 2 seconds without a reload, and no thread or inbox request is made to show it

#### Scenario: Viewer's own view
- **WHEN** a user sends a message that the scam scan flags
- **THEN** the recipient's live copy shows the caution and the sender's other tabs show it without one, as the thread endpoint would

#### Scenario: Short drop
- **WHEN** the recipient's connection was down for 30 seconds while 3 messages arrived and then reconnects
- **THEN** all 3 appear in order without a thread refetch

#### Scenario: Offline then back
- **WHEN** the recipient's connection was down for 10 minutes while 3 messages arrived and then reconnects
- **THEN** the client fetches newer messages and all 3 appear in order

#### Scenario: A lost live event
- **WHEN** the live event for message 41 never reached the recipient, and the event for message 42 arrives while the thread is open
- **THEN** the client fetches the missing messages, and 41 and 42 both appear in order

#### Scenario: Not a member
- **WHEN** a signed-in user who is not in a conversation tries to subscribe to another user's live events
- **THEN** the subscription is refused and nothing is delivered

#### Scenario: Message during first load
- **WHEN** the partner sends a message while the user's thread is still loading its first page
- **THEN** the message appears once the thread has loaded, without another message or a reload

#### Scenario: Retry after a lost response
- **WHEN** a send reaches the server but its response is lost, and the user sends it again
- **THEN** the conversation holds the message once

#### Scenario: Offline send
- **WHEN** the user sends while the browser is offline
- **THEN** the send fails at once, the text stays in the box, and the box says the message was not sent

### Requirement: Rate limits
A user SHALL be able to start at most 20 new conversations per rolling 24 hours, or 5 if their account is younger than 7 days. A conversation counts as started by the user who sends its first message or offer, at that moment; opening a conversation with Message and sending nothing SHALL not count. A user SHALL be able to send at most 30 messages per minute. Over a limit, the request SHALL be refused, and the UI SHALL say when the user can try again.

#### Scenario: New account
- **WHEN** a 2-day-old account tries to send the first message of a sixth conversation within 24 hours
- **THEN** it is refused, and the UI says when it can start another

#### Scenario: Browsing with Message
- **WHEN** a 2-day-old account opens Message on 8 Trade posts and sends nothing
- **THEN** no start is counted, and it can still send the first message in 5 of them

### Requirement: Messages settings
The Messages section of the account page (`/account/messages`) SHALL have "Who can message you" (Anyone with a linked Cosmo address, or Nobody), Chat as, and "Show Seen and typing", on by default. Changes SHALL save at once. The `/messages` header SHALL offer a settings control opening `/account/messages`. When the settings fail to load, the section SHALL say so and offer Retry rather than leave the controls disabled.

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

### Requirement: Blocks and chat mutes gate sending
Starting a conversation or sending a message SHALL be refused when either account has blocked the other, or when the other account was deleted. The refusal reason SHALL read the same as "this user isn't accepting messages", so the blocked side cannot tell. It SHALL also be refused while the sender has an active chat mute. In that case the message box SHALL be replaced by a notice with the mute's reason and end date (see `web-moderation`), and a refused start SHALL also say when the mute ends.

In a conversation with a deleted account, the message box and Offer SHALL be replaced by a notice that the account was deleted, and a request from a deleted account SHALL leave Requests and its count.

#### Scenario: Muted sender
- **WHEN** a user under a chat mute until Oct 13 opens a conversation
- **THEN** the message box shows "You can't send messages until Oct 13" and the reason, and no send is possible

#### Scenario: Deleted partner
- **WHEN** kaede.k sends a message in her conversation with an account that has since been deleted
- **THEN** the send is refused with the same reason as a block, and the earlier messages stay in the thread

#### Scenario: Deleted partner's thread
- **WHEN** kaede.k opens her conversation with an account that has since been deleted
- **THEN** the earlier messages are shown, and in place of the message box and Offer a notice says the account was deleted

#### Scenario: Muted start
- **WHEN** a user under a chat mute until Oct 13 activates Message on a Trade post
- **THEN** the refusal says they can't send messages until Oct 13

### Requirement: Seen and typing
The thread SHALL show "Seen" under the user's latest message the other person has read, and "typing…" while the other person is writing a message. Both SHALL follow the Show Seen and typing switch (see Messages settings): when either person has it off, neither person's Seen nor typing SHALL be shown to the other. A person who has not accepted a request SHALL show neither Seen nor typing to its sender. While either person has blocked the other, neither SHALL show Seen or typing to the other. Both SHALL update within 2 seconds while the viewer's socket is connected; typing SHALL clear within 6 seconds after the other person stops.

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

#### Scenario: After a block
- **WHEN** kaede.k blocks spam.seller22 and later opens their conversation from Archived
- **THEN** spam.seller22 sees no "Seen"

### Requirement: Message attaches its card
Message on a Trade post, a person sheet or a Market listing SHALL check its objekt card by the rules for sending one, then open the conversation with the card attached in the message box, and SHALL send nothing. The attached card SHALL be removable and SHALL be sent with the text when the user sends. Activating Message again for a conversation that already exists SHALL open it with the card attached and SHALL add no message. A card that can no longer be sent SHALL be refused when Message is activated and when it is sent, saying why, and no conversation SHALL be opened for it. A card can no longer be sent when:
- its list is gone, or no longer holds that collection (or, for a specific objekt, that objekt);
- its specific objekt is held by neither the sender nor the list's owner.

A card from a list that hides serials SHALL show no serial and SHALL not reveal, through its price or otherwise, which copy the list holds, to anyone but the list's owner.

Opening a conversation SHALL not count against the start limit or the per-minute message limit; only sending does (see Rate limits).

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

#### Scenario: Objekt not listed
- **WHEN** a request attaches SeoYeon 204Z #1 from rin.trades's sale list, which does not hold #1, and #1 is held by a third account
- **THEN** it is refused as a card that can no longer be sent, and nothing is sent

#### Scenario: Sold before sending
- **WHEN** rin.trades sells the listed SeoYeon 204Z #537 to a third account after a buyer opened Message with its card attached, and the buyer then sends
- **THEN** the send is refused, saying the card can no longer be sent, and the text stays in the box
