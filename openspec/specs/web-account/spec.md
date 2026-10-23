# web-account Specification

## Purpose
The `/account` page on `apps/web`: everything a signed-in user can change about their site
account, with its linked Cosmo profiles, notification, message, block and hidden-people settings each in its own section.

## Requirements

### Requirement: Account page
A signed-in user's account settings SHALL live on the `/account` page, one route per section:
- `/account` and `/account/general`: General;
- `/account/email`: Email;
- `/account/profiles`: linked Cosmo profiles (see `web-cosmo-link`);
- `/account/notifications`: Notifications (see `web-notifications`);
- `/account/messages`: Messages (see `web-chat`);
- `/account/blocked`: Blocked users (see `web-moderation`);
- `/account/hidden`: Hidden people (see `web-trade-for-you` Hide a partner);
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

### Requirement: General settings
The General section SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, and remove the profile picture. Saving SHALL
persist through the server and refresh every place the account is shown without a reload.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

### Requirement: Email
The Email section SHALL show the account's email address and let the user change it. Changing it SHALL
send a verification email to the new address and say so; the address changes only once that link is opened.

#### Scenario: Change email
- **WHEN** the user submits a new address
- **THEN** a verification email is sent to it and the section says so

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
The Danger section SHALL offer account deletion behind a confirmation. Before the confirmation, it SHALL show what blocks deletion (see Deletion blockers), and Delete SHALL be disabled while anything does. The confirmation SHALL say:
- how many open offers will be cancelled;
- that trades, ratings and messages stay with partners, who see the account as "Deleted account";
- that the linked Cosmo profiles are unlinked.

The section SHALL offer one action, by account:
- **With a deliverable email:** Send confirmation email. Confirming sends a link and says so. The account is deleted only when the link is opened while signed in to it.
- **Without one, signed in less than 10 minutes ago:** Delete now, which deletes on confirming (see Accounts without a deliverable email).
- **Without one, signed in longer ago:** Sign in again.

Deleting SHALL end every session of the account and remove its sign-in methods. What is kept is set by What deletion keeps.

#### Scenario: Confirm deletion
- **WHEN** a user with a deliverable email and nothing blocking confirms Send confirmation email
- **THEN** the confirmation email is sent, the section says so, and nothing is deleted yet

#### Scenario: Link opened
- **WHEN** the user opens the emailed link while signed in to the account, and nothing blocks deletion
- **THEN** the account is deleted and signed out everywhere

#### Scenario: Confirmation says what happens
- **WHEN** a user with 2 open offers opens the confirmation
- **THEN** it says 2 open offers will be cancelled, that trades, ratings and messages stay with partners as "Deleted account", and that Cosmo profiles are unlinked

### Requirement: Deletion blockers
Two things SHALL block deletion:
- a trade in progress that the account is a party to;
- an active sanction other than a warning (a chat mute, trade block or ban that has not ended or been revoked).

Open reports against the account SHALL NOT block it, and expired or revoked sanctions SHALL NOT.

Under "Finish your trades first", the Danger section SHALL list each blocker, the one ending soonest first:
- **A trade:** its number (T-1042) in monospace, the partner as they are named in chat, and a link to that trade's page. It reads "Cancel available" while either party may still cancel, and otherwise "Cancelling locked, ends by <date>", the date being 14 days after accept, when the trade ends on its own.
- **A sanction:** its type, and its end date, or none for one with no end.

The server SHALL check for blockers at every step: when the confirmation email is asked for, when its link is opened, on Delete now, and again in the deletion itself. A refusal SHALL change no data. When the link was already spent, the refusal SHALL return the user to `/account/danger` with the reason shown.

#### Scenario: Trade in progress
- **WHEN** rin.trades has trade T-1042 in progress with nothing sent and opens the Danger section
- **THEN** "Finish your trades first" lists T-1042 with its partner, "Cancel available" and a link to `/trade/mine/1042`, and Delete is disabled

#### Scenario: Cancel locked
- **WHEN** T-1042 was accepted on Oct 1 and one of its legs has verified
- **THEN** its row reads "Cancelling locked, ends by Oct 15"

#### Scenario: Accepted in between
- **WHEN** rin.trades asks for the confirmation email, then accepts offer O-882, which starts trade T-1050, and then opens the link
- **THEN** the page returns to `/account/danger` saying trades in progress must finish first, T-1050 is listed, and the account and its data are unchanged

#### Scenario: Warning only
- **WHEN** the account's only sanction is a warning
- **THEN** nothing is listed and Delete is enabled

#### Scenario: Chat mute
- **WHEN** the account is under a chat mute until Oct 20
- **THEN** the list shows the chat mute until Oct 20, and Delete is disabled

#### Scenario: Open report
- **WHEN** the account has an open report against it and nothing else blocks deletion
- **THEN** Delete is enabled

### Requirement: What deletion keeps
Deletion SHALL keep the account's record, renamed "Deleted account", so partners' history stays whole.

It SHALL remove:
- the email, username, avatar and linked social handles;
- the lists, notifications, and notification and message settings;
- the links to Cosmo profiles.

It SHALL keep:
- trades and their legs, each with the wallet addresses as they were at accept;
- ratings given and received;
- reports filed by and against the account, sanctions and moderation entries;
- messages.

After deletion:
- partners SHALL see "Deleted account" wherever the account was named;
- a send to the deleted account SHALL be refused as a block is (see `web-chat`);
- every open offer the account sent or received SHALL be cancelled with the reason "an account in it was deleted", and the other party SHALL be notified;
- the email address SHALL be free for a new sign-up.

A wallet that was linked to the deleted account SHALL carry its unfinished trades to any account that links it once it may be linked again (see `web-cosmo-link`, and Reputation in `web-verified-trades`).

#### Scenario: Partner view
- **WHEN** rin.trades deletes the account after completing T-1042 with kaede.k
- **THEN** kaede.k's My trades still lists T-1042 with "Deleted account" as the partner, her rating of the trade stays, and the conversation keeps its messages but refuses a new one

#### Scenario: Open offer cancelled
- **WHEN** offer O-882 from rin.trades to kaede.k is open when rin.trades deletes the account
- **THEN** O-882 shows Cancelled with "an account in it was deleted", and kaede.k is notified

#### Scenario: Same wallet, new account
- **WHEN** rin.trades has 1 unfinished trade, deletes the account, and 7 days later links the same Cosmo wallet to a new account
- **THEN** the new account's line reads "No verified trades · 1 unfinished"

### Requirement: Accounts without a deliverable email
An account whose email is a placeholder (a Discord sign-up without an email, an X sign-up) SHALL NOT be sent a deletion email. A request for one SHALL be refused with a reason, and no message SHALL claim an email was sent.

Such an account SHALL delete without an email:
- **Signed in less than 10 minutes ago:** Delete now deletes on confirming, after the same blocker checks.
- **Signed in 10 minutes ago or more:** Sign in again signs out and opens `/login?redirect=/account/danger`.

#### Scenario: Fresh Discord sign-in
- **WHEN** an account that signed up with Discord without an email signed in 3 minutes ago, has nothing blocking, and confirms Delete now
- **THEN** the account is deleted without any email and signed out

#### Scenario: Sign-in two hours old
- **WHEN** the same account signed in 2 hours ago and opens the Danger section
- **THEN** the action reads Sign in again, and activating it signs out and opens `/login?redirect=/account/danger`

#### Scenario: No email to a placeholder
- **WHEN** an X account with a placeholder email asks for the deletion email
- **THEN** the request is refused with a reason, no email is sent, and no message says one was
