## ADDED Requirements

### Requirement: Objekts sent before the accept
When a specific objekt of an open offer has moved from its giver to the other party since the offer was sent, the offer card SHALL mark that objekt as already sent, for both parties, while the offer is open. The mark SHALL appear within 3 minutes of the indexer recording the transfer, without a reload, and go away the same way if the objekt goes back to its giver. Any-copy items are never marked.

#### Scenario: One side sent
- **WHEN** only the sender has sent their objekt
- **THEN** within 3 minutes the card marks that objekt as sent, for both parties

#### Scenario: Sent back
- **WHEN** the sender's objekt was marked as sent, and the recipient sends it back to the sender
- **THEN** within 3 minutes the mark goes away, and the offer stays open

#### Scenario: Any-copy item
- **WHEN** an offer asks for any copy of Nien 205Z, and the recipient has sent one copy
- **THEN** the any-copy item is not marked

#### Scenario: Sent before the offer
- **WHEN** the giver sent the objekt to the other party before the offer was made
- **THEN** it is not marked as sent

### Requirement: Accept hint when everything was sent
When both sides of an open offer hold objekts and every one is a specific objekt marked as sent, the card SHALL show a hint above its actions:
- to the recipient: both sides are already delivered, and pressing Accept records the trade;
- to the sender: both sides are already delivered, and the trade is recorded once the recipient accepts.

The hint SHALL ignore the top-up, change nothing about the offer, and go away once the offer is no longer open.

#### Scenario: Both sides sent before anyone accepted
- **WHEN** O-180 offers Chaewon 361Z #87 for Chaeyeon 303A #12, and both parties send their objekt to the other on chain without pressing Accept
- **THEN** the recipient sees the hint to press Accept, and the sender sees that the trade is recorded once the recipient accepts

#### Scenario: Accept after the hint
- **WHEN** the recipient presses Accept on that offer
- **THEN** the trade is created, both legs verify from the earlier transfers, and it shows Completed

#### Scenario: Any-copy item in the offer
- **WHEN** an offer holds an any-copy item, and every specific objekt in it was sent
- **THEN** there is no hint

#### Scenario: Offer declined
- **WHEN** the recipient declines an offer showing the hint
- **THEN** the hint goes away
