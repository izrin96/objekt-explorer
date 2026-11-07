# Tasks

## 1. Schema

- [x] 1.1 In `packages/db/src/schema.ts`, add a nullable `bio: text("bio")` to `userAddress`, beside the banner columns. Run `bun run --filter=@repo/db db:generate` and verify the new migration is a single `ALTER TABLE "user_address" ADD COLUMN "bio" text;`, with nothing dropped or changed. Do not run `db:migrate`: applying it, locally or on production, needs the user's explicit approval. Lint and typecheck `@repo/db` (it has no build script).

## 2. API

- [x] 2.1 In `packages/api/src/schemas/profile.ts`, add `BIO_MAX_LENGTH = 160` and a pure `normalizeBio(text)`: CRLF and CR to LF, drop control characters other than LF and the bidi marks U+202A to U+202E and U+2066 to U+2069, trim each line's end and the whole text, collapse 3 or more LFs to 2, and return `null` when empty (design, Decisions). Add `profile.test.ts` covering each rule, plus the spec's "Blank lines collapse" and "Clear a bio" cases. Verify with `bun test` in `packages/api`. Lint, typecheck and test `@repo/api` (it has no build script).
- [x] 2.2 In `makeEditProfileInputSchema`, add `bio`: `z.string().max(BIO_MAX_LENGTH * 4).nullish()`, transformed by `normalizeBio` (keeping `undefined` as `undefined`), then checked to be at most `BIO_MAX_LENGTH`. In `profile.edit`, pass `bio` into the `.set()`. In `fetchOwnedProfile`, select `bio`. Check that an open tab's input (`{ address, gridColumns, bannerImgUrl, bannerImgType }`, no `bio`) parses with `bio` undefined, and add that as a case in `profile.test.ts`. Verify by reading the `.set()`: an absent `bio` writes nothing. Lint, typecheck and test `@repo/api` (it has no build script).
- [x] 2.3 Add `bio: z.string().nullable().optional()` to `publicProfileSchema`, with a comment that only the profile page's read sets it, as with `reputation`. In `toProfilePage` (`services/profile.ts`), set `bio: profile.bio` only when `shown.user` is set, and leave `toPublicProfile` unchanged. Verify `profile.preview` on local returns no `bio`, and that `getProfile` for a linked profile with a bio returns it (read-only on production). Lint and typecheck `@repo/api` (it has no build script).
- [x] 2.4 In `anonymizeUser` (`services/account/anonymize.ts`), add `bio: null` to the update that clears the banner. Verify by reading the statement. The scrub is never run against production. Lint and typecheck `@repo/api` (it has no build script).

## 3. Web

- [x] 3.1 Load `vercel-react-best-practices`, `frontend-ui-engineering`, `better-writing` and `better-accessibility`. In `EditCosmoDialog` (`features/link/edit-cosmo-dialog.tsx`), add a Bio field after the banner fields and before the unlink note: `Label`, `Textarea` with `maxLength={BIO_MAX_LENGTH}`, the placeholder, a hint, and the `aria-live` counter shown from `BIO_MAX_LENGTH - 30` with `m.chat_counter`, all as in `report-dialog.tsx`. Initialise it from `profile.bio ?? ""` and send `bio` on every save, disabled while saving. Add `profile_edit_bio_label`, `_placeholder` and `_hint` in en, ko and ja (ko 합니다체; ja full-width ？, with 。 where en ends with a period). Verify on local, opening the dialog from both `/@<nickname>` and `/account/profiles`, that the field shows the stored bio, the counter appears near the limit, and a paste stops at 160. After Save, `/@<nickname>` shows the new bio without a reload. If it does not, invalidate the query the page's loader reads, beside `PROFILE_QUERY_KEY`. Check the `profile.edit` request it would send against production read-only. Lint, typecheck and build `web`.
- [x] 3.2 In `ProfileHeader` (`features/profile/profile-header.tsx`), render `profile.bio` when set: a `<p>` under the identity row, spanning the header, with `text-sm text-pretty break-words whitespace-pre-line max-w-prose`, as plain JSX text (no `MessageMarkup`, no linkifier). Verify on local with a bio holding two lines, a URL, `<b>hi</b>`, and a 160-character run with no spaces: lines break as written, nothing is a link or bold, and nothing overflows at 375px or at desktop width. Also check an unlinked address with a stored bio shows none. Lint, typecheck and build `web`.

## 4. Docs

- [x] 4.1 Add a line under `packages/api/AGENTS.md` "Privacy and Trade": `user_address.bio` is set only by the profile page's read, when the profile shows its account, and never by `toPublicProfile`, so the hover card and `/api/v1` don't carry it. `packages/db`, `apps/web` and the root `AGENTS.md` need no change, since no convention, trap or workflow of theirs changes; state that in the task's closing note. Verify `bun run format` leaves the file unchanged. Lint, typecheck and build every touched package (`bun run check` and `bun run build --filter=web`).

## 5. Review fixes

- [x] 5.1 Clear `bio` in the user unlink (`services/account/cosmo-link.ts`) and both branches of the staff move and unlink (`services/moderation/links.ts`), and correct the proposal, design, the `web-profile` delta (A bio leaves with its account) and `packages/api/AGENTS.md`. Verified by reading each `.set()` and by `openspec validate --strict`. Lint, typecheck and test `@repo/api`.
- [x] 5.2 In `EditCosmoDialog`, send `bio` only when it differs from the text the form opened with, so a stale tab cannot write an old bio back. Lint, typecheck and build `web`.
- [x] 5.3 In `normalizeBio`, treat a line of only spaces or invisible fillers as blank, keep ZWJ inside text, and write every hidden code point as a `\u` escape in the source and the test, so no raw bidi mark sits in the file. Verified with `bun test` (14 pass) and a scan for non-ASCII characters in both files (none).

## Workflow follow-up

- The user approves and applies the migration locally, then on production before the web deploy.
- Archive the change with `/opsx:archive` once it ships.
