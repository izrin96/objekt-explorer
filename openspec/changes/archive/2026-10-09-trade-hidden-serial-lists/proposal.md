## Why

A list can hide its serial numbers ("Hide Serial Numbers"), and the list pages respect that. The offer builder doesn't. When someone opens You get on a partner's hidden-serial list, they see each listed copy's exact serial. They also see the serial of every other copy of that collection the partner holds. The serials then show again on the offer card and the trade page. Anyone who starts an offer can read what the owner chose to hide.

## What Changes

- **Hidden-serial entries are offered as "any copy" only.** In the builder's You get picker, an entry from a list that hides serials appears as "Any copy · N held". The picker shows no serials for it, neither the listed copy nor the partner's other copies.
- **The server enforces it.** An offer asking for a specific objekt is accepted only if that objekt can be reached through an entry on a list that shows serials. An entry on a hidden-serial list alone isn't enough. A counter may still ask for an objekt the partner offered in the offer it counters, since they chose to show it.
- **Nothing changes on the owner's side.** The owner can still put a specific copy in their own You give, which shows its serial, if they want to.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-offers`: a new requirement that a list's hidden serials stay hidden in offers.

## Non-goals

- Offers sent before this change. Their cards keep the specific objekts they already name.
- The objekt's own page and the serial lookup. Those follow the profile's "Hide from Serial Lookup" setting, as today.
- Hiding serials from a party once a trade is accepted. The receiver sees the objekt arrive either way.

## Routes

The offer builder in `/messages/$id` (its You get picker), and offer validation for every offer sent.

## Impact

- **`packages/api`:**
  - `services/offer/core.ts`: `allowedEntries` carries the list's `hideSerial`;
  - `services/offer/picker/theirs.ts`: hidden entries become any-copy only;
  - `services/offer/picker/shared.ts` (`matchEntry`, used by `createOffer`): the specific-objekt check skips hidden entries.
- **`apps/web`:** no code change, since any-copy tiles already exist. The builder's empty-state text gets checked.
- No database change.
