## ADDED Requirements

### Requirement: Trade side items paging
`GET /trade/lists/{listId}/items` SHALL take an optional `cursor` query parameter: the previous page's `nextCursor`, a whole number. Without it the response SHALL be the first page. Each page SHALL hold up to 200 collections in the side's order, with `nextCursor` while more remain. `more` SHALL count the collections after the page; `matched`, `near` and `copyCount` SHALL describe the whole side. A `cursor` that is empty, negative or not a whole number SHALL be rejected with 400.

#### Scenario: First page
- **WHEN** a client requests `GET /api/v1/trade/lists/{listId}/items` for a sale list with 450 collections
- **THEN** the response holds 200 items, `more` is 250 and `nextCursor` is present

#### Scenario: Last page
- **WHEN** the client requests the same list with the `nextCursor` of the second page
- **THEN** the response holds the last 50 items, `more` is 0, and there is no `nextCursor`

#### Scenario: Malformed cursor
- **WHEN** a client requests `GET /api/v1/trade/lists/{listId}/items?cursor=-1`
- **THEN** the response is 400

### Requirement: Trade side items asks
On a sale side, an item SHALL also carry what its copies ask:
- `price`, the lowest and highest of its priced copies, when any is priced (a QYOP copy counts as unpriced, whatever price it stores);
- `qyop`, when any copy is QYOP;
- `notes`, its copies' distinct notes, newest first, when any has one.

A have or want side's items SHALL carry none of these. Each field SHALL be optional.

#### Scenario: Prices on a sale side
- **WHEN** a sale list holds Lynn SCO twice, at 10 and 15, with the notes "nego" and "nego"
- **THEN** its item carries `price` `{ min: 10, max: 15 }`, no `qyop`, and `notes` `["nego"]`

#### Scenario: Have side
- **WHEN** a client requests the items of a have list
- **THEN** no item carries `price`, `qyop` or `notes`
