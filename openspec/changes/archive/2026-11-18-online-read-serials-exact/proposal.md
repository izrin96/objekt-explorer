# Proposal

## Why

Since `online-confirmed-serials`, a connected account's Cosmo read sets the serial of the online objekt it names. That serial is Cosmo's own and belongs to the token for life, yet every trade surface still marks it "~" as an estimate, because the mark treats every post-cutoff online serial as estimated. On 2026-11-19 that is 1,648 online objekts whose shown serial matches Cosmo's.

## What Changes

- An online objekt minted after the v1 cutoff reads as exact on trade surfaces when a connected account's read confirmed its own serial and the site shows that same serial.
- Only the read token itself. Tokens counted on from a read stay estimated: Cosmo's unminted serials and double mints between reads can make those counts wrong. The owner chose this over counting on from the read.
- It follows the `online-anchors` word, as the offline pins follow `anchors`: with the word off, every post-cutoff online serial reads "~" as today.
- A read whose serial the site does not show (not yet applied, or left out as a conflict) keeps the mark.

Routes: the offer builder (`/trade` and the chat composer), offer cards in `/chat`, My trades rows, and the trade page's legs. No route is added or changed.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `web-trade-offers`: "Estimated serials are marked" counts an online objekt's own confirmed serial as exact.

## Non-goals

- Tokens without their own read, including those between two reads that agree.
- Offline objekts: their ranges are already pinned by confirmed serials under `anchors`.
- Any surface outside Trade, such as the objekt drawer, which shows no mark today.
- A column on `objekt` for the flag; the reads stay in the app's `cosmo_objekt`.

## Impact

- `packages/api`: `services/objekt/serial-anchored.ts` (`anchoredSerialIds`) adds the online read-token case; a pure helper beside `lib/confirmed-pins.ts` with its test; `docs/offers.md` (Estimated serials).
- Environment: web's `COSMO_OBJEKT_WRITES` needs `online-anchors` for the mark to change; the worker already has it. The worker also reads the mark through `services/offer/verify.ts`.
- Ordering: archive after `cosmo-objekt-ownership-data` and `online-confirmed-serials`, whose versions of the requirement this one builds on.
