# Proposal

## Why

Online objekts minted after the v1 cutoff get their serial from mint order: the objekt's position by token id within its collection. Cosmo does not number them that way. A read of production on 2026-11-18 found 55 of 1,494 such objekts held by connected accounts off by one shift per collection: five Atom02 101Z collections 315 to 330 too low, two others 1 too low. Cosmo also mints two tokens with one serial now and then, which pushes mint order the other way. Connected accounts already show us Cosmo's serial for these objekts, and `cosmo-objekt-ownership-data` records it, but only compares it.

## What Changes

- A connected account's Cosmo serial for an online objekt minted after the v1 cutoff becomes a confirmed serial under the same trust rules as an offline one: the chain confirmed the holder at the read, the objekt has not been received since, and the token sits in the collection the read names.
- A new `COSMO_OBJEKT_WRITES` word, `online-anchors`, ships off. With it on, the online serial job numbers each collection from its confirmed serials: an anchored token takes Cosmo's serial, a later token counts on from the nearest anchor before it, and tokens before the first anchor keep mint order. Two tokens may end up sharing a serial, as Cosmo's own do.
- A collection whose confirmed serials run backwards (a higher token with a lower serial) uses none of them and reports each to the operator.
- A new confirmed serial rewrites its collection within the run that first uses it, even when the collection has no unnumbered objekt.
- Reads already recorded for online objekts are judged again once, so the existing reads of post-cutoff online objekts count without waiting for each account's next sync.
- The read-only plan script shows the online serials confirmed serials would move per collection, with the conflicts, instead of a bare comparison.
- Pre-assigned collections keep the offline path; serials of objekts minted before the cutoff stay untouched.

No route changes; every page showing an online serial shows the corrected number once the worker rewrites it.

## Capabilities

### New Capabilities
- `worker-online-serials`: how the worker numbers online objekts minted after the v1 cutoff, and how confirmed serials anchor that numbering.

### Modified Capabilities
- `worker-offline-serials`: the requirement "Online and v1 serials are compared, never written from reads", added by `cosmo-objekt-ownership-data`, is replaced by one that keeps only v1 serials compare-only.

## Non-goals

- The "~" estimate mark on trade surfaces. Every post-cutoff online serial stays marked as estimated, anchored or not; marking anchored ones exact is a follow-up.
- Finding where between two anchors Cosmo's numbering jumped. The count runs on from the earlier anchor and the gap shows at the next one.
- Changing serials of objekts minted before the cutoff, or of pre-assigned collections.
- Any extra Cosmo request, a faster sync, or a manual anchor command for online collections.
- Explaining why Cosmo's numbering runs ahead of the chain.

## Impact

- `packages/lib`: `cosmo-objekt-writes.ts` gains the `online-anchors` word.
- `apps/worker`: `lib/cosmo-objekts.ts` (`serialEligible`), `lib/serial-math.ts` (`computeOnlineSerials` takes anchors), a new pure online anchor merge beside `lib/cosmo-anchors.ts`, `job/populate-serial.ts` (online path loads confirmed serials and rewrites collections with due reads), `job/confirmed-serials.ts` (selects offline slugs only), `script/cosmo-objekt-plan.ts`, `script/check-serial-order.ts`, a one-off re-judge script, `AGENTS.md`.
- App database: no schema change. The re-judge writes `serial_eligible` and `serial_due` on existing `cosmo_objekt` rows (owner-approved production write).
- Indexer database: `objekt.serial` of online post-cutoff objekts in collections with confirmed serials.
- Ordering: archive after `cosmo-objekt-ownership-data`, whose requirement this change replaces.
