# Tasks

Every task ends with `bun run lint`, `bun run typecheck` and `bun run build --filter=web` passing.

## 1. Pure grouping

- [x] 1.1 Add `apps/web/src/features/trade/person-groups.ts` with `groupByList(matches, lists)`, per design decision 4, importing nothing from React or Paraglide.
- [x] 1.2 Add `person-groups.test.ts` covering: one list, two lists in `lists` order, a match on two lists landing under the first, a match whose lists are all missing, and an empty direction.

## 2. Strings

- [x] 2.1 Add the messages to `apps/web/messages/en.json`, `ko.json` and `ja.json`:
  - the summary labels ("Mutual", "you want", "they want") and their full accessible names;
  - "from {list}" and "for {list}";
  - the "+N" show-the-rest accessible label, if none fits;
  - `trust_new` (visible "New", accessible "New trader").

  Reuse an existing message wherever one already says the same thing.

## 3. Trust line

- [x] 3.1 Give `TrustLine` (`features/offers/trust-line.tsx`) a `variant` of `"full"` (the default) or `"compact"`, per design decision 8.
- [x] 3.2 Use `variant="compact"` in `browse-post.tsx`'s `phoneLine`.
- [x] 3.3 Give `TradeHeader` a way to let its `TrustLine` wrap instead of truncating (design decision 2). Posts keep truncating.
- [x] 3.4 Let the phone line wrap between its parts instead of truncating: no `truncate` on `TradeHeader`'s `phoneLine`, each part `whitespace-nowrap` in `browse-post.tsx`.

## 4. Person sheet

- [x] 4.1 Make the sheet's title `sr-only` and move `TradeHeader` into the header slot, clear of the close button. Merge "updated" and "ownership checked" into one monospace `note` line. Remove the closing "Ownership checked" line.
- [x] 4.2 Replace the `MatchChip` with a local `PersonSummary` (design decision 3): three cells, mutual tone when M > 0, A and B as buttons that scroll to and focus their section heading.
- [x] 4.3 Replace the two `Column`s with stacked `Section`s (design decision 5):
  - groups from `groupByList`, each headed by `ListRoleBadge` and the list link;
  - not counted objekts after the groups;
  - the "none" state;
  - the 50 cap with its "+N" tile.
- [x] 4.4 Below `md`: `grid-cols-5` thumbnails. Past 10, show 9 and a "+N" button that expands the section in place.
- [x] 4.5 Caption every thumbnail with the member over the collection number, monospace, two lines at most (design decision 6).
- [x] 4.6 Remove the Their matched lists block, and the `MatchChip` and `MatchedLists` imports from the sheet.
- [x] 4.7 Make the footer two equal columns below `md` (design decision 7).
- [x] 4.8 Update `PersonSkeleton` to the new shape: header, summary row, then one wide section.

## 5. Verify

- [x] 5.1 Run `bun run check` from the repo root, plus `bun run build --filter=web`.
- [x] 5.2 Browser, read-only, against the dev server:
  - open a person sheet at 1280 px and at 390 px, in dark and light;
  - check the name shows once, the trust line wraps, the summary counts match the post's chip, the summary buttons jump and focus, the list groups link correctly, the captions show, and "+N" expands on a phone;
  - check no horizontal scroll (the dev overflow guard stays quiet).
- [x] 5.3 Browser: check the Browse phone line at 390 px for an established account (no "since") and, if one is on the feed, a new account ("New"). Record it if no new account was available.
- [x] 5.5 Browser, 390 px, `/trade` and `/trade/for-you?type=wtb`: the phone line wraps between parts and nothing truncates.
- [x] 5.4 Check ko and ja render without overflow in the sheet's group headings and summary.

## 6. Docs

- [x] 6.1 Update `apps/web/AGENTS.md` only if a convention changed. Otherwise state in the hand-off that none did.

## Workflow follow-up

- Archive with `/opsx:archive` after it ships.
