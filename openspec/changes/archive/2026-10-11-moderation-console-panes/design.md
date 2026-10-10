## Context

See proposal.md for why. Current state:
- `routes/(container)/mod/reports.tsx` gates staff in `beforeLoad` and renders `<Outlet />`.
- `reports/index.tsx` loads `queueOptions()` and renders `ModQueue`.
- `reports/$userId.tsx` loads `accountOptions(userId)` and renders `ModAccount`, which stacks signals, trades, reports, actions, sanctions and audit (`features/moderation/console/*`).
- `services/mod-reads.ts`:
  - `reportQueue()` groups open reports by target.
  - `accountDossier()` returns account, addresses, `startsLast24h`, flag counts, reports (excerpt parsed with `excerptEntrySchema`: `fromTarget`, `body`, `card`, `offer?`, `at`, `unsent?`), sanctions, audit and attached trades.
- `scanMessage(body)` in `lib/scam-patterns.ts` is the pattern set that the chat caution line and flags already use.
- `reputationOf(ids)` in `services/reputation.ts` is Redis-cached for 10 min.

## Goals / Non-Goals

**Goals:** one screen on desktop with no extra round trips; a selection a moderator can link to; flagged lines computed by the same patterns chat uses; bubbles shared with the thread.

**Non-Goals:** no new moderator permissions, no change to which text moderators can read, no appeal flow.

## Decisions

1. **Layout route, not a new page.** `reports.tsx` becomes the layout. It keeps the staff `beforeLoad`, loads the queue (moved from `index.tsx`), and renders `xl:grid xl:grid-cols-[18rem_minmax(0,1fr)_20rem]`: the queue, then `<Outlet />`, which spans the two remaining columns. `$userId.tsx` renders the middle pane (reports) and the right pane (signals, actions, sanctions, audit) as two grid children, using `xl:contents` on its wrapper. `index.tsx` renders the "Pick an account" prompt across both columns. Existing URLs stay the same.
   Below `xl`, the layout hides the queue when a child account route is active (`useMatch` on `$userId`), and the index shows the queue alone, which is the current two-step flow. The account shows signals, reports, then actions, as the spec says, with an "All reports" back link.
   *Alternative:* the selected account in a search param on `/mod/reports`. It breaks existing `/mod/reports/$userId` links and the not-found handling in the `$userId` loader.
2. **Report selection is a search param.** `$userId.tsx` gains `validateSearch: z.object({ report: z.coerce.number().int().positive().optional().catch(undefined) })`. The reports pane marks that report and scrolls it into view once after mount (`scrollIntoView({ block: "nearest" })` in a ref callback, not an effect writing state). An id that isn't in `reports` matches nothing, so no report is selected. The queue row's link keeps the queue's own scroll position, because the layout doesn't remount.
3. **Flags computed at read time, in a pure module.** `lib/excerpt-flags.ts` exports `flagExcerpt(entries)`. It returns each entry with `flagged: FlagCategory[]`: `scanMessage(body)` combined with `scanMessage(offer.note)` for `fromTarget` entries, and `[]` for the reporter's entries. `accountDossier` applies it after `excerptEntrySchema` parses. The response schema adds `flagged` to each excerpt entry as an output-only field. Read-time scanning means older reports get outlines too, and a pattern update applies to them as well. It has a unit test.
   *Alternative:* store flags in the excerpt at report time. That doesn't cover old reports and goes stale when the patterns change.
4. **Bubbles from the chat thread.** The excerpt uses `Bubble` from `features/chat/thread/bubble.tsx`, which is created by `chat-thread-visual-polish`. `mine` is set to `!fromTarget`, so the reporter is on the end side, like a thread they would read, and the reported account is on the start side. `position` comes from `runPosition` in `bubble-run.ts`, given a small adapter that maps `fromTarget` to `mine` and `at` to `createdAt`. A flagged bubble adds `outline outline-2 outline-offset-2 outline-destructive/60` plus a line of `Badge variant="outline"` category labels below it, reusing the flag labels in `features/moderation/labels`. Cards and offers keep their current excerpt renderers.
   **Dependency:** apply `chat-thread-visual-polish` first. If it isn't applied yet, the builder stops at task 3 and reports it, rather than copying bubble styles.
5. **Verified trades fact.** `accountDossier` calls `reputationOf([userId])` alongside its other reads. The dossier gains `reputation: { verified, ... }`, using the existing reputation schema. `signals.tsx` adds "Verified trades" and "Unfinished trades" rows in mono, with the same numbers the profile shows. Unfinished shows even at 0, unlike the public trust line, because a moderator compares accounts; it stays monochrome like the other facts.
6. **Queue shared-excerpt count.** `reportQueue` adds `count(*) FILTER (WHERE excerpt IS NOT NULL)::int AS shared` to its grouping query. It's the same scan, so there is no extra query.

## Risks / Trade-offs

- [Three panes are cramped at 1024px] → checked: the middle column was about 316px and excerpt bubbles wrapped, so the three-pane layout starts at `xl` (1280px), and 1024–1279 uses the list-then-detail flow.
- [`reputationOf` writes the Redis cache on a miss] → this is the same cache-fill the profile already does, so it isn't a new side effect class.
- [Read-time scanning costs CPU per excerpt] → excerpts are capped at a few dozen entries and reports per account at `PAGE_LIMIT`, so the cost is negligible.

## Migration Plan

No migration. The API only adds output fields. Deploy as usual. Rollback is a revert.

## Open Questions

- An appeal action on the muted user's notice, as in the mockup. It isn't specced and isn't in this change. The user decides later whether appeals exist at all.
