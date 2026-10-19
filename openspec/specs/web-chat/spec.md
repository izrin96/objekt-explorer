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
A message SHALL be text of 1 to 2,000 characters, a card, or both. A card SHALL be one of:
- an **objekt card**, referring to a collection or a specific objekt, and optionally the list it came from;
- a **post card**, referring to a Trade post by its list, and optionally carrying a **match** saved when it was sent.

The thread SHALL render an objekt card as a live objekt card with the collection's art and name. A card for a specific objekt SHALL show its serial. A card from a list SHALL name the list and link to it, and show the list's price when the list is a sale list.

The thread SHALL render a post card, read live from the post, with:
- the post's tag (WTT, WTS and the rest, as Browse shows them) and its owner's name;
- a strip with up to six objekts of the post's have or sale list and the count of the rest, labelled as Browse labels it: its role ("HAVE", or "SALE" on a sale post) and its number of copies, in the list type's colour;
- for a post with a want list, a WANT strip the same way; for a sale post with no want list, its price range in place of the WANT strip, with whole amounts shown without decimals;
- a link to the post: for the sender, it opens Trade with the owner's row first (`person=<owner id>`); for the owner, it opens their own list.

A post card with a match SHALL show, in place of the strips, the two directions between the sender and the post's owner: first the count and up to three objekts of the owner's that are on the sender's wants, then the count and up to three objekts of the sender's that are on the owner's wants. Each direction SHALL be labelled from the viewer's side, in the wording Browse uses: "They have N you want" and "You have N they want", so the sender and the owner each read the card correctly. A direction with no matches SHALL be left out. The match SHALL show what was saved when the card was sent, even after either side's lists change, and SHALL still link to the post.

A post card whose post no longer exists, or whose list is no longer posted on Trade, SHALL say "Post removed" and keep any saved match. A card whose kind the client does not know SHALL be skipped and the message's text still shown. Messages SHALL show their time and be ordered oldest to newest.

#### Scenario: Card from a sale list
- **WHEN** a user starts a chat from a Market drawer row for SeoYeon 204Z #537 on rin.trades's sale list priced 6,000 KRW and sends it
- **THEN** the thread shows a card with SeoYeon 204Z, serial 537, the list name and 6,000 KRW

#### Scenario: Post card
- **WHEN** a user sends a post card for mina's WTT post, whose have list holds 24 collections and whose want list holds 12
- **THEN** both users see a card with the WTT tag, a teal "HAVE 24" strip with six objekts and "+18", an amber "WANT 12" strip with six objekts and "+6", and a link to the post

#### Scenario: Open post
- **WHEN** kaede.k activates the link on the post card she sent mina, and mina activates the same link
- **THEN** kaede.k is on Trade with mina's row first, and mina is on her own list

#### Scenario: Sale post
- **WHEN** a user sends a post card for rin.trades's WTS post priced from 4,000 to 9,000 KRW, with no want list
- **THEN** the card shows a rose SALE strip with its copy count, and "4,000–9,000 KRW" where the WANT strip would be

#### Scenario: Match card
- **WHEN** kaede.k, who wants 2 of mina's objekts and has 3 that mina wants, sends a match card for mina's post
- **THEN** kaede.k sees "They have 2 you want" with two of mina's objekts, then "You have 3 they want" with three of hers; mina sees the same objekts as "You have 2 they want", then "They have 3 you want"; both see a link to the post

#### Scenario: Saved match
- **WHEN** mina later removes one of the matched collections from her want list
- **THEN** the match card already sent still shows the same counts and objekts

#### Scenario: Post removed
- **WHEN** the owner deletes the list behind a post card
- **THEN** the card says "Post removed", and the message's text still shows

#### Scenario: Too long
- **WHEN** a user tries to send 2,001 characters
- **THEN** the message is refused and the box says why

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

### Requirement: Inbox, Requests and Archived
`/messages` SHALL list the signed-in user's conversations under Inbox, Requests and Archived, newest activity first. Each row SHALL show:
- the other account, headed by the nickname of its Chat as profile, else by its display name;
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

### Requirement: Thread view
`/messages/$id` SHALL show the conversation with:
- the other account and a link to their profile;
- the messages;
- a message box with Attach objekt.

