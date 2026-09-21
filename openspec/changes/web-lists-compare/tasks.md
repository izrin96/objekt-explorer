## 1. Read before editing

- [ ] 1.1 Invoke `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `baseline-ui`; read this change's `design.md` and the three spec files, `openspec/config.yaml`, port note 6 in `design/lab-code-review.md`, the lab and website files under "Surfaces covered", `packages/api/src/routers/{list-crud,list-entries,list-utils,compare}.ts`, and `apps/web/src/features/{objekt/objekt-card-menu.tsx,objekt/select-bar.tsx,user/hooks.ts,link/queries.ts}`, `apps/web/src/lib/form.ts`; verify by writing `list.create`'s input keys and the redirect rule from design decision 4 in your notes.

## 2. Data and form

- [ ] 2.1 Create `lib/functions/list.ts`, `features/list/{queries.ts,actions.ts,list-provider.tsx}` per design decision 3; verify `typecheck` and that `listBySlugQuery` resolves a real public list on 3200.
- [ ] 2.2 Port `features/list/list-form.tsx` from the lab onto the zod schema of `list.create` (decision 2) with `create-list-dialog`, `edit-list-dialog`, `delete-list-dialog`; verify sale without currency is refused, a Have list offers only Want lists as linked, the profile binding shows the user's profiles, and the built `create` input matches the router schema (request boundary).

## 3. Routes

- [ ] 3.1 Replace `(container)/list.tsx` with `list/index.tsx` (guard + `ListCard` grid from `useUserLists` + dialogs); verify signed-out redirects to `/login?redirect=/list`, cards show type badge, linked chip and owner chip keyed on `profileAddress`.
- [ ] 3.2 Add `(container)/list/$slug.tsx` and `(container)/@{$nickname}_/list.$slug.tsx` per decision 4 with `features/list/{list-header,list-view}.tsx`; verify a plain slug of a profile-bound list redirects to the profile address, an unbound list opens at `/list/<slug>`, an unknown slug shows not-found, the list's `gridColumns` is honoured, and the drawer opens from a card.
- [ ] 3.3 Replace `@{$nickname}/list.tsx`'s body with `features/list/profile-lists.tsx` on `profileListsOptions`; verify only lists with the show-on-profile flag appear.

## 4. Actions

- [ ] 4.1 Create `features/list/{add-to-list-dialog,add-to-list-menu-item}.tsx` and wire both into `(container)/index.tsx` (card menu + select bar) for signed-in users; verify the dialog lists the user's lists and builds `addObjektsToList({ slug, skipDups: true, collectionSlugs })` for one and for many (request boundary), and signed-out users see no item.
- [ ] 4.2 Create `features/list/{set-price-dialog,remove-from-list-dialog,export-button}.tsx` and the header's share copy; verify Set price builds `updateEntryPrices` updates incl. QYOP and null (request boundary), Remove builds `removeObjektsFromList` with entry ids (request boundary), Export via `curl` on `/rpc/list/export` returns `text/csv` named after the list, and share copies the profile-scoped URL.
- [ ] 4.3 Create `features/discord/{format.ts,discord-format-dialog.tsx}` and open it from the list header, `features/profile/profile-header.tsx` and the account menu; verify grouping and style options change the output and copy works.
- [ ] 4.4 Add the My lists submenu to `components/layout/user-menu.tsx`; verify it lists the user's lists with type badges and the four actions.

## 5. Compare

- [ ] 5.1 Create `features/compare/*` per decision 6 and add `validateSearch` to both list detail routes; verify choosing a profile target in missing mode writes the three keys, the grid shows `compare.compare`'s result, the banner names target and mode, owner actions stay visible, Clear removes the keys, opening another list drops them, and a private target yields the empty explanation.

## 6. Verify

- [ ] 6.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip`, `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [ ] 6.2 Browser pass of `/list`, a list detail with compare active, the create form and the Discord dialog at 390 px and 1280 px in both themes with the overflow guard silent; record what was opened.
- [ ] 6.3 Comment audit over `features/{list,compare,discord}`: only "why" comments remain.
