## MODIFIED Requirements

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
