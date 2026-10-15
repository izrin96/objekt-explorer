## MODIFIED Requirements

### Requirement: Broken trades
If a reserved objekt in an in-progress trade moves to anyone other than the receiver, and its leg holds no pending wrong copy (see Wrong copy sent, which accepts that copy instead):
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

#### Scenario: Wrong copy and sale seen together
- **WHEN** the giver sends a wrong copy of #1203, then sells #1203 to a third account, and the verifier reads both in one check
- **THEN** the copy is accepted automatically, as if it had been read first, and the trade carries on

#### Scenario: Copy of the sold objekt sent after the sale
- **WHEN** the giver sells #1203 to a third account, then sends another copy of its collection, and the verifier reads both in one check
- **THEN** that copy is not held for #1203's leg, and with nothing else sent the trade shows Cancelled

#### Scenario: Wrong copy on another leg after the sale
- **WHEN** the giver sells the objekt of one leg, then sends a wrong copy for another leg they owe, and the verifier reads both in one check
- **THEN** the trade shows Failed: the receiver holds that copy, and Report a problem covers it

#### Scenario: Sold while a wrong copy is pending
- **WHEN** the trade asks for HyeRin 301Z #537, a wrong copy #542 is pending, and the giver then sells #537 to a third account
- **THEN** #542 is accepted automatically, the leg shows Verified "#542 in place of #537", and the trade carries on

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

A pending wrong copy SHALL count as accepted, with nobody pressing Accept, at the first of:
- **its deadline**, 72 hours after it was recorded;
- **the trade's expiry**, `TRADE_EXPIRE_DAYS` after accept;
- **its leg breaking**: the asked-for objekt leaving the giver (see Broken trades).

Each of these SHALL wait until the indexer has read the chain past it (see Indexer delay), so an asked-for objekt sent in time verifies the leg first. Accepting it SHALL verify the leg exactly as Accept does, and mark the leg as accepted automatically. Of several pending copies on one leg, the earliest sent SHALL be accepted. A copy whose transfer has verified another leg SHALL no longer be offered or accepted. Moving the copy on from the receiver's wallet SHALL not stop it.

The receiver SHALL see when the copy counts as accepted ("Counts as accepted on Oct 18 unless you decline"), and the giver that it will be. Decline SHALL stay possible until then, and a declined copy SHALL never be accepted.

A trade with a received wrong copy that is still waiting on the receiver, or was declined, SHALL be treated as one where a transfer was made:
- Cancel SHALL be replaced by the locked note, as after a verified transfer.
- With a declined copy, if it is still in progress `TRADE_EXPIRE_DAYS` after accept, it SHALL end Failed, not Cancelled, so Report a problem is offered.
- With a declined copy, if a leg breaks (see Broken trades), it SHALL end Failed, not Cancelled.

A wrong copy SHALL stop being offered once its leg closes: the asked-for objekt verified, another wrong copy was accepted, or the trade ended.

A copy that was already pending when this rule shipped SHALL have its 72 hours counted from then.

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

#### Scenario: No answer
- **WHEN** a wrong copy #1207 has waited on the receiver for 72 hours, and the indexer has read past that time
- **THEN** within 3 minutes the leg shows Verified "#1207 in place of #1203", marked accepted automatically, and the trade completes if it was the last leg

#### Scenario: Deadline while the indexer is behind
- **WHEN** a wrong copy's 72 hours pass while the indexer is 2 hours behind, and the giver sent the asked-for objekt an hour before the deadline
- **THEN** once the indexer catches up the leg verifies with the asked-for objekt, and the wrong copy is no longer offered

#### Scenario: Expiry first
- **WHEN** a wrong copy is recorded on day 13, and the trade reaches its 14-day expiry with that copy still pending
- **THEN** the copy is accepted then, and the trade ends as its legs decide instead of Failed for the copy

#### Scenario: Several copies
- **WHEN** a leg holds pending copies #1207 and #1209, sent in that order, and the deadline passes
- **THEN** #1207 is accepted, and #1209 is no longer offered

#### Scenario: Declined stays declined
- **WHEN** the receiver declined a wrong copy, and 72 hours pass
- **THEN** the leg keeps waiting for its own objekt
