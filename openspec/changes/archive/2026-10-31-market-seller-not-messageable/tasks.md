# Tasks

## 1. The rule

- [x] 1.1 Add `rowContact(item, own)` to `apps/web/src/features/objekt/drawer/market-listing.ts` (`"open" | "closed" | "none"`), with `market-listing.test.ts` covering messageable true, false and an own listing; verify `bun test` on that file passes, and that lint and typecheck pass for `web`

## 2. The row

- [x] 2.1 In `market.tsx`, call `rowContact` per row: build `actions` only for `"open"`, and pass `closed` to `MarketRow`. In `market-row.tsx`, add `closed: boolean` and draw `m.trade_not_messageable()` as a muted `text-xs` line under the seller's name, wrapping, when it is set. Verify the React Compiler still compiles `MarketRow` and that lint, typecheck and the `web` build pass
- [ ] 2.2 Check it in the browser (DevTools page 8, signed in): with a response shim setting `messageable: false` on one listing, that row shows the note with its caret and no menu; a messageable row keeps its menu; your own listing shows no note; at 360 px the note reads in full and the table is no wider than without it; in Japanese the row reads "メッセージを受け付けていません". Then, in an isolated signed-out context, a seller with messages off shows the note and the rest keep their menu

## 3. Docs

- [x] 3.1 Update `apps/web/AGENTS.md` only if the change alters a convention or trap there, or state that none changed. Verify `bun run check` passes

## Workflow follow-up

- Archive the change after review, and sync the delta into `openspec/specs/web-objekt-browser/spec.md`.
