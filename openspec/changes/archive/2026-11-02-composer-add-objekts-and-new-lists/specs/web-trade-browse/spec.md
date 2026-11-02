## ADDED Requirements

### Requirement: New list in the composer
Each side's dropdown SHALL end with New have list…, New sale list… or New want list…, opening a dialog, and SHALL show even with no list of that type. A created list SHALL be picked for that side, empty and off Trade, and stays off Trade if the viewer leaves. A refused create SHALL say why and keep the dialog's input and the previous pick. Closing the dialog SHALL return focus to the dropdown.

#### Scenario: First want list
- **WHEN** the viewer has only have list "spares", picks Swap, creates want list "cc366 hunt" from the Wants dropdown and adds the rule CC366
- **THEN** "cc366 hunt" is picked, and posting makes one WTT post of "spares" and "cc366 hunt", linked, with "cc366 hunt" open to swaps only

#### Scenario: Buy post with a new want list
- **WHEN** the viewer picks Buy, creates want list "store hunt" and posts
- **THEN** "store hunt" is on Trade set to Buying only

#### Scenario: Leave keeps the list
- **WHEN** the viewer creates "cc366 hunt" and leaves without posting
- **THEN** "cc366 hunt" stays among the viewer's lists, off Trade

#### Scenario: No list of the type
- **WHEN** the viewer has no sale list and picks Sell
- **THEN** the Selling for dropdown holds New sale list…, and the page has no link to the lists page in its place

#### Scenario: Cancel
- **WHEN** the viewer opens New want list… and cancels the dialog
- **THEN** no list is created, the previous pick stays, and focus is back on the Wants dropdown

### Requirement: New want list form
New want list… SHALL ask only for a name and create a want list filed under no Cosmo profile. Create SHALL be disabled while the name is empty.

#### Scenario: Empty name
- **WHEN** the viewer opens New want list… and leaves the name empty
- **THEN** Create is disabled

### Requirement: New have or sale list form
New have list… and New sale list… SHALL open the list page's create form with the type fixed to the side's and the list bound to one of the viewer's Cosmo profiles, the first by default; a sale list SHALL also ask for its currency. Neither the type nor the binding SHALL be changeable there. Creating SHALL pick the list instead of offering Post it. With no linked Cosmo profile the item SHALL be disabled, and a note under the dropdown SHALL say one is needed, with a link to link one.

#### Scenario: New have list
- **WHEN** the viewer with Cosmo profile "rin" and no have list picks Swap, chooses New have list… in the Has dropdown, enters "spares" and creates it
- **THEN** have list "spares", bound to "rin" and empty, is picked on the Has side, the composer's other picks are as before, and no Post it is offered

#### Scenario: New sale list
- **WHEN** the viewer picks Sell, chooses New sale list…, enters "binary sale", currency USD and creates it
- **THEN** sale list "binary sale", bound to the viewer's first Cosmo profile with currency USD, is picked on the Selling for side

#### Scenario: Two profiles
- **WHEN** the viewer has Cosmo profiles "rin" and "lynn", chooses New have list… and picks "lynn"
- **THEN** the created have list is bound to "lynn"

#### Scenario: Type and binding fixed
- **WHEN** the viewer chooses New sale list…
- **THEN** the form shows the type as Sale with no way to change it, and no way to unbind the list from a profile: the profile choice offers no None

#### Scenario: No Cosmo profile
- **WHEN** a viewer with no linked Cosmo profile picks Swap and opens the Has dropdown
- **THEN** New have list… is disabled, the note under the dropdown says a linked Cosmo profile is needed and links to linking one, and New want list… in the Wants dropdown is enabled

### Requirement: Add objekts in the composer
Each picked side of the preview SHALL start its thumbnails with an Add objekts tile, even for an empty list, opening a page-wide sheet from the bottom where the viewer ticks several objekts or collections. Adding SHALL save them to the list at once, skipping what is already on it, then close the sheet, keep the picks and show them on the side; leaving keeps them. A refused add SHALL say why and keep the sheet open with its ticks.

