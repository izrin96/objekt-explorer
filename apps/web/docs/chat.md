# Chat

Part of `apps/web/AGENTS.md`, which points here.

## Chat deals

`features/chat/deal-text.ts` is the one place a deal state is worded and toned, for the Inbox row and the thread's deal strip alike, beside its test against the spec's tables. Below `md` the strip drops "v of t" and reads `phoneWords` where set (the row's shorter words for Your turn, Their turn and Stuck), so whose turn it is fits a phone. A trade step's chip words come from `stepChipText` (`features/offers/next-step-text.ts`), which the status card shares. It stays free of network imports, so the strip passes `leftLabel` and `shortDate` in. The trade page's step tones live in `STEP_TONE` (`lib/tone.ts`), which the status card and the deal read. A message that may not be loaded yet is reached through `useJumpToMessage` (`thread/thread-hooks.ts`), which loads up to 10 older pages, keeps the reader's place and focuses the target, and with `highlight` tints it through its `data-highlight` styles; Review offer, View offer, the New divider and a reply's quote use it. The Inbox's `show` chip keeps the open conversation's row after it stops matching (`kept-row.ts`), until a chip is picked or the search changes.

## Chat draft

`stores/chat-draft.ts` keeps, per conversation id and in memory only, the card a Message button hands over and the unsent `body` with the `clientId` of the send being composed. The composer reads it through selectors. A failed send restores its text in the send mutation's `onError`, not the per-call one, because that one is lost when the thread unmounts. The same `clientId` goes with every retry so the server posts the message once; editing the text starts a new one, and so does choosing, changing or stopping a reply.

The draft also carries the reply, with a snapshot of its quote, and keeps it while the box is empty. A send in flight leaves its reply in `sentReplies`, as its card waits in `sentCards`, so a failure puts both back; a reply started or a card attached meanwhile wins (the open thread lists its card in `boxCards`), and the failed text returns without its own. The reply line reads the cached message first (`features/chat/reply.ts`), and `applyUnsent` blanks a snapshot whose message was unsent.

The card is an `Attachment` (`features/chat/attachment.ts`) of two kinds: an objekt card (`kind: "objekt"`, drawn as a chip) and a Trade post card (`kind: "post"`, drawn by `thread/post-card-message.tsx`, the component the thread uses). Only Trade attaches a post card: a row's Message (Browse, For you and the person pages, one row per person, addressed to the row's lead post, or on a post page to that post), and Message about this post in a post's ⋯ menu and its "+N" sheet's footer, addressed to that post. Its `withMatch` asks the server for the match (a row's when it counts one, a post's when one of its strips does), and the first-line suggestion follows `view.match`, the match the server saved, which is the person's whole match even on one post's card.
