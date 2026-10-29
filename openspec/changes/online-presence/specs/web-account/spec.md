## MODIFIED Requirements

### Requirement: General settings
The General section SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, toggle "Show when I'm online" (on by default; see `web-presence`), and remove the
profile picture. Saving SHALL persist through the server and refresh every place the account is shown
without a reload.

The Show when I'm online description SHALL say that turning it off also hides everyone else's online
dot from the user. Once saved, the tab where it was saved SHALL show or drop other people's dots within
2 seconds; the user's other tabs and other viewers SHALL follow by their next presence check.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

#### Scenario: Online off
- **WHEN** the user turns Show when I'm online off and saves
- **THEN** that tab stops showing anyone's online dot within 2 seconds, and the user's other tabs and other viewers follow within 60 seconds

#### Scenario: Online switch default
- **WHEN** a user who never changed it opens `/account/general`
- **THEN** Show when I'm online is on
