## Purpose

Binding Cosmo profiles to a site account on `apps/web`: listing linked profiles,
connecting a new one by status-message verification, editing a profile's visibility and
banner, and unlinking.

## ADDED Requirements

### Requirement: Linked profiles list
`/link` SHALL require a session (redirecting to `/login?redirect=/link` otherwise) and
SHALL list every Cosmo profile linked to the account with its nickname and address, an
Edit action and an Unlink action behind a confirmation. Unlinking SHALL remove the profile
from the list and from the account without a reload.

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/link`
- **THEN** the URL is `/login?redirect=/link`

#### Scenario: Unlink
- **WHEN** the user confirms Unlink on a profile
- **THEN** the card disappears and the profile is no longer in the account's profiles

### Requirement: Connect flow
`/link/connect` SHALL guide the user through: finding their Cosmo user by nickname search,
checking the address is not already linked, choosing an artist, receiving a verification
code with a countdown from the server's expiry, an "Open Cosmo" action that deep-links
into the Cosmo app, and verifying that the code appears in the profile's status message.
Each server refusal (already linked, rate limited, expired, mismatch, code not found) SHALL
be shown in the user's locale at the step it applies to. Success SHALL add the profile to
the account and offer a link to it.

#### Scenario: Already linked elsewhere
- **WHEN** the chosen address is linked to another account
- **THEN** the nickname step shows the server's message and the flow does not advance

#### Scenario: Expired code
- **WHEN** the user verifies after the countdown reached zero
- **THEN** the verify step shows the expiry message and offers to generate a new code

### Requirement: Edit profile
The edit dialog SHALL load the profile's current settings and let the user toggle hide
user, hide nickname, private serial, hide transfers and private profile, choose a grid
column count between 2 and 18 or unset, and set, replace or remove a banner. Images SHALL
be cropped to the banner ratio before upload; videos and GIFs SHALL upload as-is; files
over the size limit or of an unsupported type SHALL be refused before upload. Saving SHALL
persist through the server.

#### Scenario: Banner upload
- **WHEN** the user picks a JPEG, crops it and saves
- **THEN** the profile's banner URL points at the uploaded object and the dialog closes

#### Scenario: Oversized file
- **WHEN** the user picks a file larger than the limit
- **THEN** a message explains the limit and nothing is uploaded
