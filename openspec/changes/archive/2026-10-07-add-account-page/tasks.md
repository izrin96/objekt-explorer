## 1. Chat as data and API

- [x] 1.1 Add nullable `chatAs: citext("chat_as", { length: 42 })` to `messagePref` in `packages/db/src/schema.ts`. Run `bun run --filter=@repo/db db:generate --name chat_as` and check the SQL is a single `ADD COLUMN`. Apply it with `db:migrate` only after printing the resolved `DATABASE_URL` host and confirming it is `localhost` (production is never touched). Verify: `information_schema.columns` lists `message_pref.chat_as` locally, and `@repo/db` lint, typecheck and build pass.
- [x] 1.2 Change `chatIdentity(accountName, addresses, chatAs)` in `packages/api/src/lib/chat-rules.ts`:
  - **Choosing the address:** the address equal to `chatAs`, else the first address.
  - **The name:** that address's nickname, else its shortened address. With no addresses, the account name.
  - Hide nickname is no longer read.

  Update `chat-rules.test.ts` to cover: chosen, chosen but no longer linked, hidden nickname, no nickname, and no addresses. Verify: `bun run --filter=@repo/api test` passes.
- [x] 1.3 Add `loadIdentities(userIds)` to `services/chat.ts`. It reads users, linked addresses ordered by `user_address.id`, and `message_pref.chat_as`. Make `fetchPartners` and `offer-notes` use it, removing their copies of the address query. Verify: `@repo/api` typecheck and tests pass, and `git grep -n "hideNickname" packages/api/src/services/offer-notes.ts` is empty.
- [x] 1.4 Extend the chat settings API:
  - **Schema:** `messageSettingsSchema` gains `chatAs: z.string().nullable()`; `setSettingsInputSchema` stays partial.
  - **Read:** `fetchPref` returns the resolved address: the stored one while it is still linked to the user, else the first linked, else null.
  - **Write:** `setSettings` upserts `allow` and/or `chatAs`. A `chatAs` not linked to the caller is refused with `BAD_REQUEST` and nothing is written.

  Verify:
  - `@repo/api` lint, typecheck and tests pass;
  - a local call with `{ allow: "anyone" }` alone still succeeds;
  - a `chatAs` linked to another account is refused (read-only verified at the request boundary when it would write to a shared account).

## 2. Account page shell

- [x] 2.1 Move `features/account/account-dialog/{general,notifications,messages,blocked,linked-accounts,password,danger}.tsx` to `features/account/sections/`, and `SectionStatus` with them. Do not delete the dialog yet. Verify: `web` typecheck passes and `git grep account-dialog/` lists only `index.tsx` and `user-menu.tsx`.
- [x] 2.2 Add `routes/(container)/account/route.tsx`:
  - **Sign-in:** `beforeLoad` redirects to `/login?redirect=<href>`.
  - **Header:** a `PageHeader`.
  - **Section menu:** a `hidden md:block` nav of `Link`s with `activeProps`, built from one shared item array. Password is shown only with a `credential` account.
  - **Content:** an `<Outlet />` beside the menu.

  Invoke `router-core`, `tanstack-router-best-practices` and `baseline-ui` first. Verify: `web` lint, typecheck and build pass, and a signed-out `curl -I localhost:3200/account/messages` redirects to `/login?redirect=%2Faccount%2Fmessages`.
- [x] 2.3 Add the child routes:
  - `index.tsx`: the section list `md:hidden`, plus General `hidden md:block`;
  - `general.tsx`, `notifications.tsx`, `messages.tsx`, `blocked.tsx`, `sign-in.tsx`, `danger.tsx`;
  - `password.tsx`, which throws `notFound()` without a `credential` account.

  Each child has a section heading, a `md:hidden` back link to `/account`, and its page title through `generateMetadata`. `/account/profiles`, the only one with a loader, has a `pendingComponent`. Verify:
  - `web` build passes;
  - in the browser at 1280px, each URL opens its section with the menu item marked (`aria-current="page"`), and a reload keeps it;
  - at 375px, `/account` shows only the list and each row opens its section with a working back link.
- [x] 2.4 Move the `/link` page body into `features/link/linked-profiles.tsx` and render it at `/account/profiles` with the same preview loader (grid `sm:grid-cols-2`). Turn `routes/(container)/link/index.tsx` into a redirect to `/account/profiles`. Verify:
  - signed in, `/link` lands on `/account/profiles` with the cards;
  - signed out, `/link` lands on `/login?redirect=/account/profiles`;
  - `/link/connect` still loads;
  - `web` build passes.

## 3. Chat as UI and the ways in

- [x] 3.1 In `features/account/sections/messages.tsx`, add a Chat as `RadioGroup` over `useUserProfiles()`: each profile's nickname and shortened address, with the selected value from `settings.data.chatAs`. It saves on change through the existing optimistic mutation and is hidden without profiles. Invoke `baseline-ui` and `better-accessibility` first. Verify: picking a second profile locally makes the other test account's `/messages` row show that nickname after reload, and `web` lint and typecheck pass.
- [x] 3.2 Point the ways in at the page:
  - the user menu's Account item becomes a `Link` to `/account`, and the `AccountDialog` state is removed;
  - My Cosmo's manage item and the primary nav's My Cosmo point at `/account/profiles`, and the nav also stays active on `/link/*`;
  - the offer builder ×2, attach dialog, message button and edit dialog links point at `/account/profiles`;
  - the bell popover gets a footer link to `/account/notifications` that closes it;
  - the `/messages` header gets a ghost `GearIcon` button to `/account/messages`.

  Verify: `git grep -n '"/link"' apps/web/src` lists only the redirect route, each entry lands on its URL in the browser, and `web` build passes.
- [x] 3.3 Delete `features/account/account-dialog/`. Add the new en/ja/ko messages: page title and description, back label, `chat_settings_chat_as` and its description, `notification_settings_link`, and `chat_settings_open`. Verify: `git grep -n "AccountDialog\|account-dialog" apps/web/src` is empty, and `web` lint, typecheck (which compiles Paraglide) and build pass.

## 4. Specs and checks

- [x] 4.1 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build --filter=web` from the root, and `openspec validate add-account-page --strict`. Verify: all pass, with 0 lint warnings.
- [x] 4.2 Browser pass:
  - signed out: `/account` and `/link` redirect to login;
  - signed in at 1280px and 375px: every section opens, General saves a name, the Notifications switches save, Chat as saves, Blocked users lists, and Sign-in, Password and Danger render.

  Writes go only to the local database; any action that would touch production is verified read-only at the request boundary. Verify: no console errors, and every scenario in this change's spec deltas is observed.
