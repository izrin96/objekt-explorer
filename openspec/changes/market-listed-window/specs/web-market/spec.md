## ADDED Requirements

### Requirement: Listed-within filter
`/market` SHALL offer a Listed filter with the choices Any time, Last 24 hours, Last 7 days and Last 30 days, carried on the URL as `listed=24h`, `listed=7d` or `listed=30d`. Any time SHALL be the absence of `listed`. With a window chosen, the grid SHALL keep a collection only when its newest live listing was added within that window, counting back from when the grid was filtered. The window SHALL be inclusive at its start. A listing's time SHALL be when it was added to its sale list. A listing removed since SHALL not count, and neither SHALL one left out of Market (see Trade-blocked sellers).

The Listed filter SHALL combine with every other filter on `/market`: a collection SHALL remain only when it passes the priced-only switch, the floor range, the Listed window and the facets together. While a comparison is active, the collections the compared profile holds SHALL be left out before any filter applies. A collection with no live listing SHALL never appear, whatever the filters.

The listing total under the grid SHALL sum every live listing of the collections shown, including listings added before the window.

While a window is chosen, the active chips SHALL show "Listed: {window}", and removing that chip or pressing Reset SHALL remove `listed`. A `listed` value other than `24h`, `7d` or `30d` SHALL be ignored: no window applies, no chip shows, and the next filter change SHALL write a URL without it.

Below the `md` breakpoint the Listed control SHALL move from the toolbar into the Filters sheet, and a chosen window SHALL count toward the sheet button's badge, as the floor range does.

#### Scenario: Last 7 days
- **WHEN** at 13 October 12:00 UTC the user picks Last 7 days on `/market`, SeoYeon 204Z's newest live listing was added on 9 October, and YooYeon 101Z's newest live listing was added on 2 October
- **THEN** the URL carries `listed=7d`, SeoYeon 204Z remains, YooYeon 101Z is gone, and a "Listed: Last 7 days" chip shows

#### Scenario: Removed listing
- **WHEN** a collection's only listing added in the last 24 hours is removed, and its other live listings were added a month ago
- **THEN** with `listed=24h` the collection is not shown

#### Scenario: Unreadable window
- **WHEN** `/market?listed=1y` is opened and the user then picks a member
- **THEN** the grid is not narrowed by time and shows no Listed chip, and after picking the member the URL carries the member and no `listed`

#### Scenario: Combined with a floor range
- **WHEN** `/market?listed=24h&floor_max=5` is opened
- **THEN** only collections with a listing added in the last 24 hours and a floor of at most 5 USD remain, and both chips show

#### Scenario: Total counts every listing
- **WHEN** with `listed=7d` the only collection shown has 4 live listings, 1 added 2 days ago and 3 added 20 days ago
- **THEN** the total under the grid reads 4 listings

#### Scenario: Phone
- **WHEN** at 390 px wide the user opens `/market?listed=30d`
- **THEN** the toolbar has no Listed control, the Filters sheet holds it set to Last 30 days, and the sheet button's badge counts it

### Requirement: Most listed ordering
`/market`'s Most listed sort (`sort=supply`) SHALL order collections by their number of live listings, one per listing rather than one per seller, most first unless the direction is flipped. Collections with the same number SHALL be ordered by floor price, cheapest first with unpriced collections last, then by newest listing, most recent first, then by collection slug. This tie order SHALL be the same in both directions.

#### Scenario: Tie on count
- **WHEN** two collections each have 3 live listings, one with a floor of $2 and one with a floor of $1, and the sort is Most listed in either direction
- **THEN** the $1 collection comes before the $2 collection

#### Scenario: Unpriced tie
- **WHEN** two collections each have 5 live listings and every listing of one of them is quote-your-own-price
- **THEN** the priced collection comes before the quote-your-own-price one
