## 1. API

- [x] 1.1 Create `packages/api/src/lib/excerpt-flags.ts` with `flagExcerpt(entries)` (design decision 3), and `excerpt-flags.test.ts` covering a flagged target line, a flagged offer note, an unflagged reporter line containing a pattern, and an empty body. Verify `bun test` passes.
- [x] 1.2 In `services/mod-reads.ts` `accountDossier`, apply `flagExcerpt` to parsed excerpts and add `reputation` from `reputationOf([userId])`. In `reportQueue`, add the `shared` count with `FILTER (WHERE excerpt IS NOT NULL)`. Update the output schemas in `schemas/moderation.ts` (output-only fields; no input changes). Verify lint and typecheck pass for `@repo/api`.

## 2. Layout and routes

- [x] 2.1 Move the queue loader into `routes/(container)/mod/reports.tsx`, keeping the staff `beforeLoad`. Render the three-column grid at `lg` with the queue on the left and `<Outlet />` in the remaining columns. Below `lg`, hide the queue while `$userId` matches. Verify a non-staff user still gets not-found and no queue request is sent.
- [x] 2.2 Make `reports/index.tsx` the desktop "Pick an account" prompt, which is the queue alone below `lg`. Add the prompt string to `messages/{en,ja,ko}.json`. Verify lint, typecheck and build pass for `web`.
- [x] 2.3 Add `validateSearch` with `report` (coerced positive int, `.catch(undefined)`) to `reports/$userId.tsx`. Split `ModAccount` into a reports pane and a signals/actions pane that sit in the grid with `lg:contents`, keeping the narrow order: signals, reports, actions, sanctions, audit. Add an "All reports" back link below `lg`. Verify switching rows at 1280 keeps the queue's scroll position.
- [x] 2.4 In `queue.tsx`, mark the current row (`aria-current="page"`) and show the shared-excerpt count. Verify lint, typecheck and build pass for `web`.

## 3. Excerpts and facts

- [x] 3.1 Confirm `features/chat/thread/bubble.tsx` and `bubble-run.ts` exist (from `chat-thread-visual-polish`). If they don't, stop and report it.
- [x] 3.2 In `features/moderation/console/reports.tsx`, render excerpt text entries with `Bubble` (`mine = !fromTarget`, `position` via `runPosition`). Outline flagged entries and list their category badges. Keep unsent entries with their text plus an "unsent" mark. Leave card and offer entries as they are. Mark the selected report and scroll it into view once. Verify lint, typecheck and build pass for `web`.
- [x] 3.3 In `signals.tsx`, add the "Verified trades" and "Unfinished trades" rows (mono, tabular) from `reputation`; unfinished shows even at 0. Add the strings to the en/ja/ko messages. Verify lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check as a staff account at 1024px, 1280px and 390px: switch accounts, open a `?report=` link, open an unknown `?report=`, see the flagged outline and the verified and unfinished trades. Actions are read-only verified: open the dialogs, but don't submit on production. (mocked; real-data check pending on staging)
