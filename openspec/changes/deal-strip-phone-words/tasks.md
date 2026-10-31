# Tasks

## 1. Phone words in the strip text

- [x] 1.1 In `apps/web/src/features/chat/deal-text.ts`, give `StripText` a `phoneWords: string | null` (the words below `md`, or null to keep `words`), set from `rowText(deal).words` for `yourTurn`, `theirTurn` and `stuck`, and null for every other state and for no deal. Verify: a new test in `deal-text.test.ts` checks `phoneWords` for all nine deal states and both no-deal cases ("Your turn", "Waiting for them", "Can't be sent", else null), and `bun run test`, lint and typecheck pass for `web`.

## 2. Show them below md

- [x] 2.1 In `apps/web/src/features/chat/thread/deal-strip.tsx` (`StripFrame`), when `text.phoneWords` is set, render it below `md` and `text.words` from `md` up inside the one truncating span, so the line stays one line, and hide "v of t" (with its separator) below `md`. Verify: at 360, 375 and 390 px the your-turn thread reads "T-n · Your turn" whole, and "Waiting for them" and "Can't be sent" and their ja/ko words fit the same span; at 1280 px it reads the chip text with "v of t" and the second line; offer threads read the same as before at every width. Lint, typecheck and `bun run build --filter=web` pass.

## 3. Docs

- [x] 3.1 Update `apps/web/AGENTS.md` "Chat deals" with one clause that the strip's phone words come from the row's words for Your turn, Their turn and Stuck (`deal-text.ts`), or state that no convention changed. Verify: the file reads correctly and `bun run check` passes.

## Workflow follow-up

- Archive with `/opsx:archive` once applied and committed; the delta replaces "Deal strip layout" in `openspec/specs/web-chat/spec.md`.
