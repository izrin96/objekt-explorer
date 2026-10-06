## ADDED Requirements

### Requirement: Message a seller from the Market tab
Each listing row in the objekt drawer's Market tab SHALL offer Message, unless the viewer owns the listing, under the rules in `web-chat`, including the hidden-owner opt-in. Message SHALL open the conversation with the list's owner, adding a card for that objekt and sale list.

#### Scenario: From a listing
- **WHEN** a user activates Message on the #537 row of SeoYeon 204Z
- **THEN** the conversation with the list owner opens with a card for SeoYeon 204Z #537 and its price

#### Scenario: Own listing
- **WHEN** the viewer owns the sale list behind a row
- **THEN** that row has no Message action