Attach objekt SHALL let the user pick an objekt from their own collection or a collection from their lists. On viewports below `md`, the list and the thread SHALL be separate screens with a back control; the back control SHALL also be there while the thread loads and when it fails to load. The back control of a thread opened by a Message button SHALL return to the page Message was used on, and SHALL be named "Go back"; otherwise it SHALL lead to the list. The page title SHALL name the other account ("{name} · Messages"). A conversation the user is not part of SHALL show the not-found surface.

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

#### Scenario: Back from Message on a phone
- **WHEN** a user at 390 px activates Message on rin.trades's list and then uses the back control in the thread
- **THEN** they return to rin.trades's list, not to `/messages`

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

### Requirement: Mute
The user SHALL be able to mute a conversation for 8 hours, 1 week or until unmuted. A muted conversation SHALL still receive messages, SHALL not count toward the badge, and SHALL show a muted mark. Muting SHALL be private to the user who muted.

#### Scenario: Mute ends
- **WHEN** a mute for 8 hours ends
- **THEN** new unread messages count toward the badge again

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

### Requirement: Chat as
Messages settings SHALL offer Chat as when the account has at least one linked Cosmo profile. It is a choice of one of those profiles, each shown by its nickname. The chosen profile SHALL name the account wherever another account sees it as a partner: conversation rows and threads, offers and trades, offer notes in a thread, and blocked lists.
- Without a choice, the first profile the account linked SHALL be used.
- The chosen or default profile SHALL be shown by its nickname, or by its shortened address when Cosmo gave it none; Hide Cosmo ID does not apply here (see `web-cosmo-link`).
- A change SHALL apply to every conversation, past ones included, on the other side's next load.
- When the chosen profile is unlinked, the default SHALL apply again.
- With no linked profile, the setting SHALL not be shown and the display name SHALL be used.
- A request choosing an address not linked to the caller SHALL be refused, and the setting SHALL stay unchanged.

#### Scenario: Pick a second profile
- **WHEN** a user whose first linked profile is "rin.main" picks "rin.alt" under Chat as
- **THEN** their partners' conversation rows and threads head them as "rin.alt"

#### Scenario: Hide Cosmo ID
- **WHEN** the user's chosen profile has Hide Cosmo ID on
- **THEN** partners still see that profile's nickname

#### Scenario: Chosen profile unlinked
- **WHEN** the user unlinks the profile chosen under Chat as
- **THEN** partners see them by their first linked remaining profile, and Chat as shows that one selected

#### Scenario: Someone else's address
- **WHEN** a request sets Chat as to an address linked to another account
- **THEN** it is refused and the setting is unchanged

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

The newest offer card is full, and older offer cards in the conversation collapse. A collapsed offer SHALL show, beside its O number, status and summary, small thumbnails of up to three objekts of You give, a swap mark, and up to three of You get; a side with more shows the count of the rest, and an empty side shows nothing. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

The full card SHALL be on the card surface and at most about 460 px wide, aligned to its sender's side. It SHALL have:
- a header row with the title, the O number and the status;
- the two sides next to each other, You give first, with a swap mark between them;
- a footer with the expiry and the actions.

When the card is narrower than about 448 px, as on a phone or beside the conversation list at `md`, the two sides SHALL stack, You give above You get, and the card SHALL take the thread's width. A collapsed offer SHALL use the same width and stay at full text contrast; its thumbnails SHALL not make the page scroll sideways.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card changes to Accepted, with a link to the trade

#### Scenario: Wide thread
- **WHEN** a user opens a thread holding an open counter-offer at 1280 px
- **THEN** the card shows You give and You get side by side, with the expiry and Decline, Counter and Accept in its footer

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** You give sits above You get, the card fits the thread's width, and the page does not scroll sideways

