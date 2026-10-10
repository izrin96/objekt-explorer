## Context

Phase 3 built conversations (`conversation`, `conversation_member`, `message`), the `chat` router, and `chat_changed` and `notifications_changed` nudges on `/ws/me`. It also added the safety helpers `notBlockedEither`, `notTradeBlocked` and `activeSanctionWhere` in `services/safety.ts`, and the audited `moderation` router.

Other pieces this change builds on:
- `resolveCard` and `cardListAllowed` (`services/chat.ts`) decide which lists a message may name: the sender's own, a partner list that shows its owner, or the conversation's start target.
- Ownership lives in the indexer: `objekt.owner` and `objekt.transferable`. Accounts reach addresses through `user_address.user_id`.
- List entries name a collection (`collection_slug`) and optionally one token (`objekt_id`).

## Goals / Non-Goals

**Goals:**
- Accepting an offer is one transaction. Two accepts racing for the same objekt can't both win: a unique index decides, not application code.
- Offer and trade state is read live. A thread card always shows the current status without extra messages.
- The rules live in one pure, tested module (`lib/offer-rules.ts`): which actions each party may take in each state, what a counter replaces, expiry, and the item limits.

**Non-Goals:**
- Watching the transfer stream (`add-verified-trades`).
- Any change to how a plain message or card is sent.

## Decisions

### D1. Data model
Four new tables. Every user foreign key cascades.

**`offer`**
- `id serial`, shown as O-<id>;
- `conversation_id`, `from_user_id`, `to_user_id`;
- `parent_id`: the offer this one counters;
- `status`, with a CHECK: `open | accepted | declined | withdrawn | countered | cancelled | expired`;
- `cancel_reason`, with a CHECK: `reserved | blocked | sanction | token_moved | null`;
- `topup_amount numeric(12,2)`, `topup_currency`, `topup_payer` (`from | to`); either all three are set or none;
- `note` (at most 280 characters), `caution text[]`;
- `created_at`, `expires_at` (`created_at + 7 days`), `responded_at`.

Partial unique index `offer_one_open (conversation_id) WHERE status = 'open'`, so a conversation holds at most one open offer.

**`offer_item`**
- `offer_id`;
- `side`: `give` comes from `from_user`, `get` from `to_user`;
- `collection_slug`;
- `objekt_id`, nullable: null means any copy;
- `list_id`, nullable: the list a get item was picked from.

CHECK: a `give` item always has an `objekt_id`.

