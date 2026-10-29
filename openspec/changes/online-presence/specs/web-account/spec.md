## MODIFIED Requirements

### Requirement: General settings
The General section SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, toggle "Show when I'm online" (on by default; see `web-presence`), and remove the
profile picture. Saving SHALL persist through the server and refresh every place the account is shown
without a reload.

The Show when I'm online description SHALL say that turning it off hides the user's own dot and still
shows other people's. Once saved, other viewers SHALL follow by their next presence check.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

#### Scenario: Online off
- **WHEN** the user turns Show when I'm online off and saves
- **THEN** other viewers stop seeing the user's dot within 60 seconds, and the user still sees other people's dots

#### Scenario: Online switch default
- **WHEN** a user who never changed it opens `/account/general`
- **THEN** Show when I'm online is on
