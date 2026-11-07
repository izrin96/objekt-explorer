## MODIFIED Requirements

### Requirement: Wrong copy sent
While a specific-objekt leg of an in-progress trade is waiting, the system SHALL record a **wrong copy** for it when the indexer records a transfer that:
- moves an objekt of the leg's collection, other than the leg's own objekt;
- goes from an address of the giver to an address of the receiver (as "Legs verify from on-chain transfers" counts addresses);
- happened no earlier than 10 minutes before the accept;
- has not verified any leg.
- is the first such send of that objekt: one passed back and sent again is the same copy, recorded once.

A wrong copy SHALL be recorded within 3 minutes of the indexer recording its transfer. One transfer MAY be recorded against several waiting legs, but it SHALL verify at most one.

On the trade page, the leg's card SHALL name the serial sent beside the asked-for serial, with the wrong copy's transaction hash and how long ago it arrived. The next-step banner SHALL carry the decision (see Next-step states):
- **The receiver** SHALL see Accept #542 and Decline. Accept SHALL ask for confirmation first, and SHALL then verify the leg with the wrong copy's transfer exactly as if the leg had asked for it, recording its hash and time. Decline SHALL close the wrong copy, and the leg SHALL keep waiting for its own objekt.
- **The giver** SHALL see that the receiver can accept it. Otherwise they still need to send the asked-for objekt. Once it's declined, the leg's card SHALL show that it was declined.

Only the receiver SHALL be able to accept or decline, and only while the trade is in progress and the leg is waiting. A refused request SHALL leave the trade unchanged. A leg verified through an accepted wrong copy SHALL show the serial that was received, with the asked-for serial beside it.

A pending wrong copy SHALL count as accepted, with nobody pressing Accept, at the first of:
- **its deadline**, 72 hours after it was recorded;
- **the trade's expiry**, `TRADE_EXPIRE_DAYS` after accept;
- **its leg breaking**: the asked-for objekt leaving the giver (see Broken trades);
- **another leg breaking**: a break on any other leg of the trade ending it (see Broken trades). Each open leg holding a pending copy then accepts it before the trade's outcome, and who is at fault, is decided.

Each of these SHALL wait until the indexer has read the chain past it (see Indexer delay), so an asked-for objekt sent in time verifies the leg first. Accepting it SHALL verify the leg exactly as Accept does, and mark the leg as accepted automatically. Of several pending copies on one leg, the earliest sent SHALL be accepted. A copy whose transfer has verified another leg SHALL no longer be offered or accepted. Moving the copy on from the receiver's wallet SHALL not stop it.

The receiver SHALL see when the copy counts as accepted ("Counts as accepted on Oct 18 unless you decline"), and the giver that it will be. Decline SHALL stay possible until then, and a declined copy SHALL never be accepted.

A trade with a received wrong copy that is still waiting on the receiver, or was declined, SHALL be treated as one where a transfer was made:
- Cancel trade SHALL show disabled with the locked note, as after a verified transfer.
- With a declined copy, if it is still in progress `TRADE_EXPIRE_DAYS` after accept, it SHALL end Failed, not Cancelled, so Report a problem is offered.
- With a declined copy, if a leg breaks (see Broken trades), it SHALL end Failed, not Cancelled.

A wrong copy SHALL stop being offered once its leg closes: the asked-for objekt verified, another wrong copy was accepted, or the trade ended.

A copy that was already pending when this rule shipped SHALL have its 72 hours counted from then.

#### Scenario: Our serial was off
- **WHEN** the trade asks for HyeRin 301Z #1203, and the giver sends the copy Cosmo shows as #1203, which our index has as #1207
- **THEN** within 3 minutes both parties see "sent #1207, this trade asks for #1203" in the banner, the leg's card shows "Sent #1207 instead" with its hash, and the leg stays Waiting

#### Scenario: One wrong copy sent twice
- **WHEN** T-1040 asks binary.bin for Nien 205Z #101 and T-1042 for #102, binary.bin sends #88, the user sends it back, and binary.bin sends #88 again
- **THEN** each leg records #88 once, from the first send, so the two legs can't each accept a send of it

#### Scenario: Receiver accepts
- **WHEN** the receiver accepts the wrong copy and confirms
- **THEN** the leg shows Verified with that transfer's hash and "#1207 in place of #1203", progress counts it, and the trade completes if it was the last leg

#### Scenario: Receiver declines
- **WHEN** the receiver declines the wrong copy
- **THEN** the leg stays Waiting, the giver's card shows the copy as Declined, and Cancel trade stays locked for both parties

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

#### Scenario: Another leg breaks
- **WHEN** A owes #1203 and sent wrong copy #1207, still pending, and B's leg then breaks because B sold the objekt B owes
- **THEN** #1207 is accepted automatically, A's leg shows Verified "#1207 in place of #1203", the trade ends Failed with B at fault, and A can leave feedback

#### Scenario: Another leg breaks with a declined copy
- **WHEN** A's wrong copy #1207 was declined, and B's leg then breaks
- **THEN** #1207 stays declined, A's leg stays unverified, and the trade ends Failed

#### Scenario: Several copies
- **WHEN** a leg holds pending copies #1207 and #1209, sent in that order, and the deadline passes
- **THEN** #1207 is accepted, and #1209 is no longer offered

#### Scenario: Declined stays declined
- **WHEN** the receiver declined a wrong copy, and 72 hours pass
- **THEN** the leg keeps waiting for its own objekt
