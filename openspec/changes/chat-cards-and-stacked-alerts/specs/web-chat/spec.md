## MODIFIED Requirements

### Requirement: Messages and objekt cards
A message SHALL be text of 1 to 2,000 characters, a card, or both. A card SHALL be one of:
- an **objekt card**, referring to a collection or a specific objekt, and optionally the list it came from;
- a **post card**, referring to a Trade post by its list, and optionally carrying a **match** saved when it was sent.

The thread SHALL render an objekt card as a live objekt card with the collection's art and name. A card for a specific objekt SHALL show its serial. A card from a list SHALL name the list and link to it, and show the list's price when the list is a sale list.

The thread SHALL render a post card, read live from the post, with:
- the post's tag (WTT, WTS and the rest, as Browse shows them) and its owner's name;
- a Has strip with up to six objekts of the post's have or sale list and the count of the rest;
- for a post with a want list, a Wants strip the same way; for a sale post with no want list, its price range in place of the Wants strip;
- a link to the post: for the sender, it opens the owner's person sheet on Trade; for the owner, it opens their own list.

A post card with a match SHALL show, in place of the strips, the two directions between the sender and the post's owner: first the count and up to three objekts of the owner's that are on the sender's wants, then the count and up to three objekts of the sender's that are on the owner's wants. Each direction SHALL be labelled from the viewer's side, as offer cards are: "N of yours they want" and "N of theirs you want", so the sender and the owner each read the card correctly. A direction with no matches SHALL be left out. The match SHALL show what was saved when the card was sent, even after either side's lists change, and SHALL still link to the post.

A post card whose post no longer exists, or whose list is no longer posted on Trade, SHALL say "Post removed" and keep any saved match. A card whose kind the client does not know SHALL be skipped and the message's text still shown. Messages SHALL show their time and be ordered oldest to newest.

#### Scenario: Card from a sale list
- **WHEN** a user starts a chat from a Market drawer row for SeoYeon 204Z #537 on rin.trades's sale list priced 6,000 KRW and sends it
- **THEN** the thread shows a card with SeoYeon 204Z, serial 537, the list name and 6,000 KRW

#### Scenario: Post card
- **WHEN** a user sends a post card for mina's WTT post, whose have list holds 24 collections and whose want list holds 12
- **THEN** both users see a card with the WTT tag, six objekts of the have list and "+18", six objekts of the want list and "+6", and a link to the post

#### Scenario: Open post
- **WHEN** kaede.k activates the link on the post card she sent mina, and mina activates the same link
- **THEN** kaede.k is on Trade with mina's person sheet open, and mina is on her own list

#### Scenario: Sale post
- **WHEN** a user sends a post card for rin.trades's WTS post priced from 4,000 to 9,000 KRW, with no want list
- **THEN** the card shows the Has strip and "4,000–9,000 KRW" where the Wants strip would be

#### Scenario: Match card
- **WHEN** kaede.k, who wants 2 of mina's objekts and has 3 that mina wants, sends a match card for mina's post
- **THEN** kaede.k sees "2 of theirs you want" with two of mina's objekts, then "3 of yours they want" with three of hers; mina sees the same objekts as "2 of yours they want", then "3 of theirs you want"; both see a link to the post

#### Scenario: Saved match
- **WHEN** mina later removes one of the matched collections from her want list
- **THEN** the match card already sent still shows the same counts and objekts

#### Scenario: Post removed
- **WHEN** the owner deletes the list behind a post card
- **THEN** the card says "Post removed", and the message's text still shows

#### Scenario: Too long
- **WHEN** a user tries to send 2,001 characters
- **THEN** the message is refused and the box says why

### Requirement: Message attaches its card
Message on a Trade post, a person sheet or a Market listing SHALL check its card by the rules for sending one, then open the conversation with the card attached in the message box, and SHALL send nothing. On a Trade post the card is a post card (see `web-trade-browse`); on a person sheet or a Market listing it is an objekt card. The attached card SHALL be removable and SHALL be sent with the text when the user sends. An attached post card SHALL also offer "Pick objekts instead", which removes it and opens the Attach objekt picker. Activating Message again for a conversation that already exists SHALL open it with the card attached and SHALL add no message. A card that can no longer be sent SHALL be refused when Message is activated and when it is sent, saying why, and no conversation SHALL be opened for it. An objekt card can no longer be sent when:
- its list is gone, or no longer holds that collection (or, for a specific objekt, that objekt);
- its specific objekt is held by neither the sender nor the list's owner.

A post card can no longer be sent when its list is gone, is no longer posted on Trade, or does not belong to the conversation's partner. A match is computed by the server when the card is sent, by the same rules as Browse's match chip, and a client cannot supply one.

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

### Requirement: Suggested first line
While a conversation has no messages and the user can send, the message box SHALL offer one-tap suggestions that fill the box without sending. One suggestion SHALL match the attached card:
- an objekt card from a sale list: asking whether it is still for sale;
- an objekt card from a have list: asking whether they would trade it;
- an objekt card from a want list: offering it;
- a post card with a match: "Hi! We match on a few. Want to swap?";
- a post card without a match: "Hi! Saw your post. Open to a swap?".

A post card SHALL never offer the objekt card suggestions. Without a card the suggestions SHALL be general.

#### Scenario: Sale card
- **WHEN** a user opens a new conversation from a Market listing
- **THEN** the message box offers "Hi! Is this still for sale?", and tapping it fills the box without sending

#### Scenario: Post card from Browse
- **WHEN** a user opens a new conversation from Message on a Browse post they have no matches with
- **THEN** the message box offers "Hi! Saw your post. Open to a swap?" and not "Hi! Would you trade this one?"

#### Scenario: Not after the first message
- **WHEN** the conversation has any message
- **THEN** no suggestions are shown

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
