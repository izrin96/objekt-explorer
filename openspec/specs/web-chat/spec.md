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
Lists and linked Cosmo profiles SHALL have no Hide User setting: a list's page and a profile always show the linked account, and Message follows only "Who can message you" and blocks.

#### Scenario: A sale list shows its owner
- **WHEN** a visitor opens a sale list whose owner accepts messages from anyone
- **THEN** the page shows the owner's account and offers Message

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

### Requirement: Thread view
`/messages/$id` SHALL show the conversation with:
- the other account and a link to their profile;
- the messages;
- a message box with Attach objekt.

Attach objekt SHALL let the user pick an objekt from their own collection or a collection from their lists. Both pickers SHALL offer the offer pickers' filters, followed by where the objekts come from: **List**, naming each of the user's lists after its list type badge, or **Profile**, when the user has more than one linked Cosmo profile; either shows its current choice, and stays in view below `sm` when the filters fold behind their Filters button. On viewports below `md`, the list and the thread SHALL be separate screens with a back control; the back control SHALL also be there while the thread loads and when it fails to load. The back control of a thread opened by a Message button SHALL return to the page Message was used on, and SHALL be named "Go back"; otherwise it SHALL lead to the list. The page title SHALL name the other account ("{name} · Messages"). A conversation the user is not part of SHALL show the not-found surface.

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
Starting new conversations SHALL have no daily limit. A conversation is started by the user who sends its first message or offer, at that moment; opening a conversation with Message and sending nothing SHALL not start it. A user SHALL be able to send at most 30 messages per minute. Over a limit, the request SHALL be refused, and the UI SHALL say when the user can try again.

#### Scenario: Many new people in a day
- **WHEN** a 2-day-old account sends a first offer to a 30th person within 24 hours
- **THEN** it is sent

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
- both sides, labelled from the viewer's side (You give, You get), each with its count of objekts;
- the top-up and the note;
- the current status.

Each side of a full card SHALL show its objekts as thumbnails in a grid, up to twelve: when the side holds more, the first eleven and a twelfth tile reading "+N" for the rest. An any-copy ask for several copies SHALL show its count on its thumbnail ("×3"), counted once in the grid. Each thumbnail SHALL name its objekt and serial to assistive technology and on hover. "+N", or choosing the side's count, SHALL open a sheet listing every objekt of that side as a line with its art, member, collection code and serial; a thumbnail SHALL open the objekt drawer.

The newest offer card is full, unless it was accepted: an accepted offer's card collapses, since its trade carries on at the trade page. Older offer cards in the conversation collapse. A collapsed offer SHALL show, beside its O number, status and summary, small thumbnails of up to three objekts of You give, a swap mark, and up to three of You get, and the two sides' counts ("16 ⇄ 20") when either side holds more than three; an empty side shows nothing. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

The full card SHALL be on the card surface and at most about 460 px wide, aligned to its sender's side. It SHALL have:
- a header row with the title, the O number and the status;
- the two sides next to each other, You give first, with a swap mark between them;
- a footer with the expiry and the actions.

When the card is narrower than about 448 px, as on a phone or beside the conversation list at `md`, the two sides SHALL stack, You give above You get, and the card SHALL take the thread's width. A collapsed offer SHALL use the same width and stay at full text contrast; its thumbnails SHALL not make the page scroll sideways. A card, full or collapsed, SHALL take focus from a script (`tabIndex={-1}`) without joining the tab order, so the deal strip can move focus to it.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card collapses to "Accepted" with the trade's number, and the deal strip offers Open trade

#### Scenario: Wide thread
- **WHEN** a user opens a thread holding an open counter-offer at 1280 px
- **THEN** the card shows You give and You get side by side, with the expiry and Decline, Counter and Accept in its footer

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** You give sits above You get, the card fits the thread's width, and the page does not scroll sideways

#### Scenario: Large offer
- **WHEN** a thread holds an open offer giving 18 objekts for 22
- **THEN** You give shows 11 thumbnails and "+7", You get 11 and "+11", each side labelled with its count, and the card is no taller than an offer of twelve a side

#### Scenario: Every objekt
- **WHEN** the user chooses "+11" on You get
- **THEN** a sheet lists all 22 objekts of You get, each with its serial

#### Scenario: Several copies
- **WHEN** the offer asks for 3 copies of Lynn 301A in any serial
- **THEN** You get shows one Lynn 301A thumbnail marked "×3", and the side's count includes all three

#### Scenario: Collapsed offer
- **WHEN** a thread holds an older countered offer of SeoYeon 204Z for JiWoo 110A and Kaede 112A
- **THEN** its collapsed line shows the SeoYeon 204Z thumbnail, a swap mark, and the two other thumbnails beside "O-511 Countered"

#### Scenario: Collapsed large offer
- **WHEN** a thread holds an older countered offer of 16 objekts for 20
- **THEN** its collapsed line shows three thumbnails a side and "16 ⇄ 20"

