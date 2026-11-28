## ADDED Requirements

### Requirement: One listing per copy per seller
When one seller lists the same copy in more than one discoverable sale list, every Market figure (grid count and floor, listing table, the drawer's Market tab, the `/api/v1` stats and history, the daily price history) SHALL count only that seller's cheapest listing of it: priced before QYOP, QYOP before unpriced, then the lowest USD price, then the newest. Hide-serial listings and different sellers' listings of one copy SHALL each count.

#### Scenario: One copy in two lists
- **WHEN** a seller lists Nakyoung d207 #12 in two sale lists, at 5 USD and at 7 USD, and nobody else lists Nakyoung d207
- **THEN** Market shows 1 listing for Nakyoung d207, its floor is 5 USD, and the listing table shows only the 5 USD listing

#### Scenario: Priced beats QYOP
- **WHEN** a seller lists one copy as QYOP in one sale list and at 10 USD in another
- **THEN** Market shows the 10 USD listing and counts one listing

#### Scenario: Same price
- **WHEN** a seller lists one copy at 5 USD in two sale lists
- **THEN** Market shows the newer listing and counts one listing

#### Scenario: Hidden serial
- **WHEN** a seller lists one copy at 7 USD in a sale list and at 5 USD in a sale list that hides serials
- **THEN** Market counts and shows both listings, so neither reveals which copy the hidden one is

#### Scenario: Unshown list
- **WHEN** a seller lists one copy at 3 USD in a sale list that is not discoverable and at 6 USD in a discoverable one
- **THEN** Market shows the 6 USD listing

#### Scenario: Different sellers
- **WHEN** two sellers each list the same copy in a sale list
- **THEN** Market counts two listings and shows both

#### Scenario: History
- **WHEN** a recording runs while a seller lists one copy in three sale lists that show serials
- **THEN** that day's record counts the copy as one listing, and its median uses only that seller's cheapest listing of it

## MODIFIED Requirements

### Requirement: Daily price history
The server SHALL keep one record per collection per UTC day holding, in USD, the collection's floor price and median price, and its number of listings and of priced listings. Each figure SHALL be counted under the same rules as Market's floor: sale lists that are discoverable, listings with a collection, sellers without an active trade block or ban (see Trade-blocked sellers), one listing per copy per seller (see One listing per copy per seller), and prices converted to USD through the server's rate table. QYOP and unpriced listings count toward the number of listings only.

The server SHALL record the current day at least once an hour. A day's record SHALL hold the last recording made that day, so today's record changes until UTC midnight. A collection with no priced listing at a recording SHALL have no record for that day: a record written earlier that day SHALL be removed. A recording made while the server has no currency rates SHALL write and remove nothing. Records for past days SHALL never change, whatever happens to the listings or sellers afterwards. No record SHALL be created for a day before the first recording.

The site SHALL read a collection's records for the last 7, 30 or 90 days or all of them, together with the date of the collection's first record and its number of records. A range of N days SHALL cover today and the N − 1 days before it. This read SHALL also be offered as `GET /api/v1/market/{collectionSlug}/history`.

#### Scenario: Blocked seller
- **WHEN** at a recording the cheapest priced listing of SeoYeon 204Z belongs to a trade-blocked account
- **THEN** that day's floor for SeoYeon 204Z is the next cheapest listing's price, and the blocked listing is not counted

#### Scenario: Delisted today
- **WHEN** a recording at 14:05 UTC wrote today's record for a collection, and its last priced listing is removed before the 15:05 recording
- **THEN** after the 15:05 recording the collection has no record for today, and its records for earlier days are unchanged

#### Scenario: No rates
- **WHEN** a recording runs while the server's rate table is empty
- **THEN** no record is written or removed

#### Scenario: Later sanction
- **WHEN** a seller whose listing set a collection's floor on 10 October is banned on 12 October
- **THEN** the 10 October record still holds that floor, and records from 12 October leave the listing out

### Requirement: Most listed ordering
`/market`'s Most listed sort (`sort=supply`) SHALL order collections by their number of live listings as Market counts them (see One listing per copy per seller), so two sellers of one copy count twice, most first unless the direction is flipped. Collections with the same number SHALL be ordered by floor price, cheapest first with unpriced collections last, then by newest listing, most recent first, then by collection slug. This tie order SHALL be the same in both directions.

#### Scenario: Tie on count
- **WHEN** two collections each have 3 live listings, one with a floor of $2 and one with a floor of $1, and the sort is Most listed in either direction
- **THEN** the $1 collection comes before the $2 collection

#### Scenario: Unpriced tie
- **WHEN** two collections each have 5 live listings and every listing of one of them is quote-your-own-price
- **THEN** the priced collection comes before the quote-your-own-price one
