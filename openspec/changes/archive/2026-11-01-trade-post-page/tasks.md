## 0. Before starting

- [x] 0.1 Confirm `trade-ratio` is applied (its data, API and `RatioChip`). Its migration is applied locally only with the user's approval. Verify `bun run check` passes on that base.

## 1. Route and navigation

- [x] 1.1 Load `vercel-react-best-practices`, `router-core` and `tanstack-router-best-practices`. Add `routes/(container)/trade/new.tsx` (design decision 1): its search schema (`kind`, `have`, `want`, `sale`, `alsoPay`, `alsoSwap`, `edit`, `from`), the signed-out redirect, `tradeChrome: false`, the breadcrumb and the page title. Put the `from` check and the `ComposerStart` → search mapping in a pure module with a test. Verify that test passes, and that lint, typecheck and build pass for `web`.
- [x] 1.2 Point every caller at the page (design decision 2): New post and Edit post in `browse-view.tsx`, the Trade line in `list-view.tsx` and `edit-list-dialog.tsx`, "List created" in `create-list-dialog.tsx`, and the near-match fix. Remove `useComposer`, `PostComposer` and the dialog. Verify no reference to them remains (`grep`), and that lint, typecheck and build pass for `web`.

## 2. Settings column

- [x] 2.1 Add `features/trade/composer/settings.tsx` (design decision 3): the kind segment with its description, one `Select` per side (disabled items with `rowNote`, No list where optional), the unpair prompt, "Also open to swaps", "I'd also pay…", and Post. Post saves through `useSavePost` and returns to `from`. Delete `ListSection` and its rows from `composer-lists.tsx`, keeping `OptionCheck` and `UnpairedNote`. Verify that lint, typecheck and build pass for `web`, and `bun test` for `composer-choice.test.ts` and `post-kind-text.test.ts`.
- [x] 2.2 New want list beside the want dropdown (design decision 6). Add new strings in en, ko and ja. Verify that lint, typecheck and build pass for `web`.

## 3. Preview and sheet

- [x] 3.1 Add `features/trade/composer/preview.tsx` (design decision 4): tags, Has or Selling, and Wants side by side on a wide screen, each with its list name, 23 thumbnails and "+N", the want side's rules, and the match line. Add `page.tsx` for the two-column layout and the phone layout with Post in a bottom bar. Verify that lint, typecheck and build pass for `web`.
- [x] 3.2 The side sheet (design decision 5): export `RuleForm` and show it for Add rule, and show a side's full objekt grid for "+N". Verify that lint, typecheck and build pass for `web`.
- [x] 3.3 Ratios in the preview (design decision 7): "Ratio for all" by each list name, a popover on each thumbnail and rule row, the inherited chip style, and none on a sale side or a Buy post. Verify that lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check with `browser-use`, following the rules in the user's global CLAUDE.md (your own tab; wait for hydration before submitting any login). Use the dev server with `.env.local` on the local database. Ask the user before creating any list, rule, ratio or post, even locally. Without that approval, verify those writes read-only, up to the request boundary. Check, at 1280 px and 390 px:
  - New post from Browse and For you, Post it and Edit post from a list, and "List created";
  - Swap, Sell with and without "Also open to swaps", and Buy;
  - a disabled list's reason in the dropdown, and the unpair prompt;
  - Add rule in the sheet, and "+N";
  - ratios offered only where the side swaps;
  - Post returning to where it was opened from;
  - a signed-out visit redirecting to sign in.

  Record what was checked, on which database, and what stayed read-only verified.

## 5. Docs

- [x] 5.1 Update `apps/web/AGENTS.md` with where the composer lives now (`features/trade/composer/`, the `/trade/new` route, and callers opening it with `useOpenComposer`, which builds the search with `composerSearch`). Verify `openspec validate trade-post-page --strict` passes.

## Workflow follow-up

- ko and ja strings are agent-written and need native review.
- Archive after `trade-ratio` is archived, since both touch Trade tiles' wording.
