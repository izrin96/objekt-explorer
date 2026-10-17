## Context

`/trade/mine/$tradeId` renders `TradeView` (`features/offers/trade-view.tsx`) from one `offer.trade` read, which returns `{ trade: TradeView, collections }`. Its parts:
- `TradeSteps`: four steps on a `border-t-3` bar, coloured by `TONE_BAR`;
- `LegTable`: Objekt, Direction and Status columns, with `WrongCopies` rows under a leg;
- an aside holding `FirstSender`, `Feedback` (the rating, disabled while in progress) and "If it stalls" (`offer_stall_body`);
- a footer row with Open chat, Report a problem, and `CancelTrade` or the locked note.

Everything the new page needs is already in `TradeView`:
- `acceptedAt`, `proposedAt` and `endedAt`;
- each leg's `fromYou`, `state`, `stuck`, `txHash`, `verifiedAt`, and `substitutes` with `status` and `acceptBy`;
- `progress`, `firstSender`, `canCancel`, `cancelLocked`, `indexerBehind`, `seenUntil`, `canReport`, `canRate`, `rateUntil` and `rating`;
- `partner.identity.address` (nullable) and `partner.user.image`.

The worker clocks reminders (`REMIND_AFTER_HOURS`) and expiry (`TRADE_EXPIRE_DAYS`) from `acceptedAt`, and holds both while the indexer is behind. `expiredOutcome` (`packages/api/src/lib/trade-match.ts`) ends an expired trade as failed when a leg verified or a wrong copy is held, and otherwise as cancelled.

## Goals / Non-Goals

**Goals:**
- One pure function decides the banner state, and one decides the clock rows, both from `TradeView` and `now`, both covered by `bun test`.
- No API, worker or schema change.
- The existing confirm dialogs (Cancel, Accept copy) and the report dialog are reused unchanged.

**Non-Goals:**
- Avatars outside this page keep their letter fallback. The identicon component is shared, so adopting it elsewhere is a later one-line change per site.
- No change to `TrustLine`, `--progress`, or the chat offer card's "n of m transfers verified".

## Decisions

### 1. Banner state: `nextStep(trade, now)` in `features/offers/next-step.ts`

A pure module that imports only types and constants from `@repo/api/schemas/offer`. It returns a discriminated union, and `next-step-banner.tsx` maps it to tone, icon, copy and action. Strings stay in the component, so the module has no Paraglide import and tests read the union.

Definitions, for an in-progress trade:
- **owed**: legs with `fromYou` and `state === "waiting"`.
- **sendable**: owed legs that are not `stuck` and hold no `pending` substitute.
- **to decide**: legs with `!fromYou`, `waiting` and a `pending` substitute.

Precedence, first match wins:

| # | State | When | Tone, icon | Action |
|---|---|---|---|---|
| 1 | `completed` | status completed | success, Check | none (rating inline when `canRate`) |
| 2 | `failed` | status failed | destructive, X | Report a problem (`canReport`); rating inline when `canRate` |
| 3 | `cancelled` | status cancelled | neutral, Minus | none |
| 4 | `youDecide` | any leg to decide | warning, Warning | Decline, Accept |
| 5 | `yourTurn` | any sendable leg | progress, PaperPlaneTilt | Cancel trade when `canCancel` |
| 6 | `stuck` | owed is not empty and at least one owed leg is stuck | warning, Warning | none |
| 7 | `theyDecide` | owed is not empty and every owed leg holds a pending copy | warning, Warning | none |
| 8 | `theirTurn` | owed is empty | progress, Clock | Report a problem when `canReport` |

Why this order:
- A pending copy you receive outranks everything in progress. It is the only state with its own deadline that only you can act on, and it auto-accepts if ignored.
- Your turn outranks stuck and they-decide, because a sendable leg is an action you can take now. The stuck leg still shows its note on its card and as a banner note (below).
- Stuck outranks they-decide: it names a problem on your side, while they-decide is a wait.
- Their turn is the fallback. An in-progress trade with nothing owed by anyone cannot exist, since it would have completed.

