# Design

## Context

- Open to is `match_sale` + `match_have` (`packages/db/src/schema.ts`); Buying only is `match_have = false`. `openToOf`, `flagsOf` and `resolveOpenTo` live in `packages/api/src/schemas/open-to.ts`, which the web imports.
- A link is two rows pointing at each other through `linked_list_id`. It is written by `writeList` (`services/list.ts`, create and copy) and the `edit` procedure (`routers/list-crud.ts`), both of which call `checkLinkedList(type, linkedListId, userId)` to check the other list's owner and type. Copy always saves `linkedListId: null` (`copy-list-dialog.tsx`), so it can't form a pair.
- `list-form.tsx` shows the link menu (`linkable`, the user's lists of the other type) and the Open to radio (`OPEN_TO_ORDER`).
- The dev database has no linked Buying only want list.

## Goals / Non-Goals

**Goals:** no pair can become Buying only, by any request, old tab or new; the form explains why before the server has to refuse.

**Non-Goals:** see the proposal.

## Decisions

1. **One pure rule, in `schemas/open-to.ts`.** `pairRefusesOpenTo(want: OpenToFlags): boolean` (true for Buying only), beside `resolveOpenTo`, so the server and the form read the same rule and it gets a test in `open-to.test.ts`.

2. **The server checks both sides of a link.**
   - `checkLinkedList` also selects the linked list's `matchSale`/`matchHave`; a have list linking to a want list for which the rule refuses gets `list_pair_buying_only`.
   - A want list saved with a link: create checks the resolved flags (`resolveOpenTo(input)`) in `writeList`'s preparation, and edit checks `resolveOpenTo(list.listType, input, list)`, the flags it is about to save, so an edit that keeps an existing link and turns on Buying only is refused too.
   - The checks run before the transaction, as `checkLinkedList` does today.
   - *Alternative:* a database check. Rejected: the rule spans two rows.

3. **Refusal.** `list_pair_buying_only` joins `LIST_REFUSALS` with an English message for old tabs and `/api/v1`, and `refusalText` maps it to `api_errors_list_pair_buying_only` in `en`, `ko`, `ja`, e.g. "A want list linked to a have list can't be Buying only. Pick Swaps only or Swaps or buying, or remove the link."

4. **The form.**
   - Want list form: while `value.linkedListId !== null`, the Buying only radio is disabled with the reason as its description. Picking a link while Buying only is selected leaves the choice as it is but disabled, and Save stays blocked with the same reason, so the form never silently changes a choice the user made.
   - Have list form: `linkable` want lists for which the rule refuses are offered disabled, with the reason as a muted hint, the way Compare with shows a disabled list (`SingleSelect`'s `hint`). This needs the want lists' flags, which `lists` already carries for the badge.

5. **Existing data.** Before deploying, a read-only count of linked Buying only want lists runs on production. If any exist, one approved update clears both rows' `linked_list_id` (unlinking keeps each owner's Open to). No migration is added either way.

## Risks / Trade-offs

- [An old tab can still send a Buying only pair] → The server refuses it with the new reason; the old tab shows its English message.
- [An existing pair on production would block its owner's edits until unlinked] → Step 5 finds and unlinks them before deploy.
