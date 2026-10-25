# Spec Delta

## MODIFIED Requirements

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

#### Scenario: Document describes the fields
- **WHEN** a client reads the `GET /objekts/held-by/{address}` operation in
  `/api/v1/spec.json`
- **THEN** each collection item's schema names `copies`, `minSerial`, `minSerialTokenId`
  and `firstReceivedAt`

#### Scenario: Hidden address
- **WHEN** an anonymous client requests held-by for an address whose profile was private before this change
- **THEN** the response lists that address's collections like any other

## REMOVED Requirements

### Requirement: Profile privacy on public reads
**Reason**: The private profile setting is removed; every profile, pin list, locked-objekt list and holder row is public.
**Migration**: Clients receive the full public view for every address: pins, counts, banner and linked user on a profile, and every holder's address, nickname and lowest serial. A response never marks a profile guarded, and a holder row is never `{ "kind": "private" }`.
