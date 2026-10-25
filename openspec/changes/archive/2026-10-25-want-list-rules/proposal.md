# Proposal

## Why

Traders on the tripleS #objekt-trade channel mostly want by rule, not by objekt: in 26 hours (Oct 23–24, 2026, 1,749 unique posts), 76% of swaps changed only the member within one collection ("Have Lynn cc366, Want YooYeon cc366"), and wants read "any cc366", "any CC FCO 3rd" or "any I don't have". A want list holds exact objekts only, so such a trader must add 24 to 96 entries by hand, or stay on Discord.

## What Changes

- A want list can hold **rules** beside its objekts. Two kinds:
  - **Any member of a collection**: a season and collection number ("CC366"), any member, optionally a few prio members (shown, not matched).
  - **Class, season and edition**: a class, a season, one or more editions (or any), and any member or chosen members.
  - Both skip collections the owner already holds on a linked address unless "Skip ones I own" is off.
- A rule covers at most 500 objekts; a wider one is refused with a message. A rule with nothing left to match can't be added while Skip ones I own is on.
- Each rule becomes ordinary want entries, one per collection it matches, kept current as collections are indexed and the owner's holdings change. Matching, counts, Can swap and want-list alerts therefore treat a rule's objekts like objekts added by hand.
- **List page** (`/@{nickname}/list/{slug}` and `/list/{slug}`): an **Add rule** button in the owner's header for a want list; a collapsible **Rules** strip between the header and the filter bar, one row per rule with its "N can match" count and a menu (See objekts, Edit rule, Turn into objekts, Delete rule). Rule entries stay out of the objekt grid and its count.
- **Add to list dialog** (from any objekt): when the picked list is a want list, an **Any member of {collection}** option adds the rule instead of the one objekt, with that objekt's member as prio.
- **Trade** (`/trade`, `/trade/for-you`): a post's Want strip shows each rule as one tile (RULE, its label, "N you have" for the viewer) before its objekts. On For you, the viewer's own rules that matched a partner's objekts are named under the strips.
- Share, export and the Discord format write a rule as one line ("Want: any CC366 (prio Lynn)").

## Non-goals

- Rules on have or sale lists, or on general lists.
- A ratio or terms note on posts ("1:1 only", "3rd for 1st/2nd").
- Matching that honours prio members; prio is display only.
- A Progress page shortcut ("Want the missing ones") and phone-specific layouts beyond the existing responsive rules; both follow later.
- Unscanned or physical (QR) cards.
- Grouping alerts per rule; they stay grouped per want list per day.

## Capabilities

### New Capabilities

None. Rules belong to want lists, so they extend `web-lists`.

### Modified Capabilities

- `web-lists`: want-list rules: the two kinds, limits, expansion, the Add rule dialog, the Rules strip and its menu, the Add to list option, and export.
- `web-trade-browse`: a post's Want strip shows rules as tiles with the viewer's count.
- `web-trade-for-you`: the viewer's matching rules are named on a partner's row.
- `web-notifications`: a rule's entries alert like hand-added ones, and expansion never re-alerts an entry already alerted.

## Impact

- **Database** (app): new `list_rule` table (definition per rule); `list_entries.rule_id` nullable foreign key, cascade on rule delete. Needs a migration, run only with approval.
- **API** (`packages/api`): rule schemas, `addRule` / `updateRule` / `deleteRule` / `detachRule` procedures, an expansion service reading collections and holdings from the indexer database, list reads that split rule entries from objekts, the trade feed's rule tiles, and list export.
- **Worker** (`apps/worker`): a `refresh-list-rules` job re-expanding rules as new collections and ownership arrive.
- **Web** (`apps/web`): list header, Rules strip and dialogs, Add to list option, Trade card rule tile, For you rule line; en/ko/ja strings.
- No change to `want-alerts` matching code: rule entries are list entries.
