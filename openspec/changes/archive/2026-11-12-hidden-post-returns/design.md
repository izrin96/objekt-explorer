# Design

## Context

`job/want-alerts` reads each new `list_entries` row (by id cursor, plus a late-commit overlap, newly listed lists and a 24-hour recheck of entries not owned yet) and pairs it with the lists of other people it matches (`fetchPairs`). The new entry always belongs to the partner; the other list's owner is the recipient. Until now the query dropped every pair whose new entry sits in a post the recipient hid (`inHiddenPostSql`). `judge` then applies the recipient's alert settings, skips a collection the wanter already holds, and checks the offer's owner can trade a copy (`collectionVerdict`), returning `unowned` pairs to be read again.

A hide is a `hidden_trade_post` row keyed by the post's lead list, with `created_at`. `list_entries` has `created_at` too.

## Goals / Non-Goals

**Goals:**

- One place decides "a new entry matches": the alerts job. For you and Browse keep filtering on the hide row and need no change.
- A post never returns because of an entry that was there when it was hidden.

**Non-Goals:**

- Computing "should this be hidden" at feed read time. It would put an entry-time comparison in every feed query.

## Decisions

### The alerts job unhides, by deleting the hide row

`fetchPairs` keeps a pair from a hidden post when `entry.created_at > hide.created_at` and returns it with `hidden: true`; older entries stay excluded as before. `selectUnhides` (pure, tested) picks the hidden pairs whose match is real, and `recordRun` deletes those hides in the transaction that writes the alerts and the cursor, before the alerts.

Alternative rejected: a read-time rule in `feedWhere`. Every Trade read would join entries to hides by time, and alerts would need the same rule again.

### It ignores alert settings

`selectUnhides` shares `tradable` with `judge` (wanter holds none, offer owner can trade) and skips the settings checks. A user with alerts off still gets the post back; the alert itself still goes through `judge`. So an alert is always sent with its post visible, and a post can return with no alert.

Alternative rejected: unhide only when an alert is sent. People on Off would never see the post again, and people on Can swap only when the partner is mutual, which is not what "new content that matches" means.

### Both directions

A new want entry on the hidden post that the user's have or sale list offers also brings it back. The hide is of the post, both halves, and the job already pairs both directions.

### Entries a rule adds do not count

A rule's refresh inserts `list_entries` rows with a new `created_at` whenever the rule starts to want a collection again (the owner sent a copy away, a new collection dropped). Those are not the owner changing the post, so a pair from a hidden post is kept only when its entry has no `rule_id`. A rule the owner adds after the hide therefore does not bring the post back either; hand-added entries do.

### The hider's trade cache is bumped

For you's people reads are cached per user under their trade version. Unhide bumps it, so the job does too after its transaction commits, or the alert's link would open a page still missing the post for up to five minutes.

### A hide made during the run is kept

The delete carries `created_at < run start`, so a hide the user makes between the pairs read and the write is not removed by an entry read before it.

### Unowned hidden pairs join the existing recheck

`selectUnhides` returns its own `unowned`, merged into the run's `recheck` ids, because `judge` drops a pair before the ownership check when the recipient's alerts are off, and those would otherwise never be read again.

## Risks / Trade-offs

- [A post the user hid as unwanted keeps coming back as its owner adds matching objekts] → Only a real match returns it, and hiding the person is permanent. The Hidden description says so.
- [The hidden path had no local data: no hide rows exist locally] → Checked with temporary local hide rows: a hide older than the entry flags the pair, a newer one excludes it, and the delete finds the row. The lead-list branch reuses the predicate `inHiddenPostSql` already had.
- [`want_alert_sent` drops a pair already alerted for the same lists and collection] → Accepted: an objekt removed and added again is not new.
- [Worker images are built on the VPS, not in CI] → The change is inert until the worker is rebuilt; the web deploy alone only changes one sentence.

## Migration Plan

Deploy the web as usual. Rebuild and restart the worker on the VPS. Rollback is the previous worker image: hides already removed stay removed, and nothing else was written.
