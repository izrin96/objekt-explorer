# Tasks

## 1. Schema and migration (`packages/db`)

- [x] 1.1 In `schema.ts`, add `isDefault` to `userAddress` with `user_address_default_idx` and the `user_address_default_linked` check, and remove `chatAs` from `messagePref`. Run `bun run --filter=@repo/db db:generate -- --name default_profile`, then add the copy `UPDATE` from design decision 6 above the `DROP COLUMN`. Do not apply it. Verify that the SQL adds the column, index and check, copies the choices, and drops `chat_as`, and that lint and typecheck pass for `@repo/db`.

## 2. Server (`packages/api`)

- [x] 2.1 Change `chatIdentity` to pick `isDefault ?? first` (design decision 4), and update `lib/chat-rules.test.ts`: flagged second profile, no flag, no profiles. Verify with `bun test packages/api/src/lib/chat-rules.test.ts`.
- [x] 2.2 Make `loadIdentities` select `isDefault` and drop the `message_pref` join. Remove `chatAs` from `schemas/chat.ts`, `services/chat/settings.ts` and the settings read. Verify typecheck finds no remaining `chatAs`, and that `grep -rn chatAs packages apps` returns nothing.
- [x] 2.3 Set `isDefault: false` in every write that changes `user_id`: the link upsert (values and conflict set), unlink, the staff move and unlink, and the account scrub. Verify by reading each `update(userAddress)` and `insert(userAddress)` that sets `userId` and confirming the flag is set.
- [x] 2.4 Make `toPartnerIdentity` fall back to the non-private default profile (design decision 7), and make `chatIdentity` fill `also` with non-private other profiles (decision 8). `loadIdentities` and the Trade address reads select `privateProfile`. Extend `lib/trade-rank.test.ts` and `lib/chat-rules.test.ts`: no matched profile with a default, with a private default, and with no profile. Verify `bun test` on both.
- [x] 2.5 Add `cosmoLink.setDefault({ address })` (design decision 3), with refusal `cosmo_link_not_yours` in `COSMO_LINK_REFUSALS` and its `api_errors_*` string in en, ko and ja. Add `defaultAddress` (`.nullish()`) to the current user output. Verify that `bun run lint`, `bun run typecheck` and `bun run test` pass for `@repo/api`.

## 3. Web (`apps/web`)

- [x] 3.1 In `linked-profiles.tsx` and `linked-card.tsx`, show the Default badge on the card matching `defaultAddress` and a Make default menu item on the others, only with two or more profiles. Make default calls `cosmoLink.setDefault`, invalidates the current user and shows a toast. Add en, ko and ja messages. Verify in the browser per `browser-testing-with-devtools`, read-only up to the request: the item sends that card's address.
- [x] 3.2 In `features/account/sections/messages.tsx`, replace the Chat as select with "People see you as <name>", taking the name from `defaultAddress` and its profile's nickname, else the display name, and a link to `/account/profiles` with two or more profiles. Remove the `chat_settings_chat_as*` messages. Verify in the browser that `/account/messages` shows the line and no picker.
- [x] 3.3 Add the Sending as line (a shared component reading `defaultAddress` and the current user's profiles, rendered only with two or more) under the message box in `features/chat/thread/composer.tsx` and in `features/offers/offer-builder.tsx`, with a Change link to `/account/profiles`. Add en, ko and ja messages. Verify in the browser that it shows for a two-profile account and not for a one-profile account.
- [x] 3.4 In `features/chat/thread/`, render `also` after the partner name in the thread header, and show the one-time note in an empty thread started from a profile other than the partner's default. Add en, ko and ja messages. Verify in the browser that Message on an alt profile opens a thread headed by the default, with the note.
- [x] 3.5 Verify that `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build --filter=web` pass.

## 4. Docs

- [x] 4.1 Add one line to `packages/api/AGENTS.md` under Cosmo links: every write that changes `user_address.user_id` clears `is_default`. Verify the line is there, and that no `AGENTS.md` still names Chat as (`grep -rn "Chat as\|chatAs" --include=AGENTS.md .`).

## Workflow follow-up

- With approval, apply the migration to local, then staging.
- Archive after review.
