# Spec Delta

## MODIFIED Requirements

### Requirement: Trade tabs
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar, marking the current one. It reads Browse, For you and My trades. For you SHALL be shown only to a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile); for anyone else the bar reads Browse and My trades. For a signed-out visitor, My trades SHALL lead to `/login?redirect=/trade/mine`. The Trade item in the primary navigation SHALL open Browse. A trade's own page, `/trade/mine/$tradeId`, SHALL show neither the Trade page title nor the tab bar; its breadcrumb leads back (see `web-verified-trades`, Trade page header).

For a signed-in user, My trades SHALL carry a count after its label, in monospace: the open offers waiting on the user (Needs you) plus the trades in progress:
- zero SHALL show nothing;
- above 99 SHALL read "99+";
- the tab's accessible name SHALL include it.

The count SHALL be read when the tab bar loads and when the user moves between Trade tabs. Browse and For you SHALL carry no count: For you lists every match, so a number on it would read as a match count (see Matches and Compare with for Mutual N).

#### Scenario: Switch tabs
- **WHEN** a signed-in user with a want list on `/trade` activates For you
- **THEN** the browser is at `/trade/for-you` and For you is marked current

#### Scenario: My trades signed out
- **WHEN** a signed-out visitor activates My trades
- **THEN** the browser is at `/login?redirect=/trade/mine`

#### Scenario: Counts
- **WHEN** a signed-in user has 1 offer waiting on them, 1 trade in progress and 4 mutual people
- **THEN** the tabs read "Browse", "For you" and "My trades 2", and a screen reader announces the count

#### Scenario: Nothing waiting
- **WHEN** the user has no open offer to answer, no trade in progress and no mutual person
- **THEN** My trades shows no count

#### Scenario: No list that can match
- **WHEN** a signed-in user whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** the tabs read Browse and My trades, with no For you tab

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade`
- **THEN** the tabs read Browse and My trades, no tab shows a count, and no count is requested

#### Scenario: A trade's own page
- **WHEN** the user opens `/trade/mine/88`
- **THEN** no Trade page title or tab bar shows, and the page starts with its breadcrumb
