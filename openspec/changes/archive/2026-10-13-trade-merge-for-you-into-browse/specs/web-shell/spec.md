## ADDED Requirements

### Requirement: Account menu reaches trade matches
The account menu SHALL include a Trade matches item opening `/trade?match=mutual`, Browse with Matches on Mutual (see `web-trade-browse`).

#### Scenario: From the menu
- **WHEN** the user opens the account menu and activates Trade matches
- **THEN** the browser is at `/trade?match=mutual`

## MODIFIED Requirements

### Requirement: Primary navigation with active state
The frame SHALL offer links to Objekts (`/`), Market, Trade (`/trade`), Activity and Lists on every page, in that order. It SHALL mark the link of the current page as active: an exact match for `/`, and for Trade any path under `/trade`. On viewports below the `lg` breakpoint it SHALL move those links into a side sheet, so the search field keeps its width, opened from a menu button, and the sheet SHALL close when a link is followed.

#### Scenario: Active link on desktop
- **WHEN** the user is on `/market` at 1280 px
- **THEN** the Market link is rendered in the active style and the other links are not

#### Scenario: Trade stays active under My trades
- **WHEN** the user is on `/trade/mine` at 1280 px
- **THEN** the Trade link is rendered in the active style

#### Scenario: Trade stays active under For you
- **WHEN** the user opens `/trade/for-you` at 1280 px
- **THEN** the browser is redirected to `/trade` and the Trade link is rendered in the active style

#### Scenario: Sheet closes on navigation
- **WHEN** the user opens the sheet at 390 px and taps Activity
- **THEN** the route changes to `/activity` and the sheet is closed

## REMOVED Requirements

### Requirement: Account menu reaches For you
**Reason**: For you is folded into Browse, so the item would lead to a redirect.
**Migration**: The menu's Trade matches item opens `/trade?match=mutual` (see Account menu reaches trade matches). `/trade/for-you` still redirects there for old bookmarks.
