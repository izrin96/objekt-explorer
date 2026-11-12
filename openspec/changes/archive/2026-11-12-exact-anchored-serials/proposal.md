# Proposal

## Why

Trade surfaces mark every serial of an objekt minted after Cosmo's v1 cutoff with "~" and tell the user to check it in Cosmo. For about half of the offline ones that warning is wrong: 329,535 of 653,304 post-cutoff offline objekts (read-only count on production, 2026-11-11) sit in a reserved range that also holds a serial Cosmo supplied, so their serial is that serial plus the token offset, not an estimate. Winter26 (124,173 of 124,175) and Binary02 (all 24,109) are marked as guesses although every one is exact. A mark that is wrong half the time teaches users to ignore it where it matters (Summer26, where no range is anchored).

## What Changes

- A serial is **exact** when its objekt was minted before the cutoff, or when it sits in an **anchored range**: a reserved range of its collection that holds a serial Cosmo supplied (a pre-cutoff objekt's) or a reported serial recorded as a manual anchor. Every other post-cutoff serial stays **estimated**.
- Trade surfaces show "~" and the estimate note only for estimated serials under that rule. The mark's look, wording and accessible name are unchanged.
- The API's `serialEstimated` / `estimated` fields keep their names and types; only the value changes for objekts in anchored ranges.

Routes covered: the offer builder and offer cards in chat under `/messages`, and My trades and the trade page under `/trade`. The staff trade console under `/mod` reads the same fields and follows.

## Non-goals

- Serials of online collections minted after the cutoff stay estimated; their numbering has no anchored ranges.
- No change to how serials are computed, stored or rediscovered, and no change to the worker.
- No estimate mark on surfaces that show none today (profile grids, the objekt drawer, lists).
- No new source of ground truth (reported serials from users, owner-visible `objektNo`); that is separate work.
- The collection's printed estimate ("Max serial (est.)", `api-serial-estimate`) is untouched.
- No schema change and no migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: the requirement "Estimated serials are marked" defines an estimated serial by mint date alone; it changes to exclude serials in an anchored range.

## Impact

- `packages/lib/src/serial.ts`: the pure rule that combines mint date and anchoring, with its test.
- `packages/api`: one read of which objekt ids sit in an anchored range (indexer database, read-only), used by the three places that set the field: `services/offer/verify.ts` (`shownSerials`), `services/offer/picker/shared.ts` (`toCandidate` and its callers in `picker/`), `services/chat/cards.ts`.
- `apps/web`: no code change expected; it renders the field it is given.
- One more indexer query on each trade read that shows serials. Measured read-only on production from a laptop over Tailscale: 99–137 ms for 60 objekts, picking the ids included.
- Evidence the rule is sound: across every stored range holding two or more v1 serials (7,952 ranges, 1,441,567 serials), all but 2 serials (Binary01) agree with the range's lowest-token serial plus the token offset.
