## Purpose

The account dialog on `apps/web`: everything a signed-in user can change about their site
account, as opposed to their Cosmo profiles.

## ADDED Requirements

### Requirement: General settings
The dialog SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, remove the profile picture, and change the email address. Saving SHALL
persist through the server and refresh every place the account is shown without a reload.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

### Requirement: Linked providers
The dialog SHALL list Discord and Twitter with their linked state, and per provider offer
Link, Refresh (re-read the handle from the provider) and Unlink behind a confirmation.
Unlinking the last sign-in method SHALL be refused with the server's message.

#### Scenario: Unlink
- **WHEN** the user confirms Unlink on a linked provider that is not the last method
- **THEN** the row shows the provider as not linked and the handle disappears from the account

### Requirement: Password
When the account has a password, the dialog SHALL let the user change it by entering the
current and a new password twice; mismatched confirmations SHALL be rejected before any
request. When the account has no password the Password tab SHALL not be shown.

#### Scenario: Mismatch
- **WHEN** the two new-password fields differ
- **THEN** the form shows a mismatch error and no request is sent

### Requirement: Delete account
The dialog SHALL offer account deletion behind a confirmation; confirming SHALL start the
server's deletion flow and tell the user what happens next.

#### Scenario: Confirm deletion
- **WHEN** the user confirms Delete account
- **THEN** the deletion request is sent and a message explains that a confirmation email was sent
