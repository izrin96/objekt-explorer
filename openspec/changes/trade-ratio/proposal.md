## Why

Traders often ask more than one for one: "my SCO for 2 of your FCO", "any SCO, I'd give 2". An offer can already hold such a trade (up to 50 objekts a side), but a list has no way to say it except free text, which nobody reads at a glance. A ratio on the entry or rule, shown where people look, makes the ask visible before anyone opens the offer builder.

## What Changes

- A have-list entry, a want-list entry and a want-list rule can carry a trade ratio: one whole number from 2 to 5, or none (1:1).
  - On a have entry it is what the owner asks for one copy: "1:2".
  - On a want entry or rule it is what the owner would give for one: "2:1".
  - The chip reads the owner's give:get, as Discord trades do.
- A have or want list can carry a ratio for all its objekts and rules. An entry or rule with its own ratio overrides the list's.
- **Set ratio** on the list page sets or clears the ratio on selected entries of a have or want list. The list's Edit form takes "Ratio for all". The Add rule and Edit rule dialogs take a Ratio field. The post page (`trade-post-page`) sets all three from its preview.
- The ratio shows as a chip:
  - on the list page's cards and the Rules strip;
  - on Trade post tiles and rule tiles (Browse and For you), on a side that swaps;
  - on the get side of the offer builder, for the partner's items: "They ask 2 for this".
- Copy as new list keeps ratios (the list's and each entry's) when the copy keeps the list type. Turn into objekts gives the rule's ratio to the objekts it adds. The CSV export gains a `ratio` column.
- The ratio is **never matched**: matching, Can swap, rankings, alerts and rule expansion ignore it.

Routes: the list page (`/list/$slug` and profile list pages), `/trade`, `/trade/for-you`, and the offer builder wherever it opens.

## Non-goals

- Sale lists, including Sell or swap: a sale entry has a price.
- Ratios other than 1:N and N:1 (no 2:3), and anything above 5.
- Setting a ratio in the Add to list dialog; it is set on the list page afterwards.
- The offer builder's give side ("they'd give 2 for this"), and any check or warning when an offer's counts don't meet a ratio.
- The Discord format output, which stays as it is (and English).
- The chat objekt card.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: ratio on entries and rules, Set ratio, the chip on the list page and Rules strip, copy, Turn into objekts and the CSV column (new requirements only).
- `web-trade-browse`: the ratio chip on post tiles and rule tiles.
- `web-trade-offers`: the ratio hint on the builder's get side.

## Impact

- DB: a nullable `ratio smallint` on `lists`, `list_entries` and `list_rule`, checked to 2–5. One new migration, which must be applied before web and worker deploy.
- API (`packages/api`):
  - new `list.setRatio`, with refusal codes and their `api_errors_*` strings;
  - an optional `ratio` on `list.edit` (omitted keeps the stored value);
  - an optional `ratio` beside `rule` on `addRule`/`updateRule`;
  - `ratio` on the `listEntries`, `rules`, feed tile and offer candidate outputs, all additive (the `/api/v1` outputs too);
  - the post entries cache key goes from `trade:post:3` to `trade:post:4`.
- Web (`apps/web`): the list page, Rules strip, rule dialog, Trade tiles and offer builder tiles. New strings in en, ko and ja.
- The worker is unchanged, though it reads the new columns through Drizzle.
