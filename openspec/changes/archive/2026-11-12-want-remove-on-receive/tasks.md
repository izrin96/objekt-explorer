# Tasks

## 1. Column and inputs

- [x] 1.1 Add `removeOnReceive` (`remove_on_receive boolean NOT NULL DEFAULT false`) to `lists` in `packages/db/src/schema.ts` and generate the migration with `bun run --filter=@repo/db db:generate`. Do not run it. Verify the generated SQL is a single `ADD COLUMN`, and that lint, typecheck and build pass for `@repo/db`.
- [x] 1.2 Take the field in `createListInputSchema` and `editListInputSchema` as optional (absent on create is false, absent on edit keeps the stored value), save false for any list that is not a want list, return it only from `list.find`, which the form reads, and let a copy take what its form sends (the copy form starts from the source's value for a want copy of a want list). Add tests for the pure parts (the copy plan, any input mapping). Update `packages/api/docs/lists.md`. Verify the tests pass, and that lint, typecheck and build pass for `@repo/api`.

## 2. Removal on a verified leg

- [x] 2.1 Add the removal step in `services/list/` and call it, for the legs just verified, at the three places a leg is marked verified (the verifier's loop, `acceptCopy`, `confirmLeg`), in the same transaction. Keep its imports clear of `env.ts` and `services/redis`, and confirm `apps/worker/src/import-boundary.test.ts` passes. Verify against the local database inside a rolled-back transaction that it deletes only hand-added entries on the receiver's want lists with the switch on. Verify lint, typecheck and build pass for `@repo/api` and `worker`.
- [x] 2.2 Leave `updated_at` and the trade version alone (see design.md, Caches after the commit). Update `packages/api/docs/offers.md` and `apps/worker/AGENTS.md` where they describe verifying a leg. Verify lint, typecheck and build pass for `@repo/api` and `worker`.

## 3. The switch in the list form

- [x] 3.1 Add the switch to the create and edit forms for want lists (`features/list/list-form-fields.tsx`, `list-draft.ts`), on by default in create, with its strings in en, ko and ja. Load `vercel-react-best-practices` first. Add a `list-draft` test for the default and for other list types. Verify in the running app against the local database: create shows it on, an existing list shows it off, other types show none, and a save round-trips. Verify lint, typecheck and build pass for `web`.

## 4. The trade page line

- [x] 4.1 In `trade-view.ts`, add the viewer's still-wanting lists to their own verified You get legs; add the procedure that turns the switch on and removes the entry in one transaction. Add tests for any pure mapping. Verify lint, typecheck and build pass for `@repo/api`.
- [x] 4.2 Show the line with Remove and Always remove from this list on the trade page's You get rows, with strings in en, ko and ja. Verify in the running app against the local database on a completed local trade: the line shows for the receiver only, Remove takes the entry off, Always remove also turns the switch on, at desktop and phone width. Verify lint, typecheck and build pass for `web`.

## 5. Final check

- [x] 5.1 Run `bun run check` and build `web` and `worker`. State in the final report whether any `AGENTS.md` convention changed beyond the doc updates above.

## Workflow follow-up

- Run the migration on production after the owner approves it, before the web deploy.
- Rebuild the worker on the VPS after the web deploy.
- Archive the change once it is reviewed.
- Move "Remove a hand-added want entry once its owner receives it" out of `design/backlog.md`.