#### Scenario: Accepted newest offer
- **WHEN** the newest offer in a thread is O-259, accepted as T-89
- **THEN** O-259 shows as a collapsed line that opens to the full card, and the strip names T-89

#### Scenario: Accepted offer while another trade waits on you
- **WHEN** the newest offer in izrin96's thread with haneul_07 is O-266, accepted as T-90 and waiting on haneul_07, and the older T-87 waits on izrin96 to send 1
- **THEN** the strip names T-87, and O-266 still shows as a collapsed "Accepted" line that opens to the full card

### Requirement: Offer from the composer
The message box's Add to message menu SHALL have Make offer, which opens the offer builder for this conversation; the deal strip offers it too while no deal is open. Both SHALL open the builder as the composer's Offer action did, with the same prefill: when the conversation's newest card is the partner's post card with a match, the builder adds that post's matches (see web-trade-offers). Both are hidden wherever the message box is hidden or replaced by a notice. A first offer sent from outside a conversation SHALL open a new conversation under the same start rules as Message, in the Inbox rather than in Requests.

#### Scenario: Muted sender
- **WHEN** the user is under a chat mute
- **THEN** the composer, its Add to message menu included, is replaced by the mute notice, and the deal strip offers no Make offer

#### Scenario: Make offer after a post card
- **WHEN** the newest card in izrin96's conversation with rin.trades is rin.trades's post card for "doubles" with "They have 2 you want", and no offer is open
- **THEN** Make offer from the strip and from the Add to message menu each open the builder with the two matches added, as Make offer did before

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