**`trade`**
- `id serial`, shown as T-<id>;
- `offer_id unique`, `user_a` (the offer's sender), `user_b`;
- `status`: `in_progress | completed | cancelled | failed`;
- `accepted_at`, `ended_at`, `cancelled_by`, `cancel_reason`.

**`trade_leg`**
- `trade_id`, `from_user_id`, `to_user_id`;
- `from_addresses text[]` and `to_addresses text[]`: lowercase snapshots of each side's linked addresses at accept;
- `collection_slug`, `objekt_id` (nullable for any copy);
- `open boolean default true`;
- `verified_at`, `tx_hash`, `verified_objekt_id`.

Partial unique index `trade_leg_reserved (objekt_id) WHERE open AND objekt_id IS NOT NULL`. This makes "an objekt is in at most one open trade" a database fact.

`message` gains `offer_id integer references offer`. The `message_has_content` check becomes `body IS NOT NULL OR card IS NOT NULL OR offer_id IS NOT NULL`.

`add-verified-trades` writes the verification columns and the address snapshots. They are created here so the trade tables come from one migration.

*Alternatives*:
- Storing items as jsonb on `offer` was rejected. Reservation conflicts and "open offers holding this objekt" need indexed lookups by `objekt_id`.
- Storing addresses only through `user_address` at verify time was rejected. A user who unlinks an address mid-trade would then make a leg unverifiable or, worse, attributable to someone else.

### D2. Counters and the one-open rule
`offer.create({ conversationId | target, give, get, topup?, note? })` decides what the new offer replaces:
- If the conversation has an open offer **to** the sender, the new offer counters it. The old offer becomes `countered`, and the new one's `parent_id` points at it.
- If the conversation has an open offer **from** the sender, the old one becomes `withdrawn`.
- Otherwise the new offer stands alone.

This happens in one transaction under `SELECT … FOR UPDATE` on the conversation row, the same lock `appendMessage` takes. `offer_one_open` backs it. `lib/offer-rules.ts` decides the result (`counter | replace | new`) from the open offer's direction, and is tested.

*Alternative*: allowing several open offers per conversation. Rejected: it means "which one are we talking about?", and the mockup shows one live offer with collapsed history.

### D3. Items and checks
`offer.candidates({ conversationId | target })` returns what the builder offers.

**Mine**: the sender's objekts across their linked addresses, from the indexer, paged and filterable like the profile grid. Each one carries flags:
- `transferable`;
- `reserved` (an open trade leg);
- `inOpenOffer` (the ids of other open offers that hold it).

The sender's have-list entries come first as suggestions, but anything they own can be picked. This is the sender's explicit choice, so the have-list rule for matching does not apply here.

**Theirs**: entries from the partner's have and sale lists that `cardListAllowed` permits:
- lists that show their owner;
- the conversation's start-target list;
- lists already named on a card in this conversation.

Each entry is resolved against current ownership:
- an entry with an `objekt_id` the partner still owns is a specific token;
- a collection entry offers "any copy" when the partner owns at least one transferable copy, plus the specific copies they own.

Lists that hide their owner and were never named in the conversation stay invisible, so the builder can't be used to link a hidden list to an account.

`create` runs the same checks on the server. Every `get` item must come from such a list entry, except in a counter: there, an objekt from the countered offer's give side is also allowed, because its owner already offered it.

| Refusal | Cause |
| --- | --- |
| `not_owned` | a specific objekt isn't owned by its side's addresses |
| `not_transferable` | `transferable` is false |
| `reserved` | the objekt is in an open trade leg |
| `not_listed` | a `get` item isn't on an allowed list |
| `empty` | the offer has no objekts |
| `too_many` | more than 10 objekts on one side |
| `invalid_topup` | the amount isn't positive, or the currency isn't in `currency_rates` |

An objekt in another open offer is a warning only. The response lists it, and the builder shows "Also in open offer O-874".

### D4. Accept
`offer.accept({ offerId })` runs in one transaction:
1. Lock the conversation row and re-read the offer. It must be `open`, not past `expires_at`, and addressed to the caller.
2. Recheck safety (D6) and every specific objekt's owner and `transferable` in the indexer. Any-copy items need the giver to own as many transferable, unreserved copies of that collection as the offer asks for.
3. Insert the `trade` and one `trade_leg` per objekt, with address snapshots. A unique violation on `trade_leg_reserved` becomes the refusal `reserved`.
4. Set the offer to `accepted`.
5. Mark every other open offer holding one of these specific objekt ids as `cancelled` (`reserved`), and notify both of its parties.

After commit, publish `chat_changed` for every conversation touched and `notifications_changed` for every user touched.

`decline` and `withdraw` set the status and `responded_at`. Expiry is read lazily here: an `open` offer past `expires_at` reads as `expired` everywhere, and accepting it is refused. `add-verified-trades` adds the worker that writes `expired` and notifies.

`cancelTrade({ tradeId })` lets either party end an `in_progress` trade with no verified leg. The trade becomes `cancelled`, its legs close, and the reservations free up. `add-verified-trades` adds the lock after the first verified leg.

### D5. Threads and the offer card
An offer message has `offer_id` and no body. `toChatMessages` hydrates offers in one batched read (items plus collection metadata through the existing `hydrateCards` path), and attaches `offer: OfferView` to each message:
- the status;
- both sides, which `you give` and `you get` are relative to the viewer;
- the top-up, the note and the caution flags;
- the actions the viewer may take;
- the trade id once the offer is accepted.

The card in a thread collapses when another offer in the same conversation is newer. The newest card is full. Status changes publish `chat_changed`, so the card refreshes through the existing thread cache.

The note goes through `scam-patterns` like a message body. Its caution shows to the recipient only.

### D6. Safety
A shared `offerSafety(senderId, partnerId)` reuses `chatSafety` plus `notTradeBlocked`. A block in either direction refuses offer actions with the same reason as chat, so the blocked side can't tell.

| State | Allowed | Refused |
| --- | --- | --- |
| Chat mute | accept, decline, withdraw, `cancelTrade` | `create` |
| Trade block or ban | — | every offer action |

Cancellation hooks:
- `moderation.block` (and `afterBlockChange`) cancels open offers between the pair with reason `blocked`.
- `moderation.act` with `trade_block` or `ban` cancels the target's open offers with reason `sanction`.

Both run in the same transaction as the block or the sanction. `in_progress` trades are left alone.

### D7. First offer and rate limits
`create` with a `target` opens or reuses the conversation through the same path as `chat.start`:
- a linked address is required;
- the who-can-message setting applies;
- so does the hidden-owner opt-in;
- the start limit counts it.

An offer names objekts, so a new conversation opens in the Inbox, not in Requests. An offer message also counts toward the 30-per-minute message limit. A user may have at most 20 open offers sent at once (`too_many_open`).

### D8. Web
- **`features/offers/offer-builder.tsx`**: a `Dialog` (on a phone, the `Drawer` pattern the objekt drawer uses). It has two columns, You give and You get, each with an Add picker. The pickers reuse the virtua objekt grid from the profile, filtered to candidates. Flags show inline: "Not transferable" disables the item, and "Also in open offer" shows as a warning. It also holds the top-up fields (the currency `Select` that list settings use) and the note.
- **`features/offers/offer-card.tsx`**: drawn inside `thread.tsx` next to `objekt-card-message.tsx`. Its buttons depend on the viewer: Accept, Decline and Counter for the recipient, Withdraw for the sender. Counter opens the builder prefilled with the sides swapped.
- **Entry points**:
  - the composer gains an Offer button;
  - `browse-post.tsx` gains Make offer;
  - `partner-row.tsx` gains Propose this trade. `offer.suggest({ partnerId })` returns the For you overlap as items: their have entries you want, and your have entries they want that you still own.
  - the drawer's Market rows gain Make offer, with that objekt prefilled.

  Each shows only where Message shows, and uses the same `messageable` flag.
- **Routes**:
  - `routes/(container)/trade/mine.tsx` for My trades, through `offer.mine` (grouped, with History paged by cursor);
  - `routes/(container)/trade/mine/$tradeId.tsx` for the trade page;
  - the tab bar gains My trades;
  - a signed-out visitor is sent to `/login?redirect=…`.

The design prefers existing pieces: `Dialog`/`Drawer`, the profile grid, `Select`, `message-button` gating and the thread cache. A new component is only for the builder layout and the offer card, which have no existing equivalent.

### D9. Notifications
A new type `offer`. Its payload is `{ offerId, event, reason?, partner }`, where `event` is one of `received | countered | accepted | declined | withdrawn | cancelled`.

`groupKey` is `offer:<conversationId>`, so a back-and-forth in one conversation stays one unread row. Rows are written in the same transaction as the state change, through the existing helpers. The Notifications section gains the "Offers" switch, on by default.

## Risks / Trade-offs

- **[An indexer read inside accept's transaction]** → Read the indexer before taking the Postgres lock, then lock and reread the offer status. Ownership can change between the two, but the verifier in `add-verified-trades` catches a moved token, so the cost is a trade that cancels itself later.
- **[Builder candidate size for whales]** → "Mine" is paged with filters, not loaded whole. "Theirs" is bounded by the allowed lists.
- **[Lazy expiry]** → Until `add-verified-trades` ships its worker, an expired offer still holds `offer_one_open`. `create` treats an expired open offer as replaceable: it writes `expired`, then proceeds.

## Migration Plan

Create one migration with `db:generate` and apply it locally only. At ship it goes after the phase 3 migrations. Rolling back means dropping the four tables and `message.offer_id`. No existing rows change.
