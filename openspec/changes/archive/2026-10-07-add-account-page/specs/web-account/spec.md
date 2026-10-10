## ADDED Requirements

### Requirement: Account page
A signed-in user's account settings SHALL live on the `/account` page, one route per section:
- `/account` and `/account/general`: General;
- `/account/profiles`: linked Cosmo profiles (see `web-cosmo-link`);
- `/account/notifications`: Notifications (see `web-notifications`);
- `/account/messages`: Messages (see `web-chat`);
- `/account/blocked`: Blocked users (see `web-moderation`);
- `/account/sign-in`: Discord and Twitter;
- `/account/password`: shown only when the account has a password;
- `/account/danger`: Delete account.

From `md` up, a menu of the sections SHALL sit beside the open section and mark it, and `/account` SHALL show General. Below `md`, `/account` SHALL list the sections instead. Each section SHALL then open on its own with a control back to the list. Every route SHALL redirect a signed-out visitor to `/login?redirect=<that route>`. `/account/password` SHALL show the not-found surface when the account has no password. Each section SHALL be reachable by its URL and survive a reload.

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/account/messages`
- **THEN** the URL is `/login?redirect=/account/messages`

#### Scenario: Deep link survives reload
- **WHEN** a signed-in user reloads `/account/notifications`
- **THEN** the Notifications section is open and marked in the section menu

#### Scenario: Phone list
- **WHEN** a signed-in user opens `/account` on a 375px-wide viewport and picks Messages
- **THEN** the URL is `/account/messages`, only the Messages section shows, and a back control returns to the list

#### Scenario: No password
- **WHEN** a user who signed up with Discord opens `/account/password`
- **THEN** the not-found surface is shown and the section menu has no Password entry

## MODIFIED Requirements

### Requirement: General settings
The General section SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, remove the profile picture, and change the email address. Saving SHALL
persist through the server and refresh every place the account is shown without a reload.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

### Requirement: Linked providers
The Sign-in section SHALL list Discord and Twitter with their linked state, and per provider offer
Link, Refresh (re-read the handle from the provider) and Unlink behind a confirmation.
Unlinking the last sign-in method SHALL be refused with the server's message.

#### Scenario: Unlink
- **WHEN** the user confirms Unlink on a linked provider that is not the last method
- **THEN** the row shows the provider as not linked and the handle disappears from the account

### Requirement: Password
When the account has a password, the Password section SHALL let the user change it by entering the
current and a new password twice; mismatched confirmations SHALL be rejected before any
request. When the account has no password the Password section SHALL not be offered.

#### Scenario: Mismatch
- **WHEN** the two new-password fields differ
- **THEN** the form shows a mismatch error and no request is sent

### Requirement: Delete account
The Danger section SHALL offer account deletion behind a confirmation; confirming SHALL start the
server's deletion flow and tell the user what happens next.

#### Scenario: Confirm deletion
- **WHEN** the user confirms Delete account
- **THEN** the deletion request is sent and a message explains that a confirmation email was sent
