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

### Requirement: No horizontal overflow
At any viewport from 360 px, the filter bar, chips, grid and drawer SHALL not make the page
horizontally scrollable; deliberate horizontal scrollers (member row, chips) SHALL be marked.

#### Scenario: Narrow viewport
- **WHEN** `/` is opened at 360 px with ten active chips
- **THEN** the chip row scrolls sideways within itself and the page does not

### Requirement: Lock filter is tri-state
The `locked` URL parameter SHALL be absent for all objekts, `true` for only locked and
`false` for only unlocked, and the control SHALL cycle through the three states in that order.

#### Scenario: Cycle
- **WHEN** the user activates the lock filter three times from the default
- **THEN** the URL goes `locked=true`, then `locked=false`, then no `locked` parameter

### Requirement: Drawer links Market to Trade
The objekt drawer's Market tab SHALL show how many posts on Trade have the collection on a have or sale side, and how many want it, with a link to `/trade?slug=<slug>`. The line SHALL be hidden when both counts are zero. The counts SHALL follow the feed's rules: lists on Trade, entries still owned, idle posts excluded.

#### Scenario: Posts exist
- **WHEN** the viewer opens the Market tab for SeoYeon 204Z, which 5 posts have and 7 want
- **THEN** the tab shows "On Trade: 5 have it · 7 want it" with a link to `/trade?slug=<slug>`

#### Scenario: None
- **WHEN** no post on Trade has or wants the collection
- **THEN** the On Trade line is not shown

### Requirement: Message a seller from the Market tab
Each listing row in the objekt drawer's Market tab SHALL offer Message, unless the viewer owns the listing, under the rules in `web-chat`. Message SHALL open the conversation with the list's owner, adding a card for that objekt and sale list.

Below `sm`, while the Market tab is shown, the drawer SHALL keep a bar at its bottom for the first listing in the tab's current order that shows Message. The bar names that listing: its price, its serial, and its seller. It offers Message and Make offer as two full-width buttons that act as that row's Message and Make offer do. The bar SHALL not cover the last row: the tab's content gains room for it. With no such listing, there is no bar. From `sm` up, there is no bar.

#### Scenario: From a listing
- **WHEN** a user activates Message on the #537 row of SeoYeon 204Z
- **THEN** the conversation with the list owner opens with a card for SeoYeon 204Z #537 and its price

#### Scenario: Own listing
- **WHEN** the viewer owns the sale list behind a row
- **THEN** that row has no Message action

#### Scenario: Phone bar
- **WHEN** a user at 390 px opens SeoYeon 204Z's Market tab, sorted by price, and the cheapest listing is rin.trades's #537 at 6,000 KRW
- **THEN** the bar reads "6,000 KRW · #537 · rin.trades" with Message and Make offer, and Make offer opens the builder with SeoYeon 204Z #537 under You get

#### Scenario: Own cheapest listing
- **WHEN** the cheapest listing is the viewer's own
- **THEN** the bar names the next listing the viewer can message instead

#### Scenario: Desktop
- **WHEN** the same drawer is open at 1280 px
- **THEN** there is no bar, and each row keeps its menu

### Requirement: Make offer from the Market tab
Each Market tab listing row that shows Message SHALL also offer Make offer. It opens the offer builder addressed to the list's owner, with that objekt under You get.

#### Scenario: From a listing
- **WHEN** a user activates Make offer on the #537 row of SeoYeon 204Z
- **THEN** the builder opens with SeoYeon 204Z #537 under You get
