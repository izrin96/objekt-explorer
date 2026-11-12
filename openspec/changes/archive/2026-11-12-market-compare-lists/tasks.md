# Tasks

## 1. API

- [x] 1.1 Add `compare.listSlugs` (authed, input `{ slug }`): the collection slugs on one of the caller's own lists, refusing `compare_target_list_not_found` for a missing list or someone else's, reusing `fetchListSlugs` in `services/compare.ts`. Verify lint, typecheck and build pass for `@repo/api` and `web`.

## 2. Market

- [x] 2.1 `use-market-compare.ts` accepts `cmp_type=list` with `cmp_mode=matches` for an own list and returns the slugs to keep and the target's name; `use-market-objekts.ts` keeps only those. Verify lint, typecheck and build pass for `web`.
- [x] 2.2 `market-compare-button.tsx` shows the two groups, with `ListLabel` for lists; `market-view.tsx` passes the banner the name and shows the list empty text. Add the strings in en, ko and ja. Load `vercel-react-best-practices` first. Verify lint, typecheck and build pass for `web`.

## 3. Compare dialog

- [x] 3.1 `compare-dialog.tsx` gains the own-list picker with Other list…; `compare-banner.tsx` takes an optional target name, and `list-view.tsx` passes it for an own list. Add the strings in en, ko and ja. Verify lint, typecheck and build pass for `web`.

## 4. Check

- [x] 4.1 Check in the running app against the local database: Market by a want list, by a have list, by a profile, an empty result, someone else's list in the URL, Cancel; the dialog's picker, Other list… and the banner name; phone width; ko and ja. Verify lint, typecheck and build pass for `web`.
- [x] 4.2 State in the final report whether any `AGENTS.md` convention changed (expected: none). Verify lint, typecheck and build pass for `web`.

## Workflow follow-up

- Archive the change once it is reviewed.
- Move "Filter Market by one of my lists" out of `design/backlog.md`.
