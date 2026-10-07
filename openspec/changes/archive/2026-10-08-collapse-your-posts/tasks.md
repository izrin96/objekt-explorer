## 1. Summary rule

- [x] 1.1 A pure `summarizePosts(posts)` in `apps/web/src/features/trade/my-posts-summary.ts` returning the listed, idle and ready-to-bump counts and `shownByDefault` (any post idle), with a `bun test` beside it covering six posts (5 listed, 1 idle, 2 ready), none idle, and every post idle; web lint + typecheck + test pass

## 2. Web

- [x] 2.1 `useSettings` gains `myPostsShown: boolean | null` (default null) in `stores/settings.ts`; web lint + typecheck pass
- [x] 2.2 `MyPosts` renders the summary row (title, counts with `·`, zero parts left out except listed, idle styled like the Idle badge) and a Collapsible whose ghost Show/Hide trigger sets `myPostsShown`; it is open on `useHydrated() ? (myPostsShown ?? shownByDefault) : shownByDefault`, and the post rows inside the panel are unchanged; en/ja/ko text for the counts and Show/Hide; web lint + typecheck + build pass

## 3. Verification

- [x] 3.1 On the dev server as a local account with posts (browser-use, isolated context, 1280 and 390 wide):
  - with no saved choice and no idle post, only the summary row shows above the feed;
  - with an idle post, the posts start shown;
  - Hide, reload, the posts stay hidden and the counts still show the idle post;
  - the trigger reports `aria-expanded`;
  - the server HTML and the hydrated page agree when nothing is saved;
  - no console errors
- [x] 3.2 Full checks: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build --filter=web` and `openspec validate collapse-your-posts --strict` pass
