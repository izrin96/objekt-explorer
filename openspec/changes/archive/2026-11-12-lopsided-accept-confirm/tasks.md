# Tasks

## 1. Lopsided test

- [x] 1.1 Add `apps/web/src/features/offers/lopsided.ts` exporting the threshold constant and `isLopsided({ give, get })` (both sides above zero and the larger at least 5 times the smaller), with `lopsided.test.ts` covering 17:1, 1:5, 5:1, 4:1, 10:2, 9:2, even sides and an empty side. Verify `bun test apps/web/src/features/offers/lopsided.test.ts` passes, and that lint, typecheck and build pass for `web`.

## 2. Confirmation dialog

- [x] 2.1 Add the dialog's strings to `apps/web/messages/en.json`, `ko.json` and `ja.json`: title, the counts sentence, the "accepting trades all of them" sentence, the Counter sentence. Reuse `offer_accept`, `offer_counter` and `common_modal_cancel` for the buttons. Verify `bun run paraglide:compile` in `apps/web` succeeds, and that lint, typecheck and build pass for `web`.
- [x] 2.2 In `offer-body.tsx`, make Accept open an `AlertDialog` when `isLopsided(offer)`, following `AcceptCopy` in `wrong-copy.tsx`: Cancel, Counter (only when the card shows Counter; closes the dialog and calls `onCounter(offer)`), and Accept (the mutation's loading state, closing on settle). Other offers call the mutation directly as before. Load `vercel-react-best-practices` before the edit. Verify lint, typecheck and build pass for `web`.
- [x] 2.3 Check in the running app against the local database, on a lopsided open offer addressed to the signed-in test account (make one between `localtest1` and `localtest2` if none exists; local data only): the dialog opens with the right counts from the recipient's side, Cancel returns focus to Accept, Counter opens the builder, and a 1:1 offer accepts with no dialog up to the request boundary. Check at phone width and in ko and ja. Record the result as read-only verified where a write was not made.
- [x] 2.4 Add the confirmation to `apps/web/docs/offers.md` (where Accept or held actions are described), and state in the final report whether any `AGENTS.md` convention changed (expected: none). Verify lint, typecheck and build pass for `web`.

## Workflow follow-up

- Archive the change once it is reviewed and deployed.
- Move "Warn before accepting a lopsided offer" out of `design/backlog.md`.
