## ADDED Requirements

### Requirement: Wrong copy sent
While a specific-objekt leg of an in-progress trade is waiting, the system SHALL record a **wrong copy** for it when the indexer records a transfer that:
- moves an objekt of the leg's collection, other than the leg's own objekt;
- goes from an address of the giver to an address of the receiver (as "Legs verify from on-chain transfers" counts addresses);
- happened no earlier than 10 minutes before the accept;
- has not verified any leg.

A wrong copy SHALL be recorded within 3 minutes of the indexer recording its transfer. One transfer MAY be recorded against several waiting legs, but it SHALL verify at most one.

On the trade page, under the leg, the system SHALL name both serials, the wrong copy's transaction hash and how long ago it arrived:
- **The receiver** SHALL see Accept #542 and Decline. Accept SHALL ask for confirmation first, and SHALL then verify the leg with the wrong copy's transfer exactly as if the leg had asked for it, recording its hash and time. Decline SHALL close the wrong copy, and the leg SHALL keep waiting for its own objekt.
- **The giver** SHALL see that the receiver can accept it. Otherwise they still need to send the asked-for objekt. Once it's declined, they SHALL see that it was declined.

Only the receiver SHALL be able to accept or decline, and only while the trade is in progress and the leg is waiting. A refused request SHALL leave the trade unchanged. A leg verified through an accepted wrong copy SHALL show the serial that was received, with the asked-for serial beside it.

A trade with a received wrong copy that is still waiting on the receiver, or was declined, SHALL be treated as one where a transfer was made:
- Cancel SHALL be replaced by the locked note, as after a verified transfer.
- If it is still in progress `TRADE_EXPIRE_DAYS` after accept, it SHALL end Failed, not Cancelled, so Report a problem is offered.
- If a leg breaks (see Broken trades), it SHALL end Failed, not Cancelled.

A wrong copy SHALL stop being offered once its leg closes: the asked-for objekt verified, another wrong copy was accepted, or the trade ended.

#### Scenario: Our serial was off
- **WHEN** the trade asks for HyeRin 301Z #1203, and the giver sends the copy Cosmo shows as #1203, which our index has as #1207
- **THEN** within 3 minutes both parties see "sent #1207, this trade asks for #1203" under that leg, and the leg stays Waiting

#### Scenario: Receiver accepts
- **WHEN** the receiver accepts the wrong copy and confirms
- **THEN** the leg shows Verified with that transfer's hash and "#1207 in place of #1203", progress counts it, and the trade completes if it was the last leg

#### Scenario: Receiver declines
- **WHEN** the receiver declines the wrong copy
- **THEN** the leg stays Waiting, the giver sees it was declined, and Cancel stays locked for both parties

#### Scenario: Right copy arrives after a wrong one
- **WHEN** a wrong copy is waiting on the receiver, and the giver then sends the asked-for objekt
- **THEN** the leg verifies with that transfer, and the wrong copy is no longer offered

#### Scenario: Someone else tries to accept
- **WHEN** the giver, or an account outside the trade, asks to accept the wrong copy
- **THEN** it is refused, and the trade is unchanged

#### Scenario: Expires holding a wrong copy
- **WHEN** a trade with a declined wrong copy and no verified leg reaches its expiry
- **THEN** it ends Failed, both parties are notified, and Report a problem is offered

## MODIFIED Requirements

### Requirement: Legs verify from on-chain transfers
Each leg of an in-progress trade SHALL verify on its own, with nobody confirming it by hand, once the indexer records the matching transfer:
- **Specific objekt**: that objekt moves from an address of the giver to an address of the receiver, after the offer was sent.
- **Any copy**: an objekt of that collection moves the same way, no earlier than 10 minutes before the accept (the party accepting may have sent it just before pressing Accept).

An address counts for a party if it was linked to them when the trade was accepted, or is linked to them now. A move between two of the giver's own addresses SHALL not count, and SHALL not break the leg.