Edge cases:
- **Several copies to decide.** The banner shows the copy with the earliest `acceptBy`. Only a leg's earliest pending copy carries one, so the candidates are one per leg (its earliest sent pending copy), falling back to the earliest `at`. Once that copy is decided, the next one takes the banner. Every held copy also shows on its leg's card.
- **You owe several legs.** Your turn names one objekt with `itemLabel`, or "{count} objekts" for two or more. The cards list them.
- **Both parties owe.** The state is Your turn, and the body carries the first-sender line:
  - you were suggested and haven't sent: `offer_first_you` plus "It's a suggestion: nothing stops either of you.";
  - they were suggested and haven't sent: `offer_first_them` plus the same sentence;
  - they were suggested and sent: `offer_first_them` plus `offer_first_them_sent`;
  - only you give: a plain line saying the transfer verifies here a few minutes after it is sent.
- **Notes.** Under the body, small warning lines, each shown once and in this order:
  - the indexer-behind notice (`offer_indexer_behind`, or `_unknown` before hydration or with no `seenUntil`);
  - in Your turn, an owed leg that is stuck;
  - in Your turn or Their turn, the partner's waiting leg that is stuck.
- **Cash trades.** A side with no legs never makes a state. With a top-up only on your side, your owed list is empty, so the state is Their turn.

**Deadline (right column):**
- In progress: "Ends in {left}, {date}", where the end is `acceptedAt + TRADE_EXPIRE_DAYS`.
- `youDecide`: "{left} left to decide", to the copy's `acceptBy`.
- `theyDecide`: "{left} left", to the copy's `acceptBy`.
- Completed or failed with `canRate`: "Change it until {date}" (`rateUntil`).
- Otherwise ended: "Ended {date}".
- Past due but still in progress (the indexer is behind, so expiry is held): "Ends once we catch up on the chain", never a negative count.

`{left}` is `Intl.NumberFormat` with `style: "unit"`: the calendar days from today to the deadline's date in the viewer's zone, so the count always agrees with the date beside it, or, under 24 hours, whole hours rounded up, at least 1. So a trade ending at 3:10 PM on Oct 22 reads "5 days" at any time on Oct 17. That gives plural forms in every locale without plural messages. Dates use the viewer's zone and render only after hydration, as `untilLabel` does today.

**Ended copy:**
- `endedText` moves into the banner as the body: the failed and cancelled variants, reused.
- Completed's title is "Trade complete. How did it go?" while it can be rated, and "Trade complete" with `offer_rating_closed` once it can't.
- A failed trade that the viewer can't rate (they did not deliver) shows no rating.

**Considered:** banner states as `FirstSender`, `WrongCopies` and the alert side by side. That is what the page does today, and it is the problem.

### 2. Rating moves into the banner

`Feedback` loses its card and its disabled in-progress branch. It becomes the segmented control plus the error line, rendered inside the completed and failed banners. The mutation, its scope and its error handling are unchanged. The in-progress strings (`offer_rating_pending_title`, `offer_rating_pending`) are no longer read; the clock has its own Rate row.

### 3. Header and the ⋯ menu

- **Back link:** above the card, ArrowLeft plus `page_titles_trade_mine`, linking to `/trade/mine`, in the route component so the skeleton keeps it too.
- **Avatar:** with no `user.image` and a non-null `identity.address`, an identicon; with neither, the letter fallback.
- **Identicon:** `lib/identicon.ts` returns a 5×5 grid mirrored left to right, read from the address's hex digits. An address is already uniformly random, so no hash is needed. `components/shared/identicon.tsx` draws it as an inline SVG: cells in `currentColor` (`text-foreground/70`) on `bg-muted`. It is monochrome, so it follows the theme with no new colour.
- **Considered:** a dependency such as `blockies` or `jazzicon`. Rejected: those bring their own colours, which break the monochrome chrome, and the grid is a few lines of tested code.
- **Name:** `identity.name` in mono, one line with ellipsis and the full name in `title`. A `CopyButton` copies `identity.address`, labelled "Copy address", with `profile_header_address_copied` as its toast. With no address, there is no button.
- **Status and actions:** the status chip, Open chat (outline), and a ⋯ icon button labelled "More actions" opening `components/ui/menu`. Menu items:
  - **Report a problem:** `safety.openReport` when `canReport`. While in progress before it opens, it is disabled with "Opens on {date}" (`acceptedAt + REPORT_AFTER_DAYS`). It is absent when completed or cancelled.
  - **Cancel trade:** only while in progress. It opens the existing confirm dialog when `canCancel`. Otherwise it is disabled with `offer_cancel_locked` when `cancelLocked`, or `offer_refused_indexer_behind` when `indexerBehind`.
  - With no items, the ⋯ button is not rendered.
