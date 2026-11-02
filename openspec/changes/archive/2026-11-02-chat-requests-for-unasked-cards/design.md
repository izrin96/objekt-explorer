# Design

## Context

Where a first message lands is decided in one place: `appendMessage` (`packages/api/src/services/chat/members.ts`) sets `opensWithContent = first && (card !== null || offerId !== null)` and passes it as the recipient's `incoming` event; `nextMemberState` (`lib/chat-rules.ts`) turns `!opensWithContent` into `request`. Two callers reach it: `sendMessage` (`services/chat/send.ts`, text and cards) and `createOffer` (`services/offer/index.ts`, offers).

What a card may name is checked before that, by `resolveCard` (`services/chat/cards.ts`):

- a post card resolves only to a list of the partner's that is posted on Trade (`eq(lists.userId, partnerId)`), so it is always listed;
- an objekt card may name a list of either member (`cardListAllowed`), a bare collection, or an objekt held by either member (`cardAllowed`). This is the gap: a card naming the recipient's objekt and no list is allowed, and as a card it skips Requests.

An offer's You get rows are matched against `allowedEntries`, which reads only the partner's lists, so a row with a `listId` was asked through the recipient's list. When the partner has no list askable on Trade, rows come from their collection with `listId: null`.

Accepting an offer (`services/offer/accept.ts`) touches no member row today. In a conversation that never had a request this did not matter; once an offer can open a request, accepting it would leave the trade's conversation in Requests.

## Goals / Non-Goals

**Goals:**
- One pure rule decides whether a first message is listed, tested beside the existing member-state tests.
- The verdict is worked out where the card or offer is resolved, from facts that code already loads.

**Non-Goals:**
- Changing `cardAllowed`, `cardListAllowed` or the offer's list checks. What may be sent stays as it is.
- Any client change beyond confirming the thread drops its request bar after an accept (see Decisions).

## Decisions

**1. The caller passes `listed`; `appendMessage` stops looking at the content.** `AppendInput` gains `listed?: boolean`, and the recipient's event becomes `{ type: "incoming", first, listed }` with `request: event.first ? !event.listed : state.request`. `appendMessage` already receives the card and offer id, but it has neither the card's list owner nor the offer's rows. Re-reading them under the conversation lock would repeat queries the callers just ran. A missing `listed` reads as false, so a forgotten caller fails toward Requests, the safe side.

**2. A pure `firstListed` in `lib/chat-rules.ts`.** It takes the facts and the recipient's id:

- a card: `{ list: { ownerId: string; listType: ListType } | null }`, the list it names (null for none). A post card passes its list;
- an offer: `{ asksThroughList: boolean; givesWanted: boolean }`.

It returns true when the card's list belongs to the recipient and is a sale, have or want list, or the offer asks through a list or gives something wanted. A message with neither returns false. `resolveCard` returns the list beside the stored card. It already selects the list row (`ownerId`) for objekt cards and filters post cards by the partner, so adding `listType` to those selects costs no query.

**2a. A general list does not count.** Lists are public, so a stranger can find the slug of any list the recipient keeps and attach a card through it. A general list is a collection log, not an invitation to trade, and the complaint was about objekts on none of the recipient's trade or sale lists. Only sale, have and want lists say "talk to me about this". Offers already ask only through lists askable on Trade (`askableOnTrade`), so the offer side needs no such filter.

**3. Offer facts come from rows already built.** `asksThroughList` is `getRows.some((row) => row.listId !== null)`. For `givesWanted`, one query reads whether any of the partner's `want` lists holds an entry for a give item's collection. It runs only for a first offer whose asks did not settle it, so a counter or a later offer costs nothing extra. Any want list counts, posted on Trade or not: entries a want-list rule keeps are ordinary `list_entries` rows, so they count too.

Alternative considered: count only what the offer was opened from (a Trade row or list page `target`). Rejected because the builder is also reached from a conversation that Message opened, where the target is gone; reading the offer's own items gives one answer however the builder was opened.

**4. Accept applies the member `accept` event in the accept transaction.** After the offer row turns `accepted`, `acceptOffer` applies `{ type: "accept" }` to the acceptor's member row in the same transaction, under the same row lock `updateMember` takes. `updateMember` opens its own transaction, so split out a `tx`-taking helper and have both call it, rather than nest transactions. The event clears `request` and is a no-op when it is already false. Decline and expiry stay untouched. The web's offer actions already call `invalidateChatLists` and `fetchNewer` on success. The task checks that the open thread's request bar goes too, and invalidates the thread query if `fetchNewer` does not carry the member state.

**5. The live path needs no new event.** `createOffer` publishes `chat_changed` to both members, and the web answers it with `invalidateChatLists`, which reads the lists, `requestCount` and `requestsUnseen` again from the server. A text or card send goes through `buildChatMessages`, which already fills `requests` and `requestsUnseen` from member state. Neither path inserts a conversation into the Inbox cache on its own, so a first message that opens as a request shows under Requests live. Task 3.1 checks it.

**6. No backfill.** Conversations already in an Inbox stay there; the rule applies to first messages sent after deploy.

## Risks / Trade-offs

- [A trader who opens cold with their own objekt that the recipient wants, as a card from their own collection, now lands in Requests] → The offer path counts gives on the recipient's want list, and a Message from the recipient's want post sends a post card; both stay in the Inbox. The Requests dot still shows. Widening cards to "collection on their want list" can follow if this proves common.
- [An offer opening a request still sends its bell notice, so the recipient is still told at once] → Kept on purpose (proposal non-goal): an offer expires, and a silent one would lapse unseen. The bell links to the conversation, where the request bar offers Decline and Block.
- [A caller added later forgets `listed`] → It defaults to Requests, which is the safe failure.

## Migration Plan

API-only, shipped with the web image; no schema change or migration. Rollback is a revert; conversations opened as requests in the meantime stay in Requests until answered, which is acceptable.
