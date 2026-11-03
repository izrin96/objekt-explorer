## RENAMED Requirements

- FROM: `### Requirement: New have or sale list form`
- TO: `### Requirement: New list form`

## MODIFIED Requirements

### Requirement: New list form
Each side's new list item SHALL open the list page's create form with the type fixed to the side's. A have or sale list SHALL be bound to one of the viewer's Cosmo profiles, the first by default, with no None, and a sale list SHALL ask its currency. A want list SHALL be bound to none, its profile offered as on the list page. Creating SHALL pick the list, not offer Post it. Without a linked Cosmo profile, New have list… and New sale list… SHALL be disabled, with a note saying why.

#### Scenario: New have list
- **WHEN** the viewer with Cosmo profile "rin" and no have list picks Swap, chooses New have list… in the Has dropdown, enters "spares" and creates it
- **THEN** have list "spares", bound to "rin" and empty, is picked on the Has side, the composer's other picks are as before, and no Post it is offered

#### Scenario: New sale list
- **WHEN** the viewer picks Sell, chooses New sale list…, enters "binary sale", currency USD and creates it
- **THEN** sale list "binary sale", bound to the viewer's first Cosmo profile with currency USD, is picked on the Selling for side

#### Scenario: New want list
- **WHEN** the viewer with Cosmo profile "rin" picks Buy, chooses New want list…, enters "store hunt" with description "cc366 only" and creates it
- **THEN** want list "store hunt", filed under "rin" and listed in its Lists tab but not bound to it, with that description and empty, is picked on the Wants side, and no Post it is offered

#### Scenario: Want list on no profile
- **WHEN** the viewer chooses New want list…, sets the profile to None and creates "cc366 hunt"
- **THEN** "cc366 hunt" is filed under no Cosmo profile and is picked on the Wants side

#### Scenario: Two profiles
- **WHEN** the viewer has Cosmo profiles "rin" and "lynn", chooses New have list… and picks "lynn"
- **THEN** the created have list is bound to "lynn"

#### Scenario: Type and binding fixed
- **WHEN** the viewer chooses New sale list…
- **THEN** the form shows the type as Sale with no way to change it, and no way to unbind the list from a profile: the profile choice offers no None

#### Scenario: Want type fixed
- **WHEN** the viewer chooses New want list…
- **THEN** the form shows the type as Want with no way to change it, offers None in the profile choice, and shows no binding switch and no Hide serial

#### Scenario: Empty name
- **WHEN** the viewer chooses New want list…, leaves the name empty and activates Create
- **THEN** no list is created, the name field says a name is required, and the dialog stays open

#### Scenario: No Cosmo profile
- **WHEN** a viewer with no linked Cosmo profile picks Swap and opens the Has dropdown
- **THEN** New have list… is disabled, the note under the dropdown says a linked Cosmo profile is needed and links to linking one, and New want list… in the Wants dropdown is enabled

#### Scenario: Want list with no Cosmo profile
- **WHEN** a viewer with no linked Cosmo profile chooses New want list… and creates "cc366 hunt"
- **THEN** the profile choice reads None, and "cc366 hunt" is created under no Cosmo profile and picked on the Wants side

## REMOVED Requirements

### Requirement: New want list form
**Reason**: New want list… now opens the same create form as New have list… and New sale list…, covered by "New list form".
**Migration**: None. Want lists already created from the composer stay as they are, filed under no Cosmo profile.
