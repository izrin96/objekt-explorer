## MODIFIED Requirements

### Requirement: Public operations
`/api/v1` SHALL serve exactly these read operations, all `GET`: `/activity`,
`/artists`, `/collections`, `/collections/rarity`,
`/collections/{collectionSlug}/metadata`, `/collections/{collectionSlug}/serials`,
`/collections/{collectionSlug}/serials/{serial}/transfers`,
`/collections/{collectionSlug}/holders`, `/filters`, `/lists/{slug}`,
`/lists/{slug}/entries`, `/lists/{slug}/export`, `/objekts/owned-by/{address}`,
`/objekts/held-by/{address}`, `/transfers/{address}`, `/users/search`, `/live-sessions`,
`/market`, `/market/rates`, `/market/{collectionSlug}/listings`,
`/market/{collectionSlug}/stats`, `/profiles/{address}`, `/profiles/{address}/pins`,
`/profiles/{address}/locked-objekts`, `/profiles/{profileAddress}/lists` and `/status`.
No procedure that writes data or needs a signed-in account SHALL be reachable under
`/api/v1`.

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
- **THEN** it lists the twenty-six public operations with their path and query
  parameters, each with a documented 200 response schema

## ADDED Requirements

### Requirement: Explicit artist filter on list reads
A list's entries and its export SHALL be filtered by the `artist` parameter of the request
alone. An omitted `artist` SHALL mean every artist, and no cookie SHALL change the result.

#### Scenario: One artist
- **WHEN** a client requests `GET /api/v1/lists/{slug}/entries?artist=artms` for a list
  holding artms and tripleS objekts
- **THEN** every entry in the response is an artms objekt

#### Scenario: No artist
- **WHEN** a client requests `GET /api/v1/lists/{slug}/entries` with no `artist`
- **THEN** the response holds the list's entries for every artist

#### Scenario: A selected-artists cookie is ignored
- **WHEN** a request to a list's entries or export carries an `artists` cookie naming
  one artist and no `artist` parameter
- **THEN** the response holds the entries for every artist

#### Scenario: Older client without the parameter
- **WHEN** a client calls the list-entries procedure over `/rpc` with only `{ slug }`
- **THEN** the call succeeds and returns the entries for every artist

### Requirement: List export download
`GET /lists/{slug}/export` SHALL respond with a `text/csv` body holding one header row
and one row per entry, filtered as the list's entries are, and the document SHALL describe
that response as CSV.

#### Scenario: Export a list
- **WHEN** a client requests `GET /api/v1/lists/{slug}/export?artist=artms`
- **THEN** the response is 200 with content type `text/csv`, its first line is the header
  row, and every other line is an artms entry

#### Scenario: Unknown list
- **WHEN** a client requests the export of a slug that names no list
- **THEN** the response is 404
