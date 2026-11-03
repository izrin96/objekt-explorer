# Tasks

## 1. List form: profile optional for a fixed want type

- [x] 1.1 In `apps/web/src/features/list/list-form.tsx`, pass `ProfileField` `required={lockBind && bindable}`, and update `lockBind`'s doc comment to say the type is fixed and the list is bound only when that type binds. Update the `lockType` doc comment in `create-list-dialog.tsx` to match. Verify: `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web` pass.

## 2. Composer: one dialog for every side

- [x] 2.1 In `apps/web/src/features/trade/composer/settings.tsx`, render a single `CreateListDialog` with `open={newList.open}`, `initial={{ ...EMPTY_DRAFT, listType: newList.slot, isProfileBind: isBindable(newList.slot) }}`, `lockType`, `onCreated={(slug) => pick(newList.slot, slug)}` and `finalFocus={newListOpener}`. Import `isBindable` from `@/features/list/list-draft`. Delete `bindSlot`, `NewWantListDialog`, `NewWantListForm`, and the imports only they used (`useCreateList`, `Input`, and any `Dialog*` parts left unused). Verify: lint, typecheck and build for `web` pass, and `grep -rn "NewWantList\|bindSlot" apps/web/src` finds nothing.
- [x] 2.2 Remove `trade_composer_new_want` and `trade_composer_new_want_hint` from `apps/web/messages/en.json`, `ko.json` and `ja.json`. Verify: `bun run paraglide:compile` in `apps/web`, then `grep -rn "trade_composer_new_want\b\|trade_composer_new_want_hint" apps/web/src apps/web/messages` finds nothing, and lint, typecheck and build for `web` pass.

## 3. Browser check (local dev server, signed in; read-only against production)

- [x] 3.1 On `/trade/new`, pick Buy and choose New want list…. Check that the dialog shows "Create list" with "Once created, it's picked for your post.", the type is shown as Want and can't be changed, there's a description field, "Show on profile" defaults to the first Cosmo profile and offers None, and there's no binding switch and no Hide serial. Activate Create with an empty name and check that the name field shows "Name is required." and nothing is sent. Fill a name and stop at the request boundary: the `list.create` input has `listType: "want"`, `isProfileBind: false` and the chosen `profileAddress`. Do the same for New have list… and New sale list…, and check they still show the type locked, the profile with no None, and currency for sale. Close each dialog and check that focus returns to its dropdown. Record the result as "read-only verified". A real create goes to the local database (`.env.local`) and only with the user's approval; with it, check that the want list appears in that profile's Lists tab at `/@<nickname>/list/<slug>`.

## 4. Docs

- [x] 4.1 In `apps/web/AGENTS.md` (Post composer), replace "have and sale open `CreateListDialog` with `lockType` (type fixed, bound to a profile) and `onCreated`, which picks the list instead of offering Post it, and want opens a name-only dialog" with a sentence saying every side opens `CreateListDialog` with `lockType` (type fixed; have and sale bound to a profile with no None, want unbound with the profile optional) and `onCreated`. No other `AGENTS.md` changes. Verify: the paragraph no longer mentions a name-only dialog, and lint, typecheck and build for `web` pass.

## Workflow follow-up

- Archive with `/opsx:archive` once applied and checked. The archive renames "New have or sale list form" to "New list form" in `web-trade-browse` and updates the matching reference in `web-lists`.
