# Proposal

## Why

The setting that decides which Cosmo profile names an account to other people already exists, as Chat as, but it sits under Messages settings and is stored as a message preference (`message_pref.chat_as`). Its name says it covers chat only, while it also names the account in offers, trades, notifications and the blocked list. People with more than one profile don't find it. It belongs with the profiles it chooses between, stored on the link it chooses, under a name that says what it does.

## What Changes

- **BREAKING (unreleased):** `message_pref.chat_as` is dropped, and `chatAs` leaves `chat.settings` and `chat.setSettings`. Both came with this branch, which has never reached production, so no deployed client sends or reads them.
- New `user_address.is_default` flag. A partial unique index allows one default per account. Any write that ends a link or moves it to another account clears the flag.
- New `cosmoLink.setDefault({ address })` that makes one of the caller's linked profiles the default. It refuses an address not linked to the caller.
- The current user read gains `defaultAddress`, the resolved default (the flagged profile, else the first linked one, else null), so the web shows the badge and the Messages line without another request.
- `/account/profiles`: on an account with two or more linked profiles, the default card carries a Default badge, and every other card's menu gains **Make default**. On an account with one profile, no badge or action is shown.
- `/account/messages` drops the Chat as picker. In its place is one line, "People see you as <name>", with a link to `/account/profiles` when the account has two or more profiles.
- The message box of a conversation and the offer builder show "Sending as <name>" with a Change link, for accounts with two or more profiles only. Users then see which name the other person will see at the moment it matters.
- A Trade post or For you card from a list filed under no profile is headed by the owner's default profile, unless that profile is private, instead of the account's display name. A Want list therefore needs no profile of its own to show a Cosmo name on Trade, and the name matches the one partners see in chat.
- A conversation's header names the other account's other non-private profiles ("rin.main · also rin.alt"). An empty thread opened from an alt profile says once which account that profile belongs to.
- The naming rule stays the same: the chosen profile, else the first linked one, else the display name. Hide Cosmo ID still doesn't apply.
- The migration copies each existing `chat_as` choice onto its link's `is_default` before dropping the column, so the choices already made on staging and local carry over.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-cosmo-link`: gains the Default profile requirement, which is Chat as, moved and renamed, with its controls on `/account/profiles`.
- `web-chat`: adds Other profiles in a thread. Chat as is removed, Messages settings shows the read-only line, and Inbox names the partner by their default profile.
- `web-moderation`: Blocked users names each account by its default profile.
- `web-trade-for-you`: Partner identity falls back to the default profile.
- `web-trade-browse`: Posts from lists on Trade falls back the same way.

## Non-goals

- A post from a list filed under a profile keeps naming that profile.
- Want lists don't need a profile to go on Trade. This replaces the dropped `want-list-needs-profile-for-trade` change.
- No thread per profile. A conversation stays between two accounts.
- No prefill of the new-list profile picker from the default.

## Routes

`/account/profiles`, `/account/messages`, `/messages` (the thread's message box), and the offer builder wherever it opens.

## Impact

- `packages/db`: `schema.ts`, with `is_default`, its index and check, and `chat_as` removed. One migration, which needs approval to apply on local and staging. Prod receives it with the branch.
- `packages/api`: `lib/chat-rules.ts` (`chatIdentity`), `lib/trade-rank.ts` (`toPartnerIdentity`), `services/identities.ts`, `services/chat/settings.ts`, `schemas/chat.ts`, `services/cosmo-link.ts` (link, unlink and the new `setDefault`), `services/mod-links.ts`, `services/account-anonymize.ts`, `routers/user.ts` and `schemas/user.ts`, plus a refusal code.
- `apps/web`: `features/link/linked-card.tsx`, `linked-profiles.tsx`, `features/account/sections/messages.tsx`, `features/chat/thread/composer.tsx`, `features/offers/offer-builder.tsx`, the thread header and empty state in `features/chat/thread/`, and `messages/{en,ko,ja}.json`.

## Sequencing

Archive this change before `remove-profile-privacy-settings`, which modifies requirements this one adds.
