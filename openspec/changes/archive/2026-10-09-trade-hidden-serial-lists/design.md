## Context

See proposal.md for why.

- `lists.hide_serial` is honoured by the list pages: `services/list.ts:108` maps hidden entries through `overrideCollection` with no serial.
- Every You get item comes from `allowedEntries(addressed)` (`services/offer/core.ts:266`). It returns `{ listId, listSlug, collectionSlug, objektId }` for the partner's lists that are on Trade.
- `resolveTheirItems` (`picker/theirs.ts`):
  - a specific entry becomes one candidate with its serial;
  - an any-copy entry becomes an "Any copy" placeholder, **plus** every copy the partner holds of that collection as a specific candidate (`for (const objekt of held)`).
- Server validation in `createOffer` (`services/offer/index.ts`) matches each get item to an entry with `matchEntry`. If nothing matches, it accepts a kept give from `counteredGives`, and otherwise refuses with `not_listed`.

## Goals / Non-Goals

**Goals:**
- One change point: the entries carry `hideSerial`, and both the picker and validation respect it.

**Non-Goals:**
- A new UI for hidden entries. The existing any-copy tile fits.

## Decisions

**1. `allowedEntries` returns `hideSerial`.** It selects `lists.hideSerial` with the list, and each entry carries it. There's no extra query.

**2. Picker.** In `resolveTheirItems`, an entry with `hideSerial` is treated as any copy, whatever its `objektId`: the placeholder, and none of the `held` copies. Specific copies for a collection still come from that collection's entries on visible lists. The `seen` set already merges placeholders per collection, so a collection on both kinds of list shows one placeholder and the visible copies.

The placeholder counts only the copies the hidden entries name. `anyCopyScope(entries)` (pure, `lib/offer-rules.ts`) maps each collection to `null` when an entry covers the whole collection, else to the set of tokens its hidden entries name. The picker's `copies` and the send-time copy check both count only copies in scope. A listed token that has left the wallet stops counting, so a hidden entry can't open copies the partner never listed. The count gives no serial away.

**3. Validation.** `entryObjektId(entry)` (pure) is the one rule for "the token an entry offers by serial": none for a hidden entry. `matchEntry` uses it: it ignores `hideSerial` entries when the item names a specific objekt. Any-copy items still match any entry of the collection. The kept-give fallback is unchanged. A failed match uses the existing `not_listed` refusal, so the response doesn't reveal that the objekt is on a hidden list. `createOffer` passes `anyCopyScope(entries)` to `checkItems` as `getScope`, so asking for more copies than are in scope is refused like any other shortfall. Accept's recheck doesn't apply the scope: the count was capped when the offer was sent, and accept only checks the copies are still there.

Alternative considered: keep specific picks from hidden lists but blank the serial in the views. Rejected, because the objekt id still identifies the token (the objekt page, the chain), and a specific copy with no serial couldn't be checked before sending.

## Risks / Trade-offs

- [An owner who hides serials gets fewer specific offers] → That follows from hiding serials. Any-copy offers still reach them, and they can counter with a specific copy.
- [An existing open offer names a specific objekt from a hidden list] → It stays as sent. A counter keeps working through `counteredGives`.
