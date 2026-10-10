## Context

See proposal.md for why. Current state:
- `features/chat/thread/message-item.tsx` draws text as `rounded-2xl` paragraphs. Own messages are `bg-foreground text-background` and the partner's are `bg-secondary`. The `<li>` caps the width at `max-w-[85%] sm:max-w-md`.
- `thread.tsx` already works out each message's `previous`/`next` and a `showTime` flag. A run ends when the sender changes or the gap is over `GROUP_MS`. Nothing tells a bubble whether it starts or continues a run.
- `features/offers/offer-card.tsx` wraps `OfferBody` in `bg-background w-80`. `OfferBody` stacks header, give list, get list, top-up, note, trade link, expiry and actions in one column.
- `composer.tsx` renders Attach and Offer as `size="icon"`-style buttons with `aria-label` and `title`.
- `services/chat/inbox.ts` `listConversations` joins only `c.last_message_id`. The row carries `last.card` only when the latest message is itself a card.
- Tokens: light `--card` is white and `--secondary` is 4% black; dark `--card` is `oklch(0.178 …)`. No token sits between them for a filled neutral surface.

## Goals / Non-Goals

**Goals:** one `--chat-mine` token pair in place of the inverted colours; run shape derived in one pure, tested place; an offer card that reads left-to-right on wide threads; a context thumbnail with no new endpoint.

**Non-Goals:** no change to message grouping rules (`GROUP_MS`), no virtualization change, no new offer data.

## Decisions

1. **Own bubble colour: a new `--chat-mine` token.** Dark `oklch(0.32 0.008 286)`, from the mockup's `.bub.me`. Light `oklch(0.92 0.004 286)`: a light gray that keeps `--foreground` (0.205) at well over 4.5:1 and still separates from the off-white page (0.987). Registered as `--color-chat-mine` in the `@theme` block, so the class is `bg-chat-mine`.
   *Alternatives:* `bg-secondary` / `bg-muted`. These are 4–5% alpha overlays, which fade into the page on white and look like the partner's bubble. `bg-accent` is indigo, which breaks monochrome chrome.
2. **Partner bubble: `bg-card border`.** This reuses existing tokens. On the light page, white plus the 8% border reads as a card, which matches the mockup's `.bub.them`.
3. **Run shape lives in a pure `bubble-run.ts`.** `runPosition(prev, message, next): "single" | "first" | "middle" | "last"` uses the same sender + `GROUP_MS` rule that `showTime` uses today. `showTime` is then simply `position === "single" || position === "last"`, so the two can't drift apart. `thread.tsx` passes `position` to `MessageItem`, and a test covers the rule. A small `Bubble` component in `thread/bubble.tsx` holds the surface and corner classes. `MessageItem` and the moderator excerpt both use it, so the two never drift apart. Corners use logical utilities (`rounded-2xl` plus `rounded-ee-sm` / `rounded-se-sm` for own messages, the `es`/`ss` pair for the partner's), which mirror in RTL without extra code.
   *Alternative:* compute the corners inside `MessageItem` from props. That duplicates the grouping rule a second time.
4. **Width cap on the bubble, not the `<li>`.** The `<li>` keeps `max-w-[85%]` so card messages and offer cards are still bounded on phones. The text bubble gets `max-w-[420px]`, written as `max-w-105` (26.25rem) to follow the theme-spacing rule. Padding goes from `px-3 py-2` to `px-3.5 py-2`, which is close to the mockup's 9×13 px.
5. **Offer card: container query inside `OfferBody`.** The card becomes `bg-card w-115 max-w-full` (460px, ~28.75rem) and an `@container`. Give and get sit in a wrapper that is `grid gap-3 @md:grid-cols-[1fr_auto_1fr]`, with an `ArrowsLeftRightIcon` in the middle column that is hidden below `@md` (28rem ≈ 448px). The thread pane is narrow at `md` with the list beside it, so a container query follows the card's real width where a viewport breakpoint would not. Header, top-up, note, trade link, expiry and actions keep their order. Expiry and actions move into one footer row (`flex items-center justify-between`). The collapsed `Collapsible` gets the same width and `bg-card`.
   *Alternative:* a viewport `md:` breakpoint. It would put the sides side by side in a narrow `md` thread and overflow.
6. **Composer labels: container query too.** The composer row gets `@container`. Each action button renders the icon plus `<span className="hidden @lg:inline">label</span>` (32rem), and keeps `aria-label`. The button switches from icon size to `size="sm"` with auto width. The same component works in all three layouts (phone, `md` split, desktop).
7. **Context thumbnail: one lateral read in `listConversations`.**
   ```sql
   LEFT JOIN LATERAL (
     SELECT x.card FROM message x
     WHERE x.conversation_id = c.id AND x.card IS NOT NULL AND x.unsent_at IS NULL
     ORDER BY x.id DESC LIMIT 1
   ) ctx ON true
   ```
   This walks `message_conversation_id_idx` backwards per row. A page is at most `CONVERSATION_PAGE_SIZE` rows and stops at the first card, so it's cheap. `conversationRowSchema` gains `context: storedCardSchema.nullable()`. The page gains `collections`, built with the existing `hydrateCards` from `cards.ts`, the way `toChatMessages` does it. The input schema is untouched, so old tabs keep working. A client older than the deploy ignores the extra fields.
   *Alternative:* a denormalised `conversation.context_card` column. That needs a migration and a backfill for a cosmetic field.
8. **Thumbnail rendering.** `conversation-list.tsx` reuses the existing small objekt thumbnail used by `ObjektCardMessage` / the attachment chip, scaled to `size-10` with `aspect-[5.5/8.5]`, which is `w-7 h-10`. It sits under the preview as a `font-mono text-xs` line: collection plus `#serial`. While a collection is missing from `collections`, the slug text shows in its place, as the card message does today. It is `aria-hidden`, because the line beside it says the same thing.

## Risks / Trade-offs

- [Light `--chat-mine` too close to `--secondary` hover states] → the token is a solid colour, not alpha, so contrast is checked once (task 1.1). Adjust L to 0.90 if it washes out.
- [Lateral read slower on very long conversations full of text] → the scan only covers a conversation's own rows in index order and stops at the first card. Check one `EXPLAIN` on a local DB, never on production.
- [Container queries need Tailwind v4 `@container`] → it's built in on v4. No plugin needed.

## Migration Plan

No migration. The API change only adds fields. Deploy the API and the web app together as usual. Rollback is a revert.
