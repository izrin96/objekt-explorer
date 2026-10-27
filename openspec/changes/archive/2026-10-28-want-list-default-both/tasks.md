# Tasks

## 1. API default

- [x] 1.1 In `packages/api/src/schemas/list.ts`, default `createListInputSchema.matchSale` to true; in `schemas/list.test.ts`, assert a want create without the field parses to `matchSale: true, matchHave: true`. Lint, typecheck and tests pass for `@repo/api`.

## 2. Web defaults

- [x] 2.1 In `apps/web/src/features/list/list-form.tsx`, set `EMPTY_DRAFT.matchSale` to true, so Create list and Copy as new list from another type start at Swaps or buying.
- [x] 2.2 In `apps/web/src/features/list/list-post-tags.ts`, fall back to `matchSale ?? true` and update its comment; adjust `list-post-tags.test.ts` if a case relied on the old fallback. Lint, typecheck, tests and build pass for `web`.

## 3. Check

- [x] 3.1 On local dev, create a want list from `/list` and copy a sale list as Want, and confirm both save open to swaps and buying (`match_sale` and `match_have` true). An unposted list's page names no Open to: the header shows it only as post tags once the list is on Trade. Confirm existing want lists keep their choice, then delete both test lists (approved).
- [x] 3.2 AGENTS.md: confirm no touched package's conventions, traps or workflow changed (the defaults are not documented there), so none is updated.
