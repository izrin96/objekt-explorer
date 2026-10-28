# Design

## Context

See proposal.md (Why). The pieces already exist for have and want lists:

- `tradeLineOf` in `packages/api/src/schemas/trade-post.ts` reads a list's line from the viewer's plan lists (`usePlanLists`, which already includes sale lists with `takesSwaps`). It is built on `postsOf` and `groupPosts`, which already fold a sale list into a Sell post, alone or with its want list, so a sale list gets a correct `in_post`, `paired_off`, `off` or `needs_profile` today. Only the `in_post` result leaves out the sale list's Open to.
- `TradeLine` (`apps/web/src/features/trade/trade-line.tsx`) renders it, and `startForList` already opens the composer correctly for a sale list in every state: its post, the pair with "Also open to swaps" ticked, or a lone Sell with `alsoSwap` from `takesSwaps`.
- `ListForm` (`features/list/list-form.tsx`) renders `tradeLine` only for have and want lists (`isPaired`) and renders the Show on Market and Trade `SwitchRow` for sale lists. `toEditInput` sends `discoverable` for a sale list only, and `list.edit` (`routers/list-crud.ts`) applies it through `resolveDiscoverable` and `tradeColumns`.
- `CreateListDialog` ends on its "List created" step with Post it only for a bound have or want list.

## Goals / Non-Goals

**Goals:**
- The composer is the one writer of every list's Trade state; the list form only reads it.
- Reuse `tradeLineOf`, `TradeLine` and `startForList` rather than adding a sale-only path.

**Non-Goals:**
- Changing `list.create` or `list.copy`: their `discoverable` input stays and defaults to off, so the forms just stop sending it.
- Rewording other specs' generic "turns Show on Trade on" phrasing (Bump, live updates), which already means "puts on Trade" for have and want lists.

## Decisions

**`tradeLineOf` adds `alsoSwap` to `in_post`.** It is the sale list's Open to, taken from `postKindOf(post).alsoSwap`, false for Swap and Buy posts. Alternative: have `TradeLine` read `takesSwaps` from the plan list itself. Rejected: the line should describe the post the way `postKindOf` does for every other option, and the pure function is what `trade-post.test.ts` covers.

**The line's words are chosen in a pure helper.** `lineDetail` and `lineHint` (`features/trade/trade-line-parts.ts`, beside its test) return part names, and `TradeLine` maps them to messages. A sale list in a post gets Sell only or Sell or swap first and `trade_post_option_market` ("Also on Market", the string Your posts already uses) last, around the existing Paired with and Would also pay. Both are keyed on the list's own type, not on the post's `kind`, so a want list in a Sell post reads as it did. Off Trade, a pair comes back as a Sell post when either half is the sale list, so the Sell paired-off hint keys on the list or its partner being a sale list; a sale list in no post gets a Market-naming not-on hint. Four new messages: `trade_line_sell_only`, `trade_line_sell_or_swap`, `trade_line_paired_off_sell_hint`, `trade_line_not_on_sale_hint`. Alternative: branch in the component. Rejected: the choice is where the review found two bugs, and only a pure module can be tested here.

**`ListForm` drops the switch and shows `tradeLine` for sale lists too.** The `isPaired` gate becomes have, want or sale. `discoverable` leaves `ListDraft`, `EMPTY_DRAFT`, `listDraftSchema`, `toCreateInput`, `toEditInput`, the edit dialog's `toDraft` and the copy dialog's `toCopyDraft`, and `discoverableDisabled` goes with the switch. Alternative: keep `discoverable` in the draft, fixed at false. Rejected: a field nothing can set is dead state.

**`list.edit` takes no Trade state.** Its input schema drops `discoverable` (Zod strips the key an old tab still sends), and the router drops the `resolveDiscoverable` branch and `tradeColumns(...)` from its update, so the row keeps `discoverable` and `bumped_at` as they are. This matches have and want lists and is what makes "Save from an old tab" hold. `list.edit` is not on `/api/v1`, so there is no public contract to keep.

**Create offers Post it for a bound sale list.** `CreateListDialog`'s success branch adds sale, with `canBeOnTrade` deciding as it does for a have list, and starts `{ ...NEW_POST, kind: "sell", sale: slug }` (Sell only, as a new sale list is). Its description uses `trade_line_not_on_sale_hint` for a sale list so it names Market.

## Risks / Trade-offs

- [A seller who used the switch for a quick off/on now goes through Edit post › Take off Trade] → The Trade line's Edit post sits where the switch was. Take off Trade also takes a paired want list off, which is the point (proposal, Why).
- [Tabs open before the deploy still show the switch, and its save does nothing to Trade] → The save still succeeds for every other field. A reload shows the Trade line.
- [`packages/api/AGENTS.md` already has uncommitted edits from can-swap-per-post] → The doc task touches one sentence in the Trade posts paragraph. Keep it to that line so the two changes can be committed apart.

## Migration Plan

No data change and no migration. Sale lists on Trade stay on Trade and read as one-list Sell posts. Rollback is a plain revert.
