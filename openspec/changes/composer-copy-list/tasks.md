## 1. Copy draft rule

- [x] 1.1 Move `toCopyDraft` out of `features/list/copy-list-dialog.tsx` into `features/list/copy-draft.ts` as `toCopyDraft(list, { fixedType?, profiles })` (design decision 1), and point `CopyListForm` at it with no `fixedType`. Add `copy-draft.test.ts` with these cases:
  - no `fixedType` gives the same draft as today;
  - want → want keeps Open to;
  - have → sale is bound to the source's profile and carries no currency;
  - sale → sale carries the currency;
  - general unbound → have falls back to the first profile;
  - sale → want resets Open to;
  - a source whose profile the viewer no longer has falls back to the first profile.

  Verify `bun test apps/web/src/features/list/copy-draft.test.ts` passes, and lint and typecheck pass for `web`.

## 2. Copy form for the composer

- [x] 2.1 Change `useCopyList` to take an optional `onCreated(slug)`, called after the invalidation instead of navigating (design decision 3). Export `CopyListForm` with `fixedType` (passed as `lockBind` and into `toCopyDraft`), `onCreated` and `bare` (design decision 2). Verify that Copy as new list on `/list` still opens the new list: a browser check on the local database, which records the request and the landing URL (browser-use rules below). Lint, typecheck and build must pass for `web`.
  - Revised after review: `useCopyList({ opensCopy })` only decides the navigation, `CopyListForm` calls `onCreated` in `mutate`'s per-call `onSuccess`, and `bare` is gone (design decisions 2 and 3).
- [x] 2.2 Add `features/trade/composer/copy-list-dialog.tsx` with `ComposerCopyDialog` (design decision 4): its own header, the Copy from `Select` over `useUserLists()` with `ListTypeBadge` outside the keyed subtree, the source loaded with `listFindOptions`, `CopyListForm bare key={slug} fixedType={slot} onCreated`, a disabled Create until the source is loaded, and a reset on close. Add the `trade_composer_copy_from*` messages in en, ko and ja (design decision 6). Verify lint, typecheck and build pass for `web`, and that keyboard focus stays on Copy from after a pick.

## 3. Composer dropdowns

- [x] 3.1 In `features/trade/composer/settings.tsx`, add the `COPY` item, labelled `trade_composer_copy_list`, to `ListSelect`. Render the item only when the viewer owns a list, disable it under `needsProfile`, and give `ListSelect` the `onCopy(trigger)` prop. Add `copyList: { slot, open }` state, the opener ref and one `ComposerCopyDialog` to `ComposerSettings`, with `onCreated={(slug) => pick(slot, slug)}` (design decision 5). Add the `trade_composer_copy_list` message in en, ko and ja. Verify lint, typecheck and build pass for `web`.
- [x] 3.2 Browser check on `/trade/new` against the local database (`.env.local`, never production), at 1280 px and 390 px. Check each scenario in `specs/web-trade-browse/spec.md`:
  - Sell what a Swap post holds;
  - Edit post;
  - Cancel, with focus back on the dropdown;
  - No lists;
  - No Cosmo profile;
  - Type fixed to the side;
  - Carry-over hint;
  - Changing the source;
  - the `web-lists` "Copied from the composer" scenario.

  Check Refused at the request boundary only. Record what was checked and on which database.

  - Checked 2026-11-04 on the local database and local Valkey (`.env.local`, dev server on :3200), signed in as the local copy of the owner's account. Sell what a Swap post holds (have 3 → sale, USD, picked, "have 3" still in its Swap post), Copied from the composer (stayed on `/trade/new`), Edit post (copy of "want 3" picked on Wants of the Buy post and saved in place of "want test 2", then the post restored), Cancel and Escape (focus back on the dropdown, pick unchanged), Type fixed, Carry-over hint, Changing the source, and New sale list… (picked after the reason-`"none"` guard), at 1280 px and 390 px.
  - Refused: checked at the boundary through validation only (an empty currency sends no `list.copy`, keeps the dialog and its input, and leaves the pick); a server refusal goes through `useCopyList`'s `onError` toast, and `onCreated` runs only in the per-call `onSuccess`.
  - Rechecked 2026-11-04 after review fixes (pick in the per-call `onSuccess`, `useCopyList({ opensCopy })`, no `bare`, the reason-`"none"` guard keyed to a key press): typing `h` on the closed Selling for dropdown picks "have 3 (copy)" and the preview follows; New sale list… and Copy a list… keep the new list picked; a `list.copy` held in flight (CDP `Fetch` pause), then Cancel, then released: the server created the copy and the side's pick did not change; Copy as new list on `/list` still lands on the new list. Same database and server.
  - Skipped: No lists and No Cosmo profile, since no signed-in local session without lists or without a profile exists.

Browser checks (2.1, 3.2) use the `browser-use` CLI against the automation Chrome (`BU_CDP_URL`, port 9333) in a tab of their own, opened and driven by target id. Before submitting the login form, wait for the page to hydrate. The dev server must run against `.env.local`'s local database. Put these rules in any brief that hands a check to another agent.

## 4. Wrap-up

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Review `apps/web/AGENTS.md` and the root `AGENTS.md` for conventions this change alters. Expected: none, since the change reuses the New list pattern. Either update the file or state in the change's final report that none changed.

## Workflow follow-up

- After review, `/opsx:archive` merges the two spec deltas into `openspec/specs/web-trade-browse` and `openspec/specs/web-lists`.
