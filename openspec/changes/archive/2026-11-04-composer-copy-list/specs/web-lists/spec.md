## MODIFIED Requirements

### Requirement: Copy as new list
The owner's menu on a list row and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, Open to (from a want list only), columns and hide serial.

Type and profile binding SHALL be editable. The linked list SHALL start empty and the copy SHALL start off Trade. Saving SHALL create a new list, open it, and leave the source unchanged. A copy made from the post composer SHALL be picked there and not opened, its type fixed to the composer side's (see `web-trade-browse` Composer copy form). Other visitors SHALL not see the action.

#### Scenario: Owner copies a have list as a sale list
- **WHEN** the owner of have list "spares", bound to a profile and linked to want list "binary hunt", activates Copy as new list, picks Sale, enters a currency and saves
- **THEN** a sale list "spares (copy)" bound to the same profile exists with the entries of "spares", the browser shows it, and "spares" is still a have list linked to "binary hunt"

#### Scenario: Copy starts off Trade
- **WHEN** the owner copies a want list that is on Trade
- **THEN** the form opens with no linked list, and saving it as is adds no post to `/trade`

#### Scenario: Copying a sale list on Trade
- **WHEN** the owner copies sale list "binary sale", which is on Trade, as a sale list
- **THEN** the form shows no Trade switch, and the copy is off Trade and off Market

#### Scenario: Visitor
- **WHEN** a signed-in user opens the menu on someone else's list
- **THEN** no Copy as new list item is shown

#### Scenario: Open to from another type
- **WHEN** the owner copies a sale list and picks Want
- **THEN** Open to starts at Swaps or buying, as Create does

#### Scenario: Copied from the composer
- **WHEN** the owner copies have list "spares" through Copy a list… in the post composer's Selling for dropdown
- **THEN** the browser stays on the composer with "spares (copy)" picked, and no list page opens
