## Why

A pre-launch audit of messaging found no authorization holes, but rules that break at the edges (a click on Message spends a start, an empty conversation gets around "Nobody", a card can name an objekt nobody listed, a banned account can be messaged) and a thread that can lose or duplicate text on a flaky network. All are cheaper to fix before launch.

## What Changes

- **An empty conversation has no effect until its first message.** Message still opens one, because open tabs depend on that. The first message or offer now runs the start checks: Nobody, the start limit, and whether the conversation lands in Requests. It counts as the start. The recipient cannot open an empty conversation.
- **Sending rules:**
  - A card must match a listing, and its objekt must be held by the sender or the list owner.
  - A hide-serial list never reveals which copy it holds.
  - A banned account reads as not accepting messages.
  - A sender with no linked profile cannot send.
  - A deleted partner's thread shows a notice instead of the message box.
  - "Seen" follows blocks.
  - A chat-muted start says when the mute ends.
- **Moderation:** the scam scan sees through zero-width and full-width tricks; a block's cancel reason never reaches the API; notifications name a deleted account "Deleted account".
- **Robustness:**
  - A retried send never posts twice.
  - Unsent text survives a failure, going offline and switching conversations.
  - A live message that arrives during a thread's first load still appears.
  - A failed catch-up fetch retries.
  - A thread marks read only what the user can see, with a "New messages" cue.
  - Switching Seen on or off notifies partners only when the value changes, and is rate-limited.
  - Bad input is refused with a 400, not a 500.
- **Clarity and accessibility:**
  - A declined request restores to Requests.
  - Archive, Decline and Accept confirm with Undo.
  - The empty Inbox points to waiting requests.
  - The request bar explains Decline.
  - "Mute conversation" replaces "Mute notifications".
  - Failures offer back or Retry.
  - Search results are announced.
  - Focus is kept after Send.
  - ja and ko use one term each for objekt, offer and trade.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-chat`: Who can start a conversation, Requests, Inbox Requests and Archived, Thread view, Realtime delivery, Rate limits, Messages settings, Blocks and chat mutes gate sending, Seen and typing, Message attaches its card.
- `web-moderation`: Block a user, Scam-phrase caution.

## Routes

`/messages`, `/messages/$id`, `/account/messages`, and every Message button (profile, list, Trade, For you, Market drawer).

## Non-goals

- **Already decided:** email or push, editing, late unsend, deleting conversations, presence, searching message text.
- **Creating the conversation on first send.** It breaks open tabs; an inert empty conversation gets the same result.
- **Cleaning up empty conversations.** Only their opener sees them.
- **Scale work** (inbox denormalising, card-search indexes, cached counts); it needs EXPLAIN on production data first.
- **Post-launch polish:** plural wording, emoji initials, per-thread titles, Enter on phones, the minute re-render, the request burst per incoming message, and offers counting on both the bell and Messages.

## Impact

- `packages/api`: chat services, `lib/chat-rules.ts`, `lib/scam-patterns.ts`, offer start and offer views.
- `packages/db`: one additive migration, generated but not applied: `conversation.started_by` and `started_at` (backfilled), `conversation_member.opened_at`, and `message.client_id` with a unique index.
- `apps/web`: `features/chat/*`, the `/messages` routes, the Messages settings section, and messages in en, ko and ja.
- **Compatibility:** inputs only gain optional fields. A tab opened before the deploy still sends `chat.start`, then `chat.send`. Its first send now meets the start checks, whose codes (`not_accepting`, `start_limit`) that tab already renders.
- **Order:** archive `account-deletion-safety` first, because both changes modify "Blocks and chat mutes gate sending".
