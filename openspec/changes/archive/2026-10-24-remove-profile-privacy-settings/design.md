# Design

## Context

The four settings live on `user_address` and are read in two ways:
- **Through `services/privacy.ts`:** `isProfileHidden` and `isAddressHiddenFromCaller`, the latter optionally also checking `hideTransfer`.
- **Directly:**
  - holders (all four);
  - list owners and Market sellers (`hideNickname`);
  - Serial Lookup (`collection.ts`, `privateSerial`);
  - the offer collection path (`getCopyHolders`, `collectionAskAllowed`, `offer-rules.ts`);
  - chat start and cards;
  - compare, owned, pins, locked objekts and transfers;
  - `packages/lib/src/server/user.ts`.

The web shows the results through `profile-guard.tsx`, `isGuard` on `publicProfileSchema`, the drawer's private serial notice, the holders "Private collector" row, and the Activity History hidden notice.

`lists.hide_serial` is a separate, per-list setting. Some of the same offer code reads both it and `private_serial`, through different inputs.

## Goals / Non-Goals

**Goals:** remove every read of the four columns, remove the UI that depended on them, and keep `/rpc` inputs valid for open tabs.

**Non-Goals:** dropping the columns. They leave `schema.ts`, through a migration whose snapshot drops them and whose SQL does nothing (`20261024135516_retire_privacy_columns`), and stay in the database until a later, approved drop.

## Decisions

1. **Delete `services/privacy.ts` and inline "visible".** Every caller of `isProfileHidden` or `isAddressHiddenFromCaller` takes the visible branch, and dead branches are removed rather than left behind a constant `false`. This leaves no half-alive privacy layer for a later change to switch back on by accident.

2. **Offer code: remove only the address path.**
   - `getCopyHolders` (the hidden-serial addresses) and the `privateSerial` / `privateProfile` facts in `collectionAskAllowed` and `offer-rules.ts` go.
   - The list-level path (`hideSerial` on entries, "any copy" only, the counting rules) stays untouched.
   - Tests in `offer-rules.test.ts` that cover the list-level path must keep passing unchanged. Tests that cover the address path are rewritten to expect visibility.

3. **`/rpc` compatibility.**
   - `profile.update` keeps `hideNickname`, `privateSerial`, `hideTransfer` and `privateProfile` in its input as optional fields and ignores them. An open tab's edit dialog then saves its banner and grid, and its toggles do nothing.
   - Profile outputs keep these fields, always `false`, and `isGuard` is never `true`. Any open tab therefore renders the public view.
   - The fields come out of the schemas in the column-drop change.

4. **`/api/v1`.** Responses only gain data: no field is removed, and guarded or private shapes stop appearing. The REMOVED requirement's migration note says what callers now receive.

5. **Write nothing to the columns.** The dialog stops sending the fields, and the server ignores them. The stored values sit unused until the drop, so rolling back the code brings back every user's previous choice.

6. **`packages/api/AGENTS.md`.**
   - Privacy and Trade: replace the `private_profile` / `private_serial` paragraph with one line, in the shape of the `hide_user` line: the four columns are retired and stay until their drop migration.
   - Offer get sources: remove the visible-address and hidden-serial-address sentences, and keep the list-scope rules.

7. **Notice on `/account/profiles`.** A dismissible note at the top of the page says the privacy settings were removed, because Trade needs holdings and serials visible and they are public on chain anyway. It shows to every signed-in viewer of the page, not only those who had a setting on, so nothing reads the retired columns. Dismissal is kept per browser (`localStorage`, wrapped in try/catch); the note goes in the column-drop change. It reuses the vendored `Alert` with a close button.

## Risks / Trade-offs

- **Users who chose privacy are exposed.** The product owner chose a notice on `/account/profiles` (decision 7) over a notification or nothing. It reaches only people who open that page. The data is public on chain either way, but the site made a promise in the UI.
- **Rollback is clean** because the columns keep their values (decision 5).
- **The list hide-serial path could regress.** Mitigation: decision 2's test rule, plus a browser check of an offer against a hide-serial list.

## Migration Plan

Deploy the code. No migration runs. A later change drops the four columns once production runs this code.

## Open Questions

None. The reason and the notice were decided on 2026-10-24.
