# Proposal

## Why

Users asked for a bio on their profile. Today a profile header shows only the nickname, address, reputation and socials. A trader has no place to say what they collect, how they like to trade, or when they are around, so that text ends up in list notes or chat.

## What Changes

- **A bio on each profile.** Each linked Cosmo profile (each `user_address`) gets its own short bio, stored beside its banner. The owner sets it in the profile edit dialog, the same dialog that sets the banner.
- **Plain text, 160 characters.** Line breaks, blank lines and indentation are kept as typed, for decoration. Markdown is not rendered and URLs are not linked. Clearing the field removes the bio.
- **Shown in the profile header** under the identity block, to every visitor, only while the profile shows its account. An address that no account has linked shows no bio, so every bio has an owner who can be reported.
- **The bio leaves with the account.** Unlinking a profile, a staff unlink or move, and deleting the account each clear its bio, so a bio never shows under an account that did not write it.
- Only the field's label, placeholder and counter are translated (en, ko, ja). The bio text is shown as written.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-profile`: adds the profile bio: editing it, its limit, how it is shown and when it is hidden.
- `web-account`: account deletion also removes the bio of each linked profile.

## Non-goals

- **Staff clearing a bio.** A moderator can act on the account (warn, mute, ban) but cannot remove the bio's text. Adding "Clear bio" to the moderator console is a follow-up.
- **Capturing the bio at report time.** A report from a profile keeps the reason and note only. A bio edited after a report leaves no copy for moderators.
- One bio for the whole account. The bio belongs to the Cosmo profile, like the banner.
- Showing the bio in the hover card, Trade rows, list pages or `/api/v1`.
- Links, mentions, emoji shortcodes or any formatting.
- Clearing the banner on unlink. It stays on the row today, and this change leaves it there.

## Routes

- `/@<nickname>`: the bio in the header, and the Edit dialog that sets it.
- `/account/profiles`: the same Edit dialog, opened from a linked profile's card.

## Impact

- `packages/db`: a nullable `bio` column on `user_address`, added by a new migration.
- `packages/api`: `profile.edit` takes an optional `bio`, and the profile page's read returns it. Bio normalisation is a pure, tested function in `schemas/profile.ts`. Unlink, the staff unlink and move, and `anonymizeUser` clear it.
- `apps/web`: a textarea with a counter in `EditCosmoDialog`, the bio line in `ProfileHeader`, and new messages in `en`, `ko` and `ja`.
