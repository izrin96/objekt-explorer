## Why

The user's own messages render inverted (`bg-foreground text-background`): a white slab in dark, a black one in light. It is the loudest thing on the Messages screen, and it breaks the "quiet gallery, loud cards" direction, where chrome stays monochrome and only objekt art carries colour. The rest of the thread drifts from the design reference too (`design/chat-and-trade-concepts.html`, section 03). The offer card is narrow and stacks its two sides. The composer's two actions are bare icons. Inbox rows do not show which objekt a conversation is about.

## What Changes

- **Message bubbles.** Own messages use a mid-gray fill with normal foreground text, a new `--chat-mine` token defined for light and dark. The partner's messages use the card surface with a 1px border. Bubbles get a smaller corner on the sender's side ("tail"), and consecutive messages from one side join along that side. Bubbles are capped at about 420px, with padding close to the mockup. Unsent, card, offer, caution, Seen and time states all stay legible in both themes.
- **Offer card in the thread.** The card is about 460px wide on the card surface. It has a header row (title, O number, status) and the two sides (You give, You get) next to each other with a swap glyph between them. Expiry and actions sit in a footer. The sides stack again when the card is narrower than about 448px, which covers phones and the narrow `md` thread. The collapsed form of older offers keeps its current behaviour at the new width.
- **Composer.** Attach objekt and Make offer show their text labels next to their icons when the composer is at least 32rem wide. Below that, on phones and in the narrow `md` thread, they stay icon-only and keep their accessible names.
- **Context thumbnail on conversation rows.** A row shows a small thumbnail of the newest objekt card in the conversation, with its collection and serial in mono. `chat.list` returns that card and the collections it needs. The output only gains fields and the input is unchanged, so tabs opened before the deploy keep working.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `web-chat`:
  - Adds "Message bubbles", "Composer action labels" and "Conversation context thumbnail".
  - Modifies "Offer cards in the thread" to add the side-by-side layout and its narrow fallback.

## Routes

- `/messages`: the conversation list in `apps/web/src/routes/(container)/messages/route.tsx` and `index.tsx`
- `/messages/$id`: the thread in `apps/web/src/routes/(container)/messages/$id.tsx`

## Non-goals

- Inbox search, notification changes and moderation. Sibling changes own those.
- No new message kinds, no system "started from" message, and no change to grouping times, unsend, Seen or typing behaviour.
- No change to the offer builder, offer actions or offer data. The offer card is restyled only.
- No merged "+" attach menu on phones.
- The `.offer.collapsed` opacity from the mockup is not used, because dimmed text would fail contrast.
- Things the mockup shows that were dropped on purpose stay dropped: Browse facets, the bell count, and the rest.

## Impact

- `apps/web/src/styles/app.css`: a new `--chat-mine` token for light and dark.
- `apps/web/src/features/chat/thread/message-item.tsx`, `thread.tsx`, `composer.tsx`, and a new pure `bubble-run.ts` with a test.
- `apps/web/src/features/offers/offer-card.tsx`, `offer-body.tsx`, `offer-side-list.tsx`. These are used only by the thread.
- `apps/web/src/features/chat/thread/objekt-card-message.tsx`: changes to the card surface.
- `apps/web/src/features/chat/conversation-list.tsx`.
- `packages/api/src/services/chat/inbox.ts` (`listConversations`), `services/chat/cards.ts`, and `schemas/chat.ts` (`conversationRowSchema` gains `context`; the page gains `collections`).
- No migration. The new lateral read uses the existing `message_conversation_id_idx`.
