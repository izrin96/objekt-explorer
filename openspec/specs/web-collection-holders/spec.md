# web-collection-holders Specification

## Purpose
Shows who holds a collection and how evenly its copies are spread, as a Holders tab in the objekt drawer, so a trader can find who to ask for a copy.

## Requirements

### Requirement: Held copies exclude spin and the null address
The Holders tab SHALL count a copy as held only when its owner is neither the COSMO Spin address nor the null address. Every figure, bucket, share and rank in the tab SHALL be computed over held copies only.

#### Scenario: Spun copies are left out
- **WHEN** a collection has 6,432 copies of which 3,842 are owned by COSMO Spin
- **THEN** the tab reports 2,590 copies held and no holder row for the Spin address

### Requirement: Holder summary
The tab SHALL show three figures: the number of holders together with the number of copies they hold, the number of holders who own exactly one copy together with their share of holders, and the number of holders who own ten or more copies together with their share of held copies. A physical collection SHALL label its copies as scanned copies, as the Trades tab does.

#### Scenario: Summary figures
- **WHEN** 1,133 holders hold 2,590 copies, 924 of them own one copy, and 35 own ten or more holding 867 copies
- **THEN** the summary shows 1,133 holders with 2,590 copies, 924 owning one (81.6%), and 35 owning 10+ holding 33.5%

#### Scenario: No holders
- **WHEN** no copy of the collection is held
- **THEN** the tab shows an empty state instead of the summary, chart and list

### Requirement: Spread chart
The tab SHALL bucket holders by copies owned into 1, 2–4, 5–9 and 10 or more, and draw two stacked bars over the same buckets: one as the share of holders and one as the share of held copies, with a legend naming each bucket and its holder count. The chart SHALL have a text equivalent that assistive technology reads. When 99% or more of holders own exactly one copy, the tab SHALL replace the chart with a notice that almost every holder owns one copy.

#### Scenario: Two bars over the same buckets
- **WHEN** 924 of 1,133 holders own one copy and together hold 924 of 2,590 copies
- **THEN** the single-copy segment covers 82% of the holders bar and 36% of the copies bar

#### Scenario: Almost everyone owns one
- **WHEN** 24,912 of a Welcome collection's 24,922 holders own one copy
- **THEN** the tab shows the one-copy notice and no bars

### Requirement: Ranked holder list
The tab SHALL list holders by copies held, most first, showing for each row its rank, the holder, the lowest serial they hold, their share of held copies and their copy count. Holders with equal copy counts SHALL share a rank, and the next rank SHALL skip accordingly. Among equal counts, rows SHALL be ordered by lowest serial, ascending. The list SHALL first show ten rows and load further rows as the user scrolls to its end. A holder with a public profile SHALL link to that profile.

#### Scenario: Tied counts share a rank
- **WHEN** the fifth and sixth holders both hold 42 copies
- **THEN** both rows show rank 5 and the next row shows rank 7

#### Scenario: Load more
- **WHEN** the user scrolls to the end of the first ten rows of a collection with 1,133 holders
- **THEN** the next rows load below them without replacing the first ten

### Requirement: Viewer's own row
When the signed-in viewer has a linked address that holds copies and that holder is not among the rows on screen, the tab SHALL pin a row for it under the list. The row SHALL show its true rank and be marked as the viewer's. A viewer with several linked holding addresses SHALL get one pinned row per address. A signed-out viewer SHALL see no pinned row.

#### Scenario: Viewer ranked 61st
- **WHEN** the signed-in viewer's linked address holds 6 copies and ranks 61st, and ten rows are on screen
- **THEN** a row marked as the viewer's, ranked 61, is pinned under the ten rows

#### Scenario: Viewer already visible
- **WHEN** the viewer's address ranks 3rd
- **THEN** its row in the list is marked as the viewer's and no row is pinned

### Requirement: Holder privacy
The tab SHALL apply a holder address's private-profile and private-serial settings to every viewer except the account that linked that address. A holder with a private profile SHALL appear as an unlinked "Private collector" row with no address, nickname or lowest serial, since a serial looked up in the Trades tab names its owner, and SHALL still count in every figure and rank. A holder who hides their nickname SHALL appear by their shortened address to every viewer, the linking account included, as Hide Cosmo ID applies here (see `web-cosmo-link`). A holder who hides serials SHALL show no lowest serial. The response sent to the browser SHALL NOT contain the address, nickname or serial that a setting hides.

#### Scenario: Private profile seen by another viewer
- **WHEN** the third-ranked holder has a private profile and the viewer is signed out
- **THEN** row 3 reads "Private collector", has no link and no lowest serial, and the response carries no address or serial for it

#### Scenario: Private profile seen by its owner
- **WHEN** the account that linked that address views the tab
- **THEN** the row shows its link and lowest serial, and its nickname unless the holder hides it

#### Scenario: Private serial
- **WHEN** a holder hides serials and the viewer is not that holder
- **THEN** the row shows the holder but no lowest serial

### Requirement: Holder data freshness
Holder figures SHALL reflect ownership no more than five minutes old. Privacy settings SHALL take effect on the next request, regardless of how old the holder figures are.

#### Scenario: Privacy change applies immediately
- **WHEN** a holder turns on a private profile and another viewer reopens the tab a minute later
- **THEN** that holder's row reads "Private collector"
