## MODIFIED Requirements

### Requirement: Objekt drawer
Clicking a card SHALL open a drawer with the objekt's attributes, a link to view it in
Apollo, and these tabs in order: Owned, only when the viewer holds copies; Serials,
labelled Trades; Market; Holders; and Metadata. Serials SHALL let the user step to the
previous, next, first and last existing serial or type one, and for the chosen serial show
loading, then either a private notice when the owner hides serials, a missing notice when
it has no owner, or the owner with the transfer timeline. Market SHALL list current
listings with floor price, listing count and seller count, sortable by price or date.
Metadata SHALL show every collection field. Holders SHALL behave as the
`web-collection-holders` capability specifies, and SHALL fetch nothing until it is first
opened.

#### Scenario: Private serial
- **WHEN** the chosen serial belongs to an owner who hides serials and the viewer is not that owner
- **THEN** the Serials tab shows the private notice and no owner

#### Scenario: Step to next existing serial
- **WHEN** serial 5 does not exist and the user presses Next from serial 4
- **THEN** the field jumps to the next serial that exists

#### Scenario: Holders loads on first open
- **WHEN** the drawer opens on the Trades tab
- **THEN** no holders request is made until the user opens the Holders tab
