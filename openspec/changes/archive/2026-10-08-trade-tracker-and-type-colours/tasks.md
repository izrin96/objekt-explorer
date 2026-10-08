## 1. Tokens and type badges

- [x] 1.1 Add `--type-have`, `--type-want`, `--type-sale` and `--progress` to `styles/app.css` with the light and dark values from design.md, and expose them as `--color-*` in `@theme`. Verify `text-type-have` and `bg-progress/10` compile, and recheck each value at 4.5:1 or better on its chip in both themes; web lint, typecheck and build pass.
- [x] 1.2 Make `ListTypeBadge` use the type tokens (general stays `secondary`), turn `ListRoleBadge` into a mono-font wrapper of it, and give the post `TagBadge` its type's colour. Verify in the browser, in both themes:
  - a have list's badge on its list page, in the account menu and as a WTT tag on Trade is the same teal;
  - want is amber, and sale or WTS is rose.

  Web lint, typecheck and build pass.

## 2. Match colours

- [x] 2.1 Colour `MatchLine` parts (they have: `type-want`; you have: `type-have`; Mutual: a `progress` chip) and For you's two section headings. Verify on `/trade` and `/trade/for-you` against the mock-ups, including the popover still opening from the counts; web lint, typecheck and build pass.

## 3. Trade page

- [x] 3.1 Add `TradeSteps` (Proposed, Accepted, Transfers n of m, Complete), driven by status and progress. Done steps are success, the current one progress, a failed Transfers step destructive. Verify on local trades 88 (in progress), 80 (completed), 85 (failed) and 84 (cancelled) that each matches the spec; web lint, typecheck and build pass.
- [x] 3.2 Replace the legs list with `LegTable` (Objekt, Direction, Status), with green Verified, amber Waiting and red Closed chips, stacking below `sm`. Verify at 1280 and 390 px with no sideways scroll, and that a live verification still updates the row without a reload (run the trade verifier once locally on a seeded leg); web lint, typecheck and build pass.
- [x] 3.3 Add `TradeAside`: Who sends first (indigo), the rating panel (disabled before completion, live after) and "If it stalls", with en/ja/ko text. Lay the page out as `lg:grid-cols-[minmax(0,1fr)_18rem]`, with Open chat, Report a problem and Cancel or the locked note under the table, and colour the status chip by outcome. Verify that the in-progress and completed pages match the mock-ups at both widths, and that rating and cancel still work; web lint, typecheck and build pass.

## 4. My trades

- [x] 4.1 Add `progress` to trade rows in `fetchMine` (one grouped count for the page's trade ids) and `mineRowSchema` (`nullable`, `null` for offers). Verify with `offer/mine` as shah that T-88 returns `{verified: 1, total: 2}` and offer rows return `null`; `@repo/api` lint, typecheck and build pass.
- [x] 4.2 Add `ProgressRing` with "n/m" to in-progress rows, and colour status chips: in progress `progress`, completed `success`, cancelled, failed or expired `error`, the rest neutral. Verify on `/trade/mine` at 1280 and 390 px against the mock-up; web lint, typecheck and build pass.

## 5. Notifications

- [x] 5.1 Add `features/notifications/tone.ts` (`notificationTone`), with `tone.test.ts` covering every offer and trade event, both alert kinds and sanctions. Verify `bun test apps/web/src/features/notifications/tone.test.ts` passes; web lint and typecheck pass.
- [x] 5.2 Render each notification's icon tile from `notificationTone`. Verify in the bell, at 1280 and 390 px, that a verified transfer, a reminder, a cancelled offer and a want-list alert show a green check, an amber clock, a red cross and an amber tile, matching the mock-up; web lint, typecheck and build pass.

## 6. Checks

- [x] 6.1 Run `bun run check` and `bun run build --filter=web`. Take light and dark screenshots of the trade page, My trades, Browse, For you, a list page and the bell at 1280 and 390 px, and confirm that no text falls under 4.5:1 and nothing scrolls sideways.
- [x] 6.2 Run `openspec validate trade-tracker-and-type-colours --strict`, and confirm the deltas match what shipped.