Opening a conversation SHALL not count against the per-minute message limit; only sending does (see Rate limits).

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
- a post card for a WTT post matching both ways, when the sender could swap with the owner as the card was sent (the owner's row read "You can swap N"): "Hi! We match on a few. Want to swap?";
- a post card for a WTT post matching both ways when they could not swap: the one-way suggestion below for the direction with more matches, the owner's direction on a tie;
- a post card for a WTT post matching one way: "Hi! You have one I'm after. Open to an offer?" when the owner has what the sender wants, or "Hi! I have one you're after. Interested?" the other way (each with "some" for more than one);
- a post card for a WTT post without a match: "Hi! Saw your post. Open to a swap?".

A post card saved before the card recorded whether the two could swap SHALL read as one they could swap with. A post card SHALL never offer the have or want objekt card suggestions. Without a card the suggestions SHALL be general.

#### Scenario: Sale card
- **WHEN** a user opens a new conversation from a Market listing
- **THEN** the message box offers "Hi! Is this still for sale?", and tapping it fills the box without sending

#### Scenario: Post card from Browse
- **WHEN** a user opens a new conversation from Message on a Browse WTT post they have no matches with
- **THEN** the message box offers "Hi! Saw your post. Open to a swap?" and not "Hi! Would you trade this one?"

#### Scenario: Post card for a sale post
- **WHEN** a user opens a new conversation from Message on a WTS post
- **THEN** the message box offers "Hi! Is this still for sale?" and not "Hi! Saw your post. Open to a swap?"

#### Scenario: Post card from a Can swap row
- **WHEN** a user opens a new conversation from Message on jun.p's row, which reads "You can swap 1", and the card carries "They have 1 you want · You have 1 they want"
- **THEN** the message box offers "Hi! We match on a few. Want to swap?"

#### Scenario: Post card matching both ways across posts
- **WHEN** a user opens a new conversation from Message on mina.k's row, which reads "They have 2 you want · You have 1 they want" with no Can swap mark
- **THEN** the message box offers "Hi! You have some I'm after. Open to an offer?" and not "Hi! We match on a few. Want to swap?"

#### Scenario: An older post card
- **WHEN** a conversation's newest card is a post card sent before this change, carrying a match both ways, and the conversation has no messages
- **THEN** the message box offers "Hi! We match on a few. Want to swap?"

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

### Requirement: Links in messages
The thread SHALL make each `http://` or `https://` link in a text message clickable, underlined in the bubble's text colour, opening in a new tab with no referrer and `nofollow ugc`. Other schemes and bare domains stay text. A link's host is ASCII and its path takes any non-space character. Trailing sentence punctuation, Latin or CJK, and a closing bracket the link never opened stay text.

The moderation console, reply quotes and Inbox previews show links as plain text.

#### Scenario: A link mid-sentence
- **WHEN** mina sends "see https://example.com/x. ok?"
- **THEN** kaede.k sees `https://example.com/x` as a link that opens in a new tab, and ". ok?" as text

#### Scenario: A Korean path
- **WHEN** mina sends "여기 https://namu.wiki/w/이달의_소녀 봐"
- **THEN** the whole `https://namu.wiki/w/이달의_소녀` is one link

#### Scenario: Text straight after a domain
- **WHEN** mina sends "https://example.com에서 봐"
- **THEN** only `https://example.com` is a link, and "에서 봐" is text

#### Scenario: Japanese brackets
- **WHEN** mina sends "「https://example.com/ja/ページ」。"
- **THEN** only `https://example.com/ja/ページ` is a link, and the brackets and full stop are text

#### Scenario: Another scheme
- **WHEN** mina sends "javascript:alert(1)"
- **THEN** it shows as text

### Requirement: Conversation context thumbnail
A conversation row in Inbox, Requests and Archived SHALL show the newest card sent in that conversation that was not unsent:
- for an objekt card, a small thumbnail of it and, next to it in monospace, the card's collection name and, for a specific objekt, its serial. While the collection is unknown, its slug SHALL stand in for the art;
- for a post card, the post's tag and "{owner}'s trade post", with no thumbnail.

A row whose conversation has no such card SHALL show neither and keep its layout. A row whose last message is a post card with no text SHALL preview it as "Trade post".

The context is part of the row: activating it opens the conversation, like the rest of the row, and it SHALL not be a separate control.

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

### Requirement: Other profiles in a thread
A conversation SHALL be between two accounts, headed by the other account's default profile (see `web-cosmo-link`). When that account has other linked profiles, the thread header SHALL name them after the default ("rin.main · also rin.alt"). When the user opened the conversation from a profile that is not the account's default, an empty thread SHALL say once that this profile belongs to the account it is headed by.

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
- **WHEN** the other account also links a profile that was private before this change
- **THEN** the header names it with their other profiles

### Requirement: Deal line on conversation rows
A row in Inbox, Requests or Archived SHALL show one deal line for the conversation's deal, as "Which deal a conversation shows" picks it. The line SHALL show the O or T number in monospace, a tone dot, and the row line from "Deal line wording" in its tone from "Deal tones". A row with no such deal SHALL show no line. Activating the line opens the conversation.

#### Scenario: Running trade
- **WHEN** an offer between izrin96 and haneul_07 was accepted as T-89, and izrin96 still owes 4 objekts
- **THEN** izrin96's row for haneul_07 shows "T-89" and "Your turn · send 4" under the preview

#### Scenario: No deal
- **WHEN** a conversation holds only text and an objekt card
- **THEN** its row shows no deal line and looks as it does today

#### Scenario: Offer past its expiry
- **WHEN** the only offer in a conversation is still open but its 7 days have passed
- **THEN** the row shows no deal line

#### Scenario: Rated
- **WHEN** a trade completed and the viewer has rated it
- **THEN** the row shows no deal line

### Requirement: Which deal a conversation shows
A deal is an offer of the conversation while it is open, its trade while it runs, and that trade after it ended while the viewer can still rate it and has not. One conversation can hold an open offer and several trades at once, so the row and the strip SHALL name the most urgent: first a deal marked "Needs you" in "Deal line wording", then any other open offer or running trade, then a trade to rate; among those equally urgent, the newest offer's.

#### Scenario: Several deals
- **WHEN** izrin96's conversation with trade.tester holds T-86, T-87, T-88 and T-89, all running, T-87 waiting on izrin96 to send 1, and a newer offer O-256 that expired
- **THEN** the row and the strip name T-87, and the conversation is under Needs you

#### Scenario: Waiting on you first
- **WHEN** izrin96 has an open offer O-270 to dalgom and an older trade T-88 with dalgom where izrin96 owes 2
- **THEN** the row reads "T-88 · Your turn · send 2"

### Requirement: Deal line layout
While a deal exists, the deal line SHALL take the place of the row's context line (the objekt or post thumbnail line); without one, the context line stays. The deal line SHALL be one line that never wraps. Out of room, its words SHALL truncate with an ellipsis, and the O or T number and the trailing count ("send 4", "3 of 6") SHALL stay whole.

#### Scenario: Deal replaces the context line
- **WHEN** sullin's conversation holds a SeoAh 203Z card and then an open offer O-264 from sullin
- **THEN** the row shows "O-264 · Waiting for you" where the SeoAh 203Z thumbnail line was, and shows the thumbnail line again once the offer is declined

#### Scenario: Narrow row
- **WHEN** a row at 320 px has room for only part of "T-87 · Waiting for them · 3 of 6"
- **THEN** it reads "T-87 · Waiting for… · 3 of 6" on one line

### Requirement: Muted conversation rows
A muted conversation's row SHALL show its name without bold, its unread count dimmed, and its deal line in the neutral tone (muted ink and dot), whatever the deal's state.

#### Scenario: Muted row
- **WHEN** izrin96 has muted the conversation with dalgom, whose offer O-261 waits on izrin96
- **THEN** the row's name is not bold, its count is dimmed, and "O-261 · Waiting for you" shows in the neutral tone

### Requirement: Deal line wording
The row's deal line SHALL read as the table in "Wording by state" gives it, which is the source of truth for the row. A running trade's state SHALL be the first that holds in the order the trade page's `stepKind` uses. A countered offer's line SHALL follow the newest offer, the counter. N is the objekts the viewer can send now; v of t is the verified objekts of all.

#### Scenario: Wording by state
- **WHEN** the row's deal is in one of these states
- **THEN** the row reads its line, and the conversation is under Needs you where marked

| State | When | Row line | Needs you |
| --- | --- | --- | --- |
| Offer to you | open, not expired, sent to the viewer | O-n · Waiting for you | yes |
| Offer from you | open, not expired, sent by the viewer | O-n · Waiting for them | no |
| You decide | the partner sent a different copy the viewer has not answered | T-n · Different copy to decide | yes |
| Your turn | the viewer owes objekts they can send | T-n · Your turn · send N | yes |
| Their turn | the viewer owes nothing more | T-n · Waiting for them · v of t | no |
| Stuck | what the viewer still owes can't be transferred | T-n · Can't be sent · v of t | no |
| They decide | the viewer sent a different copy the partner has not answered | T-n · Waiting for them to decide | no |
| Completed, to rate | completed; the viewer can rate and has not | T-n · Completed · rate them | no |
| Failed, to rate | failed; the viewer can rate and has not | T-n · Failed · rate them | no |

#### Scenario: Offer received
- **WHEN** dalgom sends izrin96 offer O-261
- **THEN** izrin96's row for dalgom reads "O-261 · Waiting for you", and dalgom's row for izrin96 reads "O-261 · Waiting for them"

#### Scenario: Countered
- **WHEN** izrin96 counters O-261 with O-262
- **THEN** both rows follow O-262: izrin96's reads "Waiting for them", dalgom's "Waiting for you"

#### Scenario: Waiting on the partner
- **WHEN** izrin96 sent all 4 objekts of T-87 and 3 of its 6 objekts are verified
- **THEN** izrin96's row reads "T-87 · Waiting for them · 3 of 6"

#### Scenario: Different copy
- **WHEN** the partner sent #1210 in place of the #1207 izrin96 is owed, and izrin96 has not answered
- **THEN** izrin96's row reads "Different copy to decide", even if izrin96 also owes objekts

#### Scenario: Stuck
- **WHEN** the only objekt izrin96 still owes in T-91 reads as non-transferable, and 2 of 6 are verified
- **THEN** izrin96's row reads "T-91 · Can't be sent · 2 of 6", and the conversation is not under Needs you

#### Scenario: To rate
- **WHEN** T-84 completed yesterday and yerinnie has not rated it
- **THEN** yerinnie's row reads "T-84 · Completed · rate them"

#### Scenario: Failed, to rate
- **WHEN** T-85 failed because kaede.moon never sent, and izrin96 can still rate it
- **THEN** izrin96's row reads "T-85 · Failed · rate them"

### Requirement: Deal tones
The row's deal line and the thread's deal strip SHALL take each state's tone from the table in "Tone by state". It reuses the trade page's step tones (`STEP_TONE` in `lib/tone.ts`, which `next-step-banner.tsx` reads) for every trade state but Failed, which is warning here, not destructive, because the line asks for a rating rather than reporting a loss. A muted row overrides the tone with neutral.

#### Scenario: Tone by state
- **WHEN** the deal is in one of these states
- **THEN** its dot and words take the tone beside it

| State | Tone | Trade page kind |
| --- | --- | --- |
| Offer to you | warning | (offer) |
| Offer from you | neutral | (offer) |
| You decide | warning | `youDecide` |
| Your turn | progress | `yourTurn` |
| Their turn | progress | `theirTurn` |
| Stuck | warning | `stuck` |
| They decide | warning | `theyDecide` |
| Completed, to rate | success | `completed` |
| Failed, to rate | warning | `failed` (destructive there) |

#### Scenario: Stuck in warning
- **WHEN** izrin96's row reads "T-91 · Can't be sent · 2 of 6"
- **THEN** its dot and words are in the warning tone, as the trade page's stuck card is

#### Scenario: Waiting on the partner in progress
- **WHEN** izrin96's row reads "T-87 · Waiting for them · 3 of 6"
- **THEN** it is in the progress tone, as the trade page's their-turn card is, while an offer's "Waiting for them" is neutral

### Requirement: Show filter in the Inbox
The Inbox SHALL offer All, Unread and Needs you above its list. Unread lists conversations with unread messages; Needs you lists those whose state is marked "Needs you" in "Deal line wording". Both list muted conversations too. The choice SHALL live in the URL (`show`), apply on the server in the box's order and paging, and combine with search. The label is shared with My trades and the trade page's exchange; each page lists its own set.

#### Scenario: Needs you
- **WHEN** izrin96 has 6 Inbox conversations, of which haneul_07's trade waits on izrin96 to send and dalgom's offer waits on izrin96, and picks Needs you
- **THEN** the URL carries `show=needs-you`, and the list holds those two, newest first

#### Scenario: With search
- **WHEN** izrin96 searches "hane" with Needs you picked
- **THEN** only haneul_07's conversation is listed

#### Scenario: Other boxes
- **WHEN** izrin96 opens Requests
- **THEN** no chips show, and the Requests list is not narrowed by an earlier `show`

### Requirement: Show filter counts
All SHALL show no count. Unread and Needs you SHALL show their counts over the whole Inbox, ignoring search, capped at "99+". The counts SHALL leave out muted conversations, as the Messages icon's count does, so a muted conversation can be listed under a chip without adding to its count. The counts SHALL update without a reload on every new message and every offer or trade change.

#### Scenario: Counts
- **WHEN** izrin96 has two conversations that need them and two with unread messages
- **THEN** the chips read "All", "Unread 2" and "Needs you 2"

#### Scenario: Muted not counted
- **WHEN** izrin96 has muted dalgom, whose offer waits on izrin96, and nothing else needs izrin96
- **THEN** the chip reads "Needs you 0", and picking it lists dalgom's conversation with the muted row styling

#### Scenario: Many
- **WHEN** 140 Inbox conversations hold unread messages
- **THEN** the chip reads "Unread 99+"

### Requirement: Show filter live rows
A row that stops matching the filter SHALL leave the list without a reload, except the row of the conversation open beside the list, which SHALL stay, with its live deal line and count, until the filter is next applied (a chip picked or the search changed). When a row that held focus leaves, focus SHALL move as it does when a row is archived.

#### Scenario: Nothing left
- **WHEN** izrin96 has Needs you picked on a phone, with no thread open, and sends the last objekt of T-89 in Cosmo
- **THEN** haneul_07's row leaves the list without a reload, and the chip count drops

#### Scenario: Open conversation stays
- **WHEN** izrin96 has Needs you picked and the thread with haneul_07 open beside the list at 1280 px, and T-89 stops waiting on izrin96
- **THEN** haneul_07's row stays in the list reading "T-89 · Waiting for them · 6 of 8", and leaves when izrin96 next picks a chip or changes the search

#### Scenario: Focused row leaves
- **WHEN** keyboard focus is on dalgom's row under Needs you and dalgom withdraws O-261
- **THEN** the row leaves and focus moves to the row now in its place, or to the list when none is left

### Requirement: Show filter empty state
A filter with no match SHALL say "Nothing needs you" or "Nothing unread" and offer Show all, which picks All.

#### Scenario: Empty Needs you
- **WHEN** nothing in izrin96's Inbox needs them and they pick Needs you
- **THEN** the list says "Nothing needs you" and offers Show all, which lists the whole Inbox

### Requirement: Unread count on conversation rows
A row with unread messages SHALL show, in place of the unread dot, how many of the partner's messages arrived after the viewer last read the conversation, not counting unsent ones, capped at "99+". A muted conversation's count SHALL be dimmed. The count SHALL be read out as "1 unread message", "{count} unread messages", or "More than 99 unread messages" at the cap. Rows in Requests show no count, as they show no unread mark today.

#### Scenario: One unread
- **WHEN** dalgom sends izrin96 one message izrin96 has not read
- **THEN** the row shows "1", and a screen reader reads "1 unread message"

#### Scenario: Two unread
- **WHEN** haneul_07 sends izrin96 two messages izrin96 has not read
- **THEN** the row shows "2", and a screen reader reads "2 unread messages"

#### Scenario: Unsent
- **WHEN** haneul_07 unsends one of the two
- **THEN** the row shows "1"

#### Scenario: Many
- **WHEN** a conversation holds 140 unread messages
- **THEN** the row shows "99+", and a screen reader reads "More than 99 unread messages"

### Requirement: Deal strip in the thread
Under its header, the thread SHALL show one strip for the conversation's deal: a tone dot, a line, an optional second line and one action, worded as the table in "Strip by state" gives it, which is the source of truth for the strip; it MAY word a state differently from the row. It reuses the trade page's strings (`offer_status_waiting_*`, `offer_chip_*`, `offer_trade_step_progress` for "v of t", `offer_next_their_turn`). For one objekt the send line reads "Send 1 objekt to {name} in Cosmo".

#### Scenario: Strip by state
- **WHEN** the deal is in one of these states
- **THEN** the strip shows the line, second line and action beside it

| State | Line | Second line | Action |
| --- | --- | --- | --- |
| Offer to you | O-n · Waiting for you | {name} sent an offer. It expires in {time}. | Review offer |
| Offer from you | O-n · Waiting for them | It expires in {time}. | View offer |
| You decide | T-n · In progress · you decide · v of t | none | Open trade |
| Your turn | T-n · In progress · your turn · v of t | Send N objekts to {name} in Cosmo | Open trade |
| Their turn | T-n · In progress · their turn · v of t | Waiting on {name} to send their part | Open trade |
| Stuck | T-n · In progress · can't send · v of t | none | Open trade |
| They decide | T-n · In progress · they decide · v of t | none | Open trade |
| Completed, to rate | T-n · Completed | Rate {name} by {date} | Rate |
| Failed, to rate | T-n · Failed | Rate {name} by {date} | Rate |
| Never an offer | No offer between you yet | none | Make offer |
| No open offer | No open offer | none | Make offer |

#### Scenario: Your turn
- **WHEN** izrin96 opens the thread with haneul_07 while T-89 waits on izrin96 to send 4, and 2 of 8 are verified
- **THEN** the strip reads "T-89 · In progress · your turn · 2 of 8", "Send 4 objekts to haneul_07 in Cosmo", and Open trade leads to `/trade/mine/89`

#### Scenario: Stuck
- **WHEN** izrin96 opens the thread for T-91, whose objekt izrin96 owes can't be transferred, with 2 of 6 verified
- **THEN** the strip reads "T-91 · In progress · can't send · 2 of 6" in the warning tone, with Open trade

#### Scenario: Failed, to rate
- **WHEN** izrin96 opens the thread for T-85, which failed and can be rated until Oct 30
- **THEN** the strip reads "T-85 · Failed" in the warning tone and "Rate kaede.moon by Oct 30", and Rate leads to `/trade/mine/85`

#### Scenario: Stays in view
- **WHEN** izrin96 scrolls up through older messages
- **THEN** the strip stays under the header

#### Scenario: Live
- **WHEN** haneul_07 accepts O-259 while izrin96 has the thread open
- **THEN** the strip changes from the offer to T-89 without a reload

### Requirement: Deal strip without an open deal
The strip SHALL read "No offer between you yet" when the two never had an offer, and "No open offer" when they did and none of their offers is a deal: each was declined, withdrawn, countered or expired, its trade was cancelled, or its ended trade was rated or can no longer be rated. Both SHALL offer Make offer, which opens the offer builder for this conversation.

#### Scenario: No offer yet
- **WHEN** a conversation has never held an offer
- **THEN** the strip reads "No offer between you yet" with Make offer, which opens the offer builder for this conversation

#### Scenario: Declined
- **WHEN** dalgom declined izrin96's only offer, O-255
- **THEN** the strip reads "No open offer" with Make offer

#### Scenario: Expired
- **WHEN** izrin96's offer O-257 to sullin passed its 7 days unanswered
- **THEN** the strip reads "No open offer" with Make offer

#### Scenario: Withdrawn
- **WHEN** izrin96 withdraws O-258, their offer to kaede.moon, with the thread open
- **THEN** the strip changes to "No open offer" with Make offer, without a reload

#### Scenario: Rated
- **WHEN** yerinnie rates T-84 with the thread open
- **THEN** the strip changes from "T-84 · Completed" to "No open offer" with Make offer, without a reload

### Requirement: Deal strip actions
Open trade and Rate SHALL lead to the trade's page, `/trade/mine/{n}`. Review offer and View offer SHALL scroll to the offer's card, loading older messages when it is not shown yet, up to 10 pages, and move focus to the card. When the card lies further back, the thread SHALL stay where it is and a notice SHALL say the message is too far back to show.

#### Scenario: Review offer
- **WHEN** izrin96 uses Review offer on O-261
- **THEN** the thread scrolls to O-261's card, loading older messages when it is not shown yet, and focus moves to the card

#### Scenario: Too far back
- **WHEN** O-240's card sits 12 pages back and izrin96 uses View offer
- **THEN** 10 pages load, the thread does not jump, and a notice says the message is too far back to show

### Requirement: Deal strip layout
The strip's line SHALL truncate as the row's deal line does, keeping the number and "v of t" whole. Below `md` the strip SHALL be one line, without its second line and without "v of t", and keep its action as a labelled button; the strip is never a link as a whole. It SHALL stay one line and in view under the header while the message box has focus and the on-screen keyboard is open.

Below `md`, a trade in the Your turn, Their turn or Stuck state SHALL read the Inbox row's short words in place of the "Strip by state" table's words: "Your turn", "Waiting for them" and "Can't be sent", so whose turn it is is not cut off; these SHALL fit whole from 360 px. Every other state SHALL read the table's words, and from `md` up every state SHALL read as the table gives it, "v of t" included.

#### Scenario: Phone
- **WHEN** izrin96 opens the thread with haneul_07 at 390 px and focuses the message box
- **THEN** the strip is one line, "T-89 · Your turn" with an "Open trade" button, and stays under the header above the keyboard

#### Scenario: Narrow phone, their turn
- **WHEN** izrin96 opens the thread for T-89 at 360 px while it waits on haneul_07, with 2 of 8 verified
- **THEN** the strip reads "T-89 · Waiting for them" in full, with "Open trade"

#### Scenario: Phone, a different copy to decide
- **WHEN** izrin96 opens the thread for a trade where izrin96 must decide on a different copy, at 390 px
- **THEN** the strip reads "T-n · In progress · you decide", truncating if it must

#### Scenario: Desktop keeps the full line
- **WHEN** izrin96 opens the thread with haneul_07 at 1280 px
- **THEN** the strip reads "T-89 · In progress · your turn · 2 of 8", with "Send 4 objekts to haneul_07 in Cosmo" under it

### Requirement: New messages divider
When a thread opens holding unread messages, a "New" line SHALL sit above the first of them and SHALL stay while the thread stays open, after they are read too. The line SHALL be neutral: a border-coloured rule with its label in the muted text colour. A message that arrives while the thread is open SHALL not move or add the line. Opening the thread again SHALL place the line by what is unread then, or show none.

#### Scenario: Opened with unread
- **WHEN** izrin96 opens the thread with haneul_07 holding two unread messages
- **THEN** "New" sits above the first of the two, and stays after they are marked read

#### Scenario: Read in place
- **WHEN** a new message arrives while izrin96 reads the newest message
- **THEN** no "New" line appears

### Requirement: Opening on the New divider
When the first unread message would sit above the view, the thread SHALL open scrolled to the "New" line rather than to the newest message, loading older messages when the first unread one is not shown yet, up to 10 pages. Beyond that, the thread SHALL open at the newest message with no line. Opening on the line SHALL not move focus.

#### Scenario: Many unread
- **WHEN** izrin96 opens a thread holding 60 unread messages, more than fit in view
- **THEN** the thread opens with the "New" line at the top of the view and the first unread message under it

### Requirement: Add to message menu
The message box SHALL have one button, named "Add to message", beside the text field, offering Attach objekt and Make offer, each with its icon and label. From `md` up it SHALL open a menu; below `md`, a bottom sheet titled "Add to message" whose choices also read "From your collection or a list" and "Pick what you give and get". Each choice SHALL open the same picker or offer builder as before. The text field SHALL take the rest of the row, with 16 px text below `sm`.

#### Scenario: Desktop
- **WHEN** izrin96 activates Add to message at 1280 px
- **THEN** a menu shows "Attach objekt" and "Make offer" with their icons, and choosing Attach objekt opens the objekt picker

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** the row holds Add, the text field and Send, Add opens a bottom sheet with both choices labelled and described, and the page does not scroll sideways

### Requirement: Add to message focus
Escape, and the sheet's close button, SHALL close the menu or sheet and return focus to Add to message. Closing the objekt picker or the offer builder opened from it, after a pick or without one, SHALL return focus to Add to message.

#### Scenario: Escape
- **WHEN** izrin96 opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus is on Add to message

#### Scenario: After a pick
- **WHEN** izrin96 chooses Attach objekt, picks SeoAh 203Z and the picker closes
- **THEN** the card is attached to the draft and focus is on Add to message

### Requirement: Messages page header
On `/messages`, the page header SHALL show the title and the settings link only, without the page description, and the conversation frame SHALL take the height the description used.

#### Scenario: Desktop
- **WHEN** izrin96 opens `/messages` at 1280 × 800
- **THEN** the header shows "Messages" and the settings link, and the frame below it is taller than before by the description's height

### Requirement: Reply to a message
Each text or card message that is not unsent, from either side, SHALL offer Reply in its "…" message menu, also past the unsend window. The menu SHALL show on hover and focus with a fine pointer and always on touch. Choosing Reply SHALL put "Replying to {name}", or "Replying to yourself", with the quoted text above the message box, move focus to the box rather than back to the menu's button, and send the next message as a reply to it.

#### Scenario: Reply to the partner
- **WHEN** izrin96 chooses Reply on haneul_07's "sent 2 already, check the trade page" and sends "got them both"
- **THEN** both see "got them both" with a quote of "sent 2 already, check the trade page" above it

#### Scenario: Focus after choosing Reply
- **WHEN** izrin96 opens a message's menu with the keyboard and chooses Reply
- **THEN** focus is in the message box, ready to type

#### Scenario: Old message
- **WHEN** izrin96 opens the menu on their own message from yesterday
- **THEN** it offers Reply and no Unsend

#### Scenario: Offer message
- **WHEN** izrin96 looks at an offer card in the thread
- **THEN** no Reply is offered on it

### Requirement: Stop replying
While replying, the line above the message box SHALL offer a control to stop replying, which moves focus to the box. Escape in an empty or filled box SHALL stop replying without clearing the text, unless an input method is composing text, when Escape SHALL leave the reply in place. Choosing Reply on another message SHALL replace the one being replied to.

#### Scenario: Escape
- **WHEN** izrin96 is replying with "ok" typed and presses Escape
- **THEN** the reply line goes, "ok" stays in the box, and sending it sends a plain message

#### Scenario: Escape while composing Korean
- **WHEN** izrin96, using a Korean keyboard and replying, presses Escape while "네" is still being composed
- **THEN** the reply line stays, and a second Escape after the composition ends stops replying

### Requirement: Reply drafts
The reply SHALL be kept with the conversation's unsent draft for the session, also while the box is empty. Choosing, changing or stopping a reply SHALL make the next send a new message, so a retry never posts with an earlier reply. A send that fails SHALL put both the text and the reply back, unless another reply was started meanwhile: then that newer reply stays and the failed text returns without its reply. The reply line SHALL never show the text of a message that has been unsent.

#### Scenario: Emptied box
- **WHEN** izrin96 starts a reply, types "ok", then deletes it
- **THEN** the reply line stays above the empty box

#### Scenario: Switch and back
- **WHEN** izrin96 starts a reply, opens another conversation, and comes back
- **THEN** the reply line and the typed text are still there

#### Scenario: Failed send
- **WHEN** a reply fails to send because the connection dropped
- **THEN** the text returns to the box with its reply line, and the send can be tried again

#### Scenario: Newer reply while sending
- **WHEN** izrin96's reply to message A is still sending, izrin96 chooses Reply on message B, and the send to A then fails
- **THEN** the failed text returns to the box, and the reply line names message B

#### Scenario: Quoted message unsent while replying
- **WHEN** izrin96 is replying to haneul_07's "wrong one, sorry" and haneul_07 unsends it
- **THEN** the reply line reads "Message unsent" and no longer shows "wrong one, sorry"

### Requirement: Reply quote
A reply SHALL show, above its bubble and in its sender's alignment, a one-line quote of the message it answers, with no "Replying to" label and at least 4.5:1 contrast in both themes. A message with text SHALL be quoted by its first line, cut at 120 code points with an ellipsis, even when it holds a card; a reply is quoted by its own text only. A card-only message SHALL be quoted as "Objekt card" or "Trade post". The full message is reached through the jump.

#### Scenario: Card quoted
- **WHEN** haneul_07 replies to izrin96's SeoAh 203Z objekt card
- **THEN** the quote reads "Objekt card"

#### Scenario: Trade post quoted
- **WHEN** haneul_07 replies to the Trade post card izrin96 attached
- **THEN** the quote reads "Trade post"

#### Scenario: Text and card
- **WHEN** haneul_07 replies to izrin96's "still have this one?" sent with an objekt card
- **THEN** the quote reads "still have this one?"

#### Scenario: Reply to a reply
- **WHEN** izrin96 replies to haneul_07's "got them both", which was itself a reply
- **THEN** the quote reads "got them both" and shows no quote inside it

#### Scenario: Long message
- **WHEN** haneul_07 replies to a message whose first line is 300 characters long
- **THEN** the quote shows its first 120 characters on one line, ending in an ellipsis

#### Scenario: Live
- **WHEN** haneul_07 sends a reply while izrin96 has the thread open
- **THEN** it appears with its quote within 2 seconds, with no reload

### Requirement: Jump to the quoted message
A reply's quote SHALL be a button whose accessible name is one sentence naming the sender, the quoted text and the action, such as "Reply to haneul_07: sent 2 already. Go to message". Activating it SHALL scroll to that message, loading up to 10 pages of older messages when it is not shown yet, then move focus to the message and highlight it briefly, without motion when the viewer prefers reduced motion. A message further back SHALL show "That message is too far back" instead.

#### Scenario: Jump back
- **WHEN** izrin96 activates the quote on a reply whose message is 3 pages back
- **THEN** older messages load, the thread scrolls to the quoted message, focus moves to it, and it is highlighted for a moment

#### Scenario: Too far back
- **WHEN** izrin96 activates a quote whose message is more than 10 pages back
- **THEN** a toast reads "That message is too far back to show"

### Requirement: Quote of a missing message
A quote whose message no longer exists SHALL read "Original message unavailable", and SHALL not offer a jump.

#### Scenario: Message gone
- **WHEN** izrin96 opens a thread holding a reply whose quoted message row no longer exists
- **THEN** its quote reads "Original message unavailable"

### Requirement: Quotes of unsent messages
A quote of a message that was unsent, before or after the reply was sent, SHALL read "Message unsent" and SHALL never show that message's text or card, also when the quoted message is not loaded in the thread. A quote whose message is unsent while the thread is open SHALL change within 2 seconds, as the message itself does. A reply that is itself unsent SHALL show "Message unsent" with no quote.

#### Scenario: Unsent after the reply
- **WHEN** haneul_07 unsends a message that izrin96 already replied to
- **THEN** the quote above izrin96's reply reads "Message unsent" for both of them

#### Scenario: Reply to a message being unsent
- **WHEN** izrin96 sends a reply to a message that haneul_07 unsent a moment earlier
- **THEN** the reply is sent, and its quote reads "Message unsent"

#### Scenario: Unsend heard before the reply
- **WHEN** haneul_07 unsends a message just as izrin96's reply to it is sent, and haneul_07's tab hears the unsend before the reply
- **THEN** the reply appears in haneul_07's tab with its quote reading "Message unsent"

#### Scenario: Unsent reply
- **WHEN** izrin96 unsends their reply "got them both"
- **THEN** both see "Message unsent" in its place, with no quote above it

### Requirement: Replies after a report or block
Replying SHALL be no special case after a report or a block: blocks gate sending as they do today, and a report's shared excerpt stays as it was filed.

#### Scenario: Reply after a report
- **WHEN** izrin96 reported haneul_07 from the conversation's menu without blocking, and later replies to one of haneul_07's messages
- **THEN** the reply is sent with its quote, and the report's shared excerpt is unchanged

### Requirement: Reply target checks
A send naming a message to reply to SHALL be refused with a "can't reply to that message" error when that message is not in the same conversation, does not exist, or is an offer. The refusal SHALL keep the typed text in the box. A send without a reply SHALL behave as it does today.

#### Scenario: Another conversation
- **WHEN** a request names a message from a conversation the sender is not reading
- **THEN** it is refused and nothing is posted
