## Context

- **Account dialog:** `AccountDialog` (`features/account/account-dialog/index.tsx`) is a Base UI dialog with seven tab panels. Each panel is already its own component: `general`, `notifications`, `messages`, `blocked`, `linked-accounts`, `password`, `danger`. Only General is a form with its own submit; the rest save on change.
- **Settings dialog:** the separate device Settings dialog serves signed-in and signed-out visitors alike.
- **`/link`:** a card grid of linked profiles with objekt previews, loaded in its route loader. `/link/connect` is the link flow.
- **Unlinking** sets `user_address.user_id` to null and keeps the row. Linking again keeps the row's `id`, so `user_address.id` order is link order.
- **Chat naming:** `chatIdentity(accountName, addresses)` names an account by its first address whose nickname is not hidden. It is called from `fetchPartners` (conversations, offers, trades, blocked list, mod queue) and from `offer-notes`. Both load the same address rows separately.

## Goals / Non-Goals

**Goals:**
- Sections reach the page unchanged in behaviour.
- Chat as is resolved on read, so unlinking needs no cleanup.

**Non-Goals:**
- For you and Browse name partners by the profile of the matching list (`toPartnerIdentity`). Chat as does not change that.

## Decisions

1. **The route is `/account`, not `/settings`.** "Settings" already names the device dialog, which signed-out visitors need, so it cannot move behind a login. Calling both Settings would put two different things under one word in the same menu.

2. **The route tree is `routes/(container)/account/`:**
   - `route.tsx` is the layout. Its `beforeLoad` redirects to `/login?redirect=<href>`, the pattern `/link` and `/messages` already use.
   - Only `/account/profiles` has a loader, so only it has a `pendingComponent`.
   - **Password** is `ssr: false`: the account list comes from the auth client, which only has the session in the browser.
   - The children are `index.tsx`, `general.tsx`, `profiles.tsx`, `notifications.tsx`, `messages.tsx`, `blocked.tsx`, `sign-in.tsx`, `password.tsx` and `danger.tsx`.
   - The spec names `/account` as General. A phone also needs a General entry in the list, so `/account/general` exists too, rendering the same section, and the menu marks General on both.
   - **Phone vs desktop:** a server render cannot know the viewport, so the index renders both views and CSS picks one:
     - below `md`, the section list (`md:hidden`);
     - from `md` up, General (`hidden md:block`).
   - The layout's side menu is `hidden md:block`. Every other child shows a back link to `/account`, styled `md:hidden`.
   - The alternative, redirecting `/account` to `/account/general` on desktop, would need a client-only viewport check and a flash.

3. **The side menu is a `<nav>` of TanStack `Link`s using `activeProps`**, which also sets `aria-current="page"`.
   - `TradeTabs` (horizontal Base UI `Tabs` styled as links) was considered. Tabs bring roving focus and arrow-key semantics meant for panels in one document, not for page links in a vertical list.
   - The phone section list reuses the same item array, rendered as full-width rows.

4. **Sections move from `features/account/account-dialog/` to `features/account/sections/`, unchanged.**
   - Each route wraps its section in a small heading, using the section's existing label message.
   - `SectionStatus` moves along for the Sign-in loading state.
   - The dialog shell (`index.tsx`) and its `useState` in `user-menu.tsx` are deleted.

5. **Password route:** its `beforeLoad` reads `accountsOptions` and throws `notFound()` when no `credential` account exists. The menu hides the entry using the same query.

6. **Profiles:** the body of the `/link` page moves into `features/link/linked-profiles.tsx`, and `/account/profiles` renders it with the same preview loader.
   - The grid becomes `sm:grid-cols-2`, since the content column is narrower beside the menu.
   - `/link/index.tsx` keeps only `beforeLoad: () => { throw redirect({ to: "/account/profiles" }) }`. A signed-out visitor then lands on `/login?redirect=/account/profiles` through the account layout.
   - Five in-app links switch to `/account/profiles`: the offer builder ×2, the attach dialog, the message button and the edit dialog.
   - **Primary nav:** My Cosmo's `to` becomes `/account/profiles`. Its active check also matches `/link/*`, so the link flow keeps it marked.

