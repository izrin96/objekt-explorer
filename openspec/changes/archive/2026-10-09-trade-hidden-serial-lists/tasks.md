## 1. API

- [x] 1.1 Add `hideSerial` to `AllowedEntry` and select it in `allowedEntries` (design decision 1). Verify that `@repo/api` lint and typecheck pass.
- [x] 1.2 In `resolveTheirItems`, treat hidden entries as any copy only (decision 2). Verify read-only against production with `offer.candidates`: for a partner with a hidden-serial list (or a local copy of such a list), no candidate from it has an `objektId`. Check that a visible list's copies still show. `@repo/api` lint, typecheck and build pass.
  - Local data, read-only (indexer read-only session): as trade.tester picking from shah, whose have list `kSlj92NcZ` hides serials. Its 3 entries now give one any-copy item (`cream02-xinyu-311z`, 2 spare, no serial) and no specific items. The same objekts still show with serials through shah's visible list `xeJmjGgyG`, which names them (34 specific items of 35).
- [x] 1.3 In `matchEntry` (`services/offer/picker/shared.ts`), match a specific get item only to a visible entry; the kept-give fallback stays (decision 3). Add tests for `matchEntry` (hidden entry with a specific item: no match; with any copy: match; visible entry: match), and verify up to the request boundary that a specific request for an objekt listed only on a hidden list is refused as `not_listed`, and that a counter keeping a given objekt is accepted. `@repo/api` lint, typecheck and build pass.
  - `matchEntry` moved to the pure `lib/offer-rules.ts` (its old home imports the database), with 4 tests. Ran the offer's matching step against shah's real entries, read-only. Token 26659617 is refused as `not_listed` when only the hidden list names it, and accepted through the visible `xeJmjGgyG`; any copy of `cream02-xinyu-311z` is accepted through the hidden list. The kept-give fallback in `createOffer` is unchanged and wasn't exercised.

## 2. Web

- [x] 2.1 Open the builder on a partner whose only list hides serials. Verify that You get shows any-copy tiles with no serials, and that the empty-state and filter text still read right. Web lint, typecheck and build pass (there should be no code change; record it if one was needed).
  - No web code change was needed. On local dev as shah, `/messages/359` → Make offer → "Add from 0x9ca6…8b0d's lists", with trade.tester's only bound have list (`ttdb696763`) switched to hide serials in the local database: all 14 tiles read "Any copy · N held", none shows a serial, and the header, filters and "Only what I want" read as before. At 1280 and 390 px nothing scrolls sideways. The local flag was put back to `false` afterwards.

## 3. Checks

- [x] 3.1 Run `bun run check` and `bun run build` from the root and verify both pass. Run `openspec validate trade-hidden-serial-lists --strict` and verify it passes.

## 4. Review fixes

- [x] 4.1 After review: hidden token entries now open only the tokens they name (`anyCopyScope` / `inAnyCopyScope`), in the picker's count and in the send-time copy check (`checkItems` `getScope`). `entryObjektId` is the one rule for "no serial through a hidden list", used by `matchEntry` and the picker. `AllowedEntry` = `ListEntryRef` + `listId`. `GetItemInput` is inferred from the schema. Comments are trimmed to one. A test covers the scope. Local check: shah's `cream02` placeholder still reads 2 (both of its copies are listed); 3 asks are refused and 2 pass. No local data has a spare unlisted copy, so the cap's extra refusal was verified by the unit test only.

