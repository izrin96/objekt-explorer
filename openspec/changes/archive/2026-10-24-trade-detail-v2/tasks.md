# Tasks

Each task ends with `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web` passing. Tasks that touch pure modules also run `bun test` on them.

## 1. Pure logic

- [x] 1.1 `next-step.ts`: drop the `indexerBehind` note from `notes`, and give `endsHeld` the date it was due. Add `primary: "copyAddress" | "decide" | null` and a per-side status helper (Sent · verified, Waiting on them, You owe this, After you send, Different copy, Verified, Not sent). Add a leg chip helper (Verified, Waiting, Send this, Different copy, Not sent). Verify: new cases in `next-step.test.ts` cover each primary, each side status and each chip, and the existing cases still pass.
- [x] 1.2 `trade-clock.ts`: add `timelineRows(trade, now)`, which merges the clock and History. It adds `proposed`, the copy's arrival, a `txHash` on each transfer, `paused` for an expiry that is past due while the indexer is behind, and `end` plus `rateCloses` once the trade has ended. Move the `clockRows` and `historyRows` tests onto it, then delete whichever function nothing reads. Verify: the "Mid-trade", "Completed" and "Paused expiry" scenarios from the spec pass as `bun test` cases.

## 2. Route and frame

- [x] 2.1 Add `staticData: { tradeChrome: false }` to `trade/mine/$tradeId.tsx`, add the `StaticDataRouteOption` declaration, and make `TradeLayout` skip `PageHeader` and `TradeTabs` when any match sets it. Replace `BackLink` with the breadcrumb (Trade / My trades / T-n), plus "from offer O-n" linking to `/messages/$id`. Verify in the browser: `/trade/mine/88` opens with no Trade title or tabs, and `/trade/mine` still shows both.
- [x] 2.2 Rebuild `TradeViewSkeleton` in the real grid: breadcrumb line, status card with stepper, the exchange with two 112 px leg shapes, two side cards. Verify: throttle the network and check that the page doesn't shift when it loads.

## 3. Status card

- [x] 3.1 `NextStepBanner` becomes the status card. It shows the chip ("In progress · their turn", etc.), the title, the body, the deadline as label, value and note at the trailing edge, and the actions, with `TradeSteps` as its footer. Remove `StatusBadge` from the page. Verify: on the live trades T-88, T-80 and T-79 there is exactly one status chip, and T-79 is grey throughout.
- [x] 3.2 On your turn, add the "Send to" row: the partner's short address and Copy address, using `CopyButton`'s toast, filled. On phones the Copy address button is hidden, because the bar carries it. On a different copy, show the asked and sent copies side by side. Verify by checking the your-turn state in a fixture, read-only.
- [x] 3.3 `TradeSteps`: keep all four labels on phones, colour a decision amber, keep `aria-current="step"`, add hidden "done" and "not yet" text, and keep `aria-live` on "n of m". Verify with the accessibility tree at 390 px and at 1280 px.
- [x] 3.4 Add `IndexerStrip` above the card while `trade.indexerBehind`, using the existing strings. The deadline reads "Paused" with "Was <date>". Verify: T-88 (indexer behind) shows the notice once.
- [x] 3.5 Cancelled card: Make a new offer, using `MakeOfferButton` with the partner. Verify it opens the builder for the same partner without sending anything.

## 4. Exchange

- [x] 4.1 `TradeLegs` becomes one card, The exchange. It has a summary line, a status per side, the ⇄ icon muted between the sides from `sm` up, and the note at the foot. Verify on T-88 at 1280 px and at 390 px.
- [x] 4.2 `LegCard`: chips come from the helper in 1.1. "Not sent" is neutral. The tx hash row is removed. Art still opens the drawer. Verify: T-79's legs read "Not sent" in grey, and T-80's cards show no hash.

## 5. Side panel

- [x] 5.1 Add `trade-partner-card.tsx`. It has `PersonAvatar` (unchanged), the name through `ProfileLink`, `CopyButton`, "Trading since", reputation as three figures or "New", Open chat (`default` only when `primary` is null, `outline` otherwise), View profile and `TradeMenu`. Add a compact variant for phones. Verify: on T-88 the figures match the old trust line, and on a your-turn fixture Open chat is outlined.
- [x] 5.2 Add `TradeTimeline` on `timelineRows`, replacing `TradeClockPanel` and `TradeHistoryPanel`. It reuses `Dot` plus a dashed `paused` style, keeps the first-sender line and the How trades work popover, and shows each transfer's hash with copy. On phones it sits inside a `Collapsible` whose trigger reads "Timeline", "Next: …" and a chevron. Verify: T-88, T-80 and T-79 list the rows the spec gives, and the phone Timeline opens from the keyboard.
- [x] 5.3 Lay out `TradeView`: main column (strip, card, exchange) beside a 340 px side panel from `lg`. Below `lg` the side cards follow the exchange. The phone bottom bar carries the primary action (Copy address, Decline and Accept, or Open chat), plus Open chat when that isn't the primary, plus the menu, each 44 px. Verify there's no horizontal overflow at 320, 390, 1024 and 1440 px (the dev overflow guard stays quiet).

## 6. Strings and docs

- [x] 6.1 Add the new messages in en, ko and ja (about 20, listed on the canvas). Delete the retired `offer_clock_title`, `offer_history_title` and `offer_leg_closed`, plus any header-only message nothing else reads. Verify: `paraglide:compile` passes, and grep finds no reader of a deleted key.
- [x] 6.2 Run `bun run check` and a full live pass of T-88, T-80 and T-79 at 390 px and 1440 px, in dark and light. Record the results in this task.
  - 2026-10-23: `bun run check` exit 0 (lint 0 errors, one existing `@repo/api` warning; typecheck clean; 301 web and 624 api tests pass); `bun run build --filter=web` passes. Live, read-only: T-88 (indexer behind, their turn), T-80 (completed), T-79 (cancelled, grey throughout), T-85 (failed) at 390 and 1440 px in dark and light, plus 320 and 1024 px on T-88; no horizontal overflow, no overflow-guard report. Your-turn and different-copy states checked on T-88 with the trade read rewritten in the browser (CDP Fetch), nothing sent. At 320 px the bar's "Accept #n" label truncates.
- [x] 6.3 `apps/web/AGENTS.md`: update the Trade page bullet (`timelineRows` replaces the clock and History; the status card holds the stepper) and note the `staticData` `tradeChrome` flag. Verify by reading the diff.

## Workflow follow-up

- Archive with `/opsx:archive` once applied. The ko/ja strings need a native review.
