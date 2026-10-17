# Tasks

A task is done once `bun run lint`, `bun run typecheck` and `bun run build --filter=web` pass for `apps/web`, on top of the check the task names. Only `apps/web` changes.

Verification is read-only. Use the dev server against the database `.env.local` points at, sign in as the `SMOKE_TEST1_*` account, and read trades without pressing Cancel, Accept, Decline, a rating or Report's submit. A mutation is checked up to its request boundary, as `apps/web/AGENTS.md` says.

## 1. Pure modules (`apps/web`)

- [x] 1.1 Add `features/offers/next-step.ts`: `nextStep(trade, now)` returns the state union from design.md Decision 1. That covers:
  - the precedence table and the chosen copy for `youDecide`;
  - the owed and sendable legs;
  - the first-sender variant;
  - the notes;
  - the deadline kind, with its target time and the past-due case.

  It imports only types and constants from `@repo/api/schemas/offer`.
  - Verify: `next-step.test.ts` passes under `bun run test`. It covers every row of the table, both parties owing, several copies to decide (the earliest `acceptBy` wins), a stuck leg beside a sendable one, the partner's stuck leg, a cash trade, failed with and without `canRate`, the indexer-behind note, and a trade past its 14 days.
- [x] 1.2 Add `features/offers/trade-clock.ts`:
  - `clockRows(trade, now)`: the rows, times, past, today and future, and the ends outcome as `expiredOutcome` decides it;
  - `historyRows(trade)`;
  - `firstSenderInClock(trade)`: whether the panel carries the suggestion.
  - Verify: `trade-clock.test.ts` covers the order around today, a pending copy's deadline row, failed versus cancelled at expiry (a verified leg, a pending copy, a declined copy, none), and History for completed, failed and cancelled trades.
- [x] 1.3 Add `lib/identicon.ts`: a 5×5 grid, mirrored, from an address's hex digits, case-insensitive. Add `components/shared/identicon.tsx`, which draws it as inline SVG in `currentColor` on `bg-muted`.
  - Verify: `identicon.test.ts` checks that one address always gives the same grid, mixed case gives the same grid, two addresses give different grids, and every grid is mirrored.
- [x] 1.4 Add `TONE_SOLID` to `lib/tone.ts`, a solid fill per tone.
  - Verify: typecheck.

## 2. Header, actions and back link (`apps/web`)

- [x] 2.1 In `routes/(container)/trade/mine/$tradeId.tsx`, render the My trades back link above `TradeView` and its skeleton.
  - Verify: the Back to My trades scenario.
- [x] 2.2 Rebuild the header in `trade-view.tsx`:
  - the avatar, with the `Identicon` fallback when there is no image and the address is not null;
  - the name in mono, one line with ellipsis and the full name in `title`;
  - a `CopyButton` for `identity.address`;
  - the `TrustLine` (unchanged), the T and O line, the status chip, Open chat, and the ⋯ menu.
  - Verify: the Address-only partner and Copy address scenarios on a local trade, and Trade page header in `web-trade-offers`.
- [x] 2.3 Build the ⋯ menu (`components/ui/menu`) with Report a problem and Cancel trade, each disabled with its reason as design.md Decision 3 lists. Make `CancelTrade` controlled, so the menu and the banner open one dialog.
  - Verify: the Trade actions menu scenarios. Keyboard focus reaches a disabled item and reads its reason. The dialogs open and are closed without confirming.

## 3. Next-step banner and rating (`apps/web`)

- [x] 3.1 Add `features/offers/next-step-banner.tsx`, mapping `nextStep` to:
  - tone (`TONE_FILL`, `TONE_EDGE`, a `TONE_SOLID` icon tile with a white Phosphor icon);
  - title and body;
  - notes;
  - the deadline (`Intl.NumberFormat` unit, the date after hydration);
  - the action.

  Reuse the `offer_wrong_copy_*`, `offer_first_*`, `offer_indexer_behind*` and ended-reason strings. Move the Accept and Decline controls out of `wrong-copy.tsx` into the banner, keeping `AcceptCopy`'s dialog.
  - Verify: each Next-step states, Next-step deadline and Next-step banner scenario on local trades, or with a `TradeView` fixture rendered in dev when no live trade is in that state.
