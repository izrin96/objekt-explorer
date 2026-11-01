## MODIFIED Requirements

### Requirement: Add to message focus
Escape, and the sheet's close button, SHALL close the menu or sheet and return focus to Add to message. Closing the objekt picker opened from it, after a pick or without one, SHALL return focus to Add to message. Make offer SHALL open the offer page (see `web-trade-offers` Offer page); leaving it without sending SHALL return to the conversation with focus on Add to message.

#### Scenario: Escape
- **WHEN** izrin96 opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus is on Add to message

#### Scenario: After a pick
- **WHEN** izrin96 chooses Attach objekt, picks SeoAh 203Z and the picker closes
- **THEN** the card is attached to the draft and focus is on Add to message

#### Scenario: Back from the offer page
- **WHEN** izrin96 chooses Make offer from Add to message, then Cancel on the offer page
- **THEN** the conversation opens again with focus on Add to message