- `CancelTrade` becomes controlled (`open` and `onOpenChange` props), so both the menu and the banner open the same dialog.
- The reason is the item's second line of text, so a screen reader reads it with the label, and the item stays focusable while disabled.

### 4. Stepper

`TradeSteps` keeps its four steps and `aria-current`. Each step is a 6px segment (`h-1.5`) with label and detail on one line below it. The detail is a short date for Proposed, Accepted and Complete, and "n of m" for Transfers; a step with no detail shows only its label (no "—").

| Trade | Proposed, Accepted | Transfers | Complete |
|---|---|---|---|
| in progress | done (neutral dark) | current: progress segment, label as a filled chip | todo |
| completed | success | success | success |
| failed | done | destructive | todo |
| cancelled | done | todo | todo |

- **Colours:** done is `bg-muted-foreground`, todo `bg-border`, and a coloured segment the tone's solid fill. `lib/tone.ts` gains `TONE_SOLID` (`bg-progress`, `bg-success`, …), which the banner's icon tile also uses, with `text-white` on it as `apps/web/AGENTS.md` requires.
- **Phone:** below `sm` the labels hide; one bar of four segments shows with the current step's chip beside it ("Transfers 1 of 2"; on an ended trade the last step reached, in its tone).
- **Removed:** the "n of m transfers verified" line above the legs.

### 5. You give / You get: `leg-card.tsx` replaces `leg-table.tsx`

`LegTable` is a table whose middle column is the Direction this change removes. Two lists of cards are a different structure, so it is replaced rather than extended.
- **Layout:** `trade-legs.tsx` splits legs by `fromYou` into two columns, using `offer_side_give` and `offer_side_get`, or "You gave" and "You got" once ended. A muted ArrowsLeftRight icon sits between them, with no background, `aria-hidden`. From `sm` up the grid is `1fr auto 1fr`; below it the columns stack and the icon hides.
- **Card:** card background, 1px border, `rounded-xl`. It holds:
  - the art through `OfferThumb` (`w-28`, `w-21` below `sm`), which opens the `ObjektDrawer`;
  - the member;
  - the collection code and serial in mono, or "any copy";
  - the class name after a small swatch of the collection's `backgroundColor`, the only place a class colour appears;
  - the state chip: Verified (success, Check), Waiting (warning, Clock) or Closed (destructive, X);
  - when verified, the shortened `txHash` with a `CopyButton` and its age.
- **Leg notes on the card:**
  - `InPlaceOf` stays on a leg verified with a different copy.
  - A stuck leg shows `offer_leg_stuck` under its chip.
  - Each held copy shows one line, "Sent #1188 instead", with its hash, copy button and age, plus a Declined chip once declined. The decision itself lives in the banner. This keeps the "both serials, hash and age" rule from Wrong copy sent on the page.
- **Removed:** the per-leg "transfers seen up to …" line.
- **Empty side:** `offer_side_nothing`.
- **Top-up:** a row at the end of the payer's column (`payer === "you"` → You give), using `TopupText`, with its warning icon.
- **Note:** a `blockquote` under the two columns.
- **Footnote:** `EstimatedSerialNote` under the columns, on the same condition as today.

### 6. The clock: `clockRows(trade, now)` in `features/offers/trade-clock.ts`

A pure module, like `next-step.ts`. It returns rows sorted by time, each `{ kind, at, when: "past" | "today" | "future" }`.

