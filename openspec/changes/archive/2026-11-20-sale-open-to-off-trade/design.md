# Design

## Context

A sale list's Open to is one boolean, `lists.takes_swaps` (Sell or swap when true), allowed on sale lists only (`lists_takes_swaps_sale_only`). `SaleOpenTo` and `saleOpenToOf` (`packages/api/src/schemas/open-to.ts`) decode it, though nothing calls `saleOpenToOf` yet. Only `trade.savePost` writes it after create: `list.create` and `list.copy` take no such input and `writeList` leaves the column at its default, false. `takesSwaps` and `isProfileBind` are already in every list read the header, the rows and the edit form use (`toPublicList`, `fetchOwnedLists`, `findOwnedList`).

The want-list twin, `show-open-to-off-trade` (code commit `924882781`), added `offTradeOpenTo` (`features/list/list-open-to.ts`), `ListOpenToBadge` (already rendered by `list-header.tsx` and `list-rows.tsx`), `OpenToField` behind `ListForm`'s `showOpenTo` (already passed by the create, copy and edit dialogs), `toEditInput`'s send-only-a-change rule, and `openToEdit` with `CASE` columns in `services/list/edit.ts`. This change extends each of those to the sale list.

**Where the sale case differs from the want list:**

- **Binding decides it, not only Trade.** A want list can always go on Trade and always takes part in its owner's matches. A sale list takes part only while bound to a Cosmo profile (`matchableList`, `boundOfferList`), and the edit form cannot bind it later (the switch is disabled in edit). An unbound sale list's choice therefore does nothing now and can never matter, so it gets no badge and no field.
- **What off Trade still decides.** The brief expected an off-Trade sale list to affect nothing the owner sees. The code says otherwise for a bound one, as the specs already require ("The user's own lists count whether or not they are discoverable", `web-trade-for-you` Account-wide matches):
  - `fetchViewer` (`services/trade/feed/viewer.ts`) reads every sale list of the owner's and puts a Sell or swap one in `tradeHave`, so Browse's "You have N they want", near matches and the offer picker's tags move with it.
  - `resolveTradeSides` (`services/trade/matches/recount.ts`) takes every `matchableList`, posted or not; `candidates.ts`' `my_have` applies `offersSwapsSql` to them, so For you, Find matches and Can swap move with it.
  - The reverse branch of `apps/worker/src/job/want-alerts/pairs.ts` joins the recipient's lists through `boundOfferListSql` and `offerMatchesWantSql` with no Trade condition, so "Someone wants what you have" fires from an off-Trade Sell or swap list for a want list open to swaps only, and not from a Sell only one.

  So the copy may say the choice decides which want lists match it in the owner's matches and alerts, exactly as the want list's does. Other people's matches, Browse and Market still never see an off-Trade sale list.
- **The input is a boolean on create, an enum on edit**, as the want list's is (`matchSale`/`matchHave` on create, `openTo` on edit).
- **The pair rule points the other way.** A paired want list can't be Buying only; a paired sale list can't be Sell only (`list_sale_links_sell_only`, already in `PAIR_MESSAGES`).

## Goals / Non-Goals

**Goals:** the owner sees and sets a bound sale list's Open to while it is off Trade, on the same badge and form paths as the want list, with the same race and old-tab safety.

**Non-Goals:** any change to how Open to matches (`offersSwaps`, `offerMatchesWantSql`, the viewer index), to the composer, or to what visitors see.

## Decisions

