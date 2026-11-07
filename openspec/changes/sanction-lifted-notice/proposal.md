# Proposal

## Why

Placing a chat mute or a trade block notifies the user, but a moderator lifting one early tells them nothing: an open tab silently drops the mute banner or shows their lists again, and a user who closed the site keeps believing they are still sanctioned until they try. The notice that told them about the sanction is the place they would look.

## What Changes

- A moderator revoking an active chat mute or trade block creates a sanction notification for that user saying it was lifted: "You can send messages again" or "Your lists show on Market and Trade again".
- The lifted notice carries no reason: the revoke reason goes to the audit log only, as the console already says.
- Nothing new for a warn or a banner removal (nothing to lift) or a ban (the account is signed out, as when it is placed), and nothing when a mute simply runs out.
- The lifted notice is a moderator notice like the others: never grouped, not something the user can turn off, led by the shield, but without the warning colour.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-notifications`: Sanction notices gains the lifted notice.

## Non-goals

- Notifying a partner's rating: single ratings are private to their author (`web-verified-trades` Feedback).
- A notice when a timed mute ends on its own, or for an unban.
- Changing the console's revoke dialog or what it records.

## Routes

The bell popover in the header of every signed-in page, and the moderator console's revoke action under `/mod`.

## Impact

- `packages/api`: the sanction payload's actions, `revokeSanction` (`services/moderation/console.ts`).
- `apps/web`: `sanctionText` and the notification tone, three messages in `en`, `ko` and `ja`.
- No migration: `notification.payload` is `jsonb`. A tab from before the deploy skips a notice it can't draw.
