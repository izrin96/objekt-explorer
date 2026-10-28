# Design

## Context

- **The conversation list.** It is one SQL read, `selectConversationRows` in `packages/api/src/services/chat/inbox.ts`, paged by `(activity, id)`, then shaped by `toConversationRows`. `loadConversationRow` runs the same path for one row, and `buildChatMessages` (`services/chat/live.ts`) puts that row into every `chat_message` event. So a field filled in `toConversationRows` reaches the list, the live event and the open tab alike.
- **Offers and trades.** An offer belongs to one conversation, which holds at most one open offer (`offer_one_open`). A trade belongs to one offer. Offer and trade writes, including the worker's verifier (`apps/worker/src/lib/trade-publish.ts`), already publish `chat_changed`, and the web refetches the lists and the open thread on it. The deal line therefore needs no new realtime event.
- **Unread state.** A row's unread mark is `rowUnread`: the partner's newest unsent message is past `last_read_message_id`, and the conversation is not a request. The thread payload already carries `lastReadMessageId`.
- **Trade state.** On the web, `features/offers/next-step.ts` derives "your turn" from a full `TradeView`. The server has the rate rules (`rateRefusal`, `atFault`, `lib/offer-rules.ts`) and the leg columns: `open`, `verified_at`, `untransferable_at`, and a pending `trade_substitute`.
- **The newest offer.** The thread reads its newest offer from the loaded messages (`latestOfferId`). That offer can sit beyond the first page.
- **Several deals at once.** `offer_one_open` allows one open offer per conversation, but accepting it leaves room for the next, so one conversation can hold an open offer and several running trades (the local conversation 359 holds four).

## Goals / Non-Goals

**Goals:**
- One server-side rule for which state a deal is in, shared by the list, the live event, the Needs you filter and the thread strip, and one web module for how each state is worded and toned.
- No extra request per row or per thread on the web.

**Non-Goals:**
- Changing `next-step.ts` or how the trade page behaves. Only the tone half of `TONES` moves to `lib/tone.ts` (decision 9), with the banner reading it unchanged.
- Counting conversations differently for the Messages icon.

## Decisions

1. **`deal` is computed on the server per page, from one batched read.** For the page's conversation ids, one query (`readDeals`, `services/chat/deal.ts`) reads:
   - each conversation's offers that may still be a deal, with their trades: open and not expired, a running trade, or a trade ended within the rating window;
   - for a running trade, per viewer: the count of open, unverified legs they owe that are still transferable and carry no pending substitute, the count of those that are not transferable, verified of total, and whether a pending substitute waits on the viewer or on the partner;
   - for an ended trade, what `rateRefusal` needs and the rate deadline. `readDeals` runs `rateRefusal` and `atFault` itself and hands `dealOf` a `rateable` flag, so the rate rule stays in `lib/offer-rules.ts`, which `schemas/` may not import.

   The pure `dealOf(rows, viewerId, now)` in `packages/api/src/schemas/chat-deal.ts` turns each into a deal and keeps the most urgent: a Needs you state, then any other live one, then one to rate, the newest offer winning a tie (the user's pick, 2026-10-28, over following the newest offer only, which hid a running trade behind a newer declined or expired offer). The result is `{ kind: "offer" | "trade", id, state, count?, verified?, total?, until? } | null`, tested beside it. `state` is one of the spec's table rows: `waitingYou`, `waitingThem`, `youDecide`, `yourTurn`, `stuck`, `theyDecide`, `theirTurn`, `completed`, `failed` (the last two only while the viewer can rate). Trade states are decided in `stepKind`'s order (`features/offers/next-step.ts`): you decide, your turn, their turn, stuck, they decide, so the strip and the trade page never disagree. `until` is the offer's expiry or the rate deadline. It sits in `schemas/` so the web can import its types.

   *Alternatives:*
   - Reuse `fetchTrade` per row: N full trade reads per page, rejected.
   - Compute on the web from the thread: the list has no thread data, rejected.
2. **The thread payload carries the same `deal`.** `loadThread` calls the same read for its one conversation and returns `conversation.deal`, plus `conversation.hadOffer`, true when the conversation ever held an offer, which picks "No offer between you yet" or "No open offer". A newer page replaces `conversation` in the cache (`thread-cache.ts`), so the strip updates on the `chat_changed` every offer and trade write sends.

   *Alternative:* derive the strip from `latestOfferId` plus a `tradeOptions` fetch. That misses an offer beyond the first page and costs a second request, so it was rejected.
3. **Needs you and Unread filter in SQL with the same predicates.**
   - `show: "all" | "unread" | "needs-you"` is optional on `listConversationsInputSchema`, defaulting to `all`, so open tabs keep validating (packages/api AGENTS.md).
   - Unread reuses `lastIncoming(me) > coalesce(m.last_read_message_id, 0)`.
   - Needs you is an `EXISTS` over the conversation's offers: one open, not expired and sent to `me`; or a running trade, where a pending substitute from the partner waits on `me`, or `me` owes an open, unverified, transferable leg with no pending substitute (the trade page's you decide and your turn).
   - A test pins `dealOf`'s "needs you" states to that list, so the TS rule and the SQL predicate name the same states.
   - `chat.inboxCounts` returns `{ unread, needsYou }` over the whole Inbox in one statement, ignoring search, each capped at 100 like `unreadCount`. Both leave out muted conversations with the predicate `unreadConversationCount` uses (`NOT (m.muted_until IS NOT NULL AND m.muted_until > now())`), so Unread never counts more than the Messages icon. The lists keep muted conversations: muting silences a conversation, it does not hide it.
   - The web invalidates `chat.inboxCounts` on `chat_message` and `chat_changed` (`use-user-socket.ts`), and after the viewer's own read, mute and unmute writes, which change the counts without an event.
