# Tasks

Before starting: `default-profile-setting` is archived (done), and the design's open questions are answered (done 2026-10-24).

## 1. Server (`packages/api`, `packages/lib`)

- [x] 1.1 Remove every read of `privateProfile` and `hideTransfer`, and delete `services/privacy.ts`. That covers profile, pins, locked objekts, owned, transfers, compare, chat start and cards, list, and holders. Verify that `grep -rn "privateProfile\|hideTransfer\|isProfileHidden\|isAddressHiddenFromCaller" packages/api/src packages/lib/src` matches only the `profile.update` input and the output schemas (design decision 3), and that typecheck passes.
- [x] 1.2 Remove every read of `hideNickname`: `packages/lib/src/server/user.ts`, holders, list owners, the Market router and profile. Verify by grepping as in 1.1, and run `bun test` for `packages/lib`.
- [x] 1.3 Remove the `privateSerial` path: Serial Lookup (`collection.ts`), holders' lowest serial, and the offer address path (`getCopyHolders`, the address facts in `collectionAskAllowed` and `offer-rules.ts`, `offer/collection.ts`, `offer/index.ts`). Keep the `lists.hide_serial` path (design decision 2). Rewrite the address-path tests in `offer-rules.test.ts`, and confirm the list-level tests pass unchanged. Verify with `bun test packages/api/src/lib/offer-rules.test.ts`.
- [x] 1.4 Make `profile.update` accept and ignore the four fields, and make profile outputs return them as `false`, with `isGuard` never true (design decision 3). Verify that `bun run lint`, `bun run typecheck` and `bun run test` pass for `@repo/api` and `@repo/lib`.

## 2. Web (`apps/web`)

- [x] 2.1 Remove the four toggles from `edit-cosmo-dialog.tsx` and stop sending the fields. Remove `profile-guard.tsx` and its use in `routes/@{$nickname}/route.tsx` and `profile-hover-card.tsx`. Remove the Activity History hidden notice (`trades-view.tsx`), the Serials private notice (`timeline.tsx`), and the "Private collector" row (`holders.tsx`). Remove their messages in en, ko and ja. Verify that lint and typecheck pass and that knip reports no newly unused exports.
- [ ] 2.2 Browser check per `browser-testing-with-devtools`, read-only. On staging, open a profile that had Private Profile on, its Activity History, a serial its owner hid, and that collection's Holders. Open an offer builder against a partner whose have list hides serials, and confirm it still offers "any copy" only. Verify that `bun run build --filter=web` passes.

- [x] 2.3 Add the dismissible removed-settings notice to `/account/profiles` (design decision 7), with en, ko and ja messages; dismissal in `localStorage` behind try/catch. Verify that lint and typecheck pass for `web`.

## 3. Docs

- [x] 3.1 Update `packages/api/AGENTS.md` Privacy and Trade, and Offer get sources (design decision 6). Grep every `AGENTS.md` for `private_profile`, `private_serial`, `hide_transfer` and `hide_nickname` and update any it finds. Verify that the grep shows only the retired-columns line.

## Workflow follow-up

- Archive after review, then propose the column-drop change once production runs this code.