| Kind | At | Label |
|---|---|---|
| accepted | `acceptedAt` | Accepted |
| sent | each verified leg's `verifiedAt` | "You sent {objekt}" / "{name} sent {objekt}" |
| copyDue | each pending copy's `acceptBy` | "{sent} counts as accepted" |
| reminder | `acceptedAt + REMIND_AFTER_HOURS` | "Reminder to whoever still owes" |
| report | `acceptedAt + REPORT_AFTER_DAYS` | "Report a problem opens" |
| today | `now` | Today |
| ends | `acceptedAt + TRADE_EXPIRE_DAYS` | "Ends as failed if still unfinished", or "… cancelled …" |
| rate | none, always last | "Rate the trade", "Opens once every transfer verifies" |

- **Ends outcome:** failed when `progress.verified > 0` or any leg holds a substitute (pending or declined), else cancelled. This mirrors `expiredOutcome`: expiry accepts pending copies first, so a held copy always counts as sent.
- **Dots:** past dots `bg-muted-foreground`, today `bg-progress`, future hollow (`border`).
- **Who sends first:** when both parties give, the banner carries it whenever the state is Your turn (sent or not, see Decision 1), and the clock carries it as one line at the panel's foot in every other in-progress state. `firstSenderInClock` encodes exactly this split.
- **How trades work:** a link-styled Popover trigger holding `offer_stall_body` and `offer_first_hint`, so the full rules stay one tap away.

**`remindedAt`:** the `trade.reminded_at` column exists, but `TradeView` does not carry it.
- Chosen: compute `acceptedAt + 72h`, and word the row as the scheduled rule ("Reminder to whoever still owes"), not as an event. The worker also holds the reminder while the indexer is behind, and only owing parties get it, so "sent" could be wrong for this viewer.
- Rejected for now: adding an optional `remindedAt` output field. It would be safe for open tabs, being optional output, and would let the row read "Reminder sent". It costs an API change for a row whose date is already exact.

**History (ended trades):** `historyRows(trade)` lists:
- Proposed and Accepted;
- each verified transfer, with time, mono hash, copy button, and `InPlaceOf` when it applies;
- the end, as Completed, Failed or Cancelled at `endedAt`, its dot in the status tone.

The aside now always renders: the clock while in progress, History once ended.

### 7. Phone (below `sm`)

- The name is one line with ellipsis.
- Open chat and the ⋯ menu leave the header for a bar at the article's end, `sticky bottom-0` with safe-area padding. The bar holds Open chat (primary, `h-11`, fills the width) and ⋯ (`size-11`). Being sticky, not fixed, it never covers the page's last content and needs no padding hack.
- The clock follows the columns as a card.

### 8. Shape, copy and tokens

- **Radii**, on the theme scale (`--radius` is 0.5rem): panels, cards and the banner `rounded-xl`; buttons, images and icon tiles `rounded-lg`; chips `rounded-md`. No arbitrary values.
- **Banner:** `TONE_FILL` and `TONE_EDGE` of its tone, a `rounded-lg` icon tile in `TONE_SOLID` with a white Phosphor icon (fill weight), the title, one body line, and a right column holding the deadline in `TONE_INK` above the action. Below `sm` the right column wraps under the body.
- **Copy:**
  - no em or en dashes;
  - at most one middle dot per line;
  - sentence-case labels, with no uppercase micro-labels.

  The `T-88 · from offer O-120` line keeps its single dot. `TrustLine` keeps its own dots: it is shared and out of scope, so the rule does not apply to it.

### 9. Strings

New keys, added to `en`, `ko` and `ja`:

