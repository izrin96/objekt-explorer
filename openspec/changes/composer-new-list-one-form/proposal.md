# Proposal

## Why

In the post composer (`/trade/new`), New have list… and New sale list… open the list page's create form, while New want list… opens a dialog of its own that asks only for a name. All three should open the same form, so making a list looks and works the same whatever the side, and a want list made while posting can get a description and a profile like one made on the list page.

## What Changes

- New want list… opens the list page's create form (`CreateListDialog`), the same one New have list… and New sale list… open, with the type fixed to Want.
- A want list is never bound to a profile, so the form doesn't force binding for it. The profile is the list page's "Show on profile" choice: it defaults to the viewer's first Cosmo profile, and None is offered. The form has no binding switch and no Hide serial for want, as on the list page.
- The want form gains the list page's description field and its title and copy ("Create list", "Once created, it's picked for your post.").
- An empty name no longer disables Create. Create shows the form's "Name is required." error, as it does for have and sale.
- The name-only `NewWantListDialog` and its two messages (`trade_composer_new_want`, `trade_composer_new_want_hint`) are removed.
- Have and sale lists keep everything they do today: type fixed, bound to a profile, no None.

## Non-goals

- No change to which lists can go on Trade, or to the list page's own create form.
- No change to the dropdown items, their labels, or when New have list… and New sale list… are disabled.
- No change to `list.create` or any other server code.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: "New have or sale list form" becomes "New list form" and covers want lists too. "New want list form" is removed.
- `web-lists`: "Trade line in the list form" now names the composer's "New list form" requirement.

## Impact

- `apps/web/src/features/trade/composer/settings.tsx`: the want side opens `CreateListDialog`, and `NewWantListDialog` / `NewWantListForm` are deleted.
- `apps/web/src/features/list/list-form.tsx`: the profile is required only when the fixed type binds (have or sale).
- `apps/web/src/features/list/create-list-dialog.tsx`: the `lockType` doc comment.
- `apps/web/messages/{en,ko,ja}.json`: two messages removed.
- `apps/web/AGENTS.md`: the Post composer paragraph.
- Visible change: a want list made from the composer is now filed under the viewer's first Cosmo profile by default (its Lists tab and `/@<nickname>/list/<slug>`), the same as on the list page, where before it was filed under none. The first profile is the most recently linked one, not the account's default. A Trade post is headed by its lists' profile and falls back to the default profile only when they have none, so a Buy post with such a list is now headed by that profile, not the default one.
