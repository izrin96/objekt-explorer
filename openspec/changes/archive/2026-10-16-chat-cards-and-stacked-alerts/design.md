## Context

See proposal.md for why. The current state this design builds on:

- `message.card` and `notification.payload` are `jsonb`. A card is stored as `{ collectionSlug, objektId?, listId? }` (`storedCardSchema`) and sent as `{ collectionSlug, objektId?, listSlug? }` (`cardInputSchema`). `resolveCard` checks it on `chat.start` and `chat.send`; `hydrateCards` reads it live for the thread, and `services/chat/inbox.ts` picks the newest non-unsent card as a row's `context`.
- `/rpc` must stay compatible with open tabs (`packages/api/AGENTS.md`): an old tab sends today's card input and reads `ChatMessage.card` and `ConversationRow.context` as objekt cards, with `collectionSlug` always present.
- Browse already has the match: `personDetail` (`services/trade-matches/index.ts`) returns one partner's `theyHaveIWant` and `iHaveTheyWant` items and `counts`, by the same rules as the chip.
- A Browse post is a list paired with its partner list (`pairPosts`, `lib/trade-feed.ts`), assembled by `services/trade-feed/index.ts`; `fetchMyPosts` already builds posts for one owner.
- Every offer and trade notification goes through `writeNotes` (`services/offer/notes.ts`), which the API and the worker share. Both payloads carry `offerId`. `offer_item` rows have `side` (`give` | `get`, from the offer creator's view) and `collectionSlug`.
- The bell's list response carries `collections` per page for the slugs it names (`services/notifications.ts`).

## Goals / Non-Goals

**Goals:**
- An open tab built before the deploy keeps working on every screen, whatever new cards and payloads it meets.
- One place decides what a post card shows (live), one place computes a match (the existing matching pipeline), one place adds objekts to offer and trade notifications (`writeNotes`).

**Non-Goals:**
- A new table, column or migration.
- Changing how the objekt card is checked or drawn, or how message bubbles look.

**Verifying writes.** `chat.start` and `chat.send` write rows, and the root `.env` is production. Verify them only up to the request boundary (the input the Message button would send, and the server's validation of it) with the control left unclicked, or end to end against a local database through `.env.local`. Never click Message or Send against production.

## Decisions

**1. A post card is a second card kind, kept out of the old fields.**
- Input: `cardInputSchema` becomes `z.union([postCardInput, objektCardInput])`. `postCardInput` is `{ kind: "post", listSlug, withMatch?: boolean }`. `objektCardInput` is today's object with an optional `kind: "objekt"`, so an old tab's input still validates to the same data.
- Stored: an objekt card is stored exactly as today (no `kind`), so search (`card->>'collectionSlug'`) keeps working. A post card is stored as `{ kind: "post", listId, match? }`, where `match` is `{ ownerHas: { count, slugs }, senderHas: { count, slugs } }` with at most 3 slugs each: the owner's objekts on the sender's wants, then the sender's on the owner's. The client turns these into "yours" and "theirs" by comparing the sender with the viewer.
- Two schemas: today's `storedCardSchema` is renamed `storedObjektCardSchema` (type `StoredObjektCard`) and keeps its shape. A new `storedCardSchema` is the union, and only `parseCard` and the code that writes `message.card` use it. Every output an open tab reads keeps the objekt-only schema, and post cards are mapped to `null` there:
  - `ChatMessage.card` (thread pages, `send` results, live delivery through `findSentMessage` in `services/chat/members.ts`);
  - `ConversationRow.last.card` and `ConversationRow.context` (`services/chat/inbox.ts`);
  - the report excerpt `card` (`schemas/moderation.ts`, `services/report.ts`, `lib/sanctions.ts`), which is also stored inside reports;
  - offer items (`offerItemCards` in `services/offer/view.ts`), which are objekt cards by nature.
- New fields carry the post card: `ChatMessage.post`, `ConversationRow.contextPost`, `last.post: boolean` for the preview, and an optional `post: { listId }` on a report excerpt entry, which the moderation report view shows as "Trade post card". An old tab ignores the new fields and draws the message as text only, which the spec allows.
- Alternative: one `card` field with a `kind`. Rejected, because old tabs read `card.collectionSlug` unguarded and would draw a broken objekt card.

**2. The match is computed on the server at send time.**
The client only asks (`withMatch: true`). `resolveCard` calls `personDetail(senderId, ownerId, undefined)` and saves the counts and the first three slugs of each direction, in the order the person sheet shows them. `chat.start` computes it too, for the draft preview; `chat.send` computes it again, so what is saved is what was true when sent. When there is no match either way, the card is saved without one.
- Alternative: the client sends the slugs it already shows. Rejected, because a client could then claim matches it doesn't have.
- `personDetail` is cached per viewer (`trade:person:3:`), so a send costs one cache read in the common case.

**3. The post view reuses the feed's post assembly.**
Add a `fetchPostCards(listIds, viewerId)` in `services/trade-feed/`, beside `fetchMyPosts`. It pairs each list with its partner list (`pairPosts`) and returns tag, owner, up to six slugs and the count per side, and the sale price range. A list that is gone or is no longer shown on Trade (`setShowOnTrade` off) comes back as removed. `hydrateCards` calls it for the post cards on the page.
- Alternative: hand-build the strips in `cards.ts`. Rejected; Browse and the card would drift on what a post shows.
- Collections only: the card never reads serials, so hide-serial lists need no extra rule.

**4. Web: one attachment type with two kinds.**
`Attachment` (`features/chat/attachment.ts`) and `stores/chat-draft.ts` hold `{ kind: "objekt", … } | { kind: "post", view }`. `MessageButton` keeps its props; `card` is the widened `CardInput`. A new `thread/post-card-message.tsx` draws both the post and the match form, with the `ObjektCard` thumbnail and `TagBadge` already used on Browse. `composer-attachment.tsx` draws it with remove and "Pick objekts instead" (opens the existing `attach-objekt-dialog`). `firstLineSuggestions` takes the attachment, not just a list type. `browse-post.tsx` sends `{ kind: "post", listSlug: anchor.list.slug, withMatch }`, where `withMatch` is true when `person.counts` has `theyHave` or `youHave` above zero.

**5. Collapsed offers draw from data they already have.**
`OfferView.give` and `get` carry `collectionSlug`, and `OfferCard` already has `collections`. Add a small thumbnail row to the collapsed trigger in `offer-card.tsx`; no API change.

**6. `writeNotes` adds the objekts.**
Before inserting, `writeNotes` reads `offer.from_user_id` and the `offer_item` rows for the notes' `offerId`s in one query. For each note it orders the slugs as the reader sees them: what the reader gets (the creator's `get` side if the reader created the offer, otherwise the `give` side), then what the reader gives. It removes duplicates and keeps three, as an optional `objekts: string[]` (`.max(3)`) on `offerPayloadSchema` and `tradePayloadSchema`. The ordering is a pure function in `schemas/offer.ts` with a test. Every writer, API and worker, gets it without a change at its call site.
- Alternative: pass objekts from each call site. Rejected; about a dozen writers would each need it.
- `services/notifications.ts` adds `payload.objekts` to the slugs it loads `collections` for.

**7. One stack component in the bell.**
`notification-items.tsx` gets a `NotificationStack` used by `NotificationItem` (list alerts, from `payload.latest`) and `OfferItem` (from `payload.objekts`, with the `ToneTile` icon as a badge). It draws only the slugs whose collections are loaded; with none it falls back to `ToneTile`. Which slugs to draw and in what order is a pure function beside `tone.ts`, with a test.

## Risks / Trade-offs

- [An old tab shows a post card message as text only, or as nothing when it has no text] → Accepted for the deploy window. A post card is only sent with a Message click, and the composer suggestions fill text, so nearly every one carries text.
- [`personDetail` on a cold cache is slow for a large account] → The start and send paths already wait on several reads. If it shows up, cache the match per pair for the draft and recompute only on send.
- [A deleted list cascades nothing into `message.card`] → The card reads it live and says "Post removed", and a saved match stays, as the spec says.
- [The worker imports `writeNotes`; a heavier `writeNotes` runs in every verifier pass] → One indexed query per batch (`offer_item_offer_id_idx`), only when there are notes.

## Migration Plan

No database migration. Deploy the API and web together, as usual. Rollback is a redeploy: old code reads a stored post card through `storedCardSchema`, which fails and returns `null`, so the message shows as text only; the extra `objekts` field in payloads is ignored.
