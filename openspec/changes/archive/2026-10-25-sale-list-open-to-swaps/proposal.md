# Proposal

## Why

Traders often sell an objekt or take a swap for it in one post ("WTS/WTT"), as the October 2026 read of the tripleS #objekt-trade channel showed. Today that takes a have list and a sale list holding the same objekts, kept in step by hand, and Browse shows two posts. A want list says this in one list with its Open to; the giving side has no equivalent.

## What Changes

- A sale list gets an **Open to** choice, set by its post: **Sell only** (the default, kept by every existing sale list) or **Sell or swap**.
- A sale list open to swaps acts like a have list for swapping:
  - it also matches want lists open to swaps;
  - it counts toward Can swap, on either side;
  - it counts for want-list alerts.
- It may be linked to a want list ("selling these, or swap for those"). The pair is one post, and the want side must be open to swaps.
- Its post carries **WTS and WTT**, WTS first, and is listed under both tags.
- **Composer** (`/trade`, New post):
  - Sell gains "Also open to swaps", and with it ticked, an optional want list.
  - Unticking it on a paired list asks to unpair first.
- **Lists** (`/list/{slug}`, `/@{nickname}/list/{slug}`): the header and card read "Sell or swap".
- **Help:** the "?" tables gain the new rows, and the changelog gets a line.
- Have lists stay swaps only: selling needs prices and a currency, which only sale lists carry.

## Non-goals

- Merging have and sale lists, or prices on have lists.
- "Also pay" on the want side of a sale pair; it saves Swaps only.
- Swap ratios or terms on a post.
- Any change to Market, which lists sale lists by price whatever their Open to.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`:
  - "Want list match option" covers a sale list open to swaps;
  - adds "Sale list Open to" and "Sale list pairs".
- `web-trade-browse`:
  - tags and pairs in "Posts from lists on Trade";
  - the mutual score in "Matches to the signed-in viewer";
  - Sell's options in "Post composer";
  - new rows in "Tag help".
- `web-trade-for-you`: which sale lists count in "Account-wide matches".

## Impact

- **Database:** `lists.takes_swaps`, a boolean defaulting to false and allowed true on sale lists only. One additive migration, run only with approval, locally first.
- **API:**
  - `schemas/open-to.ts` and `schemas/trade-post.ts`;
  - `offerMatchesWantSql` in `services/trade-lists.ts`;
  - the candidates and recount swap flags;
  - the feed's tag SQL and post grouping;
  - the viewer's indexes;
  - `checkLinkedList` and a new refusal.
- **Worker:** nothing of its own; alerts read `offerMatchesWantSql`.
- **Web:** the composer's Sell step, the list labels, the help tables, the changelog, and en/ko/ja strings.
- **Order:**
  - Archive `want-list-rules` first; this change's "Tag help" delta builds on that version.
  - `want-buying-only-unpaired` also edits "Want list match option", so whichever is archived second rebases on the main spec.
