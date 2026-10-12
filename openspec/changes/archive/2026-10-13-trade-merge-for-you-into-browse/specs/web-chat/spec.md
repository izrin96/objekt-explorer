## MODIFIED Requirements

### Requirement: Message attaches its card
Message on a Trade post, a person sheet or a Market listing SHALL check its objekt card by the rules for sending one, then open the conversation with the card attached in the message box, and SHALL send nothing. The attached card SHALL be removable and SHALL be sent with the text when the user sends. Activating Message again for a conversation that already exists SHALL open it with the card attached and SHALL add no message. A card that can no longer be sent (the listing is gone, the objekt changed hands) SHALL be refused when Message is activated, saying why, and no conversation SHALL be opened for it.

Opening a conversation still counts as a start against the start limit the first time it is created; nothing counts against the per-minute message limit until a message is sent.

#### Scenario: Card attached, not sent
- **WHEN** a user activates Message on rin.trades's WTS post for SeoYeon 204Z
- **THEN** the thread opens with the SeoYeon 204Z card attached in the message box, and rin.trades has received nothing

#### Scenario: Send with a line
- **WHEN** the user types "Still available?" with the card attached and sends
- **THEN** one message carrying both the text and the card appears for both users

#### Scenario: Second click
- **WHEN** the user activates Message on the same post again after sending
- **THEN** the same thread opens with the card attached, and no new message is sent

#### Scenario: Card removed
- **WHEN** the user removes the attached card and sends "Hi"
- **THEN** only the text is sent
