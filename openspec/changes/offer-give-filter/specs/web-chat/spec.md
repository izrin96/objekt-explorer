## MODIFIED Requirements

### Requirement: Requests
A conversation whose first message is not listed SHALL appear in the recipient's Requests, not their Inbox, until they reply or accept. A first message is listed when its card names one of the recipient's sale, have or want lists (every post card does), or when it is an offer that asks for something through one of the recipient's lists or gives an objekt whose collection is on one of the recipient's want lists. A general list never makes a message listed. A conversation whose first message is listed SHALL go straight to the Inbox. The recipient is whoever did not send the first message, whoever opened the conversation. Request conversations SHALL not count as unread. Declining a request SHALL archive it for the recipient without telling the sender.

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

#### Scenario: Post card
- **WHEN** a user activates Message on rin.trades's Trade row and sends "Still trading?" with the post card attached
- **THEN** the conversation goes straight to rin.trades's Inbox

#### Scenario: Market listing
- **WHEN** a user activates Message on the #537 row of SeoYeon 204Z's Market tab, listed on kaede.k's sale list, and sends with the card attached
- **THEN** the conversation goes straight to kaede.k's Inbox

#### Scenario: Their own objekt on none of their lists
- **WHEN** rin.trades messages kaede.k from her profile, attaches her SeoYeon 204Z #537, which is on none of her lists, and sends "sell?"
- **THEN** the conversation appears under Requests for kaede.k, and rin.trades sees it in his Inbox as he would for any conversation he started

#### Scenario: Card from the sender's own list
- **WHEN** rin.trades messages kaede.k from her profile with a card for SeoYeon 204Z from his own sale list
- **THEN** the conversation appears under Requests for kaede.k

#### Scenario: Card from the recipient's general list
- **WHEN** rin.trades messages kaede.k from her profile with a card for SeoYeon 204Z from her general list "favourites"
- **THEN** the conversation appears under Requests for kaede.k

#### Scenario: Offer opening a request while Messages is open
- **WHEN** kaede.k has `/messages` open on Inbox, and an offer touching none of her lists opens a conversation with her
- **THEN** without a reload the conversation joins Requests, not the Inbox, the Requests tab's count goes up and her Messages icon shows its dot

#### Scenario: Collection card with no list
- **WHEN** rin.trades messages kaede.k from her profile with a card naming the SeoYeon 204Z collection and no list
- **THEN** the conversation appears under Requests for kaede.k

#### Scenario: Offer through their list
- **WHEN** a user's first message to rin.trades is an offer asking for SeoYeon 204Z #537 from his have list "doubles"
- **THEN** the conversation goes straight to rin.trades's Inbox

#### Scenario: Offer giving what they want
- **WHEN** a user's first message to kaede.k is an offer that asks for nothing and gives HyeRin 301Z #12, a collection on kaede.k's want list
- **THEN** the conversation goes straight to kaede.k's Inbox

#### Scenario: Offer touching none of their lists
- **WHEN** rin.trades has no lists and lets people ask for anything he holds, and a user's first message to him is an offer asking for SeoYeon 204Z #537 from his collection and giving an objekt on none of his want lists
- **THEN** the offer is sent, and the conversation appears under Requests for rin.trades

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

