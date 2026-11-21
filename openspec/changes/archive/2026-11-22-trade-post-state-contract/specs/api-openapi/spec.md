## ADDED Requirements

### Requirement: List objects carry no bump time
A list object, as `GET /api/v1/lists/{slug}` returns it and as each entry of `GET /api/v1/profiles/{address}/lists` carries it, SHALL have no `bumpedAt` field, and the document SHALL name none on it. The same holds for `list.findPublic`, `list.find` and `profiles.lists` on `/rpc`. A bump belongs to a Trade post: the Trade feed's posts SHALL keep their `bumpedAt`.

#### Scenario: A list read names no bump
- **WHEN** a client requests `GET /api/v1/lists/{slug}` for a list on Trade
- **THEN** the body carries the list's fields without `bumpedAt`, and the operation's 200 response schema names no `bumpedAt`

#### Scenario: A profile's lists name no bump
- **WHEN** a client requests `GET /api/v1/profiles/{address}/lists`
- **THEN** no list in the body carries `bumpedAt`

#### Scenario: Feed posts keep their bump
- **WHEN** a client requests `GET /api/v1/trade/people`
- **THEN** each post still carries `bumpedAt`
