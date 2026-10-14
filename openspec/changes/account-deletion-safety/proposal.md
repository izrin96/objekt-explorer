## Why

Deleting an account already scrubs the row instead of removing it (commit ea2e6adb), so partners keep their trades, ratings and messages. Four gaps remain:
- A blocked deletion names a reason but not which trade or sanction.
- A trade accepted between the link's check and the scrub ends on a raw JSON error.
- Accounts with a placeholder email (Discord without one, X) get a success toast that lies: Better Auth swallows the mail error.
- Nothing in the console marks a deleted account.

## What Changes

- **Blocker list on Delete account.** "Finish your trades first" lists each trade in progress:
  - its T-number, partner (by Chat as) and a link to `/trade/mine/$tradeId`;
  - "Cancel available", or "Cancelling locked, ends by <date>" (accept + 14 days).

  It also lists each active non-warn sanction with its type and end. Delete is disabled while any blocker remains.
- **Honest confirmation.** The dialog says:
  - how many open offers will be cancelled;
  - that trades, ratings and messages stay with partners as "Deleted account";
  - that Cosmo profiles are unlinked.
- **One button per state:** Send confirmation email, Delete now, or Sign in again.
- **Accounts without a deliverable email** delete without an email, within 10 minutes of a fresh sign-in, through a server-minted Better Auth deletion token. Asking for the email is refused with `email_undeliverable`.
- **Race closed.**
  - A refusal after the link's token was spent redirects to `/account/danger?refused=<code>` instead of returning JSON.
  - The scrub locks the user row, then cancels offers, then re-checks trades and sanctions.
  - Offer create and accept read both users `FOR SHARE` and refuse a deleted one as `blocked`.
- **Moderation.**
  - A self-deletion writes an `account_deleted` audit entry (actor self, the open report ids and their count).
  - The console shows a Deleted chip and offers only Dismiss on a deleted account. The server refuses other actions.
  - The wallets the account had linked come from the link history that `cosmo-link-sanction-guard` adds.
- **Kept decisions:**
  - open reports don't block deletion;
  - a chat mute blocks it;
  - nothing auto-cancels a trade;
  - a deleted account can still be reported;
  - admin removal behaves as today.

## Dependency

`cosmo-link-sanction-guard` lands first. It adds `address_link_event`, and makes `anonymizeUser` write an `unlinked` event with reason `account_deleted` for every address it unlinks. This change adds no address list of its own and builds on that `anonymizeUser`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-account`:
  - Delete account is modified (the blockers, the per-state buttons, the email that is never sent);
  - Deletion blockers, What deletion keeps, and Accounts without a deliverable email are added.
- `web-moderation`: Deleted accounts keep their evidence is added.
- `web-chat`: Blocks and chat mutes gate sending gains the deleted partner.

## Routes

- `/account/danger`: the blocker list, the per-state buttons, and `refused` gains `email_undeliverable` and `sign_in_again`.
- `/mod/reports/$userId`: the Deleted chip and Dismiss only.

## Non-goals

- Hard delete of the user row.
- Wallet-level bans (`cosmo-link-sanction-guard`).
- Auto-cancelling trades, even with nothing sent.
- Deleting messages.
- Changing admin removal, or `session.freshAge` (stays 0).
- Any migration: `mod_audit.action` has no CHECK constraint.

## Impact

- `packages/api`:
  - `lib/account-deletion.ts` (new, tested);
  - `services/account-delete.ts`, `account-anonymize.ts`, `auth.ts`, `mod-console.ts` and `mod-reads.ts`;
  - `services/offer/index.ts`, `accept.ts`;
  - `routers/user.ts` (`deletionCheck`, `deletionToken`);
  - `schemas/user.ts` and `schemas/moderation.ts`.
- `packages/db`: the `mod_audit.action` type union only.
- `apps/web`:
  - `features/account/sections/danger.tsx`, and a new `features/account/deletion-blockers.tsx`;
  - the `/account/danger` route;
  - the moderation console's account page, `labels.ts`;
  - en/ko/ja messages.
