# Design

## Context

A want list entry is a `list_entries` row with a `collection_slug`; want lists are never bound to a profile, and a rule's entries carry `rule_id`. Trade matching, the feed and want alerts read those rows in the main database, while who holds what lives in the indexer database, so "is this entry held" cannot be joined into those reads.

A leg becomes verified in three places, and all three finish in `finishSettle` (`packages/api/src/services/offer/verify.ts`) inside one transaction under the trade's row lock: the worker's verifier (a transfer), `confirm.ts` (the receiver marks it received) and `acceptCopy` through `substitute.ts` or the worker's deadlines (a different copy accepted). The worker imports `verify.ts`, so it must stay clear of `env.ts` and `services/redis`.

Rules already drop what the owner receives through the worker's `refresh-list-rules`, which deletes and re-inserts their entries.

## Goals / Non-Goals

**Goals:**

- One write at one known moment, with no new state on entries.
- Nothing changes for a list until its owner (or the create form's default) turns the switch on.

**Non-Goals:**

- A held flag on entries kept fresh by the worker. Every Trade read would have to respect it.

## Decisions

### Delete the entry when the leg is verified

In the transaction that marks the leg verified, for the legs verified in that moment:

```sql
DELETE FROM list_entries e USING lists l, trade_leg g
WHERE g.id = ANY(<the legs just verified>) AND g.verified_at IS NOT NULL
  AND l.user_id = g.to_user_id AND l.list_type = 'want' AND l.remove_on_receive
  AND e.list_id = l.id AND e.collection_slug = g.collection_slug AND e.rule_id IS NULL
  AND e.created_at < g.verified_at
```

It runs with the verification, so the two cannot drift, and it runs for a leg whose trade later fails, since the receiver holds the objekt either way. It is keyed by leg, never by trade: reading every verified leg of the trade on each settle would delete an entry the receiver added back, or reach back to legs verified before the list's switch was turned on.

Alternatives rejected:

- Skip while held, as rules do: needs a per-entry flag and a change to every matching, feed, count and alert read.
- Remove on trade completion only: a receiver whose partner's leg arrived keeps a stale want until their own leg lands, which is the case reported.
- A worker job comparing holdings with want lists: covers gifts too, but removes entries for reasons the owner never sees, and costs an indexer read per list.

### Where the step lives

`removeReceived(tx, legIds)` in `services/list/received.ts`, called at the three places that set `verified_at`: the verifier's loop in the worker, `acceptCopy` (every accepted copy, the receiver's and the worker's) and `confirmLeg`. It is not in `finishSettle`: that is handed a count, not the legs, and an expiry that accepts a copy but still ends the trade unfinished never calls it. It imports nothing the worker cannot load.

### Caches after the commit

Nothing is bumped. A trade version only refreshes that user's own cached For you reads, which expire within five minutes; partners' pages are cached per partner and were never reached by it. No link or notice points the receiver at the stale page, and bumping would mean carrying the changed owners out of each settling transaction in the verifier. It also does not call `touchList`: `updated_at` is the owner's own edit, and a removal by a trade must not keep an idle post listed or show it as updated.

### The switch

`lists.remove_on_receive boolean NOT NULL DEFAULT false`. The column default is false so every existing list stays off and a create from an old tab makes a list with it off. The web's create form sends `true` for a want list unless the user turns it off. `createListInputSchema` and `editListInputSchema` take it as optional: absent on create means false, absent on edit keeps the stored value. The server saves false for any list that is not a want list. A copy takes what its form sends, and the copy form starts from the source's value when both are want lists. Only `list.find`, the owner's read, returns it.

### The trade page line

`trade-view.ts` adds `wantedOn` to the viewer's own verified You get legs: the viewer's want lists (switch off) that held the collection as a hand-added entry before the leg verified, by slug and name. An entry added after the leg verified is the owner asking again, so it shows no line. One procedure, `list.dropReceived`, serves both buttons: it deletes the given collections' hand-added entries from that list, and with `always` turns the switch on in the same transaction. Remove sends the line's collection; Always remove from this list sends every collection this trade shows for that list, since turning the switch on ends all of that list's lines at once. The lines sit together under You get, one per collection and list, since The exchange draws legs as grouped tiles with no row to hang a line on.

The line is computed on read, so it also covers trades verified before the deploy.

### No record of what was removed

Nothing stores "removed by T-1628". The switch is the user's choice and its text says what it does. A record would need a table or a notification type, for a deletion the user asked for.

## Risks / Trade-offs

- [A user with the default-on switch on a new list loses an entry they meant to keep] → The create form shows the switch and its one-line explanation; it is one tap to turn off. Existing lists are never switched on.
- [The delete runs under the trade's row lock and touches `list_entries`] → It takes row locks on the entries only, never on `lists` rows, so it does not join the `lockTradeLists` order. Confirm against `syncRuleEntries` (which locks the rule row, then its entries) when implementing.
- [Removal is silent] → Accepted for this change. The trade page line and the form text are the two places the behaviour is stated.
- [Worker images are built on the VPS] → Until the worker is rebuilt, transfers it verifies remove nothing; legs settled by the web do.
- [An entry removed while a For you page is cached] → Every cached page, the owner's included, catches up when it expires, within five minutes.

## Migration Plan

1. Generate the migration for the new column (`db:generate`). Running it on production needs the owner's approval; the column is nullable-safe (default false), so the old code runs unchanged against it.
2. Deploy the web. The switch appears; web-settled legs start removing.
3. Rebuild the worker on the VPS. Verified transfers start removing.

Rollback: deploy the previous images. The column can stay; nothing reads it.

## Open Questions

- The switch's exact label and help text in ko and ja, to be written with the form.
