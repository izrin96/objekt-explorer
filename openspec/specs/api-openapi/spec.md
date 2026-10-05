# api-openapi Specification

## Purpose
The public read API at `/api/v1`: its OpenAPI document, its reference page, and the
request and response contracts third-party clients build against.

## Requirements

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

### Requirement: Documented response bodies
Every public operation in the document SHALL describe its success response body with a
schema naming that body's fields. `/collections` SHALL document both its 200 response and
its 304 response to a conditional request.

#### Scenario: Owned-by response is described
- **WHEN** a client reads the `GET /objekts/owned-by/{address}` operation in the document
- **THEN** its 200 response schema names `objekts`, `nextCursor` and `total`, and each
  objekt's fields, instead of an empty schema

#### Scenario: Collection list revalidation is described
- **WHEN** a client reads the `GET /collections` operation in the document
- **THEN** it documents a 200 response carrying the collections and a 304 response with no
  body

### Requirement: List parameters in the query string
A list-valued query parameter SHALL accept one value (`?artist=artms`) and a repeated key
(`?artist=artms&artist=tripleS`), and an omitted list parameter SHALL mean no filter.

#### Scenario: One artist
- **WHEN** a client requests `GET /api/v1/activity?artist=artms`
- **THEN** the response holds only artms activity, as with `?artist[]=artms`

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

### Requirement: Stable contracts
Reorganizing how request and response schemas are defined SHALL leave every request
contract and response body unchanged: the paths and parameters of `/api/v1`, the inputs
and outputs of `/rpc` procedures, and the responses of the legacy `/api` routes.

#### Scenario: Document paths and parameters are unchanged
- **WHEN** `/api/v1/spec.json` is compared before and after a schema reorganization
- **THEN** every path, method and parameter is identical, and only response schemas
  differ

#### Scenario: Legacy and v1 responses still match
- **WHEN** the same read is made through a legacy `/api` route and its `/api/v1`
  operation after the reorganization
- **THEN** both return the body they returned before it
