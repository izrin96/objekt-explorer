# Tasks

These tasks follow option (a) of each decision in design.md, which the user chose on 2026-11-06. Should one change, these are the tasks to revise:
- decision 1: 2.1;
- decision 2: 2.2;
- decision 3: 4.1;
- decision 4: 4.2;
- decision 5: 5.1;
- decision 6: 2.2.

## 1. Schema

- [x] 1.1 Add `post: jsonb("post")` (nullable, no foreign key, no check) to `report` in `packages/db/src/schema.ts`. Run `bun run --filter=@repo/db db:generate` and confirm the generated SQL is only `ALTER TABLE "report" ADD COLUMN "post" jsonb;`. If `report-help-and-reporter-note`'s migration is already in `migrations/`, generate on top of it; if it lands later, that change regenerates its own (design, Coexistence). Do not run `db:migrate`. Lint and typecheck `@repo/db` (it has no build script).

## 2. Filing a report that names a post

- [x] 2.1 Add `reportPostSchema` to `packages/api/src/schemas/moderation.ts` (design, Decision 1). Add the pure `postSnapshot(lists, namedId)` in `src/lib/report-post.ts`: it resolves either half of a pair to the anchor, takes tags through `tagsOf`, normalizes descriptions with `normalizeUserText`, and records `onTrade`. Write `report-post.test.ts` first and see it fail, covering:
  - a WTT pair named by its want half;
  - a WTS sale list on its own;
  - a want-only post open to buying;
  - a post off Trade;
  - a blank description, which becomes null.

  Verify with `bun test` in `packages/api`. Lint, typecheck and test `@repo/api` (it has no build script).
- [x] 2.2 Add `postListId` (optional positive int) to `reportInputSchema`. Before the transaction in `fileReport`, read the named list and its pair partner by id:
  - no row: drop the post and file the report;
  - another owner, or a type other than have, want or sale: refuse with `NOT_FOUND`;
  - otherwise build the snapshot.

  Then write `post` in the insert. Confirm that a request without `postListId` builds the same insert as before, by reading the code and by parsing an old input through the schema in a test. On local, read-only verify the input and the request a report would send from the web. Lint, typecheck and test `@repo/api` (it has no build script).

## 3. Staff read

- [x] 3.1 Add `staffPosts(listIds)` beside `fetchPostCards` in `services/trade/feed/post-cards.ts`. It applies no `visibleOnTrade` filter and returns `state` (`posted`, `off_trade`, `deleted`) and `now` (tags, list names and types, slug, `profileSlug`, `profileAddress`) per id (design, Decision 2). In `accountDossier`, parse each report's `post` with `safeParse`, call `staffPosts` once for every report on the page, and return `post: { reported, state, now } | null`, with `now` null when the list is deleted. Verify against the local database with read-only queries: one report naming a posted list, one naming a list since taken off Trade, and one naming an id with no row each return the right state. Lint and typecheck `@repo/api` (it has no build script).

## 4. Web: where Report names a post

- [x] 4.1 Load `vercel-react-best-practices` and `vercel-composition-patterns`.
  - In `useSafetyDialogs` (`features/moderation/safety-dialogs.tsx`), add `post?: { listId; attachment }` and send it as `postListId`; let `SafetyMenu` pass it through.
  - Add an optional `finalFocus` to `ReportDialog`, pass it to its `DialogPopup`, and expose it through `useSafetyDialogs`.
  - In `PersonRow`, pass the focused post (its anchor id and name) when `focus` is set, and nothing otherwise.
  - Add the `mod_report_post_attached` message in en, ko and ja.

  On local, verify in the browser that the row's Report… on a post page shows the attachment line and sends `postListId`, and on `/trade` shows neither. Read-only verify against production: check the request it would send and leave Send unclicked. Lint, typecheck and build `web`.
- [x] 4.2 Load `frontend-ui-engineering` and `better-writing`. In `PostBlock` (`features/trade/post-block.tsx`), take `signedIn` from `PersonRow` and add Report this post… with `FlagIcon` after Copy link, behind a `MenuSeparator`, on another person's post for a signed-in viewer, whether or not the row takes messages. The item only sets a mounted flag. A child component rendered from then on calls `useSafetyDialogs` with `finalFocus: menuRef` and opens the report on mount (design, Decision 5). Leave the "+N" sheet's footer unchanged. Add `trade_post_report` in en, ko and ja. Verify in the browser on local that the menu items match each scenario of `web-trade-browse` Post menu and Where Make offer on one post shows: a WTT post, Not taking messages, no Cosmo profile, the viewer's own post, and signed out. Also verify that Escape returns focus to the ⋯ button. Lint, typecheck and build `web`.

## 5. Web: the console

- [x] 5.1 Add `features/moderation/console/report-post.tsx` and render it from `ReportCard` in `reports.tsx`, under the note (design, Decision 6). It shows:
  - the reported tags (`TagBadges`) and list names in their type tones;
  - the descriptions in a `details`;
  - a state Badge;
  - "Changed since the report" with the current names when the tags or names differ;
  - a link to the list page through `getListLinkOption` while the list exists.

  Add the `mod_report_post_*` messages in en, ko and ja. On local with a staff account, verify that each of the `web-moderation` scenarios in Reported posts in the console renders as written, at 1280 px and 390 px. Lint, typecheck and build `web`.

## 6. Integration and docs

- [x] 6.1 On local, run the whole path with two accounts and a staff account: report a post from its menu, edit the post, take it off Trade, then delete the list. The console should show each state over the unchanged snapshot. Report the same person's other post and confirm the 24-hour refusal. Run `bun run check` and `bun run build --filter=web`.
- [x] 6.2 Update the docs:
  - `packages/api/AGENTS.md`: under the chat card paragraph, say that a report's `post` is a snapshot plus `listId` with no foreign key, and that staff read it through `staffPosts`, never `fetchPostCards`, since that one hides what a block or sanction hides.
  - `apps/web/AGENTS.md`, the Person and post pages bullet: on a post page the row's Report names the focused post, and each post's ⋯ menu carries Report this post….
  - State in the task notes that `packages/db/AGENTS.md` and the root `AGENTS.md` did not change.

  Note: `packages/db/AGENTS.md` and the root `AGENTS.md` did not change.

## Workflow follow-up

- The migration runs on local, then production, each with the user's approval, before the deploy.
- If `report-help-and-reporter-note` is applied after this change, its migration is regenerated on the merged schema, and the reverse holds too (design, Coexistence).
- Archive after review and the browser checks.
