# Spec Delta

## MODIFIED Requirements

### Requirement: Requests
A conversation whose first message carries no objekt card SHALL appear in the recipient's Requests, not their Inbox, until they reply or accept. The recipient is whoever did not send the first message, whoever opened the conversation. Request conversations SHALL not count as unread. Declining a request SHALL archive it for the recipient without telling the sender. A conversation whose first message carries a card SHALL go straight to the Inbox.

A conversation with no message yet SHALL be shown only to a member who opened it with Message: a member who did not SHALL get the not-found surface for it, and every request about it from that member (thread, mark read, accept, decline, archive, mute) SHALL be refused as not found. No conversation list SHALL show a conversation with no message yet as a row of its own, for either member: it joins the opener's list with its first message or offer, so a Message click that sends nothing leaves nothing in their Inbox. The one exception is the thread the opener has open: their Inbox (with no search) SHALL show it at the top as a "New message" row, until the conversation's own row replaces it, they leave the thread, or they archive it.

The request bar SHALL say that declining moves the conversation to Archived without telling the sender, that it comes back if they write again, and that Block stops them.

#### Scenario: Cold message
- **WHEN** a user messages kaede.k from her profile with no card
- **THEN** the conversation appears under Requests for kaede.k, and her Messages icon shows its dot but its label counts no more unread conversations

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

#### Scenario: Message without writing
- **WHEN** rin.trades activates Message on kaede.k's profile, sends nothing and goes back to `/messages`
- **THEN** no conversation with kaede.k is listed; activating Message again opens the same empty thread

#### Scenario: Writing the first message
- **WHEN** rin.trades activates Message on kaede.k's profile, with the list beside the thread
- **THEN** the Inbox shows a "New message" row for kaede.k at the top, marked as the open one, and after the first send the conversation's own row takes its place; archiving the conversation later brings no "New message" row back


### Requirement: Unread badge
When a session exists, the frame SHALL show a Messages icon linking to `/messages`, with a dot while any Inbox conversation holds unread messages, as the bell does. The icon's label carries the number of such conversations. Muted conversations and requests SHALL not count. The dot SHALL also show while a request holds a message that arrived after the user last opened the Requests tab; then the label SHALL say that new message requests are waiting.

#### Scenario: Muted does not count
- **WHEN** the user has 2 unread conversations and mutes one of them
- **THEN** the dot stays and the icon's label counts 1 unread conversation

#### Scenario: A new request sets the dot
- **WHEN** the user has no unread Inbox conversations and rin.trades sends them a message with no card
- **THEN** the Messages icon shows its dot without a reload, and its label says new message requests are waiting and counts no unread conversations

#### Scenario: Opening Requests clears the dot
- **WHEN** the dot shows only because of a request, and the user opens the Requests tab
- **THEN** the dot goes, though the request stays under Requests with its count on the tab

#### Scenario: A request arriving while Requests is open
- **WHEN** the user has the Requests tab open and a new request arrives
- **THEN** it joins the list and the Messages icon shows no dot for it

#### Scenario: A later message in a waiting request
- **WHEN** the user opened the Requests tab, left it, and the sender of a waiting request writes again
- **THEN** the dot shows again

#### Scenario: Seen on another device
- **WHEN** the user opens the Requests tab on their phone
- **THEN** the dot is gone on their laptop the next time that tab reads the badge
