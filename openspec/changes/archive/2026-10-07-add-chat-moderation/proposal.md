## Why

Chat (`add-chat`) connects strangers trading objekts worth real money, and scams usually ask the other side to send first or pay outside the site. From the day chat ships, users need to protect themselves and the site needs to act on reports, without moderators reading inboxes.

## What Changes

- **Block a user** from a thread menu, a profile, a Trade post or a For you row:
  - they can't message you or start a thread with you, and aren't told;
  - your threads with them leave your inbox;
  - their posts and rows leave your Trade feed, For you and want-list alerts.
- **Blocked users** settings section with Unblock.
- **Report** from a thread or profile:
  - reasons: scam or fake offer, harassment, spam, impersonation, something else, plus an optional note;
  - "Share the last 20 messages with moderators", on by default, is the only way moderators see message text;
  - "Also block".
- **Safety hint**: a message matching scam phrases ("send first", outside-payment links) shows the recipient an inline caution. The matched category is recorded as a flag on the sender, without the text.
- **Moderator console** at `/mod/reports`, for moderators and admins only:
  - open reports grouped by reported user, with shared excerpts and auto-flag counts;
  - account signals: account age, linked addresses and their age, conversations started in 24 h, past sanctions;
  - actions with a reason shown to the user: dismiss, warn, mute in chat (1, 7 or 30 days), block from trading, ban;
  - an audit log of every action.
- **Sanctions ladder**:
  - **Warn**: a notification in the bell.
  - **Chat mute**: no sending; the message box shows the reason and end date.
  - **Trade block**: the user's lists leave Market, Trade, For you and alerts.
  - **Ban**: Better Auth `banned` and `banExpires`; sessions revoked; sign-in refused.

  Moderators can revoke any sanction.
- **Roles**: Better Auth's admin plugin adds `user.role`. Staff act only through the audited console; only admins manage roles. A script sets the first admin.

## Non-goals

- An appeals flow; the notice names the reason and end date only.
- Moderators reading any message a reporter didn't share.
- Email notices.
- Automatic sanctions: flags only inform a moderator.
- IP or device bans, and moderating list text.

## Capabilities

### New Capabilities

- `web-moderation`:
  - block and Blocked users;
  - report;
  - the scam-phrase hint and flags;
  - the moderator console;
  - sanctions and their effects;
  - roles and the audit log.

### Modified Capabilities

- `web-chat`: blocks and chat mutes gate starting threads and sending, and the thread shows the caution hint and the mute notice.
- `web-trade-browse`: blocked users' posts are left out, and so are lists of trade-blocked users.
- `web-trade-for-you`: blocked users are left out and counted under Not shown, and so are lists of trade-blocked users.
- `web-market`: lists of trade-blocked users are left out.
- `web-notifications`: warn notices, and no want-list alerts from blocked or trade-blocked users.
- `web-auth`: a banned user can't sign in and sees the ban reason and end date.

## Impact

- **DB**: one migration adds the admin plugin's columns (`user.role`, `banned`, `ban_reason`, `ban_expires`, `session.impersonated_by`), plus `user_block`, `report`, `message_flag`, `user_sanction` and `mod_audit`. It is applied locally only until ship.
- **API**: a `moderation` router, sanction checks in chat, list and market routes, and a `sanction` notification type.
- **Worker**: alerts skip blocked pairs and trade-blocked users.
- **Web**:
  - the `/mod/reports` route;
  - `features/moderation/*`;
  - the thread and profile menus;
  - the Blocked users settings section;
  - en, ja and ko strings.