| Key | en |
|---|---|
| `offer_copy_address` | Copy address |
| `offer_trade_more` | More actions |
| `offer_report_opens` | Opens on {date} |
| `offer_next_your_turn` | Your turn: send {objekts} to {name} |
| `offer_next_objekts_multiple` | {count} objekts |
| `offer_next_suggestion` | It's a suggestion: nothing stops either of you. |
| `offer_next_send_body` | It shows as verified here a few minutes after you send it. |
| `offer_next_their_turn` | Waiting on {name} to send their part |
| `offer_next_nothing_to_do` | Nothing to do on your side. |
| `offer_next_stuck` | Your {objekt} can't be sent right now |
| `offer_next_stuck_body` | It reads as non-transferable. The trade waits, and ends as failed on {date} if it still hasn't arrived. |
| `offer_next_their_stuck` | {name}'s {objekt} can't be sent right now. |
| `offer_next_completed` | Trade complete. How did it go? |
| `offer_next_completed_closed` | Trade complete |
| `offer_next_failed` | Trade failed |
| `offer_next_cancelled` | Trade cancelled |
| `offer_next_ends` | Ends in {left}, {date} |
| `offer_next_ends_due` | Ends once we catch up on the chain |
| `offer_next_decide_left` | {left} left to decide |
| `offer_next_left` | {left} left |
| `offer_next_ended` | Ended {date} |
| `offer_next_rate_until` | Change it until {date} |
| `offer_leg_waiting_short` | Waiting |
| `offer_leg_any_copy` | any copy |
| `offer_leg_copy_sent` | Sent {sent} instead |
| `offer_trade_you_gave` | You gave |
| `offer_trade_you_got` | You got |
| `offer_clock_title` | This trade's clock |
| `offer_clock_you_sent` | You sent {objekt} |
| `offer_clock_they_sent` | {name} sent {objekt} |
| `offer_clock_copy_due` | {sent} counts as accepted |
| `offer_clock_reminder` | Reminder to whoever still owes |
| `offer_clock_report` | Report a problem opens |
| `offer_clock_today` | Today |
| `offer_clock_ends_failed` | Ends as failed if still unfinished |
| `offer_clock_ends_cancelled` | Ends as cancelled if still unfinished |
| `offer_clock_rate` | Rate the trade |
| `offer_clock_rate_hint` | Opens once every transfer verifies |
| `offer_clock_how` | How trades work |
| `offer_history_title` | History |

**Reused:**
- `page_titles_trade_mine`, `offer_side_give`, `offer_side_get` and `offer_side_nothing`;
- `offer_first_*`, `offer_wrong_copy_*` and `offer_indexer_behind*`;
- `offer_cancel_locked` and `offer_refused_indexer_behind`;
- the `offer_trade_failed*` and `offer_trade_cancelled*` bodies, with their "Failed:" and "Cancelled:" prefixes dropped in all three locales, since the banner's title already says it (the banner is their only reader);
- `offer_rating_*` (except the pending pair);
- `offer_stall_body`, `offer_leg_stuck`, `offer_leg_in_place_of` and `profile_header_address_copied`.

**Removed:** every key this change leaves unread, in all three locales, grepping for other readers first. Likely candidates: `offer_leg_col_objekt`, `offer_leg_col_direction`, `offer_leg_col_status`, `offer_leg_seen`, `offer_stall_title`, `offer_rating_pending_title`, `offer_rating_pending`, `offer_trade_legs`, `offer_trade_to`, `offer_first_title` and `offer_leg_waiting`.

## Risks / Trade-offs

- [The banner hides the second of two simultaneous concerns, for example a copy to decide while you also owe a leg] → The cards keep every leg's state, stuck note and held copy visible. The banner states which single action comes first, and the next state appears as soon as it is resolved.
- [Today every pending copy has its own Accept and Decline under its leg. Now only the banner's copy, the earliest due, can be decided, so a later copy waits until that one is decided] → Copies with later deadlines auto-accept later too, so nothing is lost. Flagged for the user to confirm; the fallback is a compact Accept and Decline on the leg card for copies the banner is not showing.
- [The "Ends in" date is when expiry is due, but expiry waits for the indexer] → Past due, the deadline reads "Ends once we catch up on the chain" instead of a negative count.
- [The computed reminder row may not match whether this viewer was reminded] → It is worded as the rule, not the event (Decision 6).
- [The partner's name in mono departs from the rule that names of people stay in the body font] → `web-trade-offers` Objekt data in monospace is modified for this one place: an address-only partner's name is an address, and the mockup sets every partner name in mono for one consistent header. Flagged for the user to confirm.
- [ko and ja translations of the new strings] → Written with the change, then a native check (Workflow follow-up).
- [The sticky bar could cover the drawer or dialogs on phones] → Dialogs and the drawer render in portals above it. Check at 390 px.

## Migration Plan

Web-only and stateless. It ships with the next web deploy; roll back by reverting. No data, API or open-tab concern, since the `offer.trade` input and output are unchanged.
