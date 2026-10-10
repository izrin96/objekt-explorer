## ADDED Requirements

### Requirement: Drawer links Market to Trade
The objekt drawer's Market tab SHALL show how many posts on Trade have the collection on a have or sale side, and how many want it, with a link to `/trade?slug=<slug>`. The line SHALL be hidden when both counts are zero. The counts SHALL follow the feed's rules: lists on Trade, entries still owned, idle posts excluded.

#### Scenario: Posts exist
- **WHEN** the viewer opens the Market tab for SeoYeon 204Z, which 5 posts have and 7 want
- **THEN** the tab shows "On Trade: 5 have it · 7 want it" with a link to `/trade?slug=<slug>`

#### Scenario: None
- **WHEN** no post on Trade has or wants the collection
- **THEN** the On Trade line is not shown
