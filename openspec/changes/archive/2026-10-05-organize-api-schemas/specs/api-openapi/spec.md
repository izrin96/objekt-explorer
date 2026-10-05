## Purpose

The public read API at `/api/v1`: its OpenAPI document, its reference page, and the
request and response contracts third-party clients build against.

## ADDED Requirements

### Requirement: Public operations
`/api/v1` SHALL serve exactly these read operations, all `GET`: `/activity`,
`/collections`, `/collections/{collectionSlug}/metadata`,
`/collections/{collectionSlug}/serials`,
`/collections/{collectionSlug}/serials/{serial}/transfers`,
`/objekts/owned-by/{address}`, `/objekts/held-by/{address}`, `/transfers/{address}`,
`/users/search` and `/live-sessions`. No procedure that writes data or needs a signed-in
account SHALL be reachable under `/api/v1`.

#### Scenario: A write procedure is not exposed
- **WHEN** a client sends `POST /api/v1/list/create`
- **THEN** the response is 404 and the document lists no such operation

### Requirement: OpenAPI document and reference page
`/api/v1/spec.json` SHALL return an OpenAPI 3.1 document describing every public
operation, and `/api/v1/` SHALL render an interactive reference page built from that
document.

#### Scenario: Document lists every operation
- **WHEN** a client fetches `/api/v1/spec.json`
- **THEN** it lists the ten public operations with their path and query parameters

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
