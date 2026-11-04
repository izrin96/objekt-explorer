## ADDED Requirements

### Requirement: Copy a list in the composer
Each side's dropdown SHALL offer Copy a list… beside its New … list… item, shown only while the viewer owns at least one list. It SHALL open a copy dialog for that side. A created copy SHALL be picked for that side, off Trade and with no linked list, and stays off Trade if the viewer leaves. A refused copy SHALL say why and keep the dialog's input and the previous pick. Closing the dialog SHALL return focus to the dropdown.

#### Scenario: Sell what a Swap post holds
- **WHEN** have list "spares" is in the viewer's Swap post, and they pick Sell, choose Copy a list… in the Selling for dropdown, copy from "spares", enter currency USD and create it
- **THEN** sale list "spares (copy)" with the objekts of "spares" is picked on the Selling for side, and "spares" is still in the Swap post

#### Scenario: Edit post
- **WHEN** the viewer is on Edit post for their Buy post and copies want list "binary hunt" through Copy a list… in the Wants dropdown
- **THEN** "binary hunt (copy)" is picked on the Wants side, and saving puts it in that post in place of the list it held

#### Scenario: Leave keeps the copy
- **WHEN** the viewer creates a copy from the composer and leaves without posting
- **THEN** the copy stays among the viewer's lists, off Trade, and its source is unchanged

#### Scenario: No lists
- **WHEN** a viewer who owns no list opens any side's dropdown
- **THEN** it offers New … list… and no Copy item

#### Scenario: Cancel
- **WHEN** the viewer opens Copy a list… in the Has dropdown and cancels the dialog
- **THEN** no list is created, the previous pick stays, and focus is back on the Has dropdown

#### Scenario: Refused
- **WHEN** creating the copy is refused, say by the rate limit
- **THEN** a message says why, the dialog stays open with its input, and the side's pick is unchanged

### Requirement: Composer copy form
The copy dialog SHALL start with Copy from, listing every list the viewer owns, of any type and with its type shown, lists already in a post included. Picking a source SHALL fill the Copy as new list form from it (see `web-lists`), with the type fixed to the side's and the binding fixed as in New list form. Create SHALL stay unavailable until a source is picked and loaded.

#### Scenario: Type fixed to the side
- **WHEN** the viewer chooses Copy a list… in the Selling for dropdown and copies from want list "binary hunt"
- **THEN** the form shows the type as Sale with no way to change it, binds the list to a Cosmo profile with no None, asks for a currency, and names it "binary hunt (copy)"

#### Scenario: Carry-over hint
- **WHEN** the viewer chooses Copy a list… in the Has dropdown and copies from general list "wishlist" onto Cosmo profile "rin"
- **THEN** the form says how many collections carry over and how many are left out, as Copy as new list does

#### Scenario: Lists in a post are sources
- **WHEN** want list "store hunt" is in the viewer's Buy post and they open Copy a list… in the Wants dropdown
- **THEN** "store hunt" is offered in Copy from and can be picked

#### Scenario: Changing the source
- **WHEN** the viewer picks "spares" in Copy from, then picks "binary sale"
- **THEN** the form is filled from "binary sale", named "binary sale (copy)"

### Requirement: Copy a list without a Cosmo profile
Without a linked Cosmo profile, Copy a list… in the Has and Selling for dropdowns SHALL be disabled, as New have list… and New sale list… are, with the same note. Copy a list… in the Wants dropdown SHALL stay enabled.

#### Scenario: No Cosmo profile
- **WHEN** a viewer with lists but no linked Cosmo profile opens the Has dropdown
- **THEN** New have list… and Copy a list… are both disabled, and Copy a list… in the Wants dropdown is enabled
