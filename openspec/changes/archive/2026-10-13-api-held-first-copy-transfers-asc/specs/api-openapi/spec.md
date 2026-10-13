## ADDED Requirements

### Requirement: Held-by first-copy fields
Each collection row of `GET /objekts/held-by/{address}` SHALL carry, alongside `copies`,
three fields computed over the copies the address holds at request time:
`minSerial` (the lowest serial held in that collection), `minSerialTokenId` (the token ID
of that copy) and `firstReceivedAt` (the earliest time, as an ISO 8601 string, at which
the address received a copy it still holds). When two held copies share the lowest serial,
`minSerialTokenId` SHALL be the lower token ID. The same fields SHALL be returned by the
`/rpc` procedure and the legacy `/api/objekts/held-by/$address` route, and the OpenAPI
document SHALL name them in the response schema.

#### Scenario: Collector with several copies
- **WHEN** an address holds serials 412, 37 and 980 of a collection, received on
  2025-06-01, 2025-03-14 and 2025-09-20
- **THEN** that collection's row has `copies` 3, `minSerial` 37, `minSerialTokenId` the
  token ID of serial 37, and `firstReceivedAt` the 2025-03-14 timestamp

#### Scenario: A copy sent away no longer counts
- **WHEN** the address sends away its serial 37 and still holds 412 and 980
- **THEN** after the held-by cache expires, the row has `copies` 2, `minSerial` 412 and
  `firstReceivedAt` the 2025-06-01 timestamp

#### Scenario: Artist filter
- **WHEN** a client requests `GET /api/v1/objekts/held-by/{address}?artist=artms`
- **THEN** every row is an artms collection and each carries the three fields

#### Scenario: Hidden address
- **WHEN** an anonymous client requests held-by for an address whose profile is private
- **THEN** the response is 200 with `collections` empty

#### Scenario: Document describes the fields
- **WHEN** a client reads the `GET /objekts/held-by/{address}` operation in
  `/api/v1/spec.json`
- **THEN** each collection item's schema names `copies`, `minSerial`, `minSerialTokenId`
  and `firstReceivedAt`

### Requirement: Transfers sort order
`GET /transfers/{address}` SHALL accept an `order` query parameter of `desc` or `asc`.
An omitted `order` SHALL mean `desc`, newest first, as before. With `asc` the response
SHALL list the same transfers oldest first, ordered by timestamp then ID, with the same
body and cursor shape; following `nextCursor` SHALL continue toward newer transfers. The
`type`, collection facet and `at` filters SHALL select the same transfers in both orders.
Any other `order` value SHALL be rejected with 400. The `/rpc` procedure and the legacy
`/api/transfers/$address` route SHALL accept the same parameter, and the OpenAPI document
SHALL list it.

#### Scenario: First transfer in one request
- **WHEN** a client requests `GET /api/v1/transfers/{address}?order=asc`
- **THEN** the first row of the response is the address's earliest transfer, sent or
  received

#### Scenario: Paging oldest first
- **WHEN** a client requests the next page with `order=asc` and the previous page's
  `nextCursor`
- **THEN** every row is newer than, or at the same timestamp with a higher ID than, the
  cursor, and no row repeats

#### Scenario: Filters in ascending order
- **WHEN** a client requests `?order=asc&type=received&artist=artms`
- **THEN** the rows are the address's received artms transfers, oldest first

#### Scenario: Default order is unchanged
- **WHEN** a client requests `GET /api/v1/transfers/{address}` with no `order`
- **THEN** the response is identical to the response before this change

#### Scenario: Older client without the parameter
- **WHEN** a client calls `transfers.byAddress` over `/rpc` with an input that has no
  `order`
- **THEN** the call succeeds and returns newest first

#### Scenario: Invalid order
- **WHEN** a client requests `?order=oldest`
- **THEN** the response is 400