4. **`unreadCount` is a capped count.** It is `(SELECT count(*) FROM (SELECT 1 FROM message WHERE conversation_id = c.id AND sender_id <> me AND unsent_at IS NULL AND id > coalesce(last_read, 0) LIMIT 100))`, which the `message_conversation_id_idx` keyset serves. The web shows `99+` at 100. A request reads 0. `unread` stays on the row for open tabs.
5. **Realtime schema stays tolerant.** `deal` and `unreadCount` are `.nullable().default(null)` and `.default(0)` on `conversationRowSchema`. An event published by the previous build, replayed from Centrifugo history, still parses.
6. **Filtered lists refetch instead of patching, and keep the open row.**
   - `applyChatMessage` patches the unfiltered box caches as it does today. For a cache keyed with `show` other than `all`, it invalidates, because whether the row still belongs needs the server's predicate. `chat_changed` already invalidates every list.
   - `ConversationList` keeps the row of the conversation open beside it (`$id`), through the pure `nextKept` and `withKept` (`features/chat/kept-row.ts`, tested). When a refetch of a filtered list drops that id, the list keeps showing the row at its place, patched from the live event and the thread cache, until `show` or `q` next changes (a chip picked, the same one included, or the search edited). It is component state keyed by the filter, not a cache write, so the server's result stays the truth.
   - A row that leaves while it holds focus goes through `useFocusAfterLeave`, as an archived row does today.
7. **The New divider is client state.**
   - On mount, the thread keeps the `lastReadMessageId` it opened with (a `useState` initialiser, beside `seenIncoming`). The divider goes above the first message from the partner with a greater id. Later reads don't move it, and the thread is keyed by id, so reopening starts fresh.
   - It is neutral: `border-border` rule, `text-muted-foreground` label. Indigo stays for focus and selection (apps/web AGENTS.md, Look).
   - When the oldest loaded message is newer than that `lastReadMessageId`, or the divider would sit above the view, the thread opens through the jump helper (decision 12) with the divider as its target, `focus: false` and an instant scroll. Focus stays where the thread puts it on open (the heading below `md`), so the helper only scrolls. Past its 10 pages it shows no notice here and the thread opens at the newest message without a divider; a never-read thread, whose jump can match no message, falls back on the divider once the oldest page draws it.
   - Nothing is marked read while that jump runs, and `useMarkRead` reads the scroller's position as well as `atBottom`, so opening on the divider leaves the messages below the fold unread.
8. **The Add menu uses the vendored `Menu` from `md` up and a `Sheet` (`side="bottom"`) below `md`, chosen by `useMediaQuery("(min-width: 48rem)")`.**
   - `SelectedSheet` on the trade page splits at `lg` (`64rem`) on purpose, where its side column appears. The composer has no side column; `md` is where the conversation list joins the thread, so this split follows it instead.
   - The sheet's items carry a description line (`chat_add_attach_desc`, `chat_add_offer_desc`); the menu shows labels only.
   - Focus: Base UI's `Menu` returns focus to its trigger on Escape. The sheet's close button and Escape return it to Add through the sheet's `finalFocus`. `AttachObjektDialog` and the offer builder, opened from an item after the menu or sheet has closed, take `finalFocus` pointed at the Add button's ref, so closing them, after a pick or not, lands on Add.
   - `AttachObjektDialog` and `onOffer` keep their behaviour and gain only that `finalFocus`; the triggers move. `onOffer` is the one opener: the menu item and the deal strip's Make offer both call it, so both keep the post-card prefill `thread.tsx` builds (`postOffer`, from offer-prefill-matches). The `Textarea` keeps the registry's `text-base` below `sm` (`sm:text-sm`), so iOS does not zoom on focus.