1. **Bound and off Trade.** The badge and the field appear only for `listType === "sale" && isProfileBind && !discoverable`. Alternative: every off-Trade sale list, as the want list does. Rejected: on an unbound list the choice has no effect, and the field's description would say it has one.
2. **Owner only, reuse the badge.** `offTradeSaleOpenTo(list)` beside `offTradeOpenTo` in `list-open-to.ts` returns the `SaleOpenTo` of a bound sale list off Trade, or null, through `saleOpenToOf` (missing `takesSwaps` reads as Sell only). `ListOpenToBadge` asks both helpers and draws whichever answers, so the header and row need no edit. Labels: `SALE_OPEN_TO_LABEL` in `list-type-labels.ts`, reusing `trade_line_sell_only` and `trade_line_sell_or_swap`; screen-reader text reuses `list_open_to_badge_label` ("Open to: Sell only"). One helper returning both unions was rejected: `"both"` means Swaps or buying on a want list and Sell or swap on a sale list.
3. **The form.** `SaleOpenToField` in `list-form-fields.tsx`, the same `RadioGroup` pattern as `OpenToField`, with the shared radio markup factored into one local component so the two fields cannot drift. The label reuses `list_open_to_label` and the field's description reuses `list_open_to_desc` ("Decides which lists match it in your matches and alerts. Once it's on Trade, its post sets this."), which is true of a bound sale list. `ListForm` renders it behind the existing `showOpenTo` when the draft is a bound sale list; Sell only is disabled with its hint when `linkedListId` is set. No new prop: create, copy and edit already pass `showOpenTo` with the composer cases excluded.
4. **Draft.** `ListDraft` gains `takesSwaps` (false in `EMPTY_DRAFT`, `list.takesSwaps` in `toDraft`). `toCreateInput` sends `takesSwaps` true only for a bound sale list. `toEditInput` drops it and sends `saleOpenTo` only when a fifth argument, `storedSaleOpenTo`, is non-null and the draft differs, as it does for `openTo`. The edit dialog computes `storedSaleOpenTo` from the seed with `offTradeSaleOpenTo`, null inside the composer, and shows the field when either stored value is non-null.
5. **Create and copy offer it.** The want-list form offers Open to on create and copy, so the sale form does too. `createListInputSchema` gains `takesSwaps: z.boolean().default(false)`: an old tab and `/api/v1` get Sell only, as today. `writeList` stores `listType === "sale" && isProfileBind && takesSwaps`. `toCopyDraft` keeps the source's `takesSwaps` only for a sale source copied as a sale list (`CopySource` adds the field); any other copy starts at Sell only. Alternative: no field on create, the owner sets it in edit or Post sets it. Smaller (no create input), but a sale-to-sale copy would then silently drop Sell or swap. Left as an owner question below.
6. **`list.edit` takes `saleOpenTo: z.enum(["sell", "both"]).optional()`**, a field apart from `openTo`. Widening `openTo` was rejected: `"both"` would mean two things, and `openToEdit` would branch on type. A boolean `takesSwaps` would mirror the column, but the edit input names choices (`openTo`), not columns; the enum also reads the same in an `/api/v1` call. Omitted keeps the stored value, so an open tab validates unchanged.
7. **One pure rule.** `saleOpenToEdit(list, saleOpenTo)` in `schemas/open-to.ts`, beside `openToEdit` and tested the same way: keep when nothing is sent, for any other type, for an unbound sale list, and on Trade; refuse Sell only when `linkedListId` is set (`list_sale_links_sell_only` with `PAIR_MESSAGES`); otherwise write. On Trade it keeps rather than refuses, so an old tab or a post that went up after the form opened still saves the rest.
8. **Race-safe as the want list is.** `editList` writes `takes_swaps` as `CASE WHEN <keep> THEN takes_swaps ELSE <new> END`, `<keep>` being `discoverable`, and for Sell only also `postPartnerSql("lists") IS NOT NULL`. A Sell only write runs inside `lockTradeLists`, as a Buying only write does, since the pair guard reads `trade_post` rows a pairing writer may be creating. The two conditions under which `editList` takes the lock become one: either write could break the pair guard.
9. **No new cache work.** `editList` already calls `touchList`, which bumps the owner's trade version; `fetchViewer` reads `takes_swaps` live, and `useEditList` already invalidates the lists, the list reads, `trade.key()` and `list.find`.
10. **Post it needs no change.** `startForList` (`schemas/trade-post.ts`) opens an unpaired sale list on Sell with `alsoSwap: list.takesSwaps`, and a paired one with `alsoSwap: true`. A spec scenario pins it.

## Messages

New keys, after `list_open_to_pair_hint`. The ko and ja lines are drafts for the owner's review (ko 합니다체, ja polite with 。 where en ends with a period):

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `list_sale_open_to_sell_desc` | Want lists open to buying. | 구매를 받는 희망 목록과 매치합니다. | 購入を受け付ける希望リストとマッチします。 |
| `list_sale_open_to_both_desc` | Want lists open to buying, and those open to swaps. | 구매를 받는 희망 목록, 그리고 교환을 받는 희망 목록과 매치합니다. | 購入を受け付ける希望リストと、交換を受け付ける希望リストとマッチします。 |
| `list_sale_open_to_pair_hint` | A paired sale list stays open to swaps. | 연결된 판매 목록은 교환을 받아야 합니다. | ペアの販売リストは交換を受け付ける必要があります。 |

Reused: `trade_line_sell_only`, `trade_line_sell_or_swap`, `list_open_to_label`, `list_open_to_desc`, `list_open_to_badge_label`. No `api_errors_*` key: `list_sale_links_sell_only` has one.

## Risks / Trade-offs

- [The owner reads Sell or swap on an unposted list as something buyers see] → owner-only badge; the description says it decides the owner's own matches and that the post sets it once on Trade.
- [Posting replaces the form's choice with the composer's] → the composer opens with the stored choice, and Post it is disabled while the choice is unsaved (the Trade line's save-first note).
- [Reused `trade_line_*` labels change with the Trade line's wording] → that is wanted: the line and the badge name the same choice.
- [`slim-list-entries` also edits `packages/api/src/schemas/list.ts`, adding entry-row schemas] → this change touches only `createListInputSchema` and `editListInputSchema` there; expect a textual merge only. No other in-flight change modifies the `web-lists` requirements this one does.

## Open Questions

- Should create and Copy as new list offer the choice (decision 5), or only edit? Either way the specs' edit and badge behaviour stands; dropping it removes the create input and the copy-draft change. **Answered:** both offer it, shipped in 0be73c11 (group 6).
- Should an unbound sale list show or take the choice (decision 1)? It can never take part in matching or go on Trade unless copied as a bound list. **Answered:** no; an unbound sale list shows and takes none, as shipped in 0be73c11.
