# Spec Delta

## ADDED Requirements

### Requirement: Confirm a lopsided accept
An offer is lopsided when both sides hold objekts and one side holds at least 5 times as many as the other, each copy counting as one. Accept on a lopsided open offer SHALL open a confirmation before any request is sent. It SHALL state how many objekts the recipient gets and gives, and that accepting trades all of them. When the card offers Counter, it SHALL say Counter trades only some, and offer Counter beside Cancel and Accept. Any other offer SHALL accept on one press.

#### Scenario: Seventeen for one
- **WHEN** rin.trades offers the user 17 objekts for 1, and the user presses Accept on the card
- **THEN** no request is sent, and a dialog says the user gets 17 and gives 1, that accepting trades all of them, and that Counter trades only some

#### Scenario: Confirmed
- **WHEN** the user presses Accept in that dialog
- **THEN** the offer is accepted as any offer is, and the dialog closes

#### Scenario: Cancelled
- **WHEN** the user presses Cancel in that dialog
- **THEN** the offer stays open with Decline, Counter and Accept, and focus returns to Accept

#### Scenario: Counter from the dialog
- **WHEN** the user presses Counter in that dialog
- **THEN** the dialog closes and the offer builder opens as it does from the card's Counter

#### Scenario: The recipient gives the larger side
- **WHEN** rin.trades offers the user 1 objekt for 5, and the user presses Accept
- **THEN** the dialog opens, saying the user gets 1 and gives 5

#### Scenario: Four for one
- **WHEN** rin.trades offers the user 4 objekts for 1, and the user presses Accept
- **THEN** the offer is accepted without a dialog

#### Scenario: One side empty
- **WHEN** rin.trades offers the user 6 objekts and a top-up and asks for no objekt, and the user presses Accept
- **THEN** the offer is accepted without a dialog

#### Scenario: No Counter on the card
- **WHEN** a lopsided offer's card offers no Counter, and the user presses Accept
- **THEN** the dialog names the counts, says nothing of Counter, and offers only Cancel and Accept
