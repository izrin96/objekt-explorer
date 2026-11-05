# Tasks

Read these before you start:

- **Where to build.** Build on the working tree, not HEAD. The user's uncommitted trade edits are in `person-page-view.tsx`, `my-posts.tsx`, `actions.ts`, `browse-view.tsx`, `trade-header.tsx` and `messages/{en,ja,ko}.json`. Keep them, and change only the lines a task names.
- **The objekt drawer.** Someone else is editing `apps/web/src/features/objekt/drawer/*`. This change touches no file there: group 6 goes through the drawer's existing `note` prop. If a task seems to need a drawer edit, stop and ask.
- **Skills.** Load `vercel-react-best-practices` before any `.tsx` edit; a hook enforces it.
- **"Web checks pass".** In each task this means `bun run lint`, `bun run typecheck` and `bun run build` all pass with `--filter=web`.
- **Browser checks.** They are read-only, on the local dev server only. Use the `browser-use` CLI on the automation Chrome:
  - port 9333, `BU_CDP_URL` set;
  - in your own tab, by target id;
  - wait for hydration before submitting any login form.
- **Mutations.** Message (`chat.start`), Bump, Take off Trade and offer sends are writes. Verify each only up to the request it would send, and leave the control unclicked.

## 1. Shared pieces

- [x] 1.1 Generalise `CopyLinkItem` (`features/trade/copy-link-item.tsx`) into a `ReasonItem` that takes an icon, a label, a reason, and either `onClick` or a link (rendered through `MenuItem`'s `render`, plain while disabled). Keep `CopyLinkItem` as a wrapper so its callers don't change (design decision 2). Verify that web checks pass and that Copy link still shows its disabled reason in Your posts.
- [x] 1.2 Add the new keys from design.md's Strings table to `messages/en.json`, `ja.json` and `ko.json`. Verify that `bun run paraglide:compile` succeeds, that ko is 합니다체 and ja polite, and that web checks pass.

## 2. Make offer for a person with no Cosmo profile

- [x] 2.1 In `TradeActions` (`trade-actions.tsx`), when `handle` is null and the contact is open, render Make offer as a focusable `aria-disabled` button with an sr-only `aria-describedby` and a reason toast (`trade_offer_no_profile`), following `my-posts.tsx:138-158`. Verify that web checks pass, and in the browser that rows with a handle are unchanged.
- [x] 2.2 In `PostBlock`, show Make offer on this post as a disabled `ReasonItem` with the same reason, where `contact` is open, the post has an anchor and `offerHandle` is null. Verify that web checks pass and that a post with a handle still offers the enabled item.

## 3. Message about one post

- [x] 3.1 In `PostBlock`, call `useStartConversation()` and add Message about this post after Make offer on this post when `contact.kind === "open"`. Its target is `{ kind: "list", slug: anchor.list.slug }`, and its card is `{ kind: "post", listSlug: anchor.list.slug, withMatch }`, with `withMatch` from this post's strip counts (design decision 1). Verify that web checks pass. In the browser, check that the item shows on other people's posts and not on your own or on "Not taking messages" rows. Read the input it builds in code; do not activate it.

## 4. Owner actions

- [x] 4.1 Add `ownEmptyKind(posts)` to `features/trade/my-posts-summary.ts`, returning `none`, `blocked`, `idle` or `empty` in that order of precedence. Add cases to `my-posts-summary.test.ts`. Verify that `bun test apps/web/src/features/trade/my-posts-summary.test.ts` passes and web checks pass.
- [x] 4.2 Add an `OwnPostItems` child to `PostBlock`, rendered only when `own`, with Edit post first and Take off Trade last, around Show all, View post and Copy link (design decision 3). Verify that web checks pass, and in the browser that your own post's menu on `/trade` lists Edit post, Show all, Copy link and Take off Trade; leave Take off unclicked.
- [x] 4.3 In `PersonPageView`, take `own` from `userId === user?.user.id`. When own and `row` is null, render the owner's empty state from `ownEmptyKind` over `myPostsOptions()` (read only when own), with New post, Bump (`useBumpPost`) and Open Your posts (`/trade`) as each kind needs. Keep the generic empty state while `myPosts` loads or fails. Verify that web checks pass, and in the browser that your own person page shows the matching state; leave Bump unclicked.
- [x] 4.4 Pass owner actions on the own person page too: Bump, disabled with `trade_bump_next` while `nextBumpAt` is set. Add Bump to `OwnPostActions` on the post page. Verify that web checks pass, and in the browser that both pages show Bump with the same next-bump time as Your posts.

## 5. Links into person and post pages

- [x] 5.1 Add `tradePostLink(list)` to `features/list/list-link.ts` (design decision 4), with a new `list-link.test.ts` covering a bound list, a want list through its linked list, a want list with neither, and address lower-casing. Verify that `bun test apps/web/src/features/list/list-link.test.ts` passes and web checks pass.
- [x] 5.2 Link the On Trade badge in `list-header.tsx:88` and `list-rows.tsx:240` through `tradePostLink`, falling back to `/trade`, with `preload={false}`. Verify that web checks pass, and in the browser that a bound list's badge opens its post page and a want list's opens the pair's anchor.
- [x] 5.3 Add View Trade page to both row menus in `person-row-view.tsx` (signed-in `extraItems` and signed-out), as a `ReasonItem` link with `preload={false}`. Leave it out when `page` is set without `focus`, and disable it with the Copy link reason when there is no handle. Verify that web checks pass, and in the browser that it opens `/trade/@<handle>` from Browse and from a post page, and is absent on the person page.
- [x] 5.4 Add View post to each post's menu in `PostBlock`, before Copy link, with `preload={false}`, left out when `focused`. Verify that web checks pass and that it opens the post page from Browse.
- [x] 5.5 Add View post to each Your posts entry menu (`my-posts.tsx`, `MyPostRow`), after Edit post, disabled by `linkReason`. Verify that web checks pass, and in the browser that a listed post opens its page and an idle post's item is disabled, saying to bump first.

## 6. Offer from one objekt (no drawer edits)

- [x] 6.1 Add `resolveGetAsks(get, items)` beside `resolveAsks` in `features/offers/builder/draft.ts` (design decision 5). Add cases to `draft.test.ts`: any-copy item kept; first unblocked copy chosen; reserved or untransferable copies skipped; a copy on another list ignored; no copy leaves the ask; a pick naming a copy untouched. Verify that `bun test apps/web/src/features/offers/builder/draft.test.ts` passes and web checks pass.
- [x] 6.2 In `builder/form.tsx`, show and send the get side through `resolveGetAsks` over `theirs.data.items`, marking an unresolved ask as loading while `theirs` is pending, as the give side does. Verify that web checks pass. In the browser, open a Market listing's Make offer and check that it behaves as before. Send nothing.
- [x] 6.3 Widen `OpenObjekt` (`features/trade/near.ts`) with an optional `ask` callback. Wrap `onOpen` per strip in `PostBlock`, passing `ask` for have and sale strips where `offersHere` holds. Pass the same per-strip wrapper to that strip's `SideAllDialog`: the sheet's `openObjekt` (`side-items-sheet.tsx:172-175`) forwards only `(objekt, near)`, so the wrapper adds `ask` itself. Verify that web checks pass and that near matches still open their note.
- [x] 6.4 Add `features/trade/objekt-offer-note.tsx` and render it as the drawer's `note` from `browse-view.tsx` and `person-page-view.tsx` when `ask` is set and there is no near match; it closes the drawer before `ask()`. Verify that web checks pass. In the browser, open an objekt from a have strip, and from that strip's "+N" sheet, and choose Make offer for this objekt: the builder should hold a copy that isn't flagged, on a list naming copies, on a hide-serial list and on a collection entry. Leave Send unclicked. Also check that a want-strip objekt shows no line. Confirm `git status` shows no change under `features/objekt/drawer/`.

## 7. "+N" sheet actions

- [x] 7.1 Add an `actions` slot to `SideItemsSheet`'s footer (`side-items-sheet.tsx:273`, made `flex-wrap`), and pass it through `SideAllDialog` (`post-side.tsx`). Verify that web checks pass and that own posts' sheets show Open list and Close only.
- [x] 7.2 From `PostBlock`, pass Message about this post and Make offer on this post (or its disabled form) into the sheet; each closes the sheet first. Verify that web checks pass, and in the browser at 390 px and 1280 px that the footer wraps without sideways scroll. Leave Message unclicked.

## 8. Integration and docs

- [x] 8.1 Run `bun run check` and `bun run build --filter=web`. Do a read-only browser pass over `/trade`, `/trade/for-you`, `/trade/@<handle>`, a post page and a list page at 390 px and 1280 px, checking that menus, sheets and notes match the spec deltas and that the overflow guard reports nothing. Verify that all checks pass.
- [x] 8.2 Update `apps/web/AGENTS.md`:
  - **Chat draft:** Message about this post on a post's menu and sheet also attaches a post card.
  - **Person and post pages:** the View Trade page and View post links, the On Trade badge's `tradePostLink`, `preload={false}` on every link into them, and the owner's empty state.
  - **Offer builder:** Make offer for this objekt, the get-side any-copy resolution, and Make offer shown disabled with no handle.

  The root `AGENTS.md` needs no change. Verify that the edited sections read against the code, and that web checks pass.
