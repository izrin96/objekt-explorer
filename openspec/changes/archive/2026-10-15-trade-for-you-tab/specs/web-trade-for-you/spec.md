## MODIFIED Requirements

### Requirement: Old For you address
`/trade/for-you` is the For you tab (see `web-trade-browse` Matches and Compare with). It SHALL also accept the parameters of For you links from before the merge into Browse, mapping them in place:
- `match=mutual` stays `match=mutual`;
- `match=they_have` or `match=they_want` becomes `match=any`;
- `list` is kept as `list`;
- `partner` becomes `person`.

Unknown or unparsable values SHALL be dropped. The For you rules then apply: a signed-out visitor is sent to sign in, a signed-in viewer without a list that takes part in Trade is sent to `/trade`, and a `list` the viewer can't use reads as All my lists. A tab loaded before this change SHALL keep working until it is reloaded.

#### Scenario: Notification link
- **WHEN** a signed-in user with want list "binary hunt" opens `/trade/for-you?list=binary-hunt` from an older notification
- **THEN** For you opens on Any, and Compare with names "binary hunt"

#### Scenario: One-way view
- **WHEN** a signed-in user opens `/trade/for-you?match=they_want&list=spares`
- **THEN** the browser is at `/trade/for-you?match=any&list=spares`

#### Scenario: Partner link
- **WHEN** a signed-in user opens `/trade/for-you?match=mutual&partner=<id>`
- **THEN** the browser is at `/trade/for-you?match=mutual&person=<id>` with that person's sheet open

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login`, which returns them to `/trade/for-you?list=spares` after signing in

#### Scenario: Tab opened before the change
- **WHEN** a tab loaded before this change is on Browse with Matches on Any after it ships
- **THEN** its feed keeps loading the same posts until the tab is reloaded
