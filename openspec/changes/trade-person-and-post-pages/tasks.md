## 0. Before starting

- [x] 0.1 Confirm `trade-ratio` and `trade-post-page` are applied: `RatioChip` exists, and `/trade/new` accepts `edit` and `from`. Verify that `bun run check` passes on that base.

## 1. Handle and `trade.person` (API)

- [x] 1.1 Load `api-and-interface-design`. Add `tradeHandle` in `packages/api/src/schemas/trade-person.ts` (design decision 1), moving `defaultProfile` and `realNickname` where the schema can import them. Add `trade-person.test.ts`:
  - the default profile's nickname, lower-cased;
  - no default, so the first linked profile;
  - no nickname, so the address;
  - no profile, so `null`.

  Verify that the test passes, and that lint and typecheck pass for `@repo/api`.
- [x] 1.2 Add `handle` to each `trade.people` row (`peopleOutputSchema`, `services/trade-feed/people.ts`), to `trade.myPosts` (the viewer's own), and `owner.handle` to post cards (`schemas/chat.ts`, `fetchPostCards`). Confirm that no Redis key stores either value; if one does, bump its version. Verify that lint and typecheck pass for `@repo/api` and `web`.
- [x] 1.3 Add `trade.person` (design decision 2): `{ handle } | { userId }` in, `{ userId, handle }` or `NOT_FOUND` out, only linked rows, the newest first, under `limitFeed`. Put the input and output schemas in `schemas/trade-person.ts`. Verify that lint and typecheck pass for `@repo/api`. Also call it read-only against the local database: an address, a second linked nickname, a different letter case and an unlinked nickname each give the expected result.

## 2. Pages (web)

- [x] 2.1 Load `vercel-react-best-practices`, `router-core`, `tanstack-router-best-practices`, `router-query` and `start-core`. Add `routes/(container)/trade/@{$handle}/route.tsx`, `index.tsx` and `$slug.tsx` (design decision 3):
  - the canonical redirect and `notFound`;
  - the row through `loadBrowse`;
  - the anchor-slug redirect;
  - loaders that return `{ userId, handle, row }`.

  Catch a refused or failed read in the loader, so `head` falls back to the plain Trade title. Put the slug → post / anchor / "no longer on Trade" choice in a pure module with a test. Verify that test, and that lint, typecheck and build pass for `web`.
- [x] 2.2 Give `PersonRow` `focus` and drop `led` and `onClear` (design decision 4):
  - the outlined post and "Show N more posts from <name>";
  - Make offer and Message addressed to the focused post;
  - the owner's Edit post and Take down on a post page;
  - Back to Trade and the empty state;
  - the "no longer on Trade" notice.

  Delete `person-link-view.tsx` and its strings. Add the new strings in en, ko and ja. Verify that `grep` finds no `PersonLinkView` left, and that lint, typecheck and build pass for `web`.
- [x] 2.3 Load `fixing-metadata`. Add the optional `url` to `generateMetadata` (`og:title`, `og:url`, canonical), and add `features/trade/share-preview.ts` with a test for the person and post wording and the image choice (design decision 7). Wire both into the two routes' `head`. Verify the test, that `live/$id`'s tags are unchanged, and that lint, typecheck and build pass for `web`.

## 3. Old links and Copy link (web)

- [x] 3.1 Redirect `person` on `/trade` and `/trade/for-you`, and `partner` on `/trade/for-you`, in `beforeLoad` through `trade.person({ userId })` (design decision 5). Keep `person` and `partner` in the schemas as "read only to redirect". Run the person redirect before For you's sign-in redirect and `browseRedirect`. Stop `browseRedirect`, `forYouNormalise` and `forYouFallback` carrying `person`, and update `browse-search.test.ts` to match. Verify that the tests pass, and that lint, typecheck and build pass for `web`.
- [x] 3.2 Copy link (design decision 6). Have `useCopyTradeLink` take `{ handle, slug? }`, with the viewer's own handle read from `trade.myPosts`. Update the row's ⋯ menu and Your posts' header, and add Copy link to `PostBlock`'s ⋯ menu and to each Your posts entry menu. Disable it with a reason when there is no handle, and for an idle post. Point the chat post card's sender link at the post page. Verify that `grep` finds no `/trade?person` or `search: { person` left in `apps/web/src`, and that lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check with `browser-use`, following the rules in the user's global CLAUDE.md: your own tab, an isolated context for signed out, and wait for hydration before submitting any login. Use the dev server with `.env.local` on the local database. Check, at 1280 px and 390 px:
  - a person page and a post page as visitor, owner and signed out;
  - a canonical redirect by another nickname, by letter case and by the want half's slug;
  - "Show N more posts";
  - "no longer on Trade" and Nothing to show;
  - an old `?person=` and `partner=` link;
  - Copy link from all four places;
  - the chat post card's link.

  Read the rendered `head` with `curl` for the title, `og:*`, canonical and card image. Leave Make offer, Message, Edit post and Take down unclicked unless the user approves those writes; otherwise verify them up to the request boundary. Record what was checked and on which database.

## 5. Docs

- [x] 5.1 Update `packages/api/AGENTS.md`: in Trade matching, the handle (`tradeHandle`, `trade.person`), and the first-page `person` now serving the person pages rather than a URL parameter. Update `apps/web/AGENTS.md` with the person and post routes, `PersonRow`'s `focus`, and how Copy link builds page URLs. Verify that `openspec validate trade-person-and-post-pages --strict` passes.

## Workflow follow-up

- Remove the prototype once this change is applied: the worktree `.claude/worktrees/proto-person-page` and the branch `proto/trade-person-page`, or keep it as a patch if the user asks.
- Archive with `/opsx:archive` after `trade-ratio` and `trade-post-page` are archived.
