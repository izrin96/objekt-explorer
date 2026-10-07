## Why

Account settings sit in a small dialog whose seven tabs wrap onto two rows, and no section can be linked to. Linked Cosmo profiles sit apart at `/link`. A user with several profiles cannot choose which one names them in chat.

## What Changes

- New `/account` page replacing the Account dialog, one route per section:
  - `/account` and `/account/general` (General);
  - `/account/profiles` (linked Cosmo profiles, moved from `/link`);
  - `/account/notifications`;
  - `/account/messages`;
  - `/account/blocked`;
  - `/account/sign-in` (Discord and Twitter);
  - `/account/password` (only when the account has a password);
  - `/account/danger`.
- Desktop: a side menu of sections beside the open section. Phone: `/account` lists the sections and each opens on its own, with a way back to the list.
- Signed out, every `/account/*` route redirects to `/login?redirect=<that route>`.
- `/link` redirects to `/account/profiles`; `/link/connect` stays where it is and returns to `/account/profiles`.
- Links in:
  - the account menu's Account item and the primary nav's My Cosmo link open the page;
  - the bell gets a "Notification settings" link;
  - the Messages page header gets a settings button to `/account/messages`;
  - every in-app link to `/link` points at `/account/profiles`.
- **Chat as**, in Messages settings: the user picks which linked Cosmo profile names them wherever the app names them as a partner (chat, offers and trades, the blocked list).
  - Default is the first linked profile, as today.
  - Hide nickname is ignored in chat naming.
  - The choice applies to every conversation at once.
  - Unlinking the chosen profile falls back to the default.
  - With no profiles, the account name is used and the setting is not shown.
- The Account dialog is deleted. The device Settings dialog stays: signed-out visitors use it, which is also why the page is `/account`, not `/settings`.
- Edit profile no longer lists "hide user" (removed earlier).

## Non-goals

- Choosing a profile per conversation, or at the first message.
- Tying offers or trade checks to the chosen profile: those keep using every linked wallet.
- Moving device settings into the page.
- Changing what any section does: only where it lives changes.

## Capabilities

### New Capabilities
None. The page is the existing account capability, moved.

### Modified Capabilities
- `web-account`:
  - the dialog becomes the `/account` page with per-section routes, layout and sign-in redirect;
  - it gains the Linked profiles, Notifications, Messages and Blocked sections as places.
- `web-cosmo-link`:
  - the profile list moves to `/account/profiles`, and `/link` redirects there;
  - connect returns there;
  - Edit profile drops "hide user".
- `web-chat`:
  - Messages settings move to `/account/messages` and gain Chat as;
  - a partner's heading follows their Chat as;
  - the Messages page links to its settings.
- `web-notifications`: Notification settings move to `/account/notifications`, and the bell links to them.
- `web-moderation`: Blocked users moves to `/account/blocked`.
- `web-shell`: the Account item and My Cosmo point at the page instead of the dialog and `/link`.

## Impact

- **`apps/web`:**
  - new routes under `routes/(container)/account/`;
  - the dialog's section components are reused, and the dialog itself is deleted;
  - `/link` becomes a redirect;
  - the user menu, primary nav, bell, Messages header and five `/link` links are touched;
  - en/ja/ko messages.
- **`packages/api`:** the chat identity takes the chosen address; the chat settings read and write `chatAs`, refusing an address the caller has not linked.
- **`packages/db`:** one additive migration, nullable `message_pref.chat_as`.
- **Old tabs:** older tabs sending `{ allow }` still validate.
