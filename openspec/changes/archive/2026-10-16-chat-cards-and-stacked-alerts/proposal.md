## Why

Message on a Trade Browse post attaches the first objekt of the post's have list, and the first suggested line asks "Would you trade this one?". The receiver reads it as a request for that objekt, which the sender never made. In the bell, an alert about five objekts shows one thumbnail, and offer and trade notifications show only an icon. Mockups: https://claude.ai/artifact/TvsQfqCuZbPvQVopuCdejg

## What Changes

- **Post card.** A new card kind in chat that refers to a Trade post, not to one objekt. It shows the post's tag, a Has strip and a Wants strip with counts (a sale post shows its price range in place of Wants), and links to the post. It is read live; a removed post says so.
- **Match card.** A post card can also carry the overlap between the sender and the post's owner, saved when it is sent: up to three collections each way plus the two counts, from the same matching rules as Browse's chip. Its labels read from whoever views it ("yours", "theirs").
- **Message on Browse** attaches a match card when the viewer has matches with the post's owner, and a post card otherwise. The person sheet and Market keep the objekt card, since there the click is on one objekt.
- **Suggestions** for a post or match card drop "Would you trade this one?" and offer "Hi! Saw your post. Open to a swap?" (and "Hi! We match on a few. Want to swap?" for a match card). The attached post card offers "Pick objekts instead", which opens the existing attach picker.
- **Conversation list**: a conversation whose newest card is a post card shows the post's tag and owner instead of an objekt thumbnail; the last-message preview says "Trade post".
- **Collapsed older offers** show small thumbnails of both sides beside their summary.
- **Bell**: a list alert with more than one match leads with up to three objekts as an offset stack. Offer and trade notifications lead with the offer's objekts (what the reader gets first, at most three), with the event's icon as a small badge. Notifications written before this change, ones whose collections have not loaded, and moderator notices keep the icon tile.
- Old clients and old rows stay valid: a card without a kind is an objekt card, and the new notification field is optional. No database migration (both `message.card` and `notification.payload` are `jsonb`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: Messages and objekt cards, Message attaches its card, Suggested first line, Offer cards in the thread, Conversation context thumbnail.
- `web-trade-browse`: Message a post's owner.
- `web-notifications`: Notification bell and popover.

## Routes

`/trade` (Browse), `/messages` and `/messages/$id`, and the bell on every page.

## Non-goals

- Any change to message bubbles. Inverted (ink) bubbles stay ruled out by the 2026-10-11 decision.
- A system line or "Started from" message kind (mockup option D) and the link-only chip (option C).
- Changing the objekt card, its rules for sending, or Message on the person sheet, Market or list pages.
- Push, email or any new notification type, and backfilling objekts into existing notifications.
- Per-leg objekts for single-transfer trade events: every offer and trade notification shows the offer's objekts.

## Impact

- `packages/api`: chat card schemas and services, offer notification payloads, `writeNotes` (shared with the worker, so `apps/worker` needs no change), and a post read in `services/trade-feed`.
- `apps/web`: `features/chat`, `features/trade/browse-post.tsx`, `features/offers/offer-card.tsx`, `features/notifications`, the moderation report view, messages.
