## MODIFIED Requirements

### Requirement: Public operations
`/api/v1` SHALL serve exactly these read operations, all `GET`: `/activity`,
`/collections`, `/collections/rarity`, `/collections/{collectionSlug}/metadata`,
`/collections/{collectionSlug}/serials`,
`/collections/{collectionSlug}/serials/{serial}/transfers`,
`/collections/{collectionSlug}/holders`, `/objekts/owned-by/{address}`,
`/objekts/held-by/{address}`, `/transfers/{address}`, `/users/search`, `/live-sessions`,
`/market`, `/market/rates`, `/market/{collectionSlug}/listings`,
`/market/{collectionSlug}/stats`, `/profiles/{address}`, `/profiles/{address}/pins`,
`/profiles/{address}/locked-objekts` and `/status`. No procedure that writes data or needs
a signed-in account SHALL be reachable under `/api/v1`.

#### Scenario: A write procedure is not exposed
- **WHEN** a client sends `POST /api/v1/list/create`
- **THEN** the response is 404 and the document lists no such operation

#### Scenario: A new read is served
- **WHEN** a client requests `GET /api/v1/market/rates`
- **THEN** the response is 200 with an object mapping currency codes to their USD value,
  the same body `/rpc` returns for `market.rates`

### Requirement: OpenAPI document and reference page
`/api/v1/spec.json` SHALL return an OpenAPI 3.1 document describing every public
operation, and `/api/v1/` SHALL render an interactive reference page built from that
document.

#### Scenario: Document lists every operation
- **WHEN** a client fetches `/api/v1/spec.json`
- **THEN** it lists the twenty public operations with their path and query parameters,
  each with a documented 200 response schema

## ADDED Requirements

### Requirement: Numeric query parameters
A numeric pagination parameter (`offset`, `limit`) SHALL accept its value as written in
the query string, apply its default when omitted, and reject a value that is not an
integer in range with 400.

#### Scenario: Paging holders
- **WHEN** a client requests `GET /api/v1/collections/{collectionSlug}/holders?offset=10&limit=5`
- **THEN** the response holds at most five rows starting at rank position eleven

#### Scenario: Limit out of range
- **WHEN** a client requests `GET /api/v1/market/{collectionSlug}/listings?limit=500`
- **THEN** the response is 400

### Requirement: Profile privacy on public reads
The profile, pins, locked-objekts and holders operations SHALL apply the same privacy
rules the app applies: a private profile reveals itself only to the signed-in account that
linked the address. A request without that account's session SHALL get the public view.

#### Scenario: Private profile's pins
- **WHEN** an anonymous client requests `GET /api/v1/profiles/{address}/pins` for an
  address whose profile is private
- **THEN** the response is 200 with an empty array

#### Scenario: Private profile's preview
- **WHEN** an anonymous client requests `GET /api/v1/profiles/{address}` for an address
  whose profile is private
- **THEN** the response names the address and marks it guarded, with `counts` null and no
  banner or linked user

#### Scenario: Private holder
- **WHEN** an anonymous client requests a collection's holders and one holder's profile
  is private
- **THEN** that row is `{ "kind": "private" }` with `lowestSerial` null
