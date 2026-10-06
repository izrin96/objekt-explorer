## MODIFIED Requirements

### Requirement: Primary navigation with active state
The frame SHALL offer links to Objekts (`/`), Market, Trade (`/trade`), Activity and Lists on every page, in that order. It SHALL mark the link of the current page as active: an exact match for `/`, and for Trade any path under `/trade`. On viewports below the `md` breakpoint it SHALL move those links into a side sheet opened from a menu button, and the sheet SHALL close when a link is followed.

#### Scenario: Active link on desktop
- **WHEN** the user is on `/market` at 1280 px
- **THEN** the Market link is rendered in the active style and the other links are not

#### Scenario: Trade stays active under For you
- **WHEN** the user is on `/trade/for-you` at 1280 px
- **THEN** the Trade link is rendered in the active style

#### Scenario: Sheet closes on navigation
- **WHEN** the user opens the sheet at 390 px and taps Activity
- **THEN** the route changes to `/activity` and the sheet is closed
