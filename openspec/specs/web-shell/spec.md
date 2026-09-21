# web-shell Specification

## Purpose
The navigation frame every `apps/web` page sits in: how visitors move between pages,
find a user, see who they are signed in as, scope the site to artists and read system health.

## Requirements

### Requirement: Primary navigation with active state
The frame SHALL offer links to Objekts (`/`), Market, Activity and Lists on every page, mark
the link of the current page as active (exact match for `/`), and on viewports below the
`md` breakpoint SHALL move those links into a side sheet opened from a menu button that
closes when a link is followed.

#### Scenario: Active link on desktop
- **WHEN** the user is on `/market` at 1280 px
- **THEN** the Market link is rendered in the active style and the other three are not

#### Scenario: Sheet closes on navigation
- **WHEN** the user opens the sheet at 390 px and taps Activity
- **THEN** the route changes to `/activity` and the sheet is closed

### Requirement: User search with recents
The frame SHALL open a user search dialog from a search control and from ⌘K / Ctrl+K.
Typing SHALL query the server for Cosmo users by nickname and list the matches; a query
that starts with `0x` and matches no user SHALL offer to open it as a raw address. Picking a
result SHALL navigate to that profile and record it in a per-browser Recent list of at most
seven entries shown when the query is empty, ending with a "Clear history" action that empties
the list without closing the dialog. Requests SHALL be debounced and rate-limit errors from
the server SHALL be shown, not swallowed.

#### Scenario: Search and pick
- **WHEN** the user types a nickname prefix and presses Enter on the first match
- **THEN** the dialog closes, the URL is that user's profile, and the user appears first in Recent on the next open

#### Scenario: Clear history
- **WHEN** Recent has entries and the user activates "Clear history"
- **THEN** Recent is empty, the dialog stays open, and a reload keeps it empty

### Requirement: Session-aware account area
When a session exists the frame SHALL show the account avatar opening a menu with the display
name, the Artists submenu, Settings and Sign out; Sign out SHALL end the session server-side
and the frame SHALL switch to the signed-out state without a full reload. Without a session
the frame SHALL show a Settings button and a Sign in link to `/login` carrying the current
page as `redirect` (omitted when already on `/login`).

#### Scenario: Sign out
- **WHEN** a signed-in user picks Sign out
- **THEN** the avatar is replaced by the Sign in link and a subsequent request to the session endpoint returns no session

#### Scenario: Sign in link keeps the page
- **WHEN** a signed-out user on `/market` follows Sign in
- **THEN** the URL is `/login?redirect=/market`

### Requirement: Artist scope
The frame SHALL let the user choose which artists the site is scoped to, from the account
menu and from Settings. The choice SHALL be stored server-side per browser so a
server-rendered page already reflects it, SHALL keep at least one artist selected, and
SHALL apply to every page.

#### Scenario: Persisted across reload
- **WHEN** the user turns ARTMS off and hard-reloads
- **THEN** the first server-rendered HTML already shows ARTMS unselected

#### Scenario: Last artist stays on
- **WHEN** only tripleS is selected and the user tries to turn it off
- **THEN** tripleS remains selected

### Requirement: System status
The frame SHALL show an overall status of up, partial or down derived from the indexer's
freshness and the Cosmo API, tinting both the logo dot and a status control that opens a
popover with the database and Cosmo rows, the last transfer time and a loading state.

#### Scenario: Indexer behind
- **WHEN** the latest indexed transfer is older than fifteen minutes
- **THEN** the overall status is down and the popover's database row says so

### Requirement: Device settings
Settings SHALL expose theme (System, Light, Dark), language (English, 한국어, 日本語), wide
layout and hide-label switches. Theme and wide SHALL persist per browser (see `web-app-shell`);
language SHALL set the locale cookie and re-render the page in that language.

#### Scenario: Language change
- **WHEN** the user selects 한국어
- **THEN** the frame's strings are Korean and a reload keeps them Korean

### Requirement: Account menu reaches Cosmo and account settings
The account menu SHALL include a My Cosmo item opening `/link` and an Account item opening
the account dialog.

#### Scenario: My Cosmo
- **WHEN** a signed-in user picks My Cosmo
- **THEN** the URL is `/link`
