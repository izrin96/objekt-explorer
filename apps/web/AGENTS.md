# web

TanStack Start app on Base UI (the cnippet registry). `src/components/ui/*` are vendored registry copies kept verbatim; `src/components/ui/README.md` lists the only local edits, and the upstream variants to check before composing a new UI pattern or a `components/shared` wrapper.

## Rules

- **State.** URL state is the route's `validateSearch` with Zod. Zustand reads are selectors (`useFilters((s) => s.member)`), never the whole store.
- **Data.** Server data goes through React Query with the `@orpc/tanstack-query` utils. Route loaders load the first paint with `queryClient.query({ ...options, staleTime: "static" })`. `useSuspenseQueries` has no `enabled: false` (it suspends forever), so fetch unconditionally and ignore the result when it does not apply.
- **Strings.** Every user-facing string is `m.*` from Paraglide. A dialog's dismiss button is `m.common_modal_cancel()` when the dialog has a primary action that commits something, and `m.common_modal_close()` when it is informational or only produces output to copy.
- **API errors.** Show an oRPC error through `refusalText(error)` (`lib/refusal.ts`) or the domain's own formatter (`features/chat/format.ts`), never `error.message`; Better Auth calls in `features/auth/` and `features/account/` keep Better Auth's message.
- **UI kit.** Phosphor icons; `virtua` for grids.
- **Tokens.** cnippet token names only. `text-*-foreground` on a feedback colour is text on a tinted chip, not on a solid fill: text on a solid fill is `text-white`, and a tint is an opacity modifier on the fill (`bg-destructive/8`), since there is no `*-subtle` token.
- **Lists.** Where a list lives and who owns it key off its profile **address**; `isProfileBind` only decides whether it shows on that profile (`features/list/list-link.ts`).
- **Overflow guard.** `lib/dev-overflow-guard.ts` reports horizontal overflow in dev. Declare every deliberate horizontal scroller with `data-scroll-x`, or the guard reports it.
- **Trade page.** Its state lives in the pure `features/offers/next-step.ts` (the status card's state, its `primary` button, each side's status and each leg's chip), `exchange.ts` (a leg's status and warnings, and how The exchange groups, filters and finds legs) and `trade-clock.ts` (`timelineRows`, the one Timeline for every state), beside their tests: a new state starts there, then `next-step-banner.tsx` (the status card, which also holds the stepper) maps it to copy. The phone bar reads the same `primary`, so the card hides the buttons the bar carries.
- **Section chrome.** A route under `trade/` that brings its own heading sets `staticData: { tradeChrome: false }` (declared in `router.tsx`), and `trade/route.tsx` then drops the Trade header and tabs; the trade page uses it for its breadcrumb.

## Chat draft

`stores/chat-draft.ts` keeps, per conversation id and in memory only, the card a Message button hands over and the unsent `body` with the `clientId` of the send being composed. The composer reads it through selectors. A failed send restores its text in the send mutation's `onError`, not the per-call one, because that one is lost when the thread unmounts. The same `clientId` goes with every retry so the server posts the message once; editing the text starts a new one.

The card is an `Attachment` (`features/chat/attachment.ts`) of two kinds: an objekt card (`kind: "objekt"`, drawn as a chip) and a Trade post card (`kind: "post"`, drawn by `thread/post-card-message.tsx`, the component the thread uses). Only a Trade row's Message (Browse and For you, one row per person, addressed to the row's lead post) attaches a post card; its `withMatch` asks the server for the match, and the first-line suggestion follows `view.match`, the match the server saved.

## Verifying against production

The dev server talks to production unless `.env.local` overrides it, and the account in `SMOKE_TEST1_*` is the user's own: sign in and read, never write. A `window.fetch` shim cannot hold a write back, because `lib/orpc.ts` captures `fetch` when it builds its `RPCLink`. Verify a mutation up to the request boundary (its input and the request it would send) and leave the control unclicked.

## Pin drag-and-drop

`features/profile/pin-dnd.tsx` and `use-pin-order.ts`. The drop commits through plain React state (`pinOrderOverride`) set in the same handler as dnd-kit's cleanup, so both land in one commit; the mutation's `onSettled` clears it. React Query defers cache notifications to a later task, so `setQueryData` cannot paint in that frame, and `flushSync` commits while dnd-kit is still active. Reordering the DOM during `onDragOver` remounts `virtua` cells and kills the shift animation, hence `animateLayoutChanges: () => false`.
