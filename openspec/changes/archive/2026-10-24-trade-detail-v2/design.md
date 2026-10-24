# Design

## Context

`/trade/mine/$tradeId` renders `TradeView` (`features/offers/trade-view.tsx`):
- a header row (`PersonAvatar`, name, `CopyButton`, `TrustLine`, T-no and offer, `StatusBadge`, Open chat, `TradeMenu`);
- `NextStepBanner`, `TradeSteps` and `TradeLegs`;
- an aside holding `TradeClockPanel` or `TradeHistoryPanel`;
- a phone bottom bar.

The route sits under `(container)/trade/route.tsx`, whose layout always renders `PageHeader` and `TradeTabs`.

The state logic is pure and tested:
- `next-step.ts` decides the banner state and deadline;
- `trade-clock.ts` builds the clock rows (`clockRows`) and the History rows (`historyRows`).

The v2 canvas (`Hj1yL8f2gireZ6VZ6esmMW`, `Main.dc.html`) is the visual reference. Its dark values map onto the existing cnippet tokens, and the `Tone` helpers from `lib/tone` are reused.

## Goals / Non-Goals

**Goals:** one status surface, a partner card, one exchange card, one timeline for every state, phone actions that follow the state, and a skeleton that matches the layout.

**Non-goals:** API changes, avatar changes, changes to the next-step order or the trade rules.

## Decisions

### 1. Hide the Trade header and tabs per route with `staticData`
The `$tradeId` route declares `staticData: { tradeChrome: false }`, and `TradeLayout` reads it through `useMatches()`. When any match carries the flag, it skips `PageHeader` and `TradeTabs`.

- **Rejected: moving `$tradeId` out of `trade/` into a pathless layout.** It churns the route tree and breaks the `/trade/mine` beforeLoad (`requireSignedIn`), which the detail page shares through `mine/route.tsx`.
- **Rejected: `useMatchRoute` on the path string.** It ties the layout to one path.
- `staticData` needs a `StaticDataRouteOption` declaration-merge in the router's `Register` file. That is one line.

### 2. The banner becomes the status card; the logic stays in `next-step.ts`
`NextStepBanner` keeps its name and its `View` mapping. It gains three things:
- the status chip, from `tradeStatusText` plus the step kind for in progress (e.g. "In progress · your turn");
- the stepper, rendered as a footer (`TradeSteps` moves inside);
- the "Send to" row for `yourTurn`.

The indexer note leaves the card for a new `IndexerStrip` above it, which reuses the existing `offer_indexer_behind*` strings. `StatusBadge` disappears from the page. `statusTone` is no longer read here, because the card's tone comes from `TONES[step.kind]`; that also fixes the cancelled red-versus-grey mismatch.

`nextStep` gains `primary: "copyAddress" | "decide" | null`, so that both the card and the phone bar know which button is primary. It is pure and tested beside the other step tests.

### 3. A deadline that holds rather than counts
`Deadline` already has `endsHeld`. It now carries `at` (the date it was due), so the value reads "Paused" with a note "Was <date>". The other kinds keep their data, and only the copy changes:
- "Ends / in 5 days / Oct 22";
- "Decide / 2 days left / Oct 26".

### 4. One `timelineRows(trade, now)` in `trade-clock.ts`
It merges `clockRows` and `historyRows`:
- it adds `proposed` and the copy's arrival (`copy.at`);
- each transfer row carries `txHash`;
- `ends` is `when: "paused"` when it is due in the past and `trade.indexerBehind`;
- an ended trade appends `end`, then `rateCloses` when `nextStep`'s deadline is `rateBy` or `rateUntil`.

`clockRows` and `historyRows` become internal, or are deleted once their tests move to `timelineRows`. The existing scenarios stay as test cases, and new cases cover proposed, paused and rate-closes.

`TradeTimeline` replaces both panels and reuses `Dot` with a fourth `paused` style (a dashed ring). On phones it renders inside a Base UI `Collapsible`, not a bare `<details>`, which gives the trigger a chevron and the disclosure state for free. The summary's "Next: …" is the first row whose `when` is `future` or `paused`.

### 5. `TradePartnerCard` (new, `features/offers/trade-partner-card.tsx`)
It reuses:
- `PersonAvatar`, unchanged;
- `ProfileLink`, as `TradeHeader` in Browse uses it;
- `CopyButton` and `TradeMenu`.

The reputation figures read the same `reputation` object `TrustLine` takes. The "New" case reuses `trust_new`. It is a new component rather than `TradeHeader`, because `TradeHeader` is the Browse row's one-line layout and fitting it into a card would mean a pile of props. The phone variant is a compact row: avatar, name, reputation as the inline `TrustLine`, and View profile.

### 6. Legs: chip states from one mapping
`LegCard`'s `LegChip` becomes a mapping from `(leg.state, viewer owes it, pending copy, trade ended)` to `Verified | Waiting | Send this | Different copy | Not sent`. "Not sent" uses the neutral tone, replacing the red "Closed". The tx hash row leaves the card. `TradeLegs` becomes one card with a summary line and per-side status. The status is a small pure helper in `next-step.ts`, so it is tested.

### 7. One filled button
Open chat takes `variant={primary ? "outline" : "default"}`, where `primary` is `nextStep(...).primary`. On phones the card hides buttons the bar carries; the bar reads the same `primary`.

### 8. Skeleton
`TradeViewSkeleton` draws the real grid:
- the breadcrumb line;
- a status card with the stepper;
- the exchange with two leg shapes 112 px wide;
- two side cards.

It keeps `PendingStatus`.

## Risks / Trade-offs

- **Partner identity moves from the top to the side.** At `lg` and up it sits beside the status card. On phones it moves below the exchange, but the title already names the partner ("Waiting on binary.bin…").
- **About 20 new strings, and ko/ja need a native pass.** Retired ones: `offer_clock_title`, `offer_history_title`, `offer_leg_closed`, and the header-only ones. Delete them only when nothing else reads them.
- **`staticData` is a new pattern in this app.** Document it in `apps/web/AGENTS.md`.

## Open Questions

None blocking. Defaults taken:
- the offer link opens the conversation;
- Make a new offer appears only on cancelled trades;
- the phone Timeline starts folded.
