## Context

See proposal.md for why. Mock-ups of every screen at 1280 and 390 px (dark theme) were made by restyling the live pages with the app's CSS and local data, and the user approved them.

**Colour today:**
- `styles/app.css` defines `success`, `warning`, `info` and `destructive`, each with a `-foreground` for text on a tinted chip, plus the indigo `accent-solid`.
- `components/ui/badge.tsx` is vendored. Its `success`, `warning`, `info` and `error` variants draw a tinted chip.
- `ListTypeBadge` maps have to `success`, want to `warning` and sale to `info`.
- Trade's `ListRoleBadge` and post `TagBadge` are `outline` on purpose ("the objekt cards keep the colour").

**Pages today:**
- `trade-view.tsx` renders the trade page as a single column. The data it needs is all in `TradeView`: progress, firstSender, canRate, rating, cancelLocked and lastCheckedAt.
- `my-trades-view.tsx` rows carry no progress. The offer card already gets `tradeProgress` from a per-trade count in `offer-view.ts`.
- `notification-bell.tsx` renders one neutral icon per item type (handshake for offer and trade, shield for sanction).

## Goals / Non-Goals

**Goals:**
- One mapping from list type to colour, used by every type badge.
- Outcome colours drawn from the existing `success` and `destructive` tokens, so "verified" means one green across the app.

**Non-Goals:**
- Editing vendored `components/ui` files.
- Animating the stepper or the ring.

## Decisions

**1. Three new type tokens and one progress token; success and destructive reused.** `app.css` adds `--type-have`, `--type-want`, `--type-sale` and `--progress`, exposed as `--color-*` in `@theme`, so `text-type-have` and `bg-type-have/10` work.

| Token | Dark | Light |
|---|---|---|
| `type-have` (teal) | `oklch(0.8 0.12 182)` | `oklch(0.5 0.1 182)` |
| `type-want` (amber) | `oklch(0.84 0.135 78)` | `oklch(0.53 0.12 65)` |
| `type-sale` (rose) | `oklch(0.78 0.14 352)` | `oklch(0.52 0.17 355)` |
| `progress` (indigo) | `oklch(0.78 0.14 277)` | `oklch(0.5 0.2 277)` |

Chips use Badge's own tint recipe (a 30% edge and 8% fill in light, a 20% edge and 16% fill in dark), so a type chip sits beside a success or error chip at the same weight. Measured in the browser with WCAG 2 luminance, as text on its chip over the card:
- dark: 6.49 to 8.6;
- light: 4.91 to 5.77.

The indigo is lighter than `accent-solid` (0.585), which fails 4.5:1 as text on the dark card. Verified, completed and failed use the existing `Badge` `success` and `error` variants, so they stay in step with the rest of the app. Alternative considered: also mint new ok and bad tokens, as the mock-ups did. Rejected, because `success` already reads as that green and `error` as that red, and a second green would split the meaning.

**2. One `TypeBadge`.** `features/list/list-type-badge.tsx` keeps its exports, but `ListTypeBadge` now renders `LIST_TYPE_TONE`, the type's ink, tint and edge in that recipe (general stays `secondary`). `ListRoleBadge` becomes a mono-font wrapper of it, and the post `TagBadge` takes its type's colour from the same map (`wtt` → have, `wtb` → want, `wts` → sale). A feature class string, not a new `Badge` variant, keeps `badge.tsx` verbatim. Alternative considered: add `have`, `want` and `sale` variants to `badge.tsx` and note them in `components/ui/README.md`. Rejected, because the colours are this app's domain, not a generic chip.

**3. Match line colours live in `MatchLine`** (from `trade-only-matches-and-shared-row`):
- the "they have" part takes `text-type-want`, with a matching underline;
- the "you have" part takes `text-type-have`;
- Mutual is a chip in `progress`.

For you's section headings take the same classes. `MatchLine` stays the one place that decides the order and the colours.

**4. Trade page as three components.**
- `TradeSteps`: an ordered list of four steps with a 3 px top bar each. It is fed from `status`, `progress` and the timestamps. Done steps get `border-success`, the current step `border-progress`, and the failed step `border-destructive`.
- `LegTable`: a real `<table>` with a header row. Below `sm`, rows become two-column grids: the status sits beside the objekt and the direction runs under both, so a long name and the Waiting chip don't squeeze it. `thead` stays readable to screen readers with `sr-only`. Verified is Badge `success`, Waiting Badge `warning` and Closed Badge `error`.
- `TradeAside`: wraps the existing `FirstSender` and `Feedback`, plus a new "If it stalls" note. Before completion the rating panel is headed "After every transfer verifies"; once completed it is "Rate your trade with {name}", tinted green while rating is open, as the mock-up's done panel was. "If it stalls" states the rule (72 hours, 7 days), since `TradeView` carries no stall times.
- A cancelled or failed trade keeps its end time, after the sentence saying why it ended, since the stepper's Complete step stays empty.

`TradeSteps` and `LegTable` are their own files; `TradeAside` is the `<aside>` in `trade-view.tsx`, shown for a trade in progress or completed. The page grid is `lg:grid-cols-[minmax(0,1fr)_18rem]`. `CancelTrade`, Open chat and Report a problem keep their logic and move under the table.

**5. Progress on My trades rows.** `fetchMine` adds `progress` to trade rows with one grouped count over `trade_leg` for the page's trade ids: the same `count(*) FILTER (WHERE verified_at IS NOT NULL)` as `offer-trades.ts:61`. It is `null` for offer rows. `mineRowSchema` gains `progress: progressSchema.nullable()`, a new field, so older open tabs still parse it. `ProgressRing` is a 20 px SVG with two circles, `aria-hidden`, and the "n/m" text beside it carries the meaning. Every chip, panel tint, step bar and icon tile takes its classes from `lib/tone.ts` (ink, fill, edge and bar per tone), and `StatusBadge` maps an offer or trade status to its tone through one table.

**6. Notification tone as a pure map.** `features/notifications/tone.ts` exports `notificationTone(item)`, which returns `{ icon, tone }` from `type` and `payload.event`, following the spec's list. `tone.test.ts` covers every event. The bell's icon tile takes the chip tint (`bg-<tone>/8`, `/16` in dark) with `text-<tone>` for the colour tones and keeps today's neutral tile for declined and withdrawn. The reminder's amber is Badge's `warning`, as the Waiting chip is. An alert keeps its objekt thumbnail, framed in its list type's colour; the tile shows only when there is no thumbnail. Phosphor icons: `CheckIcon`, `ClockIcon`, `XIcon`, `ArrowRightIcon`, `HeartIcon`, `PackageIcon` and `ShieldWarningIcon`.

## Risks / Trade-offs

- [More colour drifts from "quiet gallery, loud cards"] → Colour goes only on chips, text and 3 px bars. Cards, buttons and backgrounds stay neutral, and the mock-ups showed the class stripes still lead.
- [List pages change colour: have was green, now teal; sale was blue, now rose] → It is intended: green is freed for verified. It is visible to every list owner, so the release note should say so.
- [Colour-only meaning for colour-blind users] → Every coloured mark also has text (the type name, the count's wording, the status) or a distinct icon. Teal and amber also differ in lightness.
- [The table at 390 px] → Rows stack into a two-column grid, which the mock-ups checked at 390 px with no sideways scroll.

## Migration Plan

Web and API ship together. `progress` is optional on the client, so a tab on the old web reading the new API is unaffected. Roll back by reverting.
