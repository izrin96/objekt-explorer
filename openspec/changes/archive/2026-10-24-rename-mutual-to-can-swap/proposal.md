# Proposal

## Why

For you's "Mutual only" means swap only: it counts a have list against a want list open to swaps, both ways, and never a sale list or a Buying only want list. People read "mutual" as "we each want something of the other", so a person who sells what you want while you sell what they want looks missing. The help explains this, but only someone who opens it sees it. The label should say what the filter does.

## What Changes

- The For you toggle "Mutual only" (with its count, "Mutual only N") is renamed **"Can swap"** ("Can swap N").
- The section heading "Mutual" under Any becomes **"Can swap"**. "One way" stays.
- The empty states read "No one can swap with you" and "No one can swap with you for {list}". The hint already speaks of swapping and stays.
- The help, the Trade post composer hint and the Find matches control's accessible name speak of swaps instead of Mutual.
- The copy changes in en, ko and ja: ko "교환 가능", ja "交換できる".
- The want list's Open to setting keeps "Swaps only". The new label doesn't reuse it, because the two mean different things: a filter on people versus what one list accepts.

## Non-goals

- Any change to matching, ranking, counts or which people are listed.
- Internal names: `mutual` in code, the `match=mutual` URL value, cache keys and API fields stay, so old links and open tabs keep working.
- Renaming "Mutual" as the specs' own term for the mode. It stays the specs' name for it, and each spec states what the viewer sees.
- The "One way" heading, the Any label and the Browse tab.

Routes: `/trade/for-you` (toggle, headings, empty states, help), `/trade` (composer hint), and own list pages `/@{nickname}/…` (Find matches).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Filters (empty-state wording), Matches to the signed-in viewer (the toggle's name in a scenario) and Matches and Compare with (toggle, count and section heading labels).
- `web-lists`: Find matches shortcut (the label its count agrees with).

## Impact

- `apps/web/messages/en.json`, `ko.json`, `ja.json`: the values of `trade_mutual_only`, `trade_section_mutual`, `trade_help_any`, `trade_help_mutual_heading`, `trade_help_mutual_score`, `trade_help_mutual_no_sale`, `trade_matches_link_label`, `trade_browse_no_mutual_list_title`, `trade_browse_no_mutual_title` and `trade_composer_match_both`. Keys are unchanged.
- No code, API, schema or URL change.
