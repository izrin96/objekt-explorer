# Spec Delta

## MODIFIED Requirements

### Requirement: Account page
A signed-in user's account settings SHALL live on the `/account` page, one route per section:
- `/account` and `/account/general`: General;
- `/account/email`: Email;
- `/account/profiles`: linked Cosmo profiles (see `web-cosmo-link`);
- `/account/collection-data`: Collection data, connecting a Cosmo account to share its collections' media (see `web-cosmo-session`);
- `/account/notifications`: Notifications (see `web-notifications`);
- `/account/messages`: Messages (see `web-chat`);
- `/account/trade`: Trade, holding the offer rules;
- `/account/blocked`: Blocked users (see `web-moderation`);
- `/account/hidden`: Hidden on Trade, listing hidden people and hidden posts (see `web-trade-for-you` Hide a partner and Hide a post);
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

#### Scenario: Trade section
- **WHEN** a signed-in user opens `/account/trade`
- **THEN** the Trade section shows the offer rules, and Trade is marked in the section menu between Messages and Blocked users

#### Scenario: Collection data section
- **WHEN** a signed-in user opens `/account/collection-data`
- **THEN** the Collection data section shows, and Collection data is marked in the section menu between Cosmo profiles and Notifications

#### Scenario: Collection data signed out
- **WHEN** a signed-out visitor opens `/account/collection-data`
- **THEN** the URL is `/login?redirect=/account/collection-data`
