# Proposal

## Why

`sale-list-open-to-swaps` lets one post say "selling these, or swap for those". Traders also post "WTS/WTT/WTB": sell these, swap for those, or pay for those. Today a Sell post's want list is always saved Swaps only, so the seller can't say they would also pay. A Buy post can't hold that want list either, since a list is in one post at a time. Before this change, the only way was a second want list with the same objekts, kept in step by hand.

A Swap post already has "I'd also pay for what I'm looking for", which saves its want list Swaps or buying. This change offers the same option on a Sell post's want list.

## What Changes

- **Composer** (`/trade`, New post, Sell step): once "Also open to swaps" is ticked and a want list is picked, "I'd also pay for what I'm looking for" can be ticked, as on the Swap step. Ticked, the want list saves Swaps or buying; unticked, Swaps only, as now. Unticking "Also open to swaps", or removing the want list, clears it.
- **Tags:** a Sell post whose want list is open to buying carries **WTS, WTT and WTB**, in that order. It is listed under all three in Browse's Post type menu.
- **Matching:** no new rule. The want list matches by its Open to, as every want list does. Sellers with what it looks for find it, and so do people with something to swap.
- **My posts and the list page's Trade line:** a Sell post that would also pay says "Would also pay", as a Swap post that would also pay does.
- **Help:** the "?" tag table's WTB row names a Sell post that would also pay.

## Non-goals

- A post table, or one list in several posts.
- Buying only on a pair's want side: a pair still needs swaps (`list_pair_buying_only`).
- Any change to a Swap or Buy post, or to Market.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: "Sale list pairs": the want side is open to swaps, and may also be open to buying.
- `web-trade-browse`:
  - "Posts from lists on Trade": a sale pair whose want list is open to buying is tagged WTS, WTT and WTB;
  - "Post composer": "also pay" on Sell;
  - "Tag help": the WTB row.

## Impact

- **Database:** none. A want list's Open to is already stored, and the pair rule already accepts Swaps or buying.
- **API:**
  - `schemas/trade-post.ts`: `composerWrites`, `tagsOf`, `postKindOf` and `editStart`.
  - `TAG_WHERE.wtb` in `services/trade-feed/query.ts`.
  - The `trade.savePost` input is unchanged (`alsoPay` is already there).
- **Worker:** none. Alerts read the want list's Open to.
- **Web:**
  - the composer's Sell step;
  - the "Would also pay" detail in My posts;
  - the help row;
  - en/ko/ja strings.
- **Order:** this change builds on `sale-list-open-to-swaps`. Archive it after that change, since its deltas modify that change's version of the requirements.
