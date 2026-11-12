# Spec Delta

## ADDED Requirements

### Requirement: List entries by profile slug and address
`GET /api/v1/lists/{slug}/entries` SHALL accept an optional `address` query parameter.
When it is present, `{slug}` SHALL be read as the list's profile slug under that Cosmo
address, and the response SHALL be the one the same request returns for the list's own
slug, with the same `artist` filter. When it is absent, `{slug}` SHALL be read as the
list's own slug, as before. The document SHALL describe the parameter.

#### Scenario: Entries are read by profile slug and address
- **WHEN** a client requests `GET /api/v1/lists/spares/entries?address=0xabc…` and the
  list filed under that address with profile slug `spares` has the slug `Z1qlA0_rR`
- **THEN** the response is 200 with the body `GET /api/v1/lists/Z1qlA0_rR/entries` returns

#### Scenario: The artist filter applies
- **WHEN** a client requests `GET /api/v1/lists/spares/entries?address=0xabc…&artist=artms`
- **THEN** the response holds only that list's artms entries

#### Scenario: The address holds no such profile slug
- **WHEN** a client requests `GET /api/v1/lists/no-such-slug/entries?address=0xabc…`
- **THEN** the response is 404

#### Scenario: The address is not an address
- **WHEN** a client requests `GET /api/v1/lists/spares/entries?address=xyz`
- **THEN** the response is 400

#### Scenario: A request without the parameter is unchanged
- **WHEN** a client requests `GET /api/v1/lists/Z1qlA0_rR/entries`
- **THEN** the response is the list's entries, read by its own slug
