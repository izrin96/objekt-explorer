## Why

On a phone the thread's deal strip is one line, and for a trade in progress that line is the trade page's chip text: "T-89 · In progress · your turn · 2 of 8". The number and "2 of 8" never shrink and the Open trade button takes its room, so the words truncate to "In progress · yo…", and the part that says whose turn it is is the part that gets cut. Measured on a thread at 360–390 px, the words get under 90 px; even "Waiting for them" alone clips at 390 px while "v of t" stays on the line. Below `md` the second line is hidden too, so nothing else on screen says it.

## What Changes

- Below `md`, the strip drops "v of t" for every state; the trade page still shows the progress, and the strip keeps it from `md` up.
- Below `md`, for a trade whose turn is the point (Your turn, Their turn, Stuck), the strip's words are the Inbox row's short words instead of the chip text:
  - Your turn: "T-89 · Your turn"
  - Their turn: "T-89 · Waiting for them"
  - Stuck: "T-91 · Can't be sent"
- Together these fit whole from 360 px in en, ja and ko. At 320 px only "Your turn" fits; the others still truncate.
- From `md` up the strip reads as today, with the chip text and its second line.
- Every other state reads as today at every width. For You decide and They decide the Inbox words ("Different copy to decide", "Waiting for them to decide") are longer than the chip text, so the chip text stays. Offers, Completed, Failed and the no-deal lines are unchanged.
- The strip stays one line below `md`, as the layout requirement already says; the tone, the number and the action are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: "Deal strip layout" no longer keeps "v of t" below `md`, gains the phone wording for Your turn, Their turn and Stuck, and its Phone scenario's quoted line changes to "T-89 · Your turn".

## Routes

`/messages/$id` (the thread, in the Inbox and on its own page).

## Non-goals

- Rewording any state from `md` up, or the "Strip by state" table, which stays the source of truth for the full line.
- Changing the Inbox row's words, the trade page's chips or the status card.
- Letting the strip wrap to two lines on phones.
- The deal strip's second line, tone or action.

## Impact

- `apps/web/src/features/chat/deal-text.ts`: `stripText` returns the phone words beside the full words; tested in `deal-text.test.ts` against the states above.
- `apps/web/src/features/chat/thread/deal-strip.tsx`: shows the phone words below `md` and the full words from `md` up, and hides "v of t" below `md`.
- No new messages: the phone words are the existing `chat_deal_row_your_turn`, `offer_status_waiting_them` and `chat_deal_row_stuck`, already translated in ja and ko and shorter than the chip text in all three locales.
- No API or schema change.
