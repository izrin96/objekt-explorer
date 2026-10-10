## Why

A have, want or sale list has two switches that pull on each other: Discoverable (Show on Market on a sale list) puts it into matching and Market, and Show on Trade posts it in Browse but always turns Discoverable on too. Three labels for two flags confuse owners. One switch per list, doing everything that list type can do on Trade, is simpler.

## What Changes

- A have or want list gets one switch, **Show on Trade**: on puts the list in Trade › Browse and in matching (For you, want alerts, the offer picker). A have list still needs Bind to Profile; a want list does not.
- A sale list gets one switch, **Show on Market**: on puts it on Market, in Trade › Browse and in matching. It still needs Bind to Profile.
- The separate Discoverable switch is removed from the list form. The Trade › Post a list dialog's switch becomes the same switch.
- Browse and the separate switch are not in production yet; production only has Discoverable. Lists already discoverable there appear in Browse when it launches, with their bump time taken from their last change, so a list untouched for 30 days starts idle until bumped or edited. "Matched but not posted" and "Market only" are not offered.
- Linking a have and a want list turns the partner's switch on when the link is made, as today; saving either list later no longer turns its partner back on.
- The switch's description names everything it turns on.
- The `show_on_trade` column, added by a migration on this branch that production has not run, is dropped again by a new migration in the same batch. Production tabs keep working: they already send only Discoverable.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-lists`: Manage lists names the one switch; Show on Trade becomes the single per-list switch (Show on Market on a sale list), with the linked-list rule changed to "when the link is made".
- `web-trade-browse`: posts come from lists with the switch on; a list with the switch off is out of matching too; Post a list toggles the same switch.

For you, want alerts, the offer picker and Market already read the flag this switch sets, so their specs keep their behaviour; their word "discoverable" now names this switch.

## Non-goals

- Public/private lists (who may open a list page or see it on a profile). That is a later change; this one leaves list pages as visible as they are today.
- Changing bump, idle or ownership rules for Browse posts.
- Any change to which lists can take part (want any time, have and sale only while bound).

## Routes

`/list` (create and edit dialogs), `/list/$slug` (On Trade badge), `/trade` (Browse and the Post a list dialog), `/trade/for-you`, `/market`, and the public `GET /api/v1/lists/{slug}`.

## Impact

- `packages/db`: a new migration drops `show_on_trade`, its check and its feed index, adds the feed index on `discoverable`, and backfills `bumped_at`.
- `packages/api`: list create/update, the Post a list toggle, the Browse feed and the bump rule read and write `discoverable` only; `showOnTrade` leaves the list schemas.
- `apps/web`: list form, edit dialog, Post a list dialog, list header badge, and en/ja/ko messages.
- Ship order: unchanged in shape. The new migration joins the pending additive batch run before deploy; the held-back `drop_hide_user` stays the only post-deploy step.