#### Scenario: Collapsed offer
- **WHEN** a thread holds an older countered offer of SeoYeon 204Z for JiWoo 110A and Kaede 112A
- **THEN** its collapsed line shows the SeoYeon 204Z thumbnail, a swap mark, and the two other thumbnails beside "O-511 Countered"

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
Message on a Trade row or a Market listing SHALL check its card by the rules for sending one, then open the conversation with the card attached in the message box, and SHALL send nothing. On a Trade row the card is a post card for the row's lead post (see `web-trade-browse`); on a Market listing it is an objekt card. The attached card SHALL be removable and SHALL be sent with the text when the user sends. An attached post card SHALL also offer "Pick objekts instead", which removes it and opens the Attach objekt picker. Activating Message again for a conversation that already exists SHALL open it with the card attached and SHALL add no message. A card that can no longer be sent SHALL be refused when Message is activated and when it is sent, saying why, and no conversation SHALL be opened for it. An objekt card can no longer be sent when:
- its list is gone, or no longer holds that collection (or, for a specific objekt, that objekt);
- its specific objekt is held by neither the sender nor the list's owner.

A post card can no longer be sent when its list is gone, is no longer posted on Trade, or does not belong to the conversation's partner. A match is computed by the server when the card is sent, by the same rules as a Trade row's header sentence, and a client cannot supply one.

A card from a list that hides serials SHALL show no serial and SHALL not reveal, through its price or otherwise, which copy the list holds, to anyone but the list's owner. A post card and its match SHALL name collections only, never serials.

Opening a conversation SHALL not count against the start limit or the per-minute message limit; only sending does (see Rate limits).

#### Scenario: Card attached, not sent
- **WHEN** a user activates Message on rin.trades's WTS post
- **THEN** the thread opens with a post card for that post attached in the message box, and rin.trades has received nothing

#### Scenario: Send with a line
- **WHEN** the user types "Still available?" with the card attached and sends
- **THEN** one message carrying both the text and the card appears for both users

#### Scenario: Second click
- **WHEN** the user activates Message on the same post again after sending
- **THEN** the same thread opens with the card attached, and no new message is sent

#### Scenario: Card removed
- **WHEN** the user removes the attached card and sends "Hi"
- **THEN** only the text is sent

#### Scenario: Pick objekts instead
- **WHEN** the user activates "Pick objekts instead" on an attached post card
- **THEN** the post card is removed and the Attach objekt picker opens

#### Scenario: Objekt not listed
- **WHEN** a request attaches SeoYeon 204Z #1 from rin.trades's sale list, which does not hold #1, and #1 is held by a third account
- **THEN** it is refused as a card that can no longer be sent, and nothing is sent

#### Scenario: Sold before sending
- **WHEN** rin.trades sells the listed SeoYeon 204Z #537 to a third account after a buyer opened Message with its card attached, and the buyer then sends
- **THEN** the send is refused, saying the card can no longer be sent, and the text stays in the box

#### Scenario: Post taken down before sending
- **WHEN** mina deletes her list after a user opened Message with its post card attached, and the user then sends
- **THEN** the send is refused, saying the card can no longer be sent, and the text stays in the box

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
While a conversation has no messages and the user can send, the message box SHALL offer one-tap suggestions that fill the box without sending. One suggestion SHALL match the attached card:
- an objekt card from a sale list: asking whether it is still for sale;
- an objekt card from a have list: asking whether they would trade it;
- an objekt card from a want list: offering it;
- a post card for a WTS post: "Hi! Is this still for sale?", whatever match it carries;
- a post card for a WTB post: when the sender has some of what the owner wants, "Hi! I have one you're after. Interested?" (or "some", for more than one); otherwise "Hi! Saw your post. Still looking?";
- a post card for a WTT post matching both ways: "Hi! We match on a few. Want to swap?";
- a post card for a WTT post matching one way: "Hi! You have one I'm after. Open to an offer?" when the owner has what the sender wants, or "Hi! I have one you're after. Interested?" the other way (each with "some" for more than one);
- a post card for a WTT post without a match: "Hi! Saw your post. Open to a swap?".

A post card SHALL never offer the have or want objekt card suggestions. Without a card the suggestions SHALL be general.

#### Scenario: Sale card
- **WHEN** a user opens a new conversation from a Market listing
- **THEN** the message box offers "Hi! Is this still for sale?", and tapping it fills the box without sending

#### Scenario: Post card from Browse
- **WHEN** a user opens a new conversation from Message on a Browse WTT post they have no matches with
- **THEN** the message box offers "Hi! Saw your post. Open to a swap?" and not "Hi! Would you trade this one?"

#### Scenario: Post card for a sale post
- **WHEN** a user opens a new conversation from Message on a WTS post
- **THEN** the message box offers "Hi! Is this still for sale?" and not "Hi! Saw your post. Open to a swap?"

