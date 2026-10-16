## 1. Card schema (api)

- [x] 1.1 In `packages/api/src/schemas/chat.ts`, rename today's `storedCardSchema` to `storedObjektCardSchema` (`StoredObjektCard`), add the union `storedCardSchema` (objekt with no `kind`, or `{ kind: "post", listId, match? }` with `ownerHas` and `senderHas`, slugs `.max(3)`), and widen `cardInputSchema` to `{ kind: "post", listSlug, withMatch? }` or today's objekt input with an optional `kind: "objekt"`. Keep `ChatMessage.card`, `ConversationRow.last.card` and `ConversationRow.context` on the objekt-only schema; add `ChatMessage.post`, `ConversationRow.contextPost`, `last.post` and `postCardViewSchema`. Add `schemas/chat.test.ts`: today's card input and a stored card without `kind` parse to the same data as before, and a post card parses as a post. `bun run lint`, `typecheck` and `test` pass for `@repo/api`.
- [x] 1.2 Move every reader to the right schema: `parseCard` and `hydrateCards`/`toChatMessages` (`services/chat/cards.ts`), `findSentMessage` (`services/chat/members.ts`), `send.ts`, `inbox.ts` (map post cards to `null` in `last.card` and `context`), `offerItemCards` (`services/offer/view.ts`, objekt-only), and the report excerpt (`schemas/moderation.ts` `card` stays objekt-only, add an optional `post: { listId }`; `services/report.ts`, `lib/sanctions.ts`). Confirm with `grep -rn "StoredCard\|parseCard\|storedCardSchema" packages/api/src` that no output an open tab reads can carry a post card. `bun run lint` and `typecheck` pass for `@repo/api` and `web`.

## 2. Post card read and match (api)

- [x] 2.1 Add `fetchPostCards(listIds, viewerId)` to `services/trade-feed/`, beside `fetchMyPosts`, reusing `pairPosts` and the feed's post assembly: tag, owner, up to six slugs and the count per side, the sale price range, or removed. Verify by calling it read-only for one live post and comparing it with what Browse shows. `bun run lint` and `typecheck` pass for `@repo/api`.
- [x] 2.2 In `resolveCard`, check a post card (list exists, shown on Trade, owned by the partner) and, when `withMatch` is set, save the counts and first three slugs each way from `personDetail`; refuse with `invalid_card` otherwise. Verify by running `resolveCard` read-only (it writes nothing) for a matched and an unmatched Browse post. Do not call `chat.start` or `chat.send` against production. `bun run lint`, `typecheck` and `test` pass for `@repo/api`.
- [x] 2.3 In `hydrateCards`, `toChatMessages` and `services/chat/inbox.ts`, fill `post`, `contextPost` and `last.post`; the context query keeps picking the newest non-unsent card of either kind. Verify by loading an existing thread and the inbox read-only. `bun run lint`, `typecheck` and `test` pass for `@repo/api`.

## 3. Post card in the web app

- [x] 3.1 Widen `Attachment` (`features/chat/attachment.ts`) and `stores/chat-draft.ts` to objekt or post, and update `putDraftCard` in `useStartConversation`. `bun run lint`, `typecheck` and `build` pass for `web`.
- [x] 3.2 Add `features/chat/thread/post-card-message.tsx` for the post and match forms, reusing `ObjektCard` and `TagBadge`, with match labels from the viewer's side ("N of theirs you want", "N of yours they want"), and render it from `message-item.tsx`. Check it against the mockup at 390 px and 1280 px, light and dark, with no sideways scroll (render it with a sample view in the dev server; send nothing). `bun run lint`, `typecheck` and `build` pass for `web`.
- [x] 3.3 Draw a post attachment in `composer-attachment.tsx` with remove and "Pick objekts instead" (opens `attach-objekt-dialog`). `bun run lint`, `typecheck` and `build` pass for `web`.
- [x] 3.4 Change `firstLineSuggestions` to take the attachment and add the two post suggestions; extend `suggestions.test.ts` so a post card never offers "Would you trade this one?". `bun run lint`, `typecheck`, `test` and `build` pass for `web`.
- [x] 3.5 In `browse-post.tsx`, send `{ kind: "post", listSlug, withMatch }` from the post's anchor and `person.counts`. Verify up to the request boundary: in the dev server, record the input the Message button would send for a matched and an unmatched post, and leave Message unclicked (or run it end to end only against a local database via `.env.local`). `bun run lint`, `typecheck` and `build` pass for `web`.
- [x] 3.6 In `conversation-list.tsx`, show `contextPost` as the tag plus "{owner}'s trade post" and preview `last.post` as "Trade post"; in the moderation report view, show an excerpt's `post` as "Trade post card". `bun run lint`, `typecheck` and `build` pass for `web`.
- [x] 3.7 Add the new strings to `messages/en.json`, `ko.json` and `ja.json`. `bun run lint`, `typecheck` and `build` pass for `web`.

## 4. Collapsed offers

- [x] 4.1 In `features/offers/offer-card.tsx`, add up to three give thumbnails, a swap mark and up to three get thumbnails to the collapsed trigger, with "+N" for the rest. Check an existing thread with an older offer at 390 px for no sideways scroll. `bun run lint`, `typecheck` and `build` pass for `web`.

## 5. Objekts in notifications

- [x] 5.1 Add optional `objekts: string[]` (`.max(3)`) to `offerPayloadSchema` and `tradePayloadSchema`, and a pure `noteObjekts(items, readerId, fromUserId)` in `schemas/offer.ts` (what the reader gets first, de-duplicated, three at most), with a test. `bun run lint`, `typecheck` and `test` pass for `@repo/api`.
- [x] 5.2 In `writeNotes` (`services/offer/notes.ts`), read the offers' `from_user_id` and `offer_item` rows in one query and set `objekts` on each note. Verify by computing the payloads for a sample of existing offers read-only, without inserting. `bun run lint` and `typecheck` pass for `@repo/api` and `worker`.
- [x] 5.3 In `services/notifications.ts`, add `payload.objekts` to the slugs the page's `collections` are loaded for. Verify by reading the bell's list read-only. `bun run lint` and `typecheck` pass for `@repo/api`.
- [x] 5.4 Add a pure stack-selection function beside `features/notifications/tone.ts` (loaded slugs only, order kept, three at most), with a test, and a `NotificationStack` in `notification-items.tsx` used by `NotificationItem` and `OfferItem`, with the tone icon as a badge on offers and trades and `ToneTile` when nothing is loaded. Check the bell against the mockup at 390 px and 1280 px, light and dark. `bun run lint`, `typecheck`, `test` and `build` pass for `web`.

## 6. Wrap-up

- [x] 6.1 Run `bun run check` and `bun run build --filter=web`; both pass.
- [x] 6.2 Update `packages/api/AGENTS.md` (chat section: post cards, the match saved at send, the objekt-only output schemas kept for open tabs; `writeNotes` filling `objekts`) and `apps/web/AGENTS.md` (Chat draft section: the two attachment kinds). State that `apps/worker` and `packages/db` conventions are unchanged. `bun run lint` passes.
