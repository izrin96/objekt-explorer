## 1. Bubbles

- [x] 1.1 Add `--chat-mine` to `apps/web/src/styles/app.css`: light `oklch(0.92 0.004 286)`, dark `oklch(0.32 0.008 286)`, plus `--color-chat-mine` in `@theme`. Verify `--foreground` on it is ≥ 4.5:1 in both themes and record the ratios in the task note. Ratios: light 14.14:1, dark 11.48:1.
- [x] 1.2 Create `apps/web/src/features/chat/thread/bubble-run.ts` with `runPosition(previous, message, next)` → `"single" | "first" | "middle" | "last"`, using the sender + `GROUP_MS` rule moved out of `thread.tsx`. Add `bubble-run.test.ts` covering a lone message, a run of three, a sender switch and a gap over `GROUP_MS`. Verify `bun test` passes.
- [x] 1.3 In `thread.tsx`, compute `position` with `runPosition` and derive `showTime` from it. Pass `position` to `MessageItem`. Verify times show exactly where they did before on a mixed thread.
- [x] 1.4 Create `apps/web/src/features/chat/thread/bubble.tsx` exporting `Bubble({ mine, position, unsent, children })`, which owns the surface, border, width, padding and corner classes below, so the moderator excerpt (change `moderation-console-panes`) can reuse it. In `message-item.tsx`, render text and unsent through it. Own text is `bg-chat-mine text-foreground`, the partner's is `bg-card border`, and both get `max-w-105 px-3.5 py-2`. On the sender side, every bubble gets the small bottom corner, and `middle`/`last` also get the small top corner (logical `ee`/`se` for own, `es`/`ss` for the partner's). The unsent form keeps its dashed, transparent look in the same shape. Verify lint, typecheck and build pass for `web`.

## 2. Offer card

- [x] 2.1 In `offer-card.tsx`, make both forms `bg-card w-115 max-w-full rounded-lg border @container`. Verify the collapsed line is unchanged apart from width and surface.
- [x] 2.2 In `offer-body.tsx`, wrap the two `OfferSideList`s in `grid gap-3 @md:grid-cols-[1fr_auto_1fr]` with a middle `ArrowsLeftRightIcon` that is `hidden @md:block`, and move expiry and actions into one footer row. Verify lint, typecheck and build pass for `web`.

## 3. Composer

- [x] 3.1 In `composer.tsx`, make the action row an `@container`. Attach and Offer become `size="sm"` buttons showing icon + `<span className="hidden @lg:inline">` label, keeping `aria-label`. Verify the text field still takes the remaining width at 390px. Verify lint, typecheck and build pass for `web`.

## 4. Context thumbnail

- [x] 4.1 In `packages/api/src/services/chat/inbox.ts` `listConversations`, add the `LEFT JOIN LATERAL` newest-card read (design decision 7) and select `ctx.card AS context_card`. Map it to `context: parseCard(row.context_card)`. Verify typecheck passes for `@repo/api`.
- [x] 4.2 In `packages/api/src/schemas/chat.ts`, add `context` to `conversationRowSchema` and `collections` to the conversation page output, filled with `hydrateCards` over the page's context cards. Leave the input schema unchanged. Verify an old-shape input still validates with a quick schema test, and that lint and typecheck pass for `@repo/api`.
- [x] 4.3 In `apps/web/src/features/chat/conversation-list.tsx`, render the thumbnail (`aria-hidden`, existing objekt thumbnail component) and a `font-mono text-xs` "Collection #serial" line. Fall back to the slug while the collection is unknown, and show nothing when `context` is null. Add any new strings to `messages/{en,ja,ko}.json`. Verify lint, typecheck and build pass for `web`.

## 5. Verify

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 5.2 Browser check at 1280px and 390px, light and dark, on `/messages` and a thread with a run, an unsent message, a card message and an open offer. Read-only: don't send anything on production. Record that the own bubble is gray in both themes, runs join, the offer sides sit side by side only on wide threads, composer labels appear only at 1280, rows show a thumbnail, and nothing scrolls sideways.