9. **The deal strip is a new `features/chat/thread/deal-strip.tsx`; its words and tones live in `features/chat/deal-text.ts`.**
   - `deal-text.ts` has no React and no queries: per `deal.state`, the row's words and count and the strip's line, second line and action, as the spec's row, tone and strip tables give them, and the tone. The row and the strip both read it, and `deal-text.test.ts` pins every state to its table row and tone.
   - The trade-state tones come from the trade page: `TONES`' tone half moves from `next-step-banner.tsx` to `lib/tone.ts` as `STEP_TONE`, which the banner keeps reading beside its icons. The deal tone is `STEP_TONE[state]` for trade states, except `failed`, which is warning here (the line asks for a rating); the two offer states are warning and neutral. A muted row overrides it with neutral.
   - The strip reuses `TONE_INK`, `TONE_SOLID` for the dot, `offerNo` and `tradeNo`, and the existing strings `offer_status_waiting_you`, `offer_status_waiting_them`, `offer_chip_*`, `offer_trade_completed`, `offer_trade_failed`, `offer_trade_step_progress` and `offer_next_their_turn`. New ones: `chat_deal_offer_from`, `chat_deal_expires`, `chat_deal_send` with `chat_deal_send_one`, `chat_deal_rate_by`, `chat_deal_none_yet`, `chat_deal_none_open`.
   - The text truncates (`min-w-0 truncate`) while the number and the "v of t" sit in `shrink-0` spans. Below `md` it is one line, its second line hidden, the action a `Button` with its label.
   - Review offer and View offer go through the jump helper (decision 12) to the offer's card, with focus.
   - No existing component fits: `TradePartnerCard` is the trade page's whole side card, too heavy for one line.
10. **Accepted newest offer collapses.** In `thread.tsx`, `collapsed` becomes `message.offer.id !== latestOffer || message.offer.status === "accepted"`. It does not depend on which deal the strip shows, so a card never opens or folds when another trade becomes the most urgent (the user's pick, 2026-10-28).
11. **Header.** `MessagesFrame` stops passing `description`. The frame's `h-[calc(100dvh-(--spacing(45))-1px)]` loses the description's line, measured against the rendered header at 1280 px. The phone thread's height is unchanged, since that header was already hidden.
12. **One jump helper reaches a message that may not be loaded.** `useJumpToMessage` in `thread/thread-hooks.ts` serves Review offer, View offer and the New divider, and later chat-reply's quote jump, which reuses it rather than adding its own.
   - It takes a target (`has`, a test on a message, and `selector`, the element to reach) and `{ focus = true, block = "center", instant = false, quiet = false }`. A highlight is not part of this change: `chat-reply` adds it with its styling.
   - `Thread` holds `query` and the inner view holds `heightBeforeOlder`, so `olderPage` gains `fetch` (one `query.fetchNextPage()`, no resync) and `resync` (`resyncThread`) beside `load`, and the helper lives in the inner view and calls those two.
   - While the target is not in the cache and older pages remain, it calls `olderPage.fetch()` in a loop, up to 10 pages. Before each page it calls the view's `markOlder`, the `heightBeforeOlder` write the sentinel makes (the React Compiler forbids a hook writing a ref it was handed), so the `useLayoutEffect` on `oldest` keeps the reader's place. It never calls `olderPage.load`, which chains `resyncThread` per page.
   - After the loop it runs `olderPage.resync()` once.
   - Found: it scrolls the target into view (`block: "center"`, smooth, or instant under `prefers-reduced-motion`), and focuses it with `preventScroll` (the target carries `tabIndex={-1}`).
   - A failed page stops the loop with the loading error notice, and closing the thread stops it with no notice.
   - Not found after 10 pages: a `toastManager` notice, `chat_jump_too_far` ("That message is too far back to show"), and the scroll stays where it was.

## Risks / Trade-offs

- [Deal read adds work to every list page] → One statement over at most `CONVERSATION_PAGE_SIZE` ids on indexed columns (`offer_conversation_id_idx`, `trade_offer_id_uniq`, `trade_leg_trade_id_idx`). It runs after the page's `LIMIT`, like the context card. Check `EXPLAIN` on the local database before shipping.
- [SQL and TS disagree on Needs you] → A test pins the state list, and the predicate is written once as a fragment used by both the filter and `inboxCounts`.
- [An expired open offer still reads open until the worker expires it] → `dealOf` and the SQL both check `expires_at > now`, as `openOffersWhere` does.
- [Stuck legs] → "Can't be sent" uses `untransferable_at`, the same signal as the trade page's stuck. It is not part of Needs you, matching the trade page, where a stuck leg waits on nobody.
- [Chip count and list differ for muted conversations] → Deliberate: the counts match the Messages icon, the lists keep every match. A muted row is drawn muted, so the extra row reads as quiet.
- [A kept open row looks stale] → It keeps updating live; it only stays listed. Picking any chip drops it.

## Migration Plan

No migration. Deploy web and API together as usual. A tab from before the deploy keeps calling `chat.list` without `show` and ignores the new row fields. Rollback is a plain revert.
