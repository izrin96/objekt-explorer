# Proposal

## Why

Requests exist so a stranger's first message waits until the recipient says yes, but any card or offer skips them. A cold message from a profile can attach one of the recipient's own objekts, a bare collection or a card from their general list, and land in the Inbox as if it answered a post. On 2026-11-02 a user complained that someone asked to buy objekts on none of their trade or sale lists. The complaint does not say how the message arrived, but this is one path that puts it in the Inbox.

## What Changes

- **A first message goes to the Inbox only when it is listed**: its card names one of the recipient's sale, have or want lists (a post card always does, and so does Message from a Market listing), or its offer touches the recipient's lists, asking for something through one of them or giving a collection on one of their want lists.
- **Everything else opens as a request**: a first message with no card (as today), with an objekt card naming no list, the sender's own list or the recipient's general list, or with an offer that touches none of the recipient's lists (an ask from the collection of someone who lists nothing, or a give the recipient never asked for).
- **Accepting an offer in a request accepts the request**, so the conversation moves to the Inbox. Declining the offer leaves it where it was.
- Cards and offers stay allowed as they are; only where the conversation lands changes. Conversations that already hold messages stay where they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: Requests now decide by whether the first message is listed rather than whether it carries a card; a first offer from outside a conversation follows the same rule; accepting an offer accepts a request.

## Impact

- `packages/api`: `lib/chat-rules.ts` (the member event and a pure "listed" rule with tests), `services/chat/cards.ts` (report the card's list owner), `services/chat/members.ts` and `send.ts` (pass the verdict to `appendMessage`), `services/offer/index.ts` (verdict for a first offer, and an accept event on offer accept).
- `apps/web`: no change expected; the Requests tab, bar and dot already handle a conversation that opens as a request.
- No schema change, no migration, no backfill.

## Non-goals

- A "Who can message you" option between Anyone and Nobody.
- Blocking an account before it writes, or catching alternate accounts.
- Changing which cards or offers may be sent at all.
- Moving conversations that already hold messages.
- Changing the bell: an offer's notice still goes out when the offer lands in Requests.

## Routes

- `/messages` and `/messages/$id` (Inbox and Requests)
- Message and Make offer on profiles, list pages, Trade rows and the objekt drawer's Market tab, which open these conversations
