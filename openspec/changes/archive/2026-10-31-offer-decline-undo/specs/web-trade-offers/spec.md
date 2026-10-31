# Spec Delta

## MODIFIED Requirements

### Requirement: Offer lifecycle
A conversation SHALL hold at most one open offer:
- **Counter**: when the recipient of the open offer sends one, it replaces that offer, which becomes Countered.
- **Replace**: when the sender of the open offer sends one, it replaces their own, which becomes Withdrawn.
- **Recipient** actions on an open offer: Accept, Decline or Counter.
- **Sender** actions on an open offer: Withdraw.
- **Expiry**: an open offer SHALL expire 7 days after it was sent, and can't be accepted after that.

Decline and Withdraw SHALL be held for 5 seconds before they reach the server. While held:
- a notice SHALL read "Offer declined" or "Offer withdrawn" and offer Undo;
- the offer card SHALL show "Declining…" or "Withdrawing…" with its own Undo in place of its actions, and focus SHALL move to that Undo;
- Undo, from the notice or the card, SHALL cancel the hold: nothing is sent, the partner is not notified, the card's actions return and focus returns to the button that started it.

When the hold ends the action SHALL be sent, also when the user has left the thread; a refusal shows the usual error notice and refreshes the offer. Closing or reloading the tab during a hold SHALL leave the offer open.

#### Scenario: Counter
- **WHEN** rin.trades counters O-881 with O-882
- **THEN** O-881 shows Countered and collapses, and O-882 shows "waiting for you" to the original sender

#### Scenario: Expired
- **WHEN** a user opens an offer sent 8 days ago that nobody answered
- **THEN** it shows Expired and has no Accept action

#### Scenario: Decline, then Undo
- **WHEN** izrin96 taps Decline on O-258 and taps Undo within 5 seconds
- **THEN** no request is sent, jiliijlilji gets no notification, O-258 shows Decline, Counter and Accept again, and focus is on Decline

#### Scenario: Decline goes through
- **WHEN** izrin96 taps Decline on O-258 and does nothing for 5 seconds
- **THEN** O-258 is declined, the card shows Declined, and jiliijlilji is notified as before

#### Scenario: Withdraw, then leave
- **WHEN** jiliijlilji taps Withdraw on their open offer and opens another conversation within 5 seconds
- **THEN** the offer is still withdrawn when the 5 seconds end

#### Scenario: Tab closed during the hold
- **WHEN** izrin96 taps Decline on O-258 and closes the tab within 5 seconds
- **THEN** O-258 stays open
