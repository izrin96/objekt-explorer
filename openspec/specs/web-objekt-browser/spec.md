# web-objekt-browser Specification

## Purpose
Browsing objekt collections on `apps/web`: filtering, sorting, searching and scoping the
grid, choosing its density, selecting cards, and inspecting one objekt's serials, market
and metadata.

## Requirements

### Requirement: Filters live on the URL
Every filter, sort and search value SHALL be represented in the page URL using the same
parameter names and encodings the website uses, so a website link opens the same view in
`web`. Changing a filter SHALL update the URL without a page reload or a history entry per
keystroke, and reloading SHALL restore the view. A Reset action SHALL clear every filter
the surface owns.

#### Scenario: Website link
- **WHEN** `/?member=Yooyeon&season=Atom01&sort=season` is opened
- **THEN** the grid shows only Yooyeon's Atom01 objekts sorted by season and the chips reflect all three

#### Scenario: Reset
- **WHEN** three filters are active and the user presses Reset
- **THEN** the URL has no filter parameters and the grid shows the unfiltered scope

### Requirement: Facets reflect real data and the artist scope
Member, season, class, collection number, edition and online/offline facets SHALL be
populated from the server's filter data and the artist catalogue, limited to the selected
artists; the member row SHALL group by artist with an artist segment control. Facet
controls in the inline bar and in the narrow-viewport sheet SHALL expose the same set of
facets.

#### Scenario: Artist scope narrows members
- **WHEN** only ARTMS is selected in the artist scope
- **THEN** the member row lists ARTMS members only and no tripleS objekt is shown

### Requirement: Search syntax
Search SHALL match member, collection number, season and class text, and SHALL support
serial ranges (`#1-20`), collection ranges (`a201z-aa204z`), negation (`!term`) and
comma-separated alternatives.

#### Scenario: Negation and range
- **WHEN** the search is `a201z-a204z, !seoyeon`
- **THEN** only objekts numbered 201Z to 204Z whose member is not Seoyeon remain

### Requirement: Column density
The grid SHALL default to three columns below 768 px, five below 1024 px and seven above,
until the user picks a count, which SHALL persist per browser across reloads and viewport
changes. The Wide setting SHALL let the grid use the full viewport width.

#### Scenario: Pick persists
- **WHEN** the user selects 5 columns at 1280 px and reloads
- **THEN** the grid still has 5 columns

### Requirement: Virtualised grid and card
The grid SHALL render only the rows near the viewport so a scope of several thousand
collections scrolls smoothly, and SHALL show a result count and an empty state when nothing
matches. Each card SHALL show the objekt image, member, short collection number and serial
when owned, hide the label when the hide-label setting is on, open the drawer on click,
enter selection on long-press, and toggle selection on click while any card is selected.
Keyboard users SHALL be able to open and select a card without nested controls stopping
event propagation.

#### Scenario: Selection bar
- **WHEN** the user long-presses one card and clicks two more
- **THEN** three cards are selected, the selection bar shows the count with Select all and Clear, and clicking a card toggles it instead of opening the drawer

### Requirement: Objekt drawer
Clicking a card SHALL open a drawer with the objekt's attributes, a link to view it in
Apollo, and three tabs. Serials SHALL let the user step to the previous, next, first and
last existing serial or type one, and for the chosen serial show loading, then either a
private notice when the owner hides serials, a missing notice when it has no owner, or the
owner with the transfer timeline. Market SHALL list current listings with floor price,
listing count and seller count, sortable by price or date. Metadata SHALL show every
collection field.

#### Scenario: Private serial
- **WHEN** the chosen serial belongs to an owner who hides serials and the viewer is not that owner
- **THEN** the Serials tab shows the private notice and no owner

#### Scenario: Step to next existing serial
- **WHEN** serial 5 does not exist and the user presses Next from serial 4
- **THEN** the field jumps to the next serial that exists

### Requirement: No horizontal overflow
At any viewport from 360 px, the filter bar, chips, grid and drawer SHALL not make the page
horizontally scrollable; deliberate horizontal scrollers (member row, chips) SHALL be marked.

#### Scenario: Narrow viewport
- **WHEN** `/` is opened at 360 px with ten active chips
- **THEN** the chip row scrolls sideways within itself and the page does not
