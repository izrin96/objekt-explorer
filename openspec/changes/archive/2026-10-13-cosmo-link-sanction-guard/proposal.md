## Why

A trade-blocked or banned account can unlink its Cosmo profile and link it to a fresh account, so its wallet, unfinished-trade reputation and objekts trade again at once. An unlink in the middle of a trade also leaves the other party unsure which account owes them. Nothing records who held an address before, so moderators can't see it either.

## What Changes

- **Link history.** Every link and unlink is recorded, with who held the address, why the link ended (verified, by the user, account deleted, staff move, staff unlink, backfill), and the staff member for staff actions. History outlives the account. Existing links and past holders read from trade snapshots are backfilled.
- **Link refused while a past holder is sanctioned.** Linking an address that any account has ever held is refused while one of those accounts has an active trade block or ban. The refusal shows only after the bio proof ("restricted by a moderation action"). Before the proof, the flow says only what it says today: linked to another account.
- **Unlink refused** while the account is trade blocked or banned, or while the address belongs to an in-progress trade that still waits on a transfer. A chat mute doesn't count.
- **7-day cooldown.** For 7 days after an address leaves an account, by unlink, staff unlink or account deletion, only that account can link it again. Other accounts are refused after the proof, with the date it opens.
- **Staff moves.** Admins can move an address from one account to another (lost access) or unlink it, with a reason and an audit entry on both accounts. A move is refused if either account is trade blocked or banned, the address is in an in-progress trade, the address has left the source, or both sides are the same account. Moves skip the cooldown. Lists stay with the source account.
- **Moderator reads.** Moderators see an account's link history and the other accounts that held its addresses, flagged when one is sanctioned, and can look up any address's history at a new route.
- **Account deletion** writes an "account deleted" event for each address it unlinks.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-cosmo-link`: "Linked profiles list" (unlink refusals, 7-day note), "Connect flow" (restricted and cooldown refusals after proof); ADDED "Link history".
- `web-moderation`: "Moderator console" (link history, also held by, address lookup); ADDED "Staff link moves".
- `web-verified-trades`: "Reputation" (scenarios move past the cooldown; staff move scenario).

## Routes

`/account/profiles`, `/link/connect`, `/mod/reports/$userId`, and the new `/mod/addresses/$address`.

## Non-goals

- One Cosmo profile per account.
- Carrying a chat mute to a new account, or chat-mute evasion generally.
- Sanctioning alt accounts automatically.
- Moving lists or verified reputation with a staff move.
- A history page for users.

## Impact

- `packages/db`: new `address_link_event` table (expand only), a generated migration and a custom backfill migration, both held for the user to apply.
- `packages/api`:
  - new pure `lib/link-rules.ts` with tests;
  - new `services/cosmo-link.ts`, which takes the link logic out of `routers/cosmo-link.ts`;
  - new `services/mod-links.ts`;
  - `services/account-anonymize.ts`, `services/mod-console.ts` (user-row lock), `services/mod-reads.ts` (dossier), `services/moderation.ts` (refusals);
  - `schemas/cosmo-link.ts`, `schemas/moderation.ts`, `routers/moderation.ts`.
- `apps/web`:
  - `lib/refusal.ts`;
  - `features/link/linked-card.tsx` (copy);
  - `features/moderation/console/` (signals, audit, new link-history and two dialogs);
  - a new route `routes/(container)/mod/addresses/$address.tsx`;
  - en, ko and ja messages.
- Old tabs show the generic error for the new refusal codes. No `/rpc` input changes.