7. **Chat as storage:** `message_pref.chat_as citext(42)`, nullable, with no foreign key.
   - **Valid only while linked:** a stored address counts only while `user_address.user_id` still equals the owner. An unlinked or re-assigned address is then ignored without any write.
   - **Why no foreign key:** one to `user_address.address` would not catch the address moving to another account.

8. **One identity loader.** A new `loadIdentities(userIds)` in `services/identities.ts` replaces the two copies of the address query. It lives in its own module because `offer-notes` is shared with the worker and must not pull in `services/chat.ts`.
   - **Queries:** users, linked addresses ordered by `user_address.id`, and `message_pref.chat_as` for those users.
   - **Naming:** `chatIdentity(accountName, addresses, chatAs)` picks the address equal to `chatAs`, else the first address. Its name is the nickname, else the shortened address. With no addresses, it uses the account name. Hide nickname is no longer read.
   - **Callers:** `fetchPartners` and `offer-notes` both call the loader.
   - **Tests:** `chat-rules.test.ts` cases change to the new rule.

9. **Settings API:**
   - `messageSettingsSchema` gains `chatAs: z.string().nullable()`; `setSettingsInputSchema` stays `.partial()`, so an old tab sending `{ allow }` still validates.
   - **Write:** `setSettings` upserts both fields. A `chatAs` the caller has not linked is refused with `BAD_REQUEST`, and nothing is written.
   - **Read:** a new `fetchSettings` returns `allow` plus the resolved address (stored if still linked, else the first linked), or null when there are no profiles. The radio group therefore always shows what partners actually see. `fetchPref` stays as it is for the message gates.
   - **Shape:** `MESSAGE_PREF_DEFAULTS` stays `{ allow: "anyone" }`, and `chatAs` defaults to null.

10. **Chat as UI** sits in the Messages section, below "Who can message you". It is a `RadioGroup` of `useUserProfiles()` showing each profile's nickname and shortened address, and it saves on change with the same optimistic mutation. It is hidden when there are no profiles.

11. **Ways in:**
    - The bell popover gets a footer link to `/account/notifications` that closes the popover.
    - The `/messages` header gets a ghost icon button (`GearIcon`, labelled `m.chat_settings_open()`) linking to `/account/messages`.
    - The user menu's Account item becomes `render={<Link to="/account" />}`.

12. **Strings:**
    - **Reused:** existing labels for section names (`auth_account_general`, `notification_section`, `chat_settings_tab`, `mod_blocked_tab`, `auth_account_social_link`, `auth_account_change_password`, `auth_account_danger_zone`, `link_my_cosmo`).
    - **New, in en/ja/ko:** the page title and description, a back label, Chat as with its description, the bell's settings link and the Messages settings button.

## Risks / Trade-offs

- **[The index renders both the section list and General]** → General mounts on a phone without being shown. Its queries are already cached from the session, so the cost is small. This is also what keeps the page correct when first rendered on the server.
- **[A user can change Chat as often]** → Every past conversation renames. The proposal accepts this. It needs no rate limit: the field is a choice among the user's own linked profiles.
- **[Old tabs with the dialog open]** → They keep working, because the API change is additive. Their dialog disappears on the next load.
- **[`/link` bookmarks and external links]** → Kept working by the redirect.

## Migration Plan

- **The migration:** one additive migration, `ALTER TABLE message_pref ADD COLUMN chat_as citext`. Apply it to the local database only during development.
- **At ship:** it is safe to run before the deploy, because old code never selects the new column.
- **The Hide User drop:** Drizzle v1 picks the migrations to run by name, not by timestamp order (`getMigrationsToRun`). The earlier `drop_hide_user` migration can therefore still be held back and applied after the deploy, even though this migration's timestamp comes later.
- **Rollback:** revert the web deploy. The extra column is harmless if left in place.
