## MODIFIED Requirements

### Requirement: Legs verify from on-chain transfers
Each leg of an in-progress trade SHALL verify on its own, with nobody confirming it by hand, once the indexer records the matching transfer:
- **Specific objekt**: that objekt moves from an address of the giver to an address of the receiver, after the offer was sent; or, after the accept, it moves to an address of the receiver from any address, so an objekt routed through another wallet (such as the giver's other account) still delivers.
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

#### Scenario: Through another account's wallet
- **WHEN** after the accept the giver moves HyeRin 301Z #1203 to a wallet linked to their other account, and that wallet sends #1203 to the receiver
- **THEN** the leg verifies with the second transfer and is never marked broken

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
If a reserved objekt in an in-progress trade moves to anyone other than the receiver, and it is still away from both the giver and the receiver 24 hours after it left, as read by the indexer (see Indexer delay), its leg breaks. A leg holding a pending wrong copy sent before the objekt left accepts that copy instead (see Wrong copy sent). When a leg breaks:
- with no leg verified yet and no received wrong copy held (see Wrong copy sent), the trade SHALL be Cancelled with the reason "an objekt left the wallet";
- with a leg already verified, or a received wrong copy held, the trade SHALL be marked Failed.

Either way both parties SHALL be notified, and every reservation of the trade SHALL be released. The break SHALL count from when the objekt left.

If the objekt comes back to an address of the giver, or is delivered to the receiver (see Legs verify from on-chain transfers), within the 24 hours, the leg SHALL not break. A return or delivery after the 24 hours SHALL not undo the break, even when the indexer reads both in one check. A move away before the accept follows the same rule, and a move away and back before the accept SHALL not break the trade.

#### Scenario: Sold elsewhere before sending
- **WHEN** the giver sends a reserved objekt to a third account, no leg was verified, and the objekt is still there 24 hours later
- **THEN** the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Sold just before the accept
- **WHEN** the giver sold a reserved objekt to a third account minutes before the accept, the accept still saw it in their wallet, and it never comes back
- **THEN** 24 hours after the sale, once it is indexed, the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Received but never returned
- **WHEN** one leg verified, then the other side sends its reserved objekt to someone else, and it stays there for 24 hours
- **THEN** the trade shows Failed, and Report a problem is offered at once

#### Scenario: Moved away and back
- **WHEN** one leg verified, the giver moves the objekt they owe to another wallet, gets it back 2 minutes later and sends it to the receiver
- **THEN** the trade never shows Failed, and Completes when that leg verifies

#### Scenario: Back after a day and a half
- **WHEN** the objekt left the giver 36 hours ago and comes back now
- **THEN** the trade already ended at the 24-hour mark, and its return changes nothing

#### Scenario: Sold elsewhere after a wrong copy
- **WHEN** the giver sent a wrong copy that the receiver declined, then sends the asked-for objekt to a third account, and it stays there for 24 hours
- **THEN** the trade shows Failed, and Report a problem is offered at once

#### Scenario: Wrong copy and sale seen together
- **WHEN** the giver sends a wrong copy of #1203, then sells #1203 to a third account, the verifier reads both in one check, and #1203 stays away for 24 hours
- **THEN** the copy is accepted automatically at the 24-hour mark, as if it had been read first, and the trade carries on

#### Scenario: Copy of the sold objekt sent after the sale
- **WHEN** the giver sells #1203 to a third account, then sends another copy of its collection, and #1203 stays away for 24 hours
- **THEN** that copy is not held for #1203's leg, and with nothing else sent the trade shows Cancelled

#### Scenario: Wrong copy on another leg after the sale
- **WHEN** the giver sells the objekt of one leg, then sends a wrong copy for another leg they owe, and the sold objekt stays away for 24 hours
- **THEN** the trade shows Failed: the receiver holds that copy, and Report a problem covers it

#### Scenario: Sold while a wrong copy is pending
- **WHEN** the trade asks for HyeRin 301Z #537, a wrong copy #542 is pending, the giver then sells #537 to a third account, and #537 stays away for 24 hours
- **THEN** #542 is accepted automatically, the leg shows Verified "#542 in place of #537", and the trade carries on

#### Scenario: Indexer behind at the deadline
- **WHEN** the 24 hours pass while the indexer is 2 hours behind, and the objekt came back 1 hour before the deadline
- **THEN** once the indexer catches up the leg is still waiting, and the trade carries on

## ADDED Requirements

### Requirement: Objekt away from the giver
When the indexer first records that a reserved objekt of a waiting leg left the giver for someone other than the receiver, both parties SHALL be notified once, naming it by serial and giving when the trade breaks (24 hours after it left). While it stays away, its leg card and the next-step banner SHALL show that time to both parties. When it comes back or is delivered, the warning SHALL go away with no new notification.

#### Scenario: Told when it leaves
- **WHEN** binary.bin's leg verified, and the user moves Kotone 301A, which they owe, to another wallet at 01:16
- **THEN** within 3 minutes the user is notified that their #301 left their wallet and to bring it back or send it by 01:16 the next day, and binary.bin that the user's #301 left their wallet and the trade ends unless it's back or delivered by then

#### Scenario: Warning on the trade page
- **WHEN** binary.bin opens that trade while Kotone 301A is away
- **THEN** the leg's card and the banner say it left the user's wallet and give the deadline

#### Scenario: Back in time
- **WHEN** Kotone 301A returns to the user's wallet 2 minutes later
- **THEN** the warning disappears from the trade page within 3 minutes, and no one is notified again

#### Scenario: Left twice
- **WHEN** Kotone 301A leaves, comes back, then leaves again an hour later
- **THEN** both parties are notified again, and the new deadline counts from the second move
