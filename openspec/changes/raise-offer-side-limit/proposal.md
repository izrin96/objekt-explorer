# Proposal

## Why

Each side of an offer holds at most 50 objekts (`OFFER_SIDE_LIMIT`), so a collector clearing doubles or answering a long want list has to split one deal into several offers. The owner asked to raise it, to about 200. A read of accept, send, the verifier and the views (design.md, Findings) shows 200 fits with one fix first. No statement nears a cap, and 200 is the largest number the current picker page allows. But a counter reads the sender's copies once per any-copy ask, and past about 115 asks that runs into the picker's rate limit of 120 reads a minute.

## What Changes

- **Prerequisite:** a counter's any-copy asks on You give take their copies from one `offer.candidates` read for the set of collections (a new optional `copiesOf` narrowing), instead of one read per ask. The copies chosen stay the same.
- `OFFER_SIDE_LIMIT` goes from 50 to 200, on both sides. Everything derived from it follows: the send refusal `too_many`, the request cap (`OFFER_SIDE_LIMIT * 10`, now 2000 items a side), the counter's flag read (`objektIds`, now up to 200), the matches prefill (`chooseMatchPicks`), near picks (`withNear`), the pickers' and the serial dialog's room, and the builder's side counts and Send gate.
- No string changes: every string that names the limit takes it as `{max}`.
- One test that hard-codes 50 and 60 (`offer-prefill.test.ts`) derives from the constant instead.
- `packages/api/docs/offers.md` records the invariant `OFFER_SIDE_LIMIT ≤ CANDIDATE_PAGE_SIZE`, which caps the limit at 200 until the page size changes.
- A browser pass on the local stack fills a side past 50, and measures how the offer page and the trade page respond with 200 objekts a side. Both draw every tile today (design.md, Decision 3).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: the side limit, the any-copy count's ceiling, the serial dialog's room and footer, the matches cap and the added-matches line, and the offer page layout scenarios change from 50 to 200.
- `web-trade-near-matches`: the full-side scenario changes from 50 to 200.

## Impact

- **Routes:** `/trade/@<handle>/offer` (the builder, its pickers and serial dialog), `/trade/mine/$tradeId` (the trade page), and the offer card in `/messages`. A 200-a-side offer reaches all three.
- **API:** `packages/api/src/schemas/offer.ts` (the constant, and the optional `copiesOf` on the picker narrowing), `services/offer/picker/mine.ts` (serves `copiesOf`). `lib/offer-rules.ts` (`validateShape`) and `lib/offer-prefill.ts` follow it unchanged. `lib/offer-prefill.test.ts`. `docs/offers.md`.
- **Web:** `features/offers/queries.ts` and `builder/form.tsx` (one copies read for a counter's asks), `builder/draft.test.ts`. Everything else imports the constant. `docs/offers.md` notes the size the two unvirtualised grids carry.
- **Worker:** no change. A 400-leg trade runs the verifier's per-leg loops four times longer than today's 100 legs (design.md, Findings 4).
- **Database:** no migration.
- **Open tabs:** `copiesOf` is optional, so an older tab's per-collection reads still validate. An older tab keeps its own 50 in the builder. A newer prefill or counter with more than 50 a side shows over the limit there, with Send disabled, until the tab reloads (design.md, Findings 7).

## Non-goals

- Virtualising the builder's sides or the trade page's exchange. Both draw every tile. The browser pass measures them, and Open Questions says what follows if the measure fails.
- Batching the verifier's per-leg statements (`settleTrade`, `recordAway`, `autoAccept`, `writeNotes`). It is a follow-up, not a prerequisite.
- `CANDIDATE_PAGE_SIZE` (200), `OFFER_VIEWS_LIMIT` (50 offers per `offer.views` call), `THREAD_PAGE_SIZE`, `NOTE_OBJEKTS` (3) and the offer card's tile count (`SIDE_TILES`). They are separate limits, unchanged.
- `OPEN_OFFER_LIMIT`, the lopsided-accept rule (`LOPSIDED_RATIO`), the ratio chip and the recipient's offer rules. None depends on the count.