- [x] 3.2 Remove from `trade-view.tsx` the ended line, the indexer `Alert`, `FirstSender` and the footer row. Delete `first-sender.tsx` if nothing else imports it.
  - Verify: the Ended reason once and Indexer behind once scenarios.
- [x] 3.3 Reshape `Feedback` (`trade-feedback.tsx`) into the inline control the completed and failed banners render. Drop its card and its in-progress branch.
  - Verify: the Rating on the trade page scenarios. A rating click is checked up to its request, not sent, on a trade the smoke account must not rate.

## 4. Stepper, objekts, clock (`apps/web`)

- [x] 4.1 Rewrite `TradeSteps` to the segments and colours of design.md Decision 4, with the single bar and chip below `sm`. Drop the "—" placeholder and the "n of m transfers verified" line above the legs.
  - Verify: the Verification progress scenarios, In progress colours, and failed and cancelled trades.
- [x] 4.2 Replace `leg-table.tsx` with `trade-legs.tsx` and `leg-card.tsx`:
  - two columns with the ⇄ icon, stacking below `sm`;
  - plain cards with art, member, code and serial, the class swatch, the state chip, and the hash with its copy button;
  - `InPlaceOf`, the stuck note, and a held copy's line with its Declined chip;
  - the top-up in the payer's column, the note quoted below, and `EstimatedSerialNote` as today.

  Drop the per-leg "transfers seen up to" line.
  - Verify: the You give and You get scenarios, Seen up to, and Our serial was off and Receiver declines from Wrong copy sent, on a local trade with a held copy if one exists, else a fixture.
- [x] 4.3 Add the aside's two panels:
  - `trade-clock-panel.tsx`: the rows, the dots, the first-sender line, and How trades work as a Popover with `offer_stall_body` and `offer_first_hint`;
  - `trade-history-panel.tsx`.

  The aside renders for every status.
  - Verify: The trade's clock and Trade history scenarios, and Suggested party sent from Who sends first.

## 5. Phone, copy and strings (`apps/web`)

- [x] 5.1 Below `sm`, move Open chat and the ⋯ menu into a `sticky bottom-0` bar (`h-11` and `size-11`, with safe-area padding), and keep the name and objekt names on one line.
  - Verify: the Trade page on phones scenario at 390 px. The dev overflow guard reports nothing, and the drawer and dialogs open above the bar.
- [x] 5.2 Add the new keys from design.md Decision 9 to `messages/en.json`, `ko.json` and `ja.json`. Then remove from all three every key the change leaves unread (design.md lists likely ones), grepping for other readers first.
  - Verify: `bun run typecheck` (which compiles Paraglide). A grep finds no read of a removed key. Every new and changed string uses no em or en dash, has at most one middle dot per line, and uses sentence case.
- [x] 5.3 Check the shape rule across the new components: `rounded-xl` for panels, cards and the banner; `rounded-lg` for buttons, images and icon tiles; `rounded-md` for chips. No arbitrary radius values, and no class-colour tint or stripe on a card.
  - Verify: a grep of the touched files for `rounded-[` finds nothing, and the light and dark themes are checked by eye at 1280 px and 390 px.

## 6. Check and document

- [ ] 6.1 Run `bun run check` and `bun run build --filter=web`. Walk `/trade/mine/$tradeId` read-only at 1280 px and 390 px, in light and dark, for an in-progress, a completed, a failed and a cancelled trade where the account has them, and record which scenarios passed live and which only on fixtures.
- [x] 6.2 Update `apps/web/AGENTS.md` if the change alters its conventions: add one line saying the trade page's state lives in the pure `next-step.ts` and `trade-clock.ts`, beside their tests, and that a new banner state starts there. Otherwise state in this task that none changed. `packages/api`, `apps/worker` and `packages/db` are untouched, so their `AGENTS.md` files are unchanged.

## Workflow follow-up

- Ask a native speaker to check the new ko and ja strings.
- Archive with `/opsx:archive` after the user verifies.