#### Scenario: Not after the first message
- **WHEN** the conversation has any message
- **THEN** no suggestions are shown

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

### Requirement: Message bubbles
The thread SHALL draw each text message as a bubble whose look depends on whose message it is:
- the viewer's own message: the inverted colours, the foreground colour as its fill with the background colour as its text, in light and dark;
- the partner's message: the card surface with a 1 px border.

Both SHALL use normal-weight body text at the thread's text size. That text SHALL keep at least 4.5:1 contrast against the bubble in both themes.

Each bubble SHALL have rounded corners, with one smaller corner at the bottom on the sender's side (the right for the viewer, the left for the partner, mirrored in right-to-left).

Consecutive messages from one side that share a time stamp form a run, as the thread already groups them. In a run, each bubble that follows another bubble of the run SHALL also take the smaller corner at its top on the sender's side, so the run reads as one block.

A bubble SHALL be at most about 420 px wide, and at most 85% of the thread's width on narrow screens. Long words SHALL wrap inside it.

An unsent message SHALL keep its dashed, transparent "Message unsent" look with the bubble's shape. A card message, the caution line, the time and Seen SHALL stay as they are, and legible in both themes.

#### Scenario: Own message in dark
- **WHEN** a user in the dark theme sends "Still available?"
- **THEN** the bubble is light with dark text

#### Scenario: Own message in light
- **WHEN** the same user switches to the light theme
- **THEN** the bubble is dark with light text

#### Scenario: Partner's message
- **WHEN** the partner's message is shown
- **THEN** its bubble is on the card surface with a visible 1 px border, aligned to the start side

#### Scenario: A run of three
- **WHEN** the partner sends three messages within a minute
- **THEN** the three bubbles join along the left side, only the last shows the time, and each has the smaller bottom-left corner

#### Scenario: Unsent in a run
- **WHEN** the middle message of a run is unsent
- **THEN** it shows "Message unsent" with a dashed outline in the same position and shape

### Requirement: Composer action labels
The message box's Attach objekt and Make offer actions SHALL show their text label beside their icon when the message box is at least 32rem wide. Narrower than that, as on a 390 px phone or beside the conversation list at `md`, they SHALL show the icon only and keep the same accessible name. Neither form SHALL make the page scroll sideways.

#### Scenario: Desktop
- **WHEN** a user opens a thread at 1280 px
- **THEN** the message box shows "Attach objekt" and "Make offer" as labelled buttons

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** both actions are icon-only, a screen reader announces "Attach objekt" and "Make offer", and the text field keeps most of the row

### Requirement: Conversation context thumbnail
A conversation row in Inbox, Requests and Archived SHALL show the newest card sent in that conversation that was not unsent:
- for an objekt card, a small thumbnail of it and, next to it in monospace, the card's collection name and, for a specific objekt, its serial. While the collection is unknown, its slug SHALL stand in for the art;
- for a post card, the post's tag and "{owner}'s trade post", with no thumbnail.

A row whose conversation has no such card SHALL show neither and keep its layout. A row whose last message is a post card with no text SHALL preview it as "Trade post".

The context is part of the row: activating it opens the conversation, like the rest of the row, and it SHALL not be a separate control.

The conversation list request SHALL keep accepting every input it accepts today. A tab loaded before this change SHALL keep listing conversations; a post card's context SHALL not break it and may show nothing there.

#### Scenario: Started from a listing
- **WHEN** a conversation started with a SeoYeon 204Z #537 card and has since exchanged text and an offer
- **THEN** its row shows the SeoYeon 204Z art and "SeoYeon 204Z #537" under the latest message preview

#### Scenario: Newer card
- **WHEN** either side later sends a HyeRin 301Z card in that conversation
- **THEN** the row's thumbnail becomes HyeRin 301Z

#### Scenario: Started from a post
- **WHEN** a conversation started with a post card for mina's WTT post
- **THEN** its row shows the WTT tag and "mina's trade post", with no thumbnail

#### Scenario: Card unsent
- **WHEN** the only card in a conversation is unsent
- **THEN** the row shows no thumbnail

#### Scenario: Text only
- **WHEN** a conversation holds only text messages
- **THEN** its row shows no thumbnail
