## ADDED Requirements

### Requirement: List objects' Open to is their posts'
A list object's `matchHave`, `matchSale` and `takesSwaps` SHALL say what the list's Trade posts are open to: the union of its posts on Trade; with none on Trade, the union of every post it is in; in no post, `true`, `true` and `false`, which every list that is not a want or sale list also carries. This holds for `GET /api/v1/lists/{slug}`, each list of `GET /api/v1/profiles/{address}/lists`, each `linkedList` they carry, and their `/rpc` twins and `user.currentUser`.

#### Scenario: A want list in a Buy post
- **WHEN** a client requests `GET /api/v1/lists/{slug}` for a want list on Trade in a Buy post
- **THEN** the body carries `matchHave` false and `matchSale` true

#### Scenario: A post taken off Trade
- **WHEN** the owner takes that post off Trade and the client requests the list again
- **THEN** the body still carries `matchHave` false and `matchSale` true

#### Scenario: A list in no post
- **WHEN** a client requests a bound sale list that has never been in a post
- **THEN** the body carries `takesSwaps` false

#### Scenario: Profile lists agree
- **WHEN** a client requests `GET /api/v1/profiles/{address}/lists` for the same profile
- **THEN** each list, and each `linkedList`, carries the same three values as its own `GET /api/v1/lists/{slug}`
