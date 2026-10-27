# Design

## Context

A want list's Open to is two columns, `match_sale` and `match_have`, both `DEFAULT true` with a check that one is set. The Swaps only default lives in two places only:
- `EMPTY_DRAFT` in `features/list/list-form.tsx` (`matchSale: false, matchHave: true`): Create list's starting draft, read by `create-list-dialog.tsx` and by `copy-list-dialog.tsx` when the copy's source is not a want list.
- `createListInputSchema` in `packages/api/src/schemas/list.ts` (`matchSale` defaults to false): what `list.create` saves when a request leaves it out.

The list form shows no Open to control, and `toEditInput` never sends Open to, so an edit cannot change it. The post composer sets it on posting (`services/trade-post.ts`).

The readers gate on the list type: the recount SQL, the feed query, `pickByOpenTo` and the alert matcher read `match_sale` only for want lists. A have, sale or general list that saves `match_sale: true` matches nothing differently.

## Goals / Non-Goals

**Goals:**
- A want list created without a post is open to swaps and buying.

**Non-Goals:**
- A migration or backfill: existing rows keep their values.
- An Open to control on the list form.
- The sale list default (`takes_swaps` stays false).

## Decisions

### Flip both defaults, keep one source per layer

`EMPTY_DRAFT.matchSale` and `createListInputSchema.matchSale` both become true. These are the existing defaults, so no new constant is needed. Alternative: only the API default, letting the form omit the field. Rejected, because the form always sends the draft's value, so the API default alone would change nothing for Create list.

`EMPTY_DRAFT` is shared by every list type. Setting `matchSale: true` on a have, sale or general draft changes nothing: `resolveOpenTo` (`schemas/open-to.ts`), which list create runs, already saves those types open to both, and for a want list it keeps what the request sends. So the two defaults above are the whole change on the write path.

### Copy as new list follows Create

`copy-list-dialog.tsx` already takes Open to from a want source and `EMPTY_DRAFT` otherwise, so it follows with no change of its own.

### Tag fallback

`listPostTags` (`features/list/list-post-tags.ts`) falls back to `matchSale ?? false` with the comment "a want list's defaults: Swaps only". The columns are `NOT NULL`, so the fallback only covers a caller that leaves the field out. It moves to `?? true` to match the new default, the column default and `post-plan.ts`'s `?? true`, so the three agree.

## Risks / Trade-offs

- **More matches from unposted want lists.** That is the point: Sell only sale lists now count for a new want list, and for the user only, since others see only posted lists. Mitigation: a Swap post without "also pay" narrows it back, and the list page header names the choice.
- **Open tabs.** An open tab's Create list still sends `matchSale: false` from its old bundle, so it saves Swaps only until it reloads. That is acceptable: the old behaviour, not a broken one.
