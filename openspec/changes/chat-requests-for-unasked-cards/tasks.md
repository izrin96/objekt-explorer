# Tasks

## 1. The rule

- [x] 1.1 In `packages/api/src/lib/chat-rules.ts`, replace `opensWithContent` on the `incoming` event with `listed` (`request: event.first ? !event.listed : state.request`) and add a pure `firstListed(facts, recipientId)` taking `{ card?: { list: { ownerId: string; listType: ListType } | null }; offer?: { asksThroughList: boolean; givesWanted: boolean } }` (design, Decisions 1–2a). In `chat-rules.test.ts`, update the `opensWithContent` case and add cases: a card on the recipient's sale, have or want list is listed; a card on the recipient's general list, a card on the sender's list, a card with no list and a message with neither are not; an offer that asks through a list, or gives something wanted, is listed; one with both false is not. Verify with `bun test` in `packages/api`. Lint, typecheck and test `@repo/api` (it has no build script).

## 2. Cards and sends

- [x] 2.1 Have `resolveCard` (`services/chat/cards.ts`) return the named list (`ownerId`, `listType`) beside the stored card, adding `listType` to the post and objekt card selects, with no new query. Add `listed?: boolean` to `AppendInput` in `services/chat/members.ts` and pass it on the recipient's `incoming` event in place of the card/offer check. In `sendMessage` (`services/chat/send.ts`), compute `firstListed` for a first message and pass it. Update the `ResolvedCard` reader in `startConversation` if its shape changes. Verify by reading the three call sites, and on local with two accounts: a profile message carrying the recipient's own objekt and no list, or a card from the recipient's general list, lands under the recipient's Requests, and a Market tab Message with the seller's listing lands in their Inbox. Lint, typecheck and test `@repo/api` (it has no build script).
  - Verified 2026-11-02 on local through the services (conversations 391–393): own objekt with no list and a card from the sender's own list landed in Requests; the recipient's sale list card in the Inbox; a general list card and a post card checked read-only through `resolveCard`.

## 3. Offers

- [x] 3.1 In `createOffer` (`services/offer/index.ts`), when the offer is the conversation's first message (`firstCtx`), set `asksThroughList` from `getRows` and, only when that is false and `input.give` is not empty, read `givesWanted` with one query over the partner's `want` lists' `list_entries` for the give collections (design, Decision 3). Pass `listed` to `appendMessage`. Verify on local: an offer asking from a have list lands in the recipient's Inbox; a give-only offer of a collection on the recipient's want list lands in the Inbox; an offer to an account with no lists, asking from its collection and giving nothing it wants, is sent and lands under Requests. With the recipient's `/messages` open on Inbox in a second browser session, that last offer joins Requests without a reload, the Requests count goes up and the Messages dot shows (design, Decision 5). Lint, typecheck and test `@repo/api` (it has no build script).
  - Verified 2026-11-02 on local (offers 261–263). The second-browser check was replaced by reading what the web re-reads after `chat_changed`: `chat.list` Requests, `requestCount` 2, `requestsUnseen` true for the recipient. Not seen in a browser: no local test-account sign-in.
- [x] 3.2 Split the locked read-and-write of `updateMember` (`services/chat/members.ts`) into a helper taking `tx`, keep `updateMember` as its wrapper, and call the helper from `acceptOffer` (`services/offer/accept.ts`) inside the accept transaction with `{ type: "accept" }` for the acceptor (design, Decision 4). Leave decline and expiry alone. Verify on local: accepting an offer from Requests moves the conversation to the acceptor's Inbox, and declining one leaves it under Requests. Lint, typecheck and test `@repo/api` (it has no build script).

## 4. Web check

- [x] 4.1 Load `vercel-react-best-practices` before any `.tsx` edit. On local, open a request that holds an offer, accept it from the thread, and confirm the request bar goes without a reload and the conversation shows under Inbox. If the bar stays, invalidate the thread query in the offer actions' `refresh` (`apps/web/src/features/offers/actions.ts`) and check again. If `web` changed, lint, typecheck and build `web`; otherwise record that it needed no change.
  - No `web` change: `fetchNewer` reads `chat.thread`, and `appendToThread` replaces the cached `conversation`, so the request bar follows `request` false. Verified server side: thread 395 reads `request: false` after the accept. Not seen in a browser.

## 5. Integration and docs

- [x] 5.1 Run `bun run check` and `bun run build --filter=web` from the root, and re-run the local checks from 2.1, 3.1 and 3.2 in one pass with the same two accounts. Mutations stay on the local database; nothing is sent to production.
  - `bun run check` 24/24 and `bun run build --filter=web` passed 2026-11-02; the local checks of 2.1, 3.1 and 3.2 ran in one script pass against localhost only.
- [x] 5.2 In `packages/api/AGENTS.md`, rewrite the sentence "`nextMemberState` puts the recipient of a card-less first message in Requests, whoever opened the conversation" to say the caller passes `listed` (`firstListed`, `lib/chat-rules.ts`) and an unlisted first message opens as a request; add that accepting an offer applies the member `accept` event. Verify by reading the paragraph. Record in the task notes that no other package's `AGENTS.md` changed.
  - Updated the "first message is the start" paragraph. No other package's `AGENTS.md` changed.

## Workflow follow-up

- Archive with `/opsx:archive` after the user reviews and the change ships.
