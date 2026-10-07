## 1. API

- [x] 1.1 `offer.candidates` side `theirs` (whole-list form) returns `wanted`: their collections on the sender's want lists; output schema updated; typecheck passes for `@repo/api`
- [x] 1.2 `pickerNarrowingSchema.wantList` for side `mine`: keep collections on that want list when it is the partner's discoverable want list, else empty; a `bun test` for the narrowing rule as a pure helper; api tests pass

## 2. Web

- [x] 2.1 `OfferRequest.focusWantList`; `browse-post.tsx` passes the have or sale list as `focusList` and the want list as `focusWantList` (WTB: want only); lint + typecheck pass for `web`
- [x] 2.2 You get shortcut: matched first (from `wanted`), then list order, added items removed before the 8 cap; a pure ordering helper with a test; lint + typecheck + test pass
- [x] 2.3 You give shortcut: first page of mine with `wantList`, first 8 not already added, one tap adds a give pick; new label in en/ja/ko; hidden when empty; lint + typecheck + build pass

## 3. Verification

- [x] 3.1 On the dev server with two local accounts (browser-use, isolated contexts): a WTT post whose matching entry sits past the 8th shows it first; adding refills; a WTB post shows the viewer's matching objekt under You give and no You get shortcut; no console errors
- [x] 3.2 Full checks: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build --filter=web` and `openspec validate offer-from-post-matches --strict` all pass
