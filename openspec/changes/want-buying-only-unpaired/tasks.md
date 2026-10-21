# Tasks

## 1. Rule and refusal (packages/api)

- [x] 1.1 `pairRefusesOpenTo` in `schemas/open-to.ts`, with tests in `open-to.test.ts`
- [x] 1.2 `list_pair_buying_only` in `LIST_REFUSALS`; `checkLinkedList` selects the linked list's flags and refuses a have list linking to a Buying only want list
- [x] 1.3 Refuse a want list saved Buying only with a link, on create (`services/list.ts`) and edit (`routers/list-crud.ts`, the flags about to be saved)
- [x] 1.4 lint + typecheck + test pass for `@repo/api`

## 2. Form and text (apps/web)

- [x] 2.1 Want list form: Buying only disabled with the reason while a link is held; Save blocked while a disabled choice is selected
- [x] 2.2 Have list form: Buying only want lists offered disabled in the link menu with the reason
- [x] 2.3 `refusalText` maps `list_pair_buying_only`; `api_errors_list_pair_buying_only` and the form reason in `en`, `ko`, `ja`
- [x] 2.4 lint + typecheck + test + build pass for `web`

## 3. Verify and document

- [ ] 3.1 Read-only check in the running app: a linked want list's form shows Buying only disabled, a have list's link menu shows a Buying only want list disabled, and an unlinked want list still offers all three (no saves on a shared database)
- [ ] 3.2 Read-only count of linked Buying only want lists on production; report it, and unlink any only with approval
- [x] 3.3 Update `packages/api/AGENTS.md` Trade matching (a pair is never Buying only; `pairRefusesOpenTo`); `apps/web/AGENTS.md` and the root `AGENTS.md` need no change
