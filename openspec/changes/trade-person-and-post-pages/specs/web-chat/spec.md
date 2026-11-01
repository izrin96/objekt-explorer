## MODIFIED Requirements

### Requirement: Messages and objekt cards
A message SHALL be text of 1 to 2,000 characters, a card, or both. A card SHALL be one of:
- an **objekt card**, referring to a collection or a specific objekt, and optionally the list it came from;
- a **post card**, referring to a Trade post by its list, and optionally carrying a **match** saved when it was sent.

The thread SHALL render an objekt card as a live objekt card with the collection's art and name. A card for a specific objekt SHALL show its serial. A card from a list SHALL name the list and link to it, and show the list's price when the list is a sale list.

The thread SHALL render a post card, read live from the post, with:
- the post's tag (WTT, WTS and the rest, as Browse shows them) and its owner's name;
- a strip with up to six objekts of the post's have or sale list and the count of the rest, labelled as Browse labels it: its role ("HAVE", or "SALE" on a sale post) and its number of copies, in the list type's colour;
- for a post with a want list, a WANT strip the same way; for a sale post with no want list, its price range in place of the WANT strip, with whole amounts shown without decimals;
- a link to the post: for the sender, it opens the post's page (`/trade/@<owner's handle>/<anchor slug>`, see `web-trade-person-pages`); for the owner, it opens their own list.

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
- **THEN** kaede.k is on the post's page under mina's handle, and mina is on her own list

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
