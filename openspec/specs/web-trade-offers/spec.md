# web-trade-offers Specification

## Purpose
Offers between two accounts on `apps/web`: specific objekts (or any copy) on each side with an optional unverified money top-up, sent and countered inside a conversation, accepted into a trade that reserves its objekts, and tracked under Trade › My trades (`/trade/mine`).

## Requirements

### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists that the sender may see in that conversation. Those are lists that show their owner, the list the conversation started from, and lists already shown on a card in the conversation.

A counter-offer MAY also ask for any objekt the recipient listed under You give in the offer it counters, since the recipient already offered it.

An offer SHALL hold at least one objekt, and at most 10 on each side. Either side may be empty. An offer MAY carry:
- a money top-up with an amount, a currency and which side pays, always shown as "paid outside, not verified";
- a note of up to 280 characters.

#### Scenario: Swap with a top-up
- **WHEN** a user offers HyeRin 301Z #1203 for rin.trades's SeoYeon 204Z #537, adding 1,000 KRW paid by the user
- **THEN** rin.trades sees an offer card with both objekts and "+ 1,000 KRW · paid outside, not verified"

#### Scenario: Cash buy
- **WHEN** a user offers nothing on the give side for SeoYeon 204Z #537, plus 6,000 KRW paid by the user
- **THEN** the offer is sent with an empty You give side

#### Scenario: Unlisted objekt
- **WHEN** a request asks for an objekt that is on none of the recipient's allowed lists
- **THEN** the offer is refused, and nothing is sent

#### Scenario: Counter keeps their objekt
- **WHEN** rin.trades offers HyeRin 301Z #1203, which is on none of their lists, and the user counters, keeping it under You get and adding a top-up
- **THEN** the counter is sent

#### Scenario: Hidden list stays hidden
- **WHEN** the recipient has a have list that hides its owner and was never shown in this conversation
- **THEN** the builder doesn't offer that list's entries

### Requirement: Checks before sending
Before an offer is sent, each specific objekt SHALL be checked against current on-chain ownership:
- each one must be owned by an address linked to the side that gives it;
- each one must be transferable;
- none may be in an accepted trade that is still in progress.

An offer that fails any of these checks SHALL be refused, naming the objekt. An objekt that is already in another open offer SHALL show a warning naming that offer, and SHALL still be sendable.

#### Scenario: Not transferable
- **WHEN** the user adds Kaede Divine01 322Z #14, which is not transferable
- **THEN** the builder marks it "Not transferable" and it can't be added

#### Scenario: Already offered elsewhere
- **WHEN** the user adds JiWoo Cream01 108Z #88, which is in open offer O-874
- **THEN** the builder shows "Also in open offer O-874" and the offer can still be sent

#### Scenario: Reserved
- **WHEN** the user adds an objekt that is part of an accepted trade in progress
- **THEN** the offer is refused for that objekt

### Requirement: Offer lifecycle
A conversation SHALL hold at most one open offer:
- **Counter**: when the recipient of the open offer sends one, it replaces that offer, which becomes Countered.
- **Replace**: when the sender of the open offer sends one, it replaces their own, which becomes Withdrawn.
- **Recipient** actions on an open offer: Accept, Decline or Counter.
- **Sender** actions on an open offer: Withdraw.
- **Expiry**: an open offer SHALL expire 7 days after it was sent, and can't be accepted after that.

#### Scenario: Counter
- **WHEN** rin.trades counters O-881 with O-882
- **THEN** O-881 shows Countered and collapses, and O-882 shows "waiting for you" to the original sender

#### Scenario: Expired
- **WHEN** a user opens an offer sent 8 days ago that nobody answered
- **THEN** it shows Expired and has no Accept action

### Requirement: Accept creates a trade
Accepting SHALL first recheck every objekt in the offer against current ownership and transferability. For any-copy items, the giver must hold enough copies that are transferable and not reserved. If the recheck passes, accepting SHALL:
- create a trade, shown as T-<number>, with one leg per objekt;
- reserve every specific objekt in it;
- cancel every other open offer that holds one of those objekts, with the reason "an objekt in it was traded", and notify both parties of each cancelled offer.

Of two offers holding the same objekt, the first accepted wins. Either party SHALL be able to cancel an in-progress trade until its first leg is verified (see `web-verified-trades`). Cancelling releases its reservations.

#### Scenario: First accepted wins
- **WHEN** O-874 and O-881 both hold JiWoo 108Z #88, and O-881 is accepted
- **THEN** O-881 becomes trade T-1042, and O-874 shows Cancelled with the reason

#### Scenario: Owner sold it meanwhile
- **WHEN** the recipient accepts an offer whose objekt has left the sender's wallet
- **THEN** the accept is refused, naming the objekt, and the offer stays open

#### Scenario: Racing accepts
- **WHEN** two offers holding the same objekt are accepted at the same moment
- **THEN** exactly one becomes a trade, and the other is refused as reserved

### Requirement: Offer builder
The builder SHALL open as a dialog, and as a full-height sheet on a phone. It shows:
- You give, with an Add picker over the sender's own objekts, have-list entries first;
- You get, with an Add picker over the allowed list entries;
- the top-up and the note.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another open offer). Send SHALL stay disabled until the offer holds at least one objekt.

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

### Requirement: My trades
`/trade/mine` SHALL list the signed-in user's offers and trades in four groups:
- **Needs you**: open offers sent to the user;
- **Waiting on them**: open offers the user sent;
- **In progress**: accepted trades not yet ended;
- **History**: ended offers and trades, newest first, loading more as the user scrolls.

Each row SHALL show the partner, the O or T number, a one-line summary of both sides and its status. It links to the conversation, or to the trade page for a trade.

`/trade/mine/$tradeId` SHALL show a trade to its two parties only:
- its status;
- when it was proposed and accepted;
- each leg: the objekt, from whom, to whom and its state;
- Open chat, and Cancel while cancelling is allowed.

Anyone else SHALL get the not-found page. A signed-out visitor SHALL be sent to `/login?redirect=` with the page's path.

#### Scenario: Needs you
- **WHEN** rin.trades counters the user's offer
- **THEN** My trades lists O-882 under Needs you, with "your turn"

#### Scenario: Not a party
- **WHEN** a third account opens `/trade/mine/1042`
- **THEN** the not-found page is shown

### Requirement: Offer rate limits
Sending an offer SHALL count toward the chat message limit. A first offer to someone without a conversation SHALL also count toward the new-conversation limit. A user SHALL have at most 20 open sent offers at a time.

#### Scenario: Too many open offers
- **WHEN** a user with 20 open sent offers sends another
- **THEN** it is refused with "You have too many open offers. Withdraw one first."