#### Scenario: Add while posting
- **WHEN** the viewer picks Swap and empty have list "spares", activates its Add objekts tile, ticks Lynn SCO #12 and Lynn SCO #30 and adds them
- **THEN** the sheet closes, the picks are as before, and the Has side shows the tile followed by both objekts

#### Scenario: Already on the list
- **WHEN** want list "binary hunt" holds the collection Lynn SCO and the viewer adds Lynn SCO and SeoYeon 204Z from Add objekts
- **THEN** "binary hunt" holds Lynn SCO once and SeoYeon 204Z once

#### Scenario: Leave without posting
- **WHEN** the viewer adds objekts to "spares" from the composer, then leaves without posting
- **THEN** "spares" holds them, and its Trade state is as before

#### Scenario: Nothing ticked
- **WHEN** the viewer opens Add objekts and ticks nothing
- **THEN** Add is disabled

### Requirement: Ticked tray
Beside the sheet's grid, a Ticked tray SHALL show how many are ticked and each ticked objekt, which the viewer can untick from there, with Clear to untick all, disabled while nothing is ticked, and SHALL hold Cancel and Add with the count. Unticking or clearing SHALL keep focus in the tray: on the next ticked objekt, else the tray's heading. Below the width where the tray fits beside the grid, it SHALL sit under the grid with Cancel and Add still in reach.

#### Scenario: Untick from the tray
- **WHEN** the viewer has ticked three objekts and removes one from the tray
- **THEN** the tray and Add show two, and that objekt is unticked in the grid

#### Scenario: Clear
- **WHEN** the viewer activates Clear
- **THEN** nothing is ticked, Clear and Add are disabled, and focus is on the tray's heading

#### Scenario: Untick by keyboard
- **WHEN** a keyboard user unticks the first of three objekts from the tray
- **THEN** focus moves to the untick control of the next ticked objekt

### Requirement: What Add objekts offers
For a have or sale list, Add objekts SHALL offer each objekt the Cosmo profile the list is bound to holds, one card per copy with its serial. For a want list it SHALL offer every collection of the artists the viewer has selected, as the index does. Both SHALL search and filter like the offer picker. For a sale list the tray SHALL also take an optional price, QYOP and note, set on what it adds; an objekt already on the list keeps its own.

#### Scenario: Have list offers its profile's holdings
- **WHEN** have list "spares" is bound to "rin" and the viewer opens Add objekts on it
- **THEN** the sheet shows the objekts "rin" holds and none from the viewer's other profiles

#### Scenario: Want list offers the catalogue
- **WHEN** the viewer has selected tripleS, opens Add objekts on want list "binary hunt" and searches "204Z"
- **THEN** the sheet shows every tripleS collection numbered 204Z, whether or not the viewer owns one

#### Scenario: Sale price on add
- **WHEN** the viewer opens Add objekts on sale list "binary sale", ticks two objekts, enters price 5 in the tray and adds them
- **THEN** both are on "binary sale" priced 5

#### Scenario: Profile holds nothing
- **WHEN** the profile "spares" is bound to holds no objekts
- **THEN** the sheet says the profile holds no objekts

### Requirement: Add objekts on Edit post
When its list is already on Trade, which only a list in the post being edited can be, Add objekts SHALL say so and that what it adds shows there straight away. A list picked during the edit that is off Trade SHALL get no such note.

#### Scenario: List already on Trade
- **WHEN** the viewer edits their Swap post holding "spares" and opens Add objekts on "spares"
- **THEN** the sheet says "spares" is on Trade and added objekts show there straight away

#### Scenario: List picked during the edit
- **WHEN** the viewer edits that post, creates want list "cc366 hunt" from the Wants dropdown and opens Add objekts on it
- **THEN** the sheet has no on-Trade note

## REMOVED Requirements

### Requirement: New want list in the composer
**Reason**: Replaced by "New list in the composer" and "New want list form": a new list of every type is now made from its side's dropdown through a dialog, and the inline name field beside the want dropdown goes.
**Migration**: None; its scenarios move to "New list in the composer", made from the Wants dropdown.
