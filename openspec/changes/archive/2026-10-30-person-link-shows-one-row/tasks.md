# Tasks

## 1. Server: one row for a person link

- [x] 1.1 In `packages/api/src/services/trade-feed/people.ts` `peopleFeed`, when `input.person` is set and there is no cursor, skip `openOrder` and return only the led row, or none, with `nextCursor: undefined` and the collections that row draws (design Decision 1). Under Mutual only, keep the person only if they are Mutual with a kept WTT post. Verify: `bun run lint`, `bun run typecheck` and `bun run build` pass for `@repo/api`; read-only, `/trade?person=<id with listed posts>` returns one person and no cursor, and `/trade?person=<id with only idle posts>` returns none.
- [x] 1.2 In `fetchMyPosts` (`services/trade-feed/index.ts`), add `tradeBlocked` to each post from one `notTradeSanctioned` query (design Decision 4). Verify: typecheck of `apps/web` sees the field on `Outputs["trade"]["myPosts"]`; `bun run lint`, `bun run typecheck` and `bun run build` pass for `@repo/api`.

## 2. Web: one row, artist selection, empty state

- [x] 2.1 In `toBrowseInput` (`apps/web/src/features/trade/browse-search.ts`), set `artist` to `search.artist ?? []` when `person` is set (design Decision 2). Write the tests first in `browse-search.test.ts`: a person link ignores the selection; a person link keeps an `artist` it names, even outside the selection; without `person` nothing changes. Verify: `bun test` passes after failing first; lint, typecheck and build pass for `web`.
- [x] 2.2 In `browse-view.tsx`, add the person-link empty state ahead of the other empty states, with Show everyone calling `clearLead`, and add `trade_person_empty_title` and `trade_person_empty_hint` in en, ko and ja (design Decision 3). Verify: lint, typecheck and build pass for `web`; read-only in the browser, an idle-only person link shows the empty state without a name, and Show everyone lists the feed.
- [x] 2.3 Add the banner above the row and the "More people are on Trade" line under it. Render the row with `led={false}`, and add the banner, count and line strings in en, ko and ja (design Decision 3a). Port from `prototype-person-link.tsx` on branch `prototype/person-link-ui`, rewritten with real strings and none of the prototype's switcher. Verify: lint, typecheck and build pass for `web`. Read-only in the browser, signed in and signed out:
  - the banner names the person, and shows the count only when signed in and above zero;
  - Copy link copies the address, with the clipboard stubbed in the page;
  - Show everyone and the line both list the feed;
  - the row has no ✕;
  - no infinite-scroll sentinel fires.

## 3. Web: Copy link reasons

- [x] 3.1 In `my-posts.tsx`, disable each post's Copy link on `tradeBlocked` or idle, with the matching reason line. Lay the item out as `trade-menu.tsx` does: `items-start py-1.5`, the icon `mt-0.5`, and the reason `text-muted-foreground` (design Decisions 4 and 6). Add `trade_post_copy_link_blocked` in en, ko and ja. Verify: lint, typecheck and build pass for `web`; read-only in the browser, an idle post's item shows the muted reason under a top-aligned icon.
- [x] 3.2 Make the row's Copy link `aria-disabled` when `tradeBlocked` or nothing is listed. In that state, activating it shows an info toast with the reason and copies nothing (design Decision 5). Verify: lint, typecheck and build pass for `web`. In the browser, with the clipboard stubbed in the page, the enabled button copies `/trade?person=<id>`. Check the disabled state up to the click handler only, since no test account is trade-blocked or has only idle posts without a write.

## 4. Wrap-up

- [x] 4.1 Run `bun run check` from the root and confirm `openspec validate person-link-shows-one-row` passes. Then update `apps/web/AGENTS.md` only if a convention changed (none expected), and say so in the change notes. Verify: both commands pass, and the AGENTS.md decision is recorded.

  - Note: `apps/web/AGENTS.md` unchanged, no web convention changed. `packages/api/AGENTS.md` (Trade matching) updated: a first-page `person` now skips the stored order.

## Workflow follow-up

- Archive with `/opsx:archive` once applied and checked; the user commits.
