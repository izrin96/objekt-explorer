# Design

## Context

A profile is a `user_address` row. The banner and grid columns live on that row, and `profile.edit` writes them. `EditCosmoDialog` (`features/link/edit-cosmo-dialog.tsx`) loads the row through `profile.find`, which calls `fetchOwnedProfile`. That function selects named columns, so a new column is not returned until it is added there. The profile page reads through the `getProfile` server function, then `fetchUserByIdentifier` and `toProfilePage`. `toPublicProfile` builds the shape that the hover card (`profile.preview`, also on `/api/v1`) shares with the page. `toProfilePage` adds the page-only fields, `userId`, `reputation` and `messageable`, on top of it.

A tab loaded before the deploy keeps calling `profile.edit` with `{ address, gridColumns, bannerImgUrl, bannerImgType }` (see `packages/api/AGENTS.md`, `/rpc` stays compatible).

## Goals / Non-Goals

**Goals:**
- The bio reaches the profile page and the edit dialog only.
- An old tab's save never changes a bio.
- One normalisation rule, run on the server and tested.

**Non-Goals:**
- Anything that needs a second copy of the bio: report snapshots, the moderator console, the hover card.

## Decisions

**A nullable `bio text` column on `user_address`.** The bio belongs to the Cosmo profile, as the banner does, so a second linked profile can say something else. Putting it on `user` would show one text on every profile of the account. The column is `text`, and the length is checked in Zod, as `lists.description` does. A database `CHECK` would count characters differently from the browser's `maxLength` and would make a later limit change a migration.

**`bio` in `makeEditProfileInputSchema` is `.nullish()`, passed through `normalizeUserText`.** `undefined` keeps the stored bio: Drizzle leaves an `undefined` key out of `.set()`, the rule `bannerImgUrl` already follows. `null` or a string that normalises to empty clears it. An open tab sends no `bio` and so still validates to data that leaves the bio as it is. A `.default(null)` would make that tab's banner save wipe the bio. The dialog sends `bio` only when the field differs from the text it opened with, so a save from a tab holding a stale copy (a banner change, say) cannot write that copy back over a bio saved from another tab.

**`normalizeUserText` lives in `packages/api/src/schemas/common/user-text.ts`, with its test, and list descriptions use it too; `BIO_MAX_LENGTH = 160` stays in `schemas/profile.ts`.** The web imports both from `schemas/` (the Vite rule allows only `schemas/` and `constants.ts`). The function:
- turns CRLF, CR and the line and paragraph separators (U+2028, U+2029) into LF;
- drops control characters other than LF, and the text-direction marks (embedding, override and isolate U+202A to U+202E and U+2066 to U+2069, and the implicit LRM U+200E, RLM U+200F and ALM U+061C), which can make a bio read as someone else's text;
- turns a tab into a space;
- trims each line's end, and drops blank lines at the very start and end;
- returns `null` when what is left is only spaces, default-ignorable code points (zero-width marks, Hangul fillers, tag characters, variation selectors, the soft hyphen) or the blank Braille cell, so nothing shows as an empty block.

It removes only what is unsafe or invisible. Indentation, the first line's included, runs of blank lines and rows of fillers stay, since owners decorate with them (K-pop profiles space with the blank Braille cell U+2800 and the Hangul filler U+3164 where plain spaces collapse); the header renders with `whitespace-pre-wrap` so they show. Padding is limited only by length: a bio of one character, 158 line breaks and another character is valid and renders about 159 lines tall, since the profile header has no line limit, and the list page header shows a description of up to 5000 characters in full. Trade clips a description to 8 lines. ZWJ inside text stays, since emoji sequences need it.

Zod runs it as a transform, then checks the result against `BIO_MAX_LENGTH`. Before the transform, the raw input is capped at `BIO_MAX_LENGTH * 4`, so a huge body is refused before any work. Both the browser and Zod count length in UTF-16 code units, so the field's limit and the server's agree.

**The page read adds `bio` in `toProfilePage`, only when `shown.user` is set.** It joins `publicProfileSchema` as `bio: z.string().nullable().optional()`, documented as set by the profile page's read only, like `reputation`. `toPublicProfile` does not carry it, so the hover card, linked previews and `/api/v1` gain nothing. Gating on `shown.user` hides the bio of an address no account holds. Such a bio would have nobody to answer for it, and the profile's Report needs `userId`.

**Every write that takes an address off an account clears its bio.** The bio is the account's words, so it leaves with the account: user unlink (`cosmo-link.ts`), staff unlink and staff move (`moderation/links.ts`), and `anonymizeUser`, each as one more key in the `.set()` it already makes. Clearing only on deletion would leave a bio that was unlinked first and then outlived its account, to show under whoever links the address next. The banner keeps today's behaviour; it is not this change's to fix.

**UI reuses the report dialog's note field.** It uses `Label`, `Textarea` with `maxLength={BIO_MAX_LENGTH}`, and the `aria-live` counter that stays silent until the text nears the limit (`m.chat_counter`), as `report-dialog.tsx` does. It sits after the banner fields and before the unlink note. In `ProfileHeader` the bio renders as a `<p>` under the identity row, spanning the header's width, with `text-sm text-pretty break-words whitespace-pre-line` and a readable measure (`max-w-prose`). It is plain JSX text, so React escapes it. There is no `MessageMarkup` and no linkifier. Nothing new is added to the vendored kit.

**Messages:** `profile_edit_bio_label`, `profile_edit_bio_placeholder` and `profile_edit_bio_hint` in `en`, `ko` and `ja`. The counter reuses `chat_counter`. The header needs no message, because the bio is the user's own text.

## Risks / Trade-offs

- [A bio carries a scam link or abuse, and staff cannot remove it] → Report from the profile still works, and a ban or mute acts on the account. "Clear bio" in the console is the named follow-up (proposal, Non-goals).
- [A bio edited after a report leaves no evidence] → The reporter's 500-character note can quote it. A snapshot is a follow-up.
- [An owner who unlinks and links the same profile again loses its bio] → It is short and theirs to type again; keeping it would show the old holder's words under any other account that links next.
- [A bio returned to the owner by `profile.find` differs from the stored one] → Both read the same column and normalisation runs only on write. The dialog shows the stored text.

## Migration Plan

1. `bun run --filter=@repo/db db:generate` writes an `ADD COLUMN "bio" text` migration (additive and nullable, so it is safe while `main` still runs).
2. Applying it (`db:migrate`) waits for the user's explicit approval, locally and on production. It runs before the web deploy that reads the column.
3. Rollback: the old web ignores the column. Dropping it later is a separate, approved migration.