One transfer SHALL verify at most one leg. A transfer is identified by its transaction hash and token, so this SHALL hold even after the indexer is rebuilt from the chain. When more than one waiting leg could take the same transfer:
- a leg naming that specific objekt SHALL take it before any-copy legs;
- among the rest, the leg of the trade accepted first SHALL take it.

A verified leg SHALL record the transaction hash and time. When the last leg verifies, the trade SHALL become Completed.

A leg SHALL verify within 3 minutes of the indexer recording its transfer, even if a live update was missed.

#### Scenario: Both legs verify
- **WHEN** the user sends HyeRin 301Z #1203 to binary.bin, and binary.bin sends a copy of Nien 205Z back
- **THEN** both legs show Verified with their transaction hashes, and T-1042 shows Completed

#### Scenario: Own wallets first
- **WHEN** the giver moves the objekt from one of their linked addresses to another, then to the receiver
- **THEN** the leg verifies on the second transfer and is never marked broken

#### Scenario: Worker restarted
- **WHEN** the transfer happens while the worker is restarting
- **THEN** the leg still verifies within 3 minutes of the worker coming back

#### Scenario: Sent with the offer
- **WHEN** the giver sends HyeRin 301Z #1203 right after sending the offer, and the receiver accepts an hour later
- **THEN** the leg verifies with that transfer

#### Scenario: A copy sent before the accept
- **WHEN** binary.bin sends the user a copy of Nien 205Z for another deal, and the user accepts an offer asking binary.bin for any copy of Nien 205Z the next day
- **THEN** that earlier transfer doesn't verify the any-copy leg

#### Scenario: Two trades between the same pair
- **WHEN** T-1040 and T-1042 each ask binary.bin for any copy of Nien 205Z, T-1040 was accepted first, and binary.bin sends one copy
- **THEN** T-1040's leg verifies, and T-1042's stays Waiting

#### Scenario: Indexer rebuilt
- **WHEN** the indexer is rebuilt from the chain while a trade with a verified any-copy leg has another trade's any-copy leg waiting for the same collection
- **THEN** the transfer that already verified the first leg doesn't verify the second

### Requirement: Broken trades
If a reserved objekt in an in-progress trade moves to anyone other than the receiver:
- with no leg verified yet and no received wrong copy held (see Wrong copy sent), the trade SHALL be Cancelled with the reason "an objekt left the wallet";
- with a leg already verified, or a received wrong copy held, the trade SHALL be marked Failed.

Either way both parties SHALL be notified, and every reservation of the trade SHALL be released.

A move away shortly before the accept counts too when the objekt never came back, since the accept's ownership check can trail the chain. A move away and back before the accept SHALL not break the trade.

#### Scenario: Sold elsewhere before sending
- **WHEN** the giver sends a reserved objekt to a third account, and no leg was verified
- **THEN** the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Sold just before the accept
- **WHEN** the giver sold a reserved objekt to a third account minutes before the accept, and the accept still saw it in their wallet
- **THEN** once the sale is indexed, the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Received but never returned
- **WHEN** one leg verified, then the other side sends its reserved objekt to someone else
- **THEN** the trade shows Failed, and Report a problem is offered at once

#### Scenario: Sold elsewhere after a wrong copy
- **WHEN** the giver sent a wrong copy that the receiver declined, then sends the asked-for objekt to a third account
- **THEN** the trade shows Failed, and Report a problem is offered at once

### Requirement: Cancel locks after the first transfer
Either party SHALL be able to cancel an in-progress trade only while none of its legs is verified and it holds no received wrong copy that is waiting on the receiver or was declined (see Wrong copy sent). After that, Cancel SHALL be replaced by "Cancelling is locked after the first verified transfer".

#### Scenario: Locked
- **WHEN** one leg has verified and the other party opens the trade page
- **THEN** there is no Cancel action, and the locked note shows

#### Scenario: Locked by a wrong copy
- **WHEN** the giver has sent a wrong copy that the receiver has not accepted, and no leg is verified
- **THEN** neither party sees Cancel, and a request to cancel is refused
